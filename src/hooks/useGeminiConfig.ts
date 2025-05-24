
import { useState, useEffect } from "react";

// Local storage keys
export const LOCAL_STORAGE_API_KEY = "gemini-api-key";
export const LOCAL_STORAGE_MODEL_CONFIG = "ai-model-config";

export interface ModelConfig {
  modelName: string;
  provider: string;
  apiKey: string;
  endpoint: string;
}

export const useGeminiConfig = () => {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);

  // Load model configuration
  useEffect(() => {
    const loadModelConfig = () => {
      const storedConfig = localStorage.getItem(LOCAL_STORAGE_MODEL_CONFIG);
      if (storedConfig) {
        try {
          const config = JSON.parse(storedConfig) as ModelConfig;
          setModelConfig(config);
          setSelectedModel(config.modelName);
          console.log("Using stored model config:", config.provider, config.modelName);
        } catch (e) {
          console.error("Failed to parse model config:", e);
          localStorage.removeItem(LOCAL_STORAGE_MODEL_CONFIG);
        }
      } else {
        // Fallback to use API key directly if no model config is found
        const storedApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
        if (storedApiKey) {
          const defaultConfig: ModelConfig = {
            modelName: "models/gemini-1.5-flash-latest",
            provider: "gemini",
            apiKey: storedApiKey,
            endpoint: ""
          };
          setModelConfig(defaultConfig);
          setSelectedModel(defaultConfig.modelName);
          console.log("Created default model config with stored API key");
        } else {
          // Set a placeholder default - user should configure this
          console.log("No model configuration found, user needs to set up API key");
        }
      }
    };

    loadModelConfig();
  }, []);

  const updateModelConfig = (model: string) => {
    setSelectedModel(model);
    if (modelConfig) {
      const updatedConfig = { ...modelConfig, modelName: model };
      setModelConfig(updatedConfig);
      localStorage.setItem(LOCAL_STORAGE_MODEL_CONFIG, JSON.stringify(updatedConfig));
    }
  };

  return {
    availableModels,
    selectedModel,
    modelConfig,
    setSelectedModel: updateModelConfig
  };
};
