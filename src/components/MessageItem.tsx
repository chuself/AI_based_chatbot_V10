
import React from "react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
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
        "mb-2 flex",
        message.isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className="flex flex-col">
        <div
          className={cn(
            message.isUser ? "message-bubble-user" : "message-bubble-ai"
          )}
        >
          <p className="text-base">{message.text}</p>
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
