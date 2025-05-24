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
    if (!modelConfig?.apiKey) {
      throw new Error("No API key configured. Please configure your model settings.");
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

      // Add assistant response to history
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response,
        timestamp: Date.now(),
      };

      // Update the actual chat history (not background history)
      const newHistory = [...chatHistory, userMessage, assistantMessage];
      setChatHistory(newHistory);

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
      const geminiURL = `https://generativelanguage.googleapis.com/v1beta/models/${modelConfig.modelName}:generateContent?key=${modelConfig.apiKey}`;
      const data = {
        contents: messages
      };

      const response = await fetch(geminiURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Gemini API error:', response.status, response.statusText, await response.text());
        throw new Error(`Gemini API request failed with status ${response.status}`);
      }

      const json = await response.json();
      const responseText = json.candidates[0].content.parts[0].text;
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

      const response = await fetch(groqURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${modelConfig.apiKey}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Groq API error:', response.status, response.statusText, await response.text());
        throw new Error(`Groq API request failed with status ${response.status}`);
      }

      const json = await response.json();
      const responseText = json.choices[0].message.content;
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
          'HTTP-Referer': 'https://lovable.ai', // Replace with your actual site URL
          'X-Title': 'Chuself AI' // Replace with your actual app name
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('OpenRouter API error:', response.status, response.statusText, await response.text());
        throw new Error(`OpenRouter API request failed with status ${response.status}`);
      }

      const json = await response.json();
      const responseText = json.choices[0].message.content;
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
