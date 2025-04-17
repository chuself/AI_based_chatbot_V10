import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, MicOff, BookOpen, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Use a simpler approach for SpeechRecognition types
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: {
    [index: number]: {
      transcript: string;
    };
  };
}

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

interface MemoryReference {
  id: string;
  userInput: string;
  assistantReply: string;
  timestamp: number;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognitionInstance | null>(null);
  const [memoryReference, setMemoryReference] = useState<MemoryReference | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedMemoryRef = sessionStorage.getItem('memory-reference');
    if (savedMemoryRef) {
      try {
        const parsedMemory = JSON.parse(savedMemoryRef) as MemoryReference;
        setMemoryReference(parsedMemory);
        sessionStorage.removeItem('memory-reference');
      } catch (e) {
        console.error("Failed to parse memory reference:", e);
      }
    }
  }, []);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognitionConstructor() as SpeechRecognitionInstance;
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
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

  const handleUseMemoryReference = () => {
    if (memoryReference) {
      const referenceText = `Regarding our previous conversation (ID: ${memoryReference.id}) where I asked "${memoryReference.userInput}" and you replied "${memoryReference.assistantReply}", I want to follow up: `;
      setMessage(referenceText);
    }
  };

  const clearMemoryReference = () => {
    setMemoryReference(null);
  };

  const handleSendMessage = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage("");
      setMemoryReference(null);
      
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
    <div className="border-t border-gray-200 px-4 py-3 bg-white">
      {memoryReference && (
        <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <BookOpen size={16} className="text-purple-600 mr-2" />
            <span className="text-sm text-purple-700 truncate">
              Using memory reference: {new Date(memoryReference.timestamp).toLocaleDateString()}
            </span>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleUseMemoryReference}
              className="text-xs text-purple-700 hover:bg-purple-100"
            >
              Insert
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearMemoryReference}
              className="text-gray-500 hover:bg-gray-100"
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex items-center">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={isRecording ? "Listening..." : memoryReference ? "Continue the conversation about this memory..." : "Message"}
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
    </div>
  );
};

export default MessageInput;
