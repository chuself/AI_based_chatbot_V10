
import { useState } from "react";
import { useGeminiConfig } from "./useGeminiConfig";
import { useChatHistory, ChatMessage } from "./useChatHistory";
import { callGeminiApi, callOpenRouterApi, callGroqApi, prepareMessageHistory } from "@/services/aiProviders";

// Export types with the 'export type' syntax for isolatedModules compatibility
export type { ChatMessage } from "./useChatHistory";
export type { ModelConfig } from "./useGeminiConfig";

export const useGemini = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { chatHistory, setChatHistory, clearChatHistory } = useChatHistory();
  const { availableModels, selectedModel, modelConfig, setSelectedModel } = useGeminiConfig();

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
      // Create message history with system message first if provided
      const messageHistory = [...chatHistory];
      
      // Always add custom instructions at the beginning of the conversation
      // This ensures the model receives the instructions first
      if (customInstructions && customInstructions.trim()) {
        // Only add system message if it doesn't exist or is different
        const existingSystemMessage = messageHistory.find(msg => 
          msg.role === "system" && msg.content === customInstructions
        );
        
        if (!existingSystemMessage) {
          // Remove any previous system messages to avoid conflicting instructions
          const filteredHistory = messageHistory.filter(msg => msg.role !== "system");
          
          // Add the new system message at the beginning
          filteredHistory.unshift({
            role: "system",
            content: customInstructions,
            timestamp: Date.now() - 10000, // Add slightly before user message
          });
          
          // Update the history
          messageHistory.length = 0;
          messageHistory.push(...filteredHistory);
        }
      }
      
      // Add user message to chat history
      const userMessage: ChatMessage = {
        role: "user",
        content: message,
        timestamp: Date.now()
      };
      
      const updatedHistory = [...messageHistory, userMessage];
      setChatHistory(updatedHistory);

      // Use smart token management to prepare history
      const recentHistory = prepareMessageHistory(updatedHistory);
      
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
        role: "assistant",
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

  return {
    sendMessage,
    isLoading,
    error,
    availableModels,
    selectedModel,
    setSelectedModel,
    chatHistory,
    clearChatHistory
  };
};
