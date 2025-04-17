
import React, { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bot, User, Volume2, VolumeX, Mail } from "lucide-react";
import LoadingDots from "./LoadingDots";
import { Button } from "./ui/button";
import { useSpeech } from "@/hooks/useSpeech";

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  isMcpResult?: boolean;
}

interface MessageItemProps {
  message: Message;
  autoPlaySpeech?: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, autoPlaySpeech = false }) => {
  const { speak, stop, isSpeaking, autoPlay } = useSpeech();
  
  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Auto-play text if it's an AI message and autoPlay is enabled
  useEffect(() => {
    if (!message.isUser && !message.isLoading && (autoPlaySpeech || autoPlay) && message.text && !message.isMcpResult) {
      speak(message.text);
    }
    
    return () => {
      if (isSpeaking) {
        stop();
      }
    };
  }, [message.text, message.isLoading, message.isUser, autoPlaySpeech, autoPlay, message.isMcpResult]);

  const handlePlaySpeech = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(message.text);
    }
  };

  // Check if the message appears to be a JSON string from MCP result
  const isMcpJsonResult = !message.isUser && message.isMcpResult && message.text.trim().startsWith('{');

  // Render MCP JSON result with formatting
  const renderMcpResult = () => {
    try {
      // Check if it starts with "Error:"
      if (message.text.startsWith('Error:')) {
        return (
          <div className="text-red-400">
            <p className="font-medium">{message.text}</p>
          </div>
        );
      }
      
      // Try to parse and pretty print the JSON
      const jsonData = JSON.parse(message.text);
      
      // Determine if it looks like Gmail data
      const isGmailData = jsonData && 
        (Array.isArray(jsonData.messages) || 
         jsonData.threadId || 
         jsonData.id && jsonData.labelIds);
      
      if (isGmailData) {
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-white/10">
              <Mail className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-400">Gmail Data</span>
            </div>
            {Array.isArray(jsonData.messages) ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">Found {jsonData.messages.length} emails</p>
                {jsonData.messages.map((msg: any, index: number) => (
                  <div key={index} className="p-2 bg-white/5 rounded-lg">
                    <p className="font-medium">{msg.subject || 'No Subject'}</p>
                    <p className="text-xs text-gray-400">From: {msg.from || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">Date: {new Date(msg.date || Date.now()).toLocaleString()}</p>
                    {msg.snippet && <p className="mt-1 text-sm">{msg.snippet}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <pre className="bg-white/5 p-2 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            )}
          </div>
        );
      }
      
      // Generic JSON display
      return (
        <pre className="bg-white/5 p-2 rounded-lg overflow-x-auto text-xs">
          {JSON.stringify(jsonData, null, 2)}
        </pre>
      );
    } catch (e) {
      // If parsing fails, just render the text
      return <div className="whitespace-pre-wrap">{message.text}</div>;
    }
  };

  return (
    <div className={cn(
      "flex w-full mb-4", 
      message.isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex max-w-[80%] md:max-w-[70%]", 
        message.isUser ? "flex-row-reverse" : "flex-row"
      )}>
        <Avatar className={cn(
          "h-8 w-8 mt-1", 
          message.isUser ? "ml-2" : "mr-2"
        )}>
          <AvatarFallback>
            {message.isUser ? <User size={14} /> : <Bot size={14} />}
          </AvatarFallback>
          <AvatarImage src={message.isUser ? "/user-avatar.png" : "/bot-avatar.png"} />
        </Avatar>
        
        <div>
          <Card className={cn(
            "px-4 py-3 mb-1 relative group",
            message.isUser 
              ? "bg-gemini-primary text-white" 
              : "bg-white border-gray-200 text-gray-800",
            message.isMcpResult ? "bg-slate-800 text-white border-blue-500/30" : ""
          )}>
            {message.isLoading ? (
              <div className="p-4 min-w-[120px] flex items-center justify-center">
                <LoadingDots className="scale-150 opacity-100" />
              </div>
            ) : (
              <>
                {isMcpJsonResult ? renderMcpResult() : (
                  <div className="whitespace-pre-wrap">{message.text}</div>
                )}
                
                {/* Speech Controls - Only show for AI messages that aren't MCP results */}
                {!message.isUser && !message.isMcpResult && (
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6" 
                      onClick={handlePlaySpeech}
                    >
                      {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
          
          <div className={cn(
            "text-xs text-gray-500 flex items-center",
            message.isUser ? "justify-end" : "justify-start"
          )}>
            <span>{formatTimestamp(message.timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
