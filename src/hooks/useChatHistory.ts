
import { useState, useEffect } from "react";

// Local storage keys
export const LOCAL_STORAGE_CHAT_HISTORY = "gemini-chat-history";

// Maximum number of chat history messages to maintain (to avoid token limits)
export const MAX_HISTORY_LENGTH = 10;

// Type definitions for better type safety
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export const useChatHistory = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

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

  return {
    chatHistory,
    setChatHistory,
    clearChatHistory,
  };
};
