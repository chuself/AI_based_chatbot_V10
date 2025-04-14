
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Save } from "lucide-react";

const LOCAL_STORAGE_MODEL_CONFIG = "ai-model-config";

interface ModelConfig {
  modelName: string;
  provider: string;
  apiKey: string;
  endpoint: string;
}

const ModelSettings: React.FC = () => {
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    modelName: "",
    provider: "gemini",
    apiKey: "",
    endpoint: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_MODEL_CONFIG);
    if (savedConfig) {
      try {
        setModelConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error("Failed to parse saved model config:", error);
      }
    }
  }, []);

  const handleChange = (field: keyof ModelConfig, value: string) => {
    setModelConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Basic validation
    if (!modelConfig.modelName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a model name",
        variant: "destructive",
      });
      return;
    }

    if (!modelConfig.apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem(LOCAL_STORAGE_MODEL_CONFIG, JSON.stringify(modelConfig));
    
    toast({
      title: "Success",
      description: "Model configuration saved successfully",
    });
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

  return (
    <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Model Configuration</h3>
        <p className="text-sm text-gray-400">
          Configure the AI model you want to use for chat responses
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="provider">API Provider</Label>
          <Select 
            value={modelConfig.provider} 
            onValueChange={(value) => handleChange("provider", value)}
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
          <Label htmlFor="modelName">Model Name</Label>
          <Input
            id="modelName"
            value={modelConfig.modelName}
            onChange={(e) => handleChange("modelName", e.target.value)}
            placeholder="e.g., gemini-pro, llama-3-70b-chat"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            value={modelConfig.apiKey}
            onChange={(e) => handleChange("apiKey", e.target.value)}
            placeholder="Enter your API key"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="endpoint">Model Endpoint (Optional)</Label>
          <Input
            id="endpoint"
            value={modelConfig.endpoint}
            onChange={(e) => handleChange("endpoint", e.target.value)}
            placeholder={getEndpointPlaceholder()}
          />
          <p className="text-xs text-gray-400">
            Leave blank to use the default endpoint for the selected provider
          </p>
        </div>
        
        <Button 
          className="w-full bg-gemini-primary hover:bg-gemini-secondary"
          onClick={handleSave}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Model Configuration
        </Button>
      </div>
    </div>
  );
};

export default ModelSettings;
