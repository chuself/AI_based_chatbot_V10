
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Using the global type definition from src/types/speechRecognition.d.ts
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        
        setMessage(transcript);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
        toast({
          title: "Voice Recognition Error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive",
        });
      };
      
      recognitionInstance.onend = () => {
        setIsRecording(false);
      };
      
      setRecognition(recognitionInstance);
    }
    
    return () => {
      if (recognition) {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      toast({
        title: "Voice Recognition Not Available",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setMessage("");
      recognition.start();
      setIsRecording(true);
      
      toast({
        title: "Listening...",
        description: "Speak now. Recording will automatically stop after you pause.",
      });
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
      
      if (isRecording && recognition) {
        recognition.stop();
        setIsRecording(false);
      }
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
        placeholder={isRecording ? "Listening..." : "Message"}
        className="flex-1 mr-2 border-gray-300 focus-visible:ring-gemini-primary"
        disabled={isLoading}
      />
      
      <Button
        onClick={toggleRecording}
        className={`mr-2 p-2 rounded-full w-10 h-10 flex items-center justify-center ${
          isRecording 
            ? "bg-red-500 hover:bg-red-600 text-white" 
            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
        }`}
        type="button"
        disabled={isLoading}
      >
        {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
      </Button>
      
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
