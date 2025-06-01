
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Save, Loader2, Key, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";

const LOCAL_STORAGE_MODEL_CONFIG = "ai-model-config";

interface ModelConfig {
  modelName: string;
  provider: string;
  apiKey: string;
  endpoint: string;
}

const ModelSettings: React.FC = () => {
  const [step, setStep] = useState<"api-key" | "model-selection">("api-key");
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    modelName: "",
    provider: "gemini",
    apiKey: "",
    endpoint: "",
  });
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a saved config
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_MODEL_CONFIG);
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setModelConfig(config);
        
        // If we have an API key, go straight to model selection
        if (config.apiKey) {
          setStep("model-selection");
          fetchAvailableModels(config.provider, config.apiKey);
        }
      } catch (error) {
        console.error("Failed to parse saved model config:", error);
      }
    }
  }, []);

  const fetchAvailableModels = async (provider: string, apiKey: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let modelsData: string[] = [];
      
      // Fetch models based on the provider
      switch (provider) {
        case "gemini":
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          );
          
          if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json().catch(() => ({}));
            throw new Error(errorData.error?.message || "Invalid API key or network error");
          }
          
          const geminiData = await geminiResponse.json();
          modelsData = geminiData.models?.map((model: any) => model.name) || [];
          break;
          
        case "openrouter":
          const openRouterResponse = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              Authorization: `Bearer ${apiKey}`
            }
          });
          
          if (!openRouterResponse.ok) {
            throw new Error("Invalid OpenRouter API key or network error");
          }
          
          const openRouterData = await openRouterResponse.json();
          modelsData = openRouterData.data?.map((model: any) => model.id) || [];
          break;
          
        case "groq":
          // Groq uses OpenAI compatible API but has a limited set of models
          modelsData = [
            "llama-3.1-8b-instant",
            "llama-3.1-70b-instant", 
            "llama-3.1-405b-instant",
            "mixtral-8x7b-32768",
            "gemma-7b-it"
          ];
          break;
          
        default:
          throw new Error("Unsupported provider");
      }
      
      setAvailableModels(modelsData);
      
      // If there are available models, select the first one by default
      if (modelsData.length > 0 && !modelConfig.modelName) {
        setModelConfig(prev => ({ ...prev, modelName: modelsData[0] }));
      }
      
      toast({
        title: "Models Loaded",
        description: `Found ${modelsData.length} models for ${provider}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch models";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderChange = (provider: string) => {
    setModelConfig(prev => ({ ...prev, provider, modelName: "" }));
    setAvailableModels([]);
  };

  const handleApiKeySubmit = () => {
    if (!modelConfig.apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    // Go to model selection step and fetch models
    setStep("model-selection");
    fetchAvailableModels(modelConfig.provider, modelConfig.apiKey);
  };

  const handleSaveConfig = () => {
    // Basic validation
    if (!modelConfig.modelName) {
      toast({
        title: "Error",
        description: "Please select a model",
        variant: "destructive",
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem(LOCAL_STORAGE_MODEL_CONFIG, JSON.stringify(modelConfig));
    
    toast({
      title: "Success",
      description: "Model configuration saved successfully. Changes will take effect immediately.",
    });
    
    // Force reload to apply changes
    window.location.reload();
  };

  // Provider specific endpoint placeholders
  const getEndpointPlaceholder = () => {
    switch (modelConfig.provider) {
      case "openrouter":
        return "https://openrouter.ai/api/v1/chat/completions";
      case "groq":
        return "https://api.groq.com/openai/v1/chat/completions";
      case "gemini":
        return "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";
      default:
        return "Enter endpoint URL";
    }
  };

  const getModelDisplayName = (fullModelName: string) => {
    return fullModelName.split("/").pop() || fullModelName;
  };

  // Render the API key input step
  if (step === "api-key") {
    return (
      <Card className="space-y-4 p-4 rounded-lg border border-gray-200 bg-white">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Connect to AI Model</h3>
          <p className="text-sm text-gray-500">
            Choose a provider and enter your API key to access available models
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Select API Provider</Label>
            <Select 
              value={modelConfig.provider} 
              onValueChange={handleProviderChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="groq">Groq</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key for {modelConfig.provider}</Label>
            <Input
              id="apiKey"
              type="password"
              value={modelConfig.apiKey}
              onChange={(e) => setModelConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Enter your API key"
            />
            <p className="text-xs text-gray-500">
              Your API key is stored locally in your browser
            </p>
          </div>
          
          <Button 
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={handleApiKeySubmit}
          >
            <Key className="h-4 w-4 mr-2" />
            Connect to Service
          </Button>
        </div>
      </Card>
    );
  }

  // Render the model selection step
  return (
    <div className="space-y-4 p-4 rounded-lg border border-gray-200 bg-white">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Model Configuration</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setStep("api-key")}
          >
            Change API Key
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          Select the AI model you want to use for chat responses
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="provider">API Provider</Label>
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-md flex-1">
              {modelConfig.provider.charAt(0).toUpperCase() + modelConfig.provider.slice(1)}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchAvailableModels(modelConfig.provider, modelConfig.apiKey)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="modelSelect">Available Models</Label>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2">Loading models...</span>
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          ) : availableModels.length > 0 ? (
            <Select 
              value={modelConfig.modelName} 
              onValueChange={(value) => setModelConfig(prev => ({ ...prev, modelName: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {getModelDisplayName(model)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-gray-500 bg-gray-100 p-3 rounded">
              No models available. Please refresh or try a different API key.
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="endpoint">Custom Endpoint (Optional)</Label>
          <Input
            id="endpoint"
            value={modelConfig.endpoint}
            onChange={(e) => setModelConfig(prev => ({ ...prev, endpoint: e.target.value }))}
            placeholder={getEndpointPlaceholder()}
          />
          <p className="text-xs text-gray-500">
            Leave blank to use the default endpoint for the selected provider
          </p>
        </div>
        
        <Button 
          className="w-full bg-purple-600 hover:bg-purple-700"
          onClick={handleSaveConfig}
          disabled={!modelConfig.modelName || isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Model Configuration
        </Button>
      </div>
    </div>
  );
};

export default ModelSettings;
