
import { useState, useEffect } from "react";

// The API key can come from localStorage or fallback to the hardcoded one
const LOCAL_STORAGE_API_KEY = "gemini-api-key";

export const useGemini = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");

  // Get API key from localStorage or use the fallback
  const getApiKey = (): string => {
    const storedApiKey = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    // Fallback to hardcoded API key if not found in localStorage
    return storedApiKey || "AIzaSyDApo1EqSX0Mq3ZePA9OM_yD0hnmoz_s-Q";
  };

  useEffect(() => {
    // Fetch available models on component load
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${getApiKey()}`
      );
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to fetch models");
      }

      if (data.models && Array.isArray(data.models)) {
        const modelNames = data.models.map((model: any) => model.name);
        setAvailableModels(modelNames);
        
        // Find a suitable model (prefer gemini-1.5-flash or similar)
        const preferredModels = [
          "gemini-1.5-flash",
          "gemini-1.5-pro", 
          "gemini-pro",
          "models/gemini-pro"
        ];
        
        let foundModel = "";
        for (const preferred of preferredModels) {
          const match = modelNames.find((model: string) => model.includes(preferred));
          if (match) {
            foundModel = match;
            break;
          }
        }
        
        if (foundModel) {
          setSelectedModel(foundModel);
          console.log("Selected model:", foundModel);
        } else if (modelNames.length > 0) {
          setSelectedModel(modelNames[0]);
          console.log("Using first available model:", modelNames[0]);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch available models";
      console.error("Error fetching models:", errorMessage);
      setError(errorMessage);
    }
  };

  const sendMessage = async (message: string) => {
    if (!selectedModel) {
      setError("No AI model available. Please try again later.");
      return "Sorry, no AI model is currently available. Please try again later.";
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extract just the model name part if it's a full path
      const modelId = selectedModel.includes("/") 
        ? selectedModel 
        : `models/${selectedModel}`;

      console.log(`Using model: ${modelId}`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${getApiKey()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: message,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to get response from Gemini API");
      }

      // Extract the response text from the Gemini API response
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";
      
      return responseText;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      console.error("Error calling Gemini API:", errorMessage);
      return "Sorry, I encountered an error processing your request.";
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading,
    error,
    availableModels,
    selectedModel
  };
};
