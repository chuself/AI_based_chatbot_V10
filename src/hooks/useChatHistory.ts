import { useState, useEffect, useContext } from "react";
import { syncChatHistory, fetchChatHistory } from "@/services/supabaseService";
import { SupabaseContext } from "@/App";

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
  const { user } = useContext(SupabaseContext);

  // Load chat history on mount or when user changes
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        // Always start with local storage to prevent chat loss
        const localHistory = loadFromLocalStorage();
        
        if (localHistory.length > 0) {
          setChatHistory(localHistory);
          console.info(`Loaded chat history from localStorage: ${localHistory.length} messages`);
        }

        // If user is logged in, try to sync with cloud
        if (user) {
          console.log("Fetching chat history from Supabase");
          const cloudHistory = await fetchChatHistory();
          
          if (cloudHistory && cloudHistory.length > 0) {
            // Only update if cloud has more recent data
            const localTimestamp = localHistory.length > 0 ? localHistory[localHistory.length - 1].timestamp : 0;
            const cloudTimestamp = cloudHistory.length > 0 ? cloudHistory[cloudHistory.length - 1].timestamp : 0;
            
            if (cloudTimestamp > localTimestamp) {
              console.info(`Loaded newer chat history from cloud: ${cloudHistory.length} messages`);
              setChatHistory(cloudHistory);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudHistory));
            }
          }
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
        // Keep local data if cloud fails
        const localHistory = loadFromLocalStorage();
        if (localHistory.length > 0) {
          setChatHistory(localHistory);
        }
      } finally {
        setIsInitialLoad(false);
      }
    };

    const loadFromLocalStorage = (): ChatMessage[] => {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedHistory) {
        try {
          const parsedHistory = JSON.parse(storedHistory) as ChatMessage[];
          // Deduplicate messages based on timestamp and content
          const uniqueHistory = parsedHistory.filter((message, index, arr) => 
            index === arr.findIndex(m => 
              m.timestamp === message.timestamp && 
              m.content === message.content && 
              m.role === message.role
            )
          );
          return uniqueHistory;
        } catch (error) {
          console.error("Failed to parse chat history from localStorage:", error);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      }
      return [];
    };

    loadChatHistory();
  }, [user?.id]); // Only reload when user ID changes, not on every navigation

  // Save to both localStorage and cloud when history changes
  useEffect(() => {
    if (chatHistory.length > 0 && !isInitialLoad) {
      console.log("Saving chat history", { length: chatHistory.length, isLoggedIn: !!user });
      
      // Always save to localStorage immediately for offline access
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatHistory));
      
      // Sync with cloud if user is logged in (but don't block on it)
      if (user) {
        console.log("Syncing chat history with cloud");
        syncChatHistory(chatHistory).then(success => {
          if (!success) {
            console.warn("Failed to sync chat history with cloud. Changes saved locally only.");
          } else {
            console.log("Successfully synced chat history with cloud");
          }
        }).catch(error => {
          console.error("Error syncing chat history:", error);
        });
      }
    }
  }, [chatHistory, isInitialLoad, user?.id]);

  const clearChatHistory = () => {
    setChatHistory([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    
    // Also clear from cloud if user is logged in
    if (user) {
      syncChatHistory([]).catch(error => {
        console.error("Failed to clear chat history in cloud:", error);
      });
    }
  };

  return {
    chatHistory,
    setChatHistory,
    clearChatHistory
  };
};
