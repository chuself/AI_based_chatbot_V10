
import React, { useEffect, useRef, useState } from "react";
import MessageItem, { Message } from "./MessageItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

interface MessageListProps {
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Setup scroll event listener to detect when user has scrolled up
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = scrollArea;
      // Show button if not at bottom (with small tolerance for rounding errors)
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
      setShowScrollButton(!isAtBottom);
    };

    scrollArea.addEventListener("scroll", handleScroll);
    return () => {
      scrollArea.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="flex-1 relative h-full">
      <ScrollArea className="h-full" scrollHideDelay={0}>
        <div 
          className="px-4 py-4 space-y-2" 
          ref={scrollAreaRef}
          style={{ minHeight: "100%" }}
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Start a conversation
            </div>
          ) : (
            messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {showScrollButton && (
        <Button
          className="absolute bottom-4 right-4 rounded-full w-10 h-10 p-0 bg-gemini-primary hover:bg-gemini-secondary"
          onClick={() => scrollToBottom()}
        >
          <ArrowDown size={18} />
        </Button>
      )}
    </div>
  );
};

export default MessageList;
