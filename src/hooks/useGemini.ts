
import { useState, useEffect } from "react";

// Local storage keys
const LOCAL_STORAGE_API_KEY = "gemini-api-key";
const LOCAL_STORAGE_MODEL = "gemini-selected-model";
const LOCAL_STORAGE_CHAT_HISTORY = "gemini-chat-history";

// Maximum number of chat history messages to maintain (to avoid token limits)
const MAX_HISTORY_LENGTH = 10;

// Type definitions for better type safety
export interface ChatMessage {
  role: "user" | "model";
  content: string;
  timestamp: number;
}

export const useGemini = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Get API key from localStorage or use the fallback
  const getApiKey = (): string => {
    const storedApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    // Fallback to hardcoded API key if not found in localStorage
    return storedApiKey || "AIzaSyDApo1EqSX0Mq3ZePA9OM_yD0hnmoz_s-Q";
  };

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

  // Load or fetch model information
  useEffect(() => {
    // Load preferred model from localStorage if available
    const storedModel = localStorage.getItem(LOCAL_STORAGE_MODEL);
    if (storedModel) {
      console.log("Using stored model preference:", storedModel);
      setSelectedModel(storedModel);
    } else {
      // Otherwise fetch available models
      fetchAvailableModels();
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_CHAT_HISTORY, JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // If we don't have a stored model preference, fetch available models
  const fetchAvailableModels = async () => {
    try {
      console.log("Fetching available models...");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${getApiKey()}`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Network response was not ok");
      }
      
      const data = await response.json();
      
      if (data.models && Array.isArray(data.models)) {
        const modelNames = data.models.map((model: any) => model.name);
        console.log("Available models:", modelNames);
        setAvailableModels(modelNames);
        
        // Find a suitable model (prefer gemini-1.5-flash or similar)
        const preferredModels = [
          "gemini-1.5-flash",
          "gemini-1.5-pro", 
          "gemini-pro",
          "models/gemini-pro"
        ];
        
        let foundModel = "";
        for (const preferred of preferredModels) {
          const match = modelNames.find((model: string) => model.includes(preferred));
          if (match) {
            foundModel = match;
            break;
          }
        }
        
        if (foundModel) {
          setSelectedModel(foundModel);
          localStorage.setItem(LOCAL_STORAGE_MODEL, foundModel);
          console.log("Selected model:", foundModel);
        } else if (modelNames.length > 0) {
          setSelectedModel(modelNames[0]);
          localStorage.setItem(LOCAL_STORAGE_MODEL, modelNames[0]);
          console.log("Using first available model:", modelNames[0]);
        }
      } else {
        throw new Error("Invalid response format: models array not found");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch available models";
      console.error("Error fetching models:", errorMessage);
      
      // If we couldn't fetch models, set a default one
      if (!selectedModel) {
        const defaultModel = "models/gemini-1.5-flash-latest";
        setSelectedModel(defaultModel);
        setAvailableModels([defaultModel]);
        localStorage.setItem(LOCAL_STORAGE_MODEL, defaultModel);
        console.log("Using default model:", defaultModel);
      }
      
      setError(errorMessage);
    }
  };

  const clearChatHistory = () => {
    setChatHistory([]);
    localStorage.removeItem(LOCAL_STORAGE_CHAT_HISTORY);
  };

  const sendMessage = async (message: string) => {
    if (!selectedModel) {
      setError("No AI model available. Please try again later.");
      return "Sorry, no AI model is currently available. Please try again later.";
    }

    setIsLoading(true);
    setError(null);

    try {
      // Format model ID properly
      const modelId = selectedModel.includes("/") 
        ? selectedModel 
        : `models/${selectedModel}`;

      console.log(`Using model: ${modelId}`);

      // Add user message to chat history
      const userMessage: ChatMessage = {
        role: "user",
        content: message,
        timestamp: Date.now()
      };
      
      const updatedHistory = [...chatHistory, userMessage];
      setChatHistory(updatedHistory);

      // Prepare the conversation history for the API request
      // Only include the most recent messages to avoid token limits
      const recentHistory = updatedHistory.slice(-MAX_HISTORY_LENGTH);
      
      // Format conversation history for Gemini API
      const formattedHistory = recentHistory.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      // Send the request with conversation history
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${getApiKey()}`,
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
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";
      
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
      console.error("Error calling Gemini API:", errorMessage);
      
      // If the error is related to conversation format, try again with just the current message
      if (errorMessage.includes("conversation") || errorMessage.includes("contents")) {
        console.log("Retrying with just the current message...");
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${selectedModel.includes("/") ? selectedModel : `models/${selectedModel}`}:generateContent?key=${getApiKey()}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [{ text: message }]
                  }
                ],
              }),
            }
          );
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error?.message || "Failed on retry");
          }
          
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";
          return responseText;
        } catch (retryErr) {
          console.error("Retry also failed:", retryErr);
          return "Sorry, I encountered an error processing your request with conversation history.";
        }
      }
      
      return "Sorry, I encountered an error processing your request.";
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading,
    error,
    availableModels,
    selectedModel,
    setSelectedModel: (model: string) => {
      setSelectedModel(model);
      localStorage.setItem(LOCAL_STORAGE_MODEL, model);
    },
    chatHistory,
    clearChatHistory
  };
};
