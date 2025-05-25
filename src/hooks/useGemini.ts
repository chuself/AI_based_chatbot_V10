
import { useState, useEffect } from "react";
import { ModelConfig, useGeminiConfig } from "./useGeminiConfig";
import { useChatHistory, ChatMessage, MAX_HISTORY_LENGTH } from "./useChatHistory";

export const useGemini = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { modelConfig, selectedModel } = useGeminiConfig();
  const { chatHistory, setChatHistory, clearChatHistory } = useChatHistory();

  const sendMessage = async (
    message: string, 
    customInstructions?: string,
    backgroundHistory?: ChatMessage[]
  ): Promise<string> => {
    console.log('sendMessage called with:', { message, modelConfig });
    
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
      
      // Combine current chat history with new message
      const userMessage: ChatMessage = {
        role: "user",
        content: message,
        timestamp: Date.now(),
      };

      const updatedHistory = [...historyToUse, userMessage];

      // Prepare messages for the API call
      let messages = updatedHistory.slice(-MAX_HISTORY_LENGTH).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      if (customInstructions) {
        messages.unshift({
          role: "system",
          content: customInstructions
        });
      }

      console.log('Sending request to:', modelConfig.provider);
      console.log('Using model:', modelConfig.modelName);
      console.log('Message count:', messages.length);
      console.log('Full model config:', modelConfig);

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

      console.log('Received response:', response);

      // Add assistant response to history (only if not using background history)
      if (!backgroundHistory) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response,
          timestamp: Date.now(),
        };

        const newHistory = [...chatHistory, userMessage, assistantMessage];
        setChatHistory(newHistory);
      }

      return response;
    } catch (err) {
      console.error('Error in sendMessage:', err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sendGeminiRequest = async (messages: { role: string; content: string; }[], modelConfig: ModelConfig): Promise<string> => {
    try {
      // Format messages for Gemini API
      const formattedMessages = messages.map(msg => ({
        role: msg.role === "assistant" ? "model" : msg.role === "system" ? "user" : msg.role,
        parts: [{ text: msg.content }]
      }));

      const modelName = modelConfig.modelName.includes('/') ? modelConfig.modelName : `models/${modelConfig.modelName}`;
      const geminiURL = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${modelConfig.apiKey}`;
      
      console.log('Gemini API URL:', geminiURL);
      console.log('Formatted messages:', formattedMessages);

      const requestBody = {
        contents: formattedMessages
      };

      const response = await fetch(geminiURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Gemini response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, response.statusText, errorText);
        throw new Error(`Gemini API request failed with status ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      console.log('Gemini response data:', json);
      
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
        top_p: 1,
        n: 1,
        stream: false,
        max_tokens: 1024,
        presence_penalty: 0,
        frequency_penalty: 0,
        stop: null
      };

      console.log('Groq request data:', data);

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
        console.error('Groq API error:', response.status, response.statusText, errorText);
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
        top_p: 1,
        n: 1,
        stream: false,
        max_tokens: 1024,
        presence_penalty: 0,
        frequency_penalty: 0,
        stop: null
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
        console.error('OpenRouter API error:', response.status, response.statusText, errorText);
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
  };
};
