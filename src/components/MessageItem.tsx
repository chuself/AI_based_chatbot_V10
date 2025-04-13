
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

  // Split text by newlines and render each line
  const textLines = message.text.split("\n");

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
            "rounded-lg px-3 py-2",
            message.isUser ? "bg-gemini-primary text-white" : "bg-white shadow-sm"
          )}
        >
          {textLines.map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < textLines.length - 1 && <br />}
            </React.Fragment>
          ))}
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
