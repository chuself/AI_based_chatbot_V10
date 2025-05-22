
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
  const [loadedFromCloud, setLoadedFromCloud] = useState(false);
  const { user } = useContext(SupabaseContext);

  // Load chat history on mount or when user changes
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        // Only try to load from Supabase if the user is logged in
        if (user) {
          console.log("Fetching chat history from Supabase");
          const cloudHistory = await fetchChatHistory();
          
          if (cloudHistory && cloudHistory.length > 0) {
            console.info(`Loaded chat history from cloud: ${cloudHistory.length} messages`);
            setChatHistory(cloudHistory);
            setLoadedFromCloud(true);
            
            // Save to localStorage as backup
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudHistory));
          } else {
            console.info("No cloud history found, loading from local storage");
            // Fall back to local storage if cloud fetch fails or returns empty
            loadFromLocalStorage();
          }
        } else {
          console.info("Not logged in, loading from local storage only");
          // User is not logged in, load from local storage only
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
        loadFromLocalStorage();
      } finally {
        setIsInitialLoad(false);
      }
    };

    const loadFromLocalStorage = () => {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedHistory) {
        try {
          const parsedHistory = JSON.parse(storedHistory) as ChatMessage[];
          setChatHistory(parsedHistory);
          console.info(`Loaded chat history from localStorage: ${parsedHistory.length} messages`);
        } catch (error) {
          console.error("Failed to parse chat history from localStorage:", error);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setChatHistory([]);
        }
      } else {
        setChatHistory([]);
      }
    };

    loadChatHistory();
  }, [user]);

  // Save to both localStorage and cloud when history changes
  useEffect(() => {
    if (chatHistory.length > 0 && !isInitialLoad) {
      console.log("Saving chat history", { length: chatHistory.length, isLoggedIn: !!user });
      
      // Always save to localStorage for offline access
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatHistory));
      
      // Sync with cloud if user is logged in
      if (user) {
        console.log("Syncing chat history with cloud");
        syncChatHistory(chatHistory).then(success => {
          if (!success) {
            console.warn("Failed to sync chat history with cloud. Changes saved locally only.");
          } else {
            console.log("Successfully synced chat history with cloud");
          }
        });
      }
    }
  }, [chatHistory, isInitialLoad, user]);

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
    clearChatHistory,
    loadedFromCloud
  };
};
