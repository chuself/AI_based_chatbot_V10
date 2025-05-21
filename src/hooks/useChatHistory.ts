
import { useState, useEffect } from "react";
import { syncChatHistory, fetchChatHistory } from "@/services/supabaseService";

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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        // First try to load from Supabase
        const cloudHistory = await fetchChatHistory();
        
        if (cloudHistory && cloudHistory.length > 0) {
          console.info(`Loaded chat history from cloud: ${cloudHistory.length} messages`);
          setChatHistory(cloudHistory);
        } else {
          // Fall back to local storage if cloud fetch fails or returns empty
          const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (storedHistory) {
            try {
              const parsedHistory = JSON.parse(storedHistory) as ChatMessage[];
              setChatHistory(parsedHistory);
              console.info(`Loaded chat history from localStorage: ${parsedHistory.length} messages`);
              
              // Sync the local history to cloud
              syncChatHistory(parsedHistory).then(success => {
                if (success) {
                  console.info("Successfully synced local chat history to cloud");
                }
              });
            } catch (error) {
              console.error("Failed to parse chat history from localStorage:", error);
              localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
          }
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadChatHistory();
  }, []);

  // Save to both localStorage and cloud when history changes
  useEffect(() => {
    if (chatHistory.length > 0 && !isInitialLoad) {
      // Always save to localStorage for offline access
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatHistory));
      
      // Sync with cloud
      syncChatHistory(chatHistory).then(success => {
        if (!success) {
          console.warn("Failed to sync chat history with cloud. Changes saved locally only.");
        }
      });
    }
  }, [chatHistory, isInitialLoad]);

  const clearChatHistory = () => {
    setChatHistory([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    
    // Also clear from cloud
    syncChatHistory([]).catch(error => {
      console.error("Failed to clear chat history in cloud:", error);
    });
  };

  return {
    chatHistory,
    setChatHistory,
    clearChatHistory
  };
};
