
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import LoadingDots from "./LoadingDots";

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
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
            "px-4 py-3 mb-1",
            message.isUser 
              ? "bg-gemini-primary text-white" 
              : "bg-white border-gray-200 text-gray-800"
          )}>
            {message.isLoading ? (
              <div className="p-2 min-w-[60px] flex items-center justify-center">
                <LoadingDots className="py-2" />
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{message.text}</div>
            )}
          </Card>
          
          <div className={cn(
            "text-xs text-gray-500",
            message.isUser ? "text-right" : "text-left"
          )}>
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
