
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Settings, Mic, MicOff, Square, Volume2, VolumeX, RotateCcw, Brain, Globe, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MessageList from "@/components/MessageList";
import { useGemini } from "@/hooks/useGemini";
import { useSpeech } from "@/hooks/useSpeech";
import { useDataSync } from "@/hooks/useDataSync";
import { useIntegrationCommands } from "@/hooks/useIntegrationCommands";
import Header from "@/components/Header";
import LoadingDots from "@/components/LoadingDots";
import { useChatHistory } from "@/hooks/useChatHistory";

const Index = () => {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Hooks
  const { sendMessage, isLoading: geminiLoading, selectedModel } = useGemini();
  const { 
    isListening: isRecording, 
    isSpeaking: isPlaying, 
    transcript, 
    startListening: startRecording, 
    stopListening: stopRecording, 
    speak: togglePlayback,
    isAvailable: isSpeechEnabled 
  } = useSpeech();
  const { syncData, isLoading: syncLoading, refreshSync } = useDataSync();
  const { executeCommand } = useIntegrationCommands();
  const { 
    chatHistory: messages, 
    setChatHistory: addMessage, 
    clearChatHistory: clearMessages
  } = useChatHistory();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim() || geminiLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsTyping(true);

    console.log('📤 Sending message:', userMessage);

    // Add user message to chat
    const newUserMessage = {
      id: Date.now().toString(),
      content: userMessage,
      sender: 'user' as const,
      timestamp: new Date()
    };
    
    addMessage([...messages, newUserMessage]);

    try {
      // Send message to Gemini and get response
      const response = await sendMessage(userMessage);
      
      console.log('📥 Received response:', response);

      if (response) {
        // Add AI response to chat
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          content: response,
          sender: 'ai' as const,
          timestamp: new Date()
        };
        addMessage([...messages, newUserMessage, aiMessage]);
      } else {
        // Handle empty response
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          content: "I apologize, but I couldn't generate a response. Please try again.",
          sender: 'ai' as const,
          timestamp: new Date()
        };
        addMessage([...messages, newUserMessage, errorMessage]);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Add error message to chat
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, there was an error processing your message. Please try again.",
        sender: 'ai' as const,
        timestamp: new Date()
      };
      addMessage([...messages, newUserMessage, errorMessage]);

      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    clearMessages();
    toast({
      title: "Chat Cleared",
      description: "All messages have been removed from this session.",
    });
  };

  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-900 dark:to-indigo-900">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-300">Syncing your data...</p>
          </div>
        </div>
      </div>
    );
  }

  const isAnyLoading = geminiLoading || isTyping;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-900 dark:to-indigo-900">
      <Header />
      
      <div className="pt-16">
        <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-4rem)] flex flex-col">
          {/* Status Bar */}
          <div className="flex items-center justify-between mb-4 p-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg border border-white/20 dark:border-slate-700/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedModel || 'Gemini'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {syncData?.syncMetadata?.syncSource === 'cloud' ? 'Cloud Synced' : 'Local Only'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshSync}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/settings')}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          <Card className="flex-1 mb-4 glass-card border-white/20 dark:border-slate-700/20 overflow-hidden">
            <CardContent className="p-0 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4 max-w-md">
                      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Welcome to Your AI Assistant
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Start a conversation by typing a message or using voice input. 
                        I can help with tasks, answer questions, and work with your integrations.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <MessageList messages={messages} />
                    {isAnyLoading && (
                      <div className="flex justify-start mb-4">
                        <div className="glass-card max-w-[80%] p-3 rounded-lg border border-white/20 dark:border-slate-700/20">
                          <LoadingDots />
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>

          {/* Input Area */}
          <Card className="glass-card border-white/20 dark:border-slate-700/20">
            <CardContent className="p-4">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={isRecording ? "Listening..." : "Type your message..."}
                      className="flex-1 glass-input border-white/20 dark:border-slate-700/20"
                      disabled={geminiLoading || isRecording}
                    />
                    
                    {isSpeechEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMicToggle}
                        className={`glass-button ${isRecording ? 'bg-red-500/20 text-red-600 border-red-300' : ''}`}
                      >
                        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                    )}
                    
                    {messages.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearChat}
                        className="glass-button text-gray-600 dark:text-gray-400"
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || geminiLoading}
                  className="glass-button bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700"
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
