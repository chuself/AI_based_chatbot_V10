
import { useState, useEffect, useCallback, useRef } from "react";

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
  const [isValidated, setIsValidated] = useState(false);
  const initialLoadDone = useRef(false);

  // Load model configuration
  useEffect(() => {
    const loadModelConfig = () => {
      try {
        const storedConfig = localStorage.getItem(LOCAL_STORAGE_MODEL_CONFIG);
        
        if (storedConfig) {
          const config = JSON.parse(storedConfig) as ModelConfig;
          console.log("Loading model config:", config.provider, config.modelName);
          
          // Validate the config before using it
          if (config.apiKey && config.modelName && config.provider) {
            setModelConfig(config);
            setSelectedModel(config.modelName);
            setIsValidated(true);
            console.log("Using validated model config:", config.provider, config.modelName);
          } else {
            console.warn("Invalid model config found, missing required fields");
            tryFallbackConfig();
          }
        } else {
          tryFallbackConfig();
        }
        
        initialLoadDone.current = true;
      } catch (e) {
        console.error("Failed to parse model config:", e);
        tryFallbackConfig();
      }
    };

    const tryFallbackConfig = () => {
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
        setIsValidated(true);
        console.log("Created default model config with stored API key");
        
        // Save this default config to localStorage
        localStorage.setItem(LOCAL_STORAGE_MODEL_CONFIG, JSON.stringify(defaultConfig));
      } else {
        // Set a placeholder default - user should configure this
        console.log("No model configuration found, user needs to set up API key");
        setIsValidated(false);
      }
    };

    if (!initialLoadDone.current) {
      loadModelConfig();
    }
    
    // Listen for storage changes to reload config when it's updated
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_MODEL_CONFIG) {
        console.log("Model config updated in storage, reloading...");
        loadModelConfig();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Update model config - ensure we save to localStorage
  const updateModelConfig = useCallback((model: string) => {
    setSelectedModel(model);
    if (modelConfig) {
      const updatedConfig = { ...modelConfig, modelName: model };
      setModelConfig(updatedConfig);
      localStorage.setItem(LOCAL_STORAGE_MODEL_CONFIG, JSON.stringify(updatedConfig));
      console.log("Updated model config:", updatedConfig.provider, updatedConfig.modelName);
      
      // Trigger storage event to notify other components
      window.dispatchEvent(new Event('storage'));
    }
  }, [modelConfig]);

  // Save complete model config
  const saveModelConfig = useCallback((config: ModelConfig) => {
    setModelConfig(config);
    setSelectedModel(config.modelName);
    setIsValidated(true);
    localStorage.setItem(LOCAL_STORAGE_MODEL_CONFIG, JSON.stringify(config));
    console.log("Saved new model config:", config.provider, config.modelName);
    
    // Trigger storage event to notify other components
    window.dispatchEvent(new Event('storage'));
  }, []);

  const validateApiConnection = async (config: ModelConfig): Promise<boolean> => {
    try {
      console.log("Validating API connection for:", config.provider);
      
      switch (config.provider) {
        case "gemini":
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`
          );
          return geminiResponse.ok;
          
        case "openrouter":
          const openRouterResponse = await fetch("https://openrouter.ai/api/v1/models", {
            headers: { Authorization: `Bearer ${config.apiKey}` }
          });
          return openRouterResponse.ok;
          
        case "groq":
          // Groq doesn't have a simple validation endpoint, assume valid if key exists
          return !!config.apiKey;
          
        default:
          return false;
      }
    } catch (error) {
      console.error("API validation failed:", error);
      return false;
    }
  };

  return {
    availableModels,
    selectedModel,
    modelConfig,
    isValidated,
    setSelectedModel: updateModelConfig,
    saveModelConfig,
    validateApiConnection
  };
};
