
import { useState, useEffect } from "react";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isMcpResult?: boolean;
}

// Add MAX_HISTORY_LENGTH as an exported constant
export const MAX_HISTORY_LENGTH = 50;

const LOCAL_STORAGE_KEY = "chat-history";

export const useChatHistory = () => {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const loadChatHistory = () => {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedHistory) {
        try {
          const parsedHistory = JSON.parse(storedHistory) as ChatMessage[];
          setChatHistory(parsedHistory);
          console.info(`Loaded chat history from localStorage: ${parsedHistory.length} messages`);
        } catch (error) {
          console.error("Failed to parse chat history from localStorage:", error);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      }
    };

    loadChatHistory();
  }, []);

  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  const clearChatHistory = () => {
    setChatHistory([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  return {
    chatHistory,
    setChatHistory,
    clearChatHistory
  };
};
