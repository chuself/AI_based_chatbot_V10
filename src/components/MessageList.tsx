
import React, { useEffect, useRef, useState } from "react";
import MessageItem from "./MessageItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { ChatMessage } from "@/hooks/useChatHistory";

interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  onRegenerateResponse?: (message: ChatMessage) => void;
  onCopyMessage?: (message: ChatMessage) => void;
  onDeleteMessage?: (message: ChatMessage) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isLoading = false,
  onRegenerateResponse,
  onCopyMessage,
  onDeleteMessage
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll to bottom when new messages arrive - optimized
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]); // Only trigger on length change, not content change

  // Setup scroll event listener - debounced
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const { scrollHeight, scrollTop, clientHeight } = scrollArea;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setShowScrollButton(!isAtBottom);
      }, 100);
    };

    scrollArea.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollArea.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="flex-1 relative h-full">
      <ScrollArea className="h-full" scrollHideDelay={0}>
        <div 
          className="px-4 py-4 space-y-3" 
          ref={scrollAreaRef}
          style={{ minHeight: "100%" }}
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Start a conversation
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageItem 
                key={`${message.timestamp}-${index}`} 
                message={message} 
              />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[80%] p-3 rounded-lg border bg-gray-50 dark:bg-gray-800">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {showScrollButton && (
        <Button
          className="absolute bottom-4 right-4 rounded-full w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          onClick={() => scrollToBottom()}
        >
          <ArrowDown size={16} />
        </Button>
      )}
    </div>
  );
};

export default MessageList;
