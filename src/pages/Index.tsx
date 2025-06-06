
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Settings, Mic, MicOff, Square, RotateCcw, Brain, Globe, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MessageList from "@/components/MessageList";
import { useGemini } from "@/hooks/useGemini";
import { useSpeech } from "@/hooks/useSpeech";
import { useDataSync } from "@/hooks/useDataSync";
import Header from "@/components/Header";

const Index = () => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Hooks - simplified to avoid duplicate calls
  const { sendMessage, isLoading: geminiLoading, selectedModel, chatHistory, clearChatHistory } = useGemini();
  const { 
    speak: togglePlayback,
    isSpeaking: isPlaying,
    isVoiceSupported: isSpeechEnabled 
  } = useSpeech();
  const { syncData, isLoading: syncLoading, refreshSync } = useDataSync();

  // Voice recognition state (simplified)
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [chatHistory]);

  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const handleSend = async () => {
    if (!input.trim() || geminiLoading) return;

    const userMessage = input.trim();
    setInput("");

    try {
      // Send message directly to Gemini - it handles chat history internally
      await sendMessage(userMessage);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    clearChatHistory();
    toast({
      title: "Chat Cleared",
      description: "All messages have been removed from this session.",
    });
  };

  const handleMicToggle = () => {
    setIsRecording(!isRecording);
  };

  const handleRefreshSync = async () => {
    try {
      await refreshSync();
      toast({
        title: "Sync Refreshed",
        description: "Your data has been synchronized.",
      });
    } catch (error) {
      toast({
        title: "Sync Error",
        description: "Failed to refresh sync. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show loading spinner during initial sync
  if (syncLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-300">Syncing your data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      <div className="pt-16">
        <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-4rem)] flex flex-col">
          {/* Status Bar - Clean and minimal */}
          <div className="mb-2 opacity-60 hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center justify-between p-2 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Brain className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {selectedModel || 'No Model'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {syncData?.syncMetadata?.syncSource === 'cloud' ? 'Cloud' : 'Local'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshSync}
                  className="h-6 w-6 p-0"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/settings')}
                  className="h-6 w-6 p-0"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Chat Messages - Minimal design */}
          <Card className="flex-1 mb-4 border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {chatHistory.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4 max-w-md p-8">
                      <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Start a conversation
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Type a message to begin chatting with your AI assistant.
                      </p>
                    </div>
                  </div>
                ) : (
                  <MessageList messages={chatHistory} isLoading={geminiLoading} />
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>

          {/* Input Area - Clean design */}
          <Card className="border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRecording ? "Listening..." : "Type your message..."}
                  className="flex-1 border-slate-200 dark:border-slate-600"
                  disabled={geminiLoading || isRecording}
                />
                
                {isSpeechEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMicToggle}
                    className={isRecording ? 'bg-red-50 text-red-600 border-red-200' : ''}
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
                
                {chatHistory.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearChat}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || geminiLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
