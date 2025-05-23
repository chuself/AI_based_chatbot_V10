
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import Header from "@/components/Header";
import MemorySearch from "@/components/MemorySearch";
import { ChatMessage, useChatHistory } from "@/hooks/useChatHistory";
import { useGeminiConfig } from "@/hooks/useGeminiConfig";
import { useToast } from "@/hooks/use-toast";
import { SupabaseContext } from "@/App";
import { useSettingsSync } from "@/hooks/useSettingsSync";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useContext(SupabaseContext);
  const { toast } = useToast();
  
  // Initialize settings sync
  const { settings, isLoading: settingsLoading, updateModelSettings } = useSettingsSync();
  
  // State for UI - always start with empty messages for clean interface
  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);
  const [isMemorySearchOpen, setIsMemorySearchOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Hooks
  const { modelConfig } = useGeminiConfig();
  const { 
    messages: backgroundMessages, 
    addMessage, 
    clearMessages,
    isLoading: historyLoading,
    syncToCloud: syncHistoryToCloud
  } = useChatHistory();

  // Initialize app when user logs in
  useEffect(() => {
    const initializeApp = async () => {
      if (!user || isInitialized || settingsLoading) return;
      
      try {
        console.log('Initializing app for user login...');
        
        // Reset display to show clean interface
        setDisplayMessages([]);
        
        // Show loading message briefly
        toast({
          title: "Welcome back!",
          description: "Loading your settings and data...",
        });
        
        // Wait for settings to be loaded
        if (settings && Object.keys(settings).length > 0) {
          console.log('Settings loaded:', Object.keys(settings));
          
          // Update model config if available in settings
          if (settings.model) {
            console.log('Updating model config from synced settings');
          }
          
          setIsInitialized(true);
          
          toast({
            title: "Ready to chat!",
            description: "Your settings and data have been synchronized.",
          });
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        toast({
          title: "Initialization Error",
          description: "Some settings may not have loaded properly.",
          variant: "destructive"
        });
      }
    };

    initializeApp();
  }, [user, settings, settingsLoading, isInitialized, toast]);

  // Handle logout - redirect to auth
  useEffect(() => {
    if (!user && isInitialized) {
      console.log('User logged out, redirecting...');
      navigate("/auth");
    }
  }, [user, navigate, isInitialized]);

  const handleSendMessage = async (message: string) => {
    try {
      // Add user message to both display and background
      const userMessage: ChatMessage = {
        role: "user",
        content: message,
        timestamp: Date.now()
      };
      
      setDisplayMessages(prev => [...prev, userMessage]);
      addMessage(userMessage);

      // Here you would integrate with your AI service
      // For now, adding a placeholder response
      const assistantMessage: ChatMessage = {
        role: "assistant", 
        content: "I'm processing your message. (This will be replaced with actual AI response)",
        timestamp: Date.now()
      };
      
      setDisplayMessages(prev => [...prev, assistantMessage]);
      addMessage(assistantMessage);
      
      // Sync to cloud in background
      await syncHistoryToCloud();
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleNewChat = () => {
    setDisplayMessages([]);
    // Note: We don't clear backgroundMessages to maintain history for AI reference
    toast({
      title: "New Chat Started",
      description: "Previous conversation is saved in background for context.",
    });
  };

  // Show loading state while settings are being loaded
  if (settingsLoading || !isInitialized) {
    return (
      <div className="flex h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-indigo-50">
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-purple-600">Loading your settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-indigo-50">
      <div className="flex flex-col w-full">
        <Header 
          modelName={modelConfig?.modelName?.split('/').pop()} 
          onNewChat={handleNewChat}
        />
        
        <div className="flex-1 flex flex-col pt-16 pb-20">
          <MessageList 
            messages={displayMessages}
            isLoading={historyLoading}
          />
          <MessageInput 
            onSendMessage={handleSendMessage}
            disabled={historyLoading}
          />
        </div>

        <MemorySearch
          isOpen={isMemorySearchOpen}
          onClose={() => setIsMemorySearchOpen(false)}
        />
      </div>
    </div>
  );
};

export default Index;
