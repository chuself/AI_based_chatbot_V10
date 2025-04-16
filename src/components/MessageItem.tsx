
import React, { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bot, User, Volume2, VolumeX } from "lucide-react";
import LoadingDots from "./LoadingDots";
import { Button } from "./ui/button";
import { useSpeech } from "@/hooks/useSpeech";

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
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
    if (!message.isUser && !message.isLoading && (autoPlaySpeech || autoPlay) && message.text) {
      speak(message.text);
    }
    
    return () => {
      if (isSpeaking) {
        stop();
      }
    };
  }, [message.text, message.isLoading, message.isUser, autoPlaySpeech, autoPlay]);

  const handlePlaySpeech = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(message.text);
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
              : "bg-white border-gray-200 text-gray-800"
          )}>
            {message.isLoading ? (
              <div className="p-2 min-w-[60px] flex items-center justify-center">
                <LoadingDots className="py-2" />
              </div>
            ) : (
              <>
                <div className="whitespace-pre-wrap">{message.text}</div>
                
                {/* Speech Controls - Only show for AI messages */}
                {!message.isUser && (
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
