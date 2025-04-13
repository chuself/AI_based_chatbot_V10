import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Key, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useGemini } from "@/hooks/useGemini";
import GoogleApiSettings from "@/components/GoogleApiSettings";

const LOCAL_STORAGE_API_KEY = "gemini-api-key";
const LOCAL_STORAGE_MODEL = "gemini-selected-model";

const Settings = () => {
  const [apiKey, setApiKey] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { availableModels, selectedModel, setSelectedModel, error } = useGemini();
  const [currentModel, setCurrentModel] = useState("");

  useEffect(() => {
    const storedApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    
    if (selectedModel) {
      setCurrentModel(selectedModel);
    } else {
      const storedModel = localStorage.getItem(LOCAL_STORAGE_MODEL);
      if (storedModel) {
        setCurrentModel(storedModel);
      }
    }
  }, [selectedModel]);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem(LOCAL_STORAGE_API_KEY, apiKey);
    
    toast({
      title: "Success",
      description: "API key saved successfully",
    });
    
    if (isSheetOpen) {
      setIsSheetOpen(false);
    }
  };

  const handleSaveModel = (modelName: string) => {
    setCurrentModel(modelName);
    setSelectedModel(modelName);
    
    toast({
      title: "Model Updated",
      description: `Now using model: ${modelName.split("/").pop()}`,
    });
  };

  const handleGoBack = () => {
    navigate("/");
  };

  const handleShowApiKey = () => {
    setIsSheetOpen(true);
  };

  const handleRefreshModels = async () => {
    setIsLoading(true);
    
    localStorage.removeItem(LOCAL_STORAGE_MODEL);
    
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const getDisplayModelName = (fullModelName: string) => {
    return fullModelName.split("/").pop() || fullModelName;
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
          
          <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="modelSelect">Gemini Model</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshModels}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Models
                </Button>
              </div>
              
              {availableModels.length > 0 ? (
                <Select 
                  value={currentModel} 
                  onValueChange={handleSaveModel}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {getDisplayModelName(model)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-gray-400 bg-gray-100 p-3 rounded border border-gray-200">
                  {error ? (
                    <p>Error loading models: {error}</p>
                  ) : (
                    <p>No models available. Try refreshing.</p>
                  )}
                </div>
              )}
              
              <p className="text-xs text-gray-400">
                Choose which Gemini model to use for generating responses.
                Some models have different capabilities and performance characteristics.
                If the dropdown is empty, click "Refresh Models".
              </p>
            </div>
          </div>
          
          <div className="space-y-1 mt-8">
            <h2 className="text-xl font-medium">Google Integration</h2>
            <p className="text-sm text-gray-400">
              Connect to Google services for email, calendar and other features
            </p>
          </div>
          
          <GoogleApiSettings />
          
          <div className="space-y-2">
            <h3 className="text-md font-medium">How to get a Gemini API Key</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              <li>Visit the <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-gemini-primary hover:underline">Google AI Studio</a></li>
              <li>Sign in with your Google account</li>
              <li>Navigate to API keys in your account settings</li>
              <li>Create a new API key and copy it</li>
              <li>Paste the API key in the field above and click "Save Settings"</li>
            </ol>
          </div>
          
          <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5">
            <h3 className="text-md font-medium">Conversation Memory</h3>
            <p className="text-sm text-gray-400">
              The app now maintains conversation history to provide context between messages. Your 
              chat history is stored locally in your browser and sent with each request to help the 
              AI remember previous parts of your conversation.
            </p>
            <p className="text-sm text-gray-400">
              To clear your conversation history, use the trash icon in the chat interface.
            </p>
          </div>
          
          <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5">
            <h3 className="text-md font-medium">Changelog</h3>
            <div className="text-xs text-gray-300">
              <p className="font-semibold">Version 1.4.0 (2025-04-13)</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Added Google API integration for email, calendar, and other Google services</li>
                <li>Added account and calendar selection for Google services</li>
                <li>Improved mobile navigation experience</li>
              </ul>
              
              <p className="font-semibold mt-2">Version 1.3.0 (2025-04-13)</p>
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
              
              <p className="font-semibold mt-2">Version 1.1.0</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Added API key management</li>
                <li>Implemented settings page</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

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
