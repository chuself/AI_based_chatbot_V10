
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import { Message } from "@/components/MessageItem";
import { useGemini, ChatMessage } from "@/hooks/useGemini";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const LOCAL_STORAGE_API_KEY = "gemini-api-key";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { sendMessage, isLoading, error, selectedModel, chatHistory, clearChatHistory } = useGemini();
  const { toast } = useToast();
  
  // Convert chat history from the hook to the message format used by components
  useEffect(() => {
    if (chatHistory.length > 0) {
      const convertedMessages = chatHistory.map((msg: ChatMessage) => ({
        id: msg.timestamp.toString(),
        text: msg.content,
        isUser: msg.role === "user",
        timestamp: new Date(msg.timestamp),
      }));
      
      setMessages(convertedMessages);
    } else if (messages.length === 0) {
      // Display welcome message only if there's no chat history
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: "👋 Hi! I'm your Gemini AI assistant. How can I help you today?",
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
    }
  }, [chatHistory]);

  // Show error toast when API error occurs
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Show toast when model is selected
  useEffect(() => {
    if (selectedModel) {
      const modelName = selectedModel.split("/").pop();
      toast({
        title: "Model Selected",
        description: `Using model: ${modelName}`,
      });
    }
  }, [selectedModel, toast]);

  // Initialize API key in localStorage if not present
  useEffect(() => {
    if (!localStorage.getItem(LOCAL_STORAGE_API_KEY)) {
      localStorage.setItem(LOCAL_STORAGE_API_KEY, "AIzaSyDApo1EqSX0Mq3ZePA9OM_yD0hnmoz_s-Q");
    }
  }, []);

  const handleSendMessage = async (text: string) => {
    // Add user message to the chat immediately for UI feedback
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Get response from Gemini API - this will also update chatHistory in the hook
    const response = await sendMessage(text);
    
    // Add AI response to the chat
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: response,
      isUser: false,
      timestamp: new Date(),
    };
    
    setMessages((prevMessages) => [...prevMessages, aiMessage]);
  };

  const handleClearChat = () => {
    clearChatHistory();
    
    // Add a new welcome message
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: "Chat history cleared. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    };
    
    setMessages([welcomeMessage]);
    
    toast({
      title: "Chat Cleared",
      description: "Your conversation history has been cleared.",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gemini-background">
      <Header modelName={selectedModel} />
      
      <div className="fixed top-16 right-4 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClearChat}
          className="bg-white/80 hover:bg-white border border-gray-200"
          title="Clear chat history"
        >
          <Trash2 className="h-4 w-4 text-gray-500" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden pt-16 pb-16">
        <MessageList messages={messages} />
      </div>
      
      <div className="fixed bottom-0 left-0 right-0">
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Index;
