
import { useState, useEffect } from "react";
import { ModelConfig, useGeminiConfig } from "./useGeminiConfig";
import { useChatHistory, ChatMessage, MAX_HISTORY_LENGTH } from "./useChatHistory";
import { generateIntegrationsSystemPrompt } from "@/services/aiIntegrationHelper";
import { useCommands } from "./useCommands";

export const useGemini = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { modelConfig, selectedModel, isValidated } = useGeminiConfig();
  const { chatHistory, setChatHistory, clearChatHistory } = useChatHistory();
  const { commands } = useCommands();

  const sendMessage = async (
    message: string, 
    customInstructions?: string,
    backgroundHistory?: ChatMessage[]
  ): Promise<string> => {
    console.log('🚀 Sending message:', message);
    
    if (!isValidated) {
      const errorMsg = "Model configuration not validated. Please check your API key and model settings.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    if (!modelConfig?.apiKey) {
      const errorMsg = "No API key configured. Please configure your model settings.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!modelConfig?.modelName) {
      const errorMsg = "No model selected. Please select a model in settings.";
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use background history if provided, otherwise use current chat history
      const historyToUse = backgroundHistory || chatHistory;
      
      // Create user message
      const userMessage: ChatMessage = {
        role: "user",
        content: message,
        timestamp: Date.now(),
      };

      // Add user message to history immediately (only if not using background history)
      if (!backgroundHistory) {
        const newHistory = [...historyToUse, userMessage];
        setChatHistory(newHistory);
      }

      const updatedHistory = [...historyToUse, userMessage];

      // Prepare messages for the API call
      let messages = updatedHistory.slice(-MAX_HISTORY_LENGTH).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Build system instructions efficiently
      let systemInstructions = "You are a helpful AI assistant.";
      
      // Add commands context
      if (commands && commands.length > 0) {
        const personalityCommands = commands.filter(cmd => 
          cmd.type !== 'mcp' && 
          (cmd.instruction || cmd.prompt) &&
          (cmd.name.toLowerCase().includes('personality') || 
           cmd.name.toLowerCase().includes('behavior') ||
           cmd.instruction?.toLowerCase().includes('you are') ||
           cmd.prompt?.toLowerCase().includes('you are'))
        );
        
        if (personalityCommands.length > 0) {
          systemInstructions += "\n\nPersonality: ";
          personalityCommands.forEach(cmd => {
            const instruction = cmd.instruction || cmd.prompt;
            if (instruction) {
              systemInstructions += instruction + " ";
            }
          });
        }
      }
      
      // Add integrations context
      const integrationsPrompt = await generateIntegrationsSystemPrompt();
      if (integrationsPrompt && integrationsPrompt.length > 0) {
        systemInstructions += integrationsPrompt;
      }
      
      // Add custom instructions if provided
      if (customInstructions) {
        systemInstructions += "\n\n" + customInstructions;
      }

      // Add system message once at the beginning
      if (systemInstructions.length > "You are a helpful AI assistant.".length) {
        messages.unshift({
          role: "system",
          content: systemInstructions
        });
      }

      console.log('📡 Calling API with', messages.length, 'messages');

      let response;
      
      if (modelConfig.provider === "gemini") {
        response = await sendGeminiRequest(messages, modelConfig);
      } else if (modelConfig.provider === "groq") {
        response = await sendGroqRequest(messages, modelConfig);
      } else if (modelConfig.provider === "openrouter") {
        response = await sendOpenRouterRequest(messages, modelConfig);
      } else {
        throw new Error(`Unsupported provider: ${modelConfig.provider}`);
      }

      console.log('✅ Received response');

      // Add assistant response to history (only if not using background history)
      if (!backgroundHistory) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response,
          timestamp: Date.now(),
        };

        const finalHistory = [...updatedHistory, assistantMessage];
        setChatHistory(finalHistory);
      }

      return response;
    } catch (err) {
      console.error('❌ Error in sendMessage:', err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sendGeminiRequest = async (messages: { role: string; content: string; }[], modelConfig: ModelConfig): Promise<string> => {
    try {
      const formattedMessages = messages
        .filter(msg => msg.role !== "system")
        .map(msg => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        }));

      const systemMessage = messages.find(msg => msg.role === "system");
      if (systemMessage) {
        formattedMessages.unshift({
          role: "user",
          parts: [{ text: `Instructions: ${systemMessage.content}` }]
        });
      }

      const modelName = modelConfig.modelName.includes('/') ? modelConfig.modelName : `models/${modelConfig.modelName}`;
      const geminiURL = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${modelConfig.apiKey}`;
      
      const requestBody = {
        contents: formattedMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      };

      const response = await fetch(geminiURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API request failed with status ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        throw new Error('No response content from Gemini API');
      }
      
      return responseText;

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error(`Failed to get response from Gemini: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const sendGroqRequest = async (messages: { role: string; content: string; }[], modelConfig: ModelConfig): Promise<string> => {
    try {
      const groqURL = `https://api.groq.com/openai/v1/chat/completions`;
      const data = {
        model: modelConfig.modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
      };

      const response = await fetch(groqURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${modelConfig.apiKey}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API request failed with status ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const responseText = json.choices?.[0]?.message?.content;
      
      if (!responseText) {
        throw new Error('No response content from Groq API');
      }
      
      return responseText;

    } catch (error) {
      console.error('Error calling Groq API:', error);
      throw new Error(`Failed to get response from Groq: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const sendOpenRouterRequest = async (messages: { role: string; content: string; }[], modelConfig: ModelConfig): Promise<string> => {
    try {
      const openRouterURL = `https://openrouter.ai/api/v1/chat/completions`;
      const data = {
        model: modelConfig.modelName,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
      };

      const response = await fetch(openRouterURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${modelConfig.apiKey}`,
          'HTTP-Referer': 'https://lovable.ai',
          'X-Title': 'Chuself AI'
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API request failed with status ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const responseText = json.choices?.[0]?.message?.content;
      
      if (!responseText) {
        throw new Error('No response content from OpenRouter API');
      }
      
      return responseText;

    } catch (error) {
      console.error('Error calling OpenRouter API:', error);
      throw new Error(`Failed to get response from OpenRouter: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return {
    sendMessage,
    isLoading,
    error,
    selectedModel,
    chatHistory,
    clearChatHistory,
    isValidated,
  };
};
