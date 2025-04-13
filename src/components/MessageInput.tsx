
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t border-gray-200 px-4 py-3 bg-white flex items-center">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Message"
        className="flex-1 mr-2 border-gray-300 focus-visible:ring-gemini-primary"
        disabled={isLoading}
      />
      <Button
        onClick={handleSendMessage}
        className="bg-gemini-primary hover:bg-gemini-secondary text-white p-2 rounded-full w-10 h-10 flex items-center justify-center"
        disabled={!message.trim() || isLoading}
      >
        <Send size={18} />
      </Button>
    </div>
  );
};

export default MessageInput;
