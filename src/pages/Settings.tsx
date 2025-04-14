import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Key } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGemini } from "@/hooks/useGemini";
import ModelSettings from "@/components/ModelSettings";
import GoogleIntegration from "@/components/GoogleIntegration";

const LOCAL_STORAGE_API_KEY = "gemini-api-key";

const Settings = () => {
  const [apiKey, setApiKey] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Load API key from localStorage on component mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    // Save API key to localStorage
    localStorage.setItem(LOCAL_STORAGE_API_KEY, apiKey);
    
    toast({
      title: "Success",
      description: "API key saved successfully",
    });
    
    // Close the sheet if open
    if (isSheetOpen) {
      setIsSheetOpen(false);
    }
  };

  const handleGoBack = () => {
    navigate("/");
  };

  const handleShowApiKey = () => {
    setIsSheetOpen(true);
  };

  return (
    <div className="flex flex-col h-screen bg-gemini-background">
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

      <div className="flex-1 overflow-y-auto pt-16 pb-16 px-4">
        <div className="max-w-md mx-auto space-y-6 py-8">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="models">Models</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-medium">API Settings</h2>
                <p className="text-sm text-gray-400">
                  Manage your Gemini API key for using the chat functionality
                </p>
              </div>
              
              <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="apiKey">Gemini API Key</Label>
                    <Button variant="outline" size="sm" onClick={handleShowApiKey}>
                      <Key className="h-4 w-4 mr-2" />
                      View Key
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Input
                      id="apiKey"
                      type="password"
                      value="•••••••••••••••••••••••••••••••"
                      readOnly
                      className="flex-1"
                    />
                  </div>
                  
                  <p className="text-xs text-gray-400">
                    Your API key is stored securely in your browser's local storage.
                  </p>
                </div>
                
                <Button 
                  className="w-full bg-gemini-primary hover:bg-gemini-secondary"
                  onClick={handleSaveApiKey}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
              
              {/* Conversation Memory Info */}
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
            </TabsContent>
            
            <TabsContent value="models" className="space-y-6">
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
            </TabsContent>
            
            <TabsContent value="integrations" className="space-y-6">
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
            </TabsContent>
          </Tabs>
          
          {/* Changelog Section */}
          <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5">
            <h3 className="text-md font-medium">Changelog</h3>
            <div className="text-xs text-gray-300">
              <p className="font-semibold">Version 1.4.0 (2025-04-14)</p>
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
              
              <p className="font-semibold mt-2">Version 1.2.0</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Added model selection dropdown</li>
                <li>Added scroll navigation for message history</li>
                <li>Improved settings page with API key management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Gemini API Key</SheetTitle>
            <SheetDescription>
              Your API key is used to authenticate requests to the Gemini API.
              Keep this key secure and never share it publicly.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="viewApiKey">API Key</Label>
              <Input
                id="viewApiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
              />
            </div>
            <Button 
              className="w-full bg-gemini-primary hover:bg-gemini-secondary"
              onClick={handleSaveApiKey}
            >
              Save Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Settings;
