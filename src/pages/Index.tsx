
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import { Message } from "@/components/MessageItem";
import { useGemini, ChatMessage } from "@/hooks/useGemini";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { App } from '@capacitor/app';
import { checkGoogleConnection, getEmails, getCalendarEvents, getDriveFiles, createCalendarEvent } from "@/utils/googleService";

const LOCAL_STORAGE_API_KEY = "gemini-api-key";
const LOCAL_STORAGE_MODEL_CONFIG = "ai-model-config";

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { sendMessage, isLoading, error, selectedModel, chatHistory, clearChatHistory } = useGemini();
  const { toast } = useToast();
  const [googleConnected, setGoogleConnected] = useState(false);
  
  // Check if Google services are connected
  useEffect(() => {
    const googleStatus = checkGoogleConnection();
    setGoogleConnected(googleStatus.gmail || googleStatus.calendar || googleStatus.drive);
  }, []);
  
  useEffect(() => {
    const backButtonHandler = App.addListener('backButton', (data) => {
      if (window.location.pathname === '/') {
        App.exitApp();
      }
    });

    return () => {
      backButtonHandler.then(listener => {
        listener.remove();
      }).catch(error => {
        console.error('Error with back button handler:', error);
      });
    };
  }, []);
  
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
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: "👋 Hi! I'm your Chuself AI assistant. How can I help you today?",
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
    }
  }, [chatHistory]);
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  useEffect(() => {
    if (selectedModel) {
      const modelName = selectedModel.split("/").pop();
      toast({
        title: "Model Selected",
        description: `Using model: ${modelName}`,
      });
    }
  }, [selectedModel, toast]);
  
  useEffect(() => {
    if (!localStorage.getItem(LOCAL_STORAGE_API_KEY)) {
      localStorage.setItem(LOCAL_STORAGE_API_KEY, "AIzaSyDApo1EqSX0Mq3ZePA9OM_yD0hnmoz_s-Q");
    }
  }, []);

  // Helper function to detect Google service requests
  const detectServiceRequest = (text: string) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("email") || lowerText.includes("gmail") || lowerText.includes("inbox") || 
        lowerText.includes("message") || lowerText.includes("mail")) {
      return "gmail";
    }
    
    if (lowerText.includes("calendar") || lowerText.includes("schedule") || lowerText.includes("meeting") || 
        lowerText.includes("event") || lowerText.includes("appointment")) {
      return "calendar";
    }
    
    if (lowerText.includes("drive") || lowerText.includes("file") || lowerText.includes("document") || 
        lowerText.includes("upload") || lowerText.includes("folder")) {
      return "drive";
    }
    
    return null;
  };
  
  // Handler for Gmail requests
  const handleEmailRequest = async (query: string) => {
    try {
      const emails = await getEmails(5);
      return `Here are your recent emails:\n\n${emails.map(email => 
        `From: ${email.sender}\nSubject: ${email.subject}\nDate: ${new Date(email.date).toLocaleString()}\n${email.snippet}\n\n`
      ).join('---\n\n')}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'Could not access your emails'}. Please connect your Gmail account in Settings.`;
    }
  };
  
  // Handler for Calendar requests
  const handleCalendarRequest = async (query: string) => {
    try {
      const events = await getCalendarEvents(7);
      return `Here are your upcoming events:\n\n${events.map(event => 
        `${event.title}\nWhen: ${new Date(event.start).toLocaleString()} to ${new Date(event.end).toLocaleString()}\nWhere: ${event.location}\n\n`
      ).join('---\n\n')}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'Could not access your calendar'}. Please connect your Google Calendar in Settings.`;
    }
  };
  
  // Handler for Drive requests
  const handleDriveRequest = async (query: string) => {
    try {
      const files = await getDriveFiles(query);
      return `Here are your files:\n\n${files.map(file => 
        `${file.name}\nType: ${file.mimeType}\nLast modified: ${new Date(file.lastModified).toLocaleString()}\n\n`
      ).join('---\n\n')}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'Could not access your files'}. Please connect your Google Drive in Settings.`;
    }
  };
  
  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    const loadingMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = {
      id: loadingMessageId,
      text: "",
      isUser: false,
      timestamp: new Date(),
      isLoading: true,
    };
    
    setMessages((prevMessages) => [...prevMessages, loadingMessage]);

    // Check if this is a request for a Google service
    const serviceType = detectServiceRequest(text);
    let response;
    
    if (googleConnected && serviceType) {
      // Handle service-specific requests
      switch(serviceType) {
        case "gmail":
          response = await handleEmailRequest(text);
          break;
        case "calendar":
          response = await handleCalendarRequest(text);
          break;
        case "drive":
          response = await handleDriveRequest(text);
          break;
        default:
          response = await sendMessage(text);
      }
    } else {
      // Use the regular AI model for responses
      response = await sendMessage(text);
    }
    
    setMessages((prevMessages) => 
      prevMessages
        .filter(msg => msg.id !== loadingMessageId)
        .concat({
          id: (Date.now() + 2).toString(),
          text: response,
          isUser: false,
          timestamp: new Date(),
        })
    );
  };

  const handleClearChat = () => {
    clearChatHistory();
    
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
    <div className="flex flex-col h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-indigo-50 overscroll-none">
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
      
      <div className="fixed bottom-0 left-0 right-0 w-full">
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Index;
