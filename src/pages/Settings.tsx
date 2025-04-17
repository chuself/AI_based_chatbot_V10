import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Command, 
  Brain, 
  Search, 
  Trash2, 
  Volume2, 
  Settings as SettingsIcon,
  Cpu,
  Globe
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGemini } from "@/hooks/useGemini";
import ModelSettings from "@/components/ModelSettings";
import GoogleIntegration from "@/components/GoogleIntegration";
import MemoryViewer from "@/components/MemoryViewer";
import MemorySearch from "@/components/MemorySearch";
import SpeechSettings from "@/components/SpeechSettings";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

const Settings = () => {
  const [isMemoryViewerOpen, setIsMemoryViewerOpen] = useState(false);
  const [isMemorySearchOpen, setIsMemorySearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clearChatHistory } = useGemini();

  const handleGoBack = () => {
    navigate("/");
  };

  const navigateToCommands = () => {
    navigate("/commands");
  };

  const navigateToMemories = () => {
    navigate("/memories");
  };

  const handleClearChat = () => {
    clearChatHistory();
    
    toast({
      title: "Chat Cleared",
      description: "Your conversation history has been cleared.",
    });
  };

  const tabs = [
    { id: "general", label: "General", icon: <SettingsIcon className="h-5 w-5" /> },
    { id: "models", label: "Models", icon: <Cpu className="h-5 w-5" /> },
    { id: "speech", label: "Speech", icon: <Volume2 className="h-5 w-5" /> },
    { id: "integrations", label: "Integrations", icon: <Globe className="h-5 w-5" /> }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-medium">App Settings</h2>
              <p className="text-sm text-gray-400">
                General application settings
              </p>
            </div>
            
            <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5">
              <h3 className="text-md font-medium">Memory Management</h3>
              <p className="text-sm text-gray-400 mb-4">
                Manage your conversation history and stored memories
              </p>
              
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Button 
                  variant="outline" 
                  className="flex justify-start"
                  onClick={() => navigate('/memories')}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  View Memories
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex justify-start"
                  onClick={() => setIsMemorySearchOpen(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search Memories
                </Button>
                
                <Button 
                  variant="destructive" 
                  className="flex justify-start md:col-span-2"
                  onClick={handleClearChat}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Chat History
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-md font-medium">Custom Commands</h3>
                  <p className="text-sm text-gray-400">
                    Create instructions for the AI to follow
                  </p>
                </div>
                <Button onClick={navigateToCommands} variant="outline" size="sm">
                  <Command className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5">
              <h3 className="text-md font-medium">Conversation Memory</h3>
              <p className="text-sm text-gray-400">
                The app maintains conversation history to provide context between messages. Your 
                chat history is stored locally in your browser and sent with each request to help the 
                AI remember previous parts of your conversation.
              </p>
              <p className="text-sm text-gray-400">
                To clear your conversation history, use the trash icon in the chat interface.
              </p>
            </div>
          </div>
        );
      case "models":
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-medium">Model Configuration</h2>
              <p className="text-sm text-gray-400">
                Configure different AI models and providers
              </p>
            </div>
            
            <ModelSettings />
            
            <div className="space-y-2">
              <h3 className="text-md font-medium">How to get API Keys</h3>
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <h4 className="text-sm font-medium">Gemini API</h4>
                <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-300">
                  <li>Visit the <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-gemini-primary hover:underline">Google AI Studio</a></li>
                  <li>Sign in with your Google account</li>
                  <li>Navigate to API keys in your account settings</li>
                  <li>Create a new API key and copy it</li>
                </ol>
              </div>
              
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5 mt-2">
                <h4 className="text-sm font-medium">Groq API</h4>
                <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-300">
                  <li>Visit <a href="https://console.groq.com/" target="_blank" rel="noopener noreferrer" className="text-gemini-primary hover:underline">Groq Console</a></li>
                  <li>Sign up or sign in to your account</li>
                  <li>Go to API Keys section</li>
                  <li>Generate a new API key</li>
                </ol>
              </div>
              
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5 mt-2">
                <h4 className="text-sm font-medium">OpenRouter</h4>
                <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-300">
                  <li>Visit <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="text-gemini-primary hover:underline">OpenRouter</a></li>
                  <li>Create an account or sign in</li>
                  <li>Navigate to API Keys section</li>
                  <li>Create a new API key for your project</li>
                </ol>
              </div>
            </div>
          </div>
        );
      case "speech":
        return (
          <div className="space-y-6">
            <SpeechSettings className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5" />
          </div>
        );
      case "integrations":
        return (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-medium">Integrations</h2>
              <p className="text-sm text-gray-400">
                Connect external services to enhance your assistant's capabilities
              </p>
            </div>
            
            <GoogleIntegration />
            
            <div className="text-xs text-gray-400 mt-4">
              <p className="font-semibold">How does this work?</p>
              <p className="mt-1">
                When connected to Google services, you can ask your AI assistant to:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Check your recent emails by asking "Check my latest emails"</li>
                <li>Create calendar events with "Schedule a meeting with John on Friday"</li>
                <li>Manage files with "Upload this document to Drive" or "Find my resume"</li>
              </ul>
              <p className="mt-2">
                Your assistant will detect these requests and use the appropriate Google API to fulfill them.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen w-full bg-gemini-background">
        <div className="fixed top-0 left-0 right-0 z-10 bg-black/10 backdrop-blur-lg border-b border-white/10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleGoBack} 
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Settings</h1>
            </div>
          </div>
        </div>

        <div className="flex flex-1 pt-16 overflow-hidden">
          <div className="h-full">
            <Sidebar variant="floating" collapsible="icon" className="pt-2 h-full">
              <SidebarContent>
                <SidebarMenu>
                  {tabs.map((tab) => (
                    <SidebarMenuItem key={tab.id}>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <SidebarMenuButton 
                            isActive={activeTab === tab.id}
                            tooltip={tab.label}
                            onClick={() => setActiveTab(tab.id)}
                          >
                            {tab.icon}
                            <span>{tab.label}</span>
                          </SidebarMenuButton>
                        </HoverCardTrigger>
                        <HoverCardContent side="right" className="w-52">
                          <p className="text-sm font-medium">{tab.label} Settings</p>
                          <p className="text-xs text-muted-foreground">
                            {tab.id === "general" && "Configure general app settings"}
                            {tab.id === "models" && "Configure AI models and providers"}
                            {tab.id === "speech" && "Configure text-to-speech settings"}
                            {tab.id === "integrations" && "Connect external services"}
                          </p>
                        </HoverCardContent>
                      </HoverCard>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>
            </Sidebar>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-16 pt-4">
            <div className="max-w-2xl mx-auto">
              {renderTabContent()}
              
              {activeTab === "general" && (
                <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5 mt-6">
                  <h3 className="text-md font-medium">Changelog</h3>
                  <div className="text-xs text-gray-300">
                    <p className="font-semibold">Version 1.6.0 (2025-04-17)</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                      <li>Added MCP server integration for Gmail, Calendar, and Drive</li>
                      <li>Implemented Gmail OAuth connection in the integrations tab</li>
                      <li>Added formatted display of Gmail data in chat responses</li>
                      <li>Improved handling of API responses in the chat interface</li>
                      <li>Fixed text-to-speech issues with more natural voice patterns</li>
                    </ul>
                    
                    <p className="font-semibold mt-2">Version 1.5.0 (2025-04-16)</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                      <li>Added text-to-speech functionality for AI responses</li>
                      <li>Improved memory search with highlighting and relevance scores</li>
                      <li>Added loading indicators with animated message bubbles</li>
                      <li>Optimized memory storage for better recall</li>
                      <li>Centralized memory management in settings</li>
                    </ul>
                    
                    <p className="font-semibold mt-2">Version 1.4.0 (2025-04-14)</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                      <li>Added support for multiple AI model providers</li>
                      <li>Added Google services integration (Gmail, Calendar, Drive)</li>
                      <li>Implemented tabbed settings interface</li>
                      <li>Fixed message display issues</li>
                    </ul>
                    
                    <p className="font-semibold mt-2">Version 1.3.0</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                      <li>Added conversation history to maintain context between messages</li>
                      <li>Added ability to clear conversation history</li>
                      <li>Fixed model selection issues</li>
                      <li>Added model refresh button to settings</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Sheet open={isMemorySearchOpen} onOpenChange={setIsMemorySearchOpen}>
          <SheetContent className="w-[400px] sm:w-[540px] p-4">
            <SheetHeader>
              <SheetTitle>Search Memories</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <MemorySearch />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
