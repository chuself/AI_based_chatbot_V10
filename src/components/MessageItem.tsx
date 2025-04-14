
import React from "react";
import { cn } from "@/lib/utils";

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
  const formattedTime = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(message.timestamp);

  return (
    <div
      className={cn(
        "mb-3 flex",
        message.isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className="flex flex-col max-w-[85%]">
        <div
          className={cn(
            message.isUser 
              ? "message-bubble-user" 
              : "message-bubble-ai"
          )}
        >
          {message.isLoading ? (
            <div className="flex space-x-2 py-2">
              <div className="h-3 w-3 rounded-full bg-gemini-tertiary/60 animation-pulse"></div>
              <div className="h-3 w-3 rounded-full bg-gemini-secondary/60 animation-pulse delay-200"></div>
              <div className="h-3 w-3 rounded-full bg-gemini-primary/60 animation-pulse delay-400"></div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">
              {message.text}
            </div>
          )}
        </div>
        <span
          className={cn(
            "text-xs mt-1 text-gray-500",
            message.isUser ? "text-right" : "text-left"
          )}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
};

export default MessageItem;
