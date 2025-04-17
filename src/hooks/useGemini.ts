
import { useState } from "react";
import { useGeminiConfig } from "./useGeminiConfig";
import { useChatHistory, ChatMessage } from "./useChatHistory";
import { callGeminiApi, callOpenRouterApi, callGroqApi, prepareMessageHistory } from "@/services/aiProviders";
import getMcpClient from "@/services/mcpService";

// Export types with the 'export type' syntax for isolatedModules compatibility
export type { ChatMessage } from "./useChatHistory";
export type { ModelConfig } from "./useGeminiConfig";

export const useGemini = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mcpResult, setMcpResult] = useState<any | null>(null);
  const { chatHistory, setChatHistory, clearChatHistory } = useChatHistory();
  const { availableModels, selectedModel, modelConfig, setSelectedModel } = useGeminiConfig();
  const mcpClient = getMcpClient();

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
    setMcpResult(null);

    try {
      // Create message history with system message first if provided
      const messageHistory = [...chatHistory];
      
      // Add MCP server information to the system message
      const mcpInstructions = `You have access to an MCP server at https://cloud-connect-mcp-server.onrender.com/.
When you need to use Gmail, Calendar, or Drive tools, emit exactly:
{ "mcp_call": { "tool": "<toolName>", "method": "<methodName>", "params": { ... }, "id": 1 } }`;
      
      // Combine user instructions with MCP instructions
      let systemInstructions = mcpInstructions;
      if (customInstructions && customInstructions.trim()) {
        systemInstructions = `${customInstructions}\n\n${mcpInstructions}`;
      }
      
      // Only add system message if it doesn't exist or is different
      const existingSystemMessage = messageHistory.find(msg => 
        msg.role === "system" && msg.content === systemInstructions
      );
      
      if (!existingSystemMessage) {
        // Remove any previous system messages to avoid conflicting instructions
        const filteredHistory = messageHistory.filter(msg => msg.role !== "system");
        
        // Add the new system message at the beginning
        filteredHistory.unshift({
          role: "system",
          content: systemInstructions,
          timestamp: Date.now() - 10000, // Add slightly before user message
        });
        
        // Update the history
        messageHistory.length = 0;
        messageHistory.push(...filteredHistory);
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
      
      // Check if the response contains an MCP call
      if (mcpClient.hasMcpCall(responseText)) {
        const mcpCall = mcpClient.extractMcpCall(responseText);
        if (mcpCall) {
          // Add AI message with MCP call request
          const aiRequestMessage: ChatMessage = {
            role: "assistant",
            content: `I'll help you with that using ${mcpCall.tool}.`,
            timestamp: Date.now()
          };
          
          setChatHistory(prevHistory => [...prevHistory, aiRequestMessage]);
          
          // Process the MCP call
          const mcpResponse = await mcpClient.processMcpCall(mcpCall);
          setMcpResult(mcpResponse);
          
          // Add MCP result message
          let resultMessage = "";
          
          if (mcpResponse.error) {
            resultMessage = `Error: ${mcpResponse.error.message}`;
          } else {
            resultMessage = JSON.stringify(mcpResponse.result, null, 2);
          }
          
          // Add a new AI message with the result
          const aiResultMessage: ChatMessage = {
            role: "assistant",
            content: resultMessage,
            timestamp: Date.now() + 1000,
            isMcpResult: true
          };
          
          setChatHistory(prevHistory => [...prevHistory, aiResultMessage]);
          
          return resultMessage;
        }
      }
      
      // Add AI response to chat history for normal responses
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
    mcpResult,
    availableModels,
    selectedModel,
    setSelectedModel,
    chatHistory,
    clearChatHistory
  };
};
