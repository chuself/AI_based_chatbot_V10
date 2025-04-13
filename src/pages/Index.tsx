
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import { Message } from "@/components/MessageItem";
import { useGemini } from "@/hooks/useGemini";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { sendMessage, isLoading, error, selectedModel } = useGemini();
  const { toast } = useToast();
  
  // Display a welcome message when the app first loads
  useEffect(() => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: "👋 Hi! I'm your Gemini AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    };
    
    setMessages([welcomeMessage]);
  }, []);

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

  const handleSendMessage = async (text: string) => {
    // Add user message to the chat
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Get response from Gemini API
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

  return (
    <div className="flex flex-col h-screen bg-gemini-background">
      <Header modelName={selectedModel} />
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
