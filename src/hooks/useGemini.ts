import { useState, useEffect } from "react";

// Local storage keys
const LOCAL_STORAGE_API_KEY = "gemini-api-key";
const LOCAL_STORAGE_MODEL_CONFIG = "ai-model-config";
const LOCAL_STORAGE_CHAT_HISTORY = "gemini-chat-history";

// Maximum number of chat history messages to maintain (to avoid token limits)
const MAX_HISTORY_LENGTH = 10;

// Type definitions for better type safety
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ModelConfig {
  modelName: string;
  provider: string;
  apiKey: string;
  endpoint: string;
}

export const useGemini = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);

  // Load chat history from localStorage on initialization
  useEffect(() => {
    const loadChatHistory = () => {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_CHAT_HISTORY);
      if (storedHistory) {
        try {
          const parsedHistory = JSON.parse(storedHistory) as ChatMessage[];
          setChatHistory(parsedHistory);
          console.log("Loaded chat history from localStorage:", parsedHistory.length, "messages");
        } catch (e) {
          console.error("Failed to parse chat history:", e);
          localStorage.removeItem(LOCAL_STORAGE_CHAT_HISTORY);
        }
      }
    };

    loadChatHistory();
  }, []);

  // Load model configuration
  useEffect(() => {
    const loadModelConfig = () => {
      const storedConfig = localStorage.getItem(LOCAL_STORAGE_MODEL_CONFIG);
      if (storedConfig) {
        try {
          const config = JSON.parse(storedConfig) as ModelConfig;
          setModelConfig(config);
          setSelectedModel(config.modelName);
          console.log("Using stored model config:", config.provider, config.modelName);
        } catch (e) {
          console.error("Failed to parse model config:", e);
          localStorage.removeItem(LOCAL_STORAGE_MODEL_CONFIG);
        }
      } else {
        // Fallback to use API key directly if no model config is found
        const storedApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
        if (storedApiKey) {
          const defaultConfig: ModelConfig = {
            modelName: "models/gemini-1.5-flash-latest",
            provider: "gemini",
            apiKey: storedApiKey,
            endpoint: ""
          };
          setModelConfig(defaultConfig);
          setSelectedModel(defaultConfig.modelName);
          console.log("Created default model config with stored API key");
        } else {
          // Set a placeholder default
          const fallbackConfig: ModelConfig = {
            modelName: "models/gemini-1.5-flash-latest",
            provider: "gemini",
            apiKey: "AIzaSyDApo1EqSX0Mq3ZePA9OM_yD0hnmoz_s-Q",
            endpoint: ""
          };
          setModelConfig(fallbackConfig);
          setSelectedModel(fallbackConfig.modelName);
          console.log("Using fallback model config");
        }
      }
    };

    loadModelConfig();
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_CHAT_HISTORY, JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  const clearChatHistory = () => {
    setChatHistory([]);
    localStorage.removeItem(LOCAL_STORAGE_CHAT_HISTORY);
  };

  /**
   * Send a message to the selected AI model
   */
  const sendMessage = async (message: string, customInstructions?: string): Promise<string> => {
    if (!modelConfig) {
      setError("No model configuration available. Please set up your model in settings.");
      return "Sorry, no AI model is currently available. Please configure your model in settings.";
    }

    setIsLoading(true);
    setError(null);

    try {
      // Add user message to chat history
      const userMessage: ChatMessage = {
        role: "user",
        content: message,
        timestamp: Date.now()
      };
      
      const messageHistory = [...chatHistory];
      
      // Add custom instructions as a system message if provided
      if (customInstructions && customInstructions.trim()) {
        messageHistory.unshift({
          role: "system",
          content: customInstructions,
          timestamp: Date.now() - 10000, // Add slightly before user message
        });
      }
      
      const updatedHistory = [...messageHistory, userMessage];
      setChatHistory(updatedHistory);

      // Prepare the conversation history for the API request
      // Only include the most recent messages to avoid token limits
      const recentHistory = updatedHistory.slice(-MAX_HISTORY_LENGTH);
      
      let responseText = "";
      
      // Handle different providers
      switch(modelConfig.provider) {
        case "gemini":
          responseText = await callGeminiApi(recentHistory, message, modelConfig);
          break;
        case "openrouter":
          responseText = await callOpenRouterApi(recentHistory, message, modelConfig);
          break;
        case "groq":
          responseText = await callGroqApi(recentHistory, message, modelConfig);
          break;
        default:
          throw new Error(`Unsupported provider: ${modelConfig.provider}`);
      }
      
      // Add AI response to chat history
      const aiMessage: ChatMessage = {
        role: "model",
        content: responseText,
        timestamp: Date.now()
      };
      
      setChatHistory(prevHistory => [...prevHistory, aiMessage]);
      
      return responseText;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Error calling AI API:", errorMessage);
      
      return "Sorry, I encountered an error processing your request.";
    } finally {
      setIsLoading(false);
    }
  };

  const callGeminiApi = async (history: ChatMessage[], currentMessage: string, config: ModelConfig) => {
    // Format model ID properly
    const modelId = config.modelName.includes("/") 
      ? config.modelName 
      : `models/${config.modelName}`;

    console.log(`Using Gemini model: ${modelId}`);
    
    // Format conversation history for Gemini API
    const formattedHistory = history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    // Use custom endpoint if provided, otherwise use default
    const endpoint = config.endpoint || 
      `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${config.apiKey}`;

    // Send the request with conversation history
    const response = await fetch(
      endpoint.replace("{model}", modelId),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: formattedHistory,
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to get response from Gemini API");
    }

    // Extract the response text from the Gemini API response
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";
  };

  const callOpenRouterApi = async (history: ChatMessage[], currentMessage: string, config: ModelConfig) => {
    console.log(`Using OpenRouter model: ${config.modelName}`);
    
    // Format conversation history for OpenRouter API (OpenAI compatible)
    const formattedHistory = history.map(msg => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    }));

    // Use custom endpoint if provided, otherwise use default
    const endpoint = config.endpoint || "https://openrouter.ai/api/v1/chat/completions";

    // Send the request
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: formattedHistory
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to get response from OpenRouter API");
    }

    // Extract the response text
    return data.choices?.[0]?.message?.content || "No response from AI";
  };

  const callGroqApi = async (history: ChatMessage[], currentMessage: string, config: ModelConfig) => {
    console.log(`Using Groq model: ${config.modelName}`);
    
    // Format conversation history for Groq API (OpenAI compatible)
    const formattedHistory = history.map(msg => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content
    }));

    // Use custom endpoint if provided, otherwise use default
    const endpoint = config.endpoint || "https://api.groq.com/openai/v1/chat/completions";

    // Send the request
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: formattedHistory
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to get response from Groq API");
    }

    // Extract the response text
    return data.choices?.[0]?.message?.content || "No response from AI";
  };

  return {
    sendMessage,
    isLoading,
    error,
    availableModels,
    selectedModel,
    setSelectedModel: (model: string) => {
      setSelectedModel(model);
      if (modelConfig) {
        const updatedConfig = { ...modelConfig, modelName: model };
        setModelConfig(updatedConfig);
        localStorage.setItem(LOCAL_STORAGE_MODEL_CONFIG, JSON.stringify(updatedConfig));
      }
    },
    chatHistory,
    clearChatHistory
  };
};
