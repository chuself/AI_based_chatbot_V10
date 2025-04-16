import { ChatMessage, MAX_HISTORY_LENGTH } from "@/hooks/useChatHistory";
import { ModelConfig } from "@/hooks/useGeminiConfig";

export const callGeminiApi = async (history: ChatMessage[], currentMessage: string, config: ModelConfig) => {
  // Format model ID properly
  const modelId = config.modelName.includes("/") 
    ? config.modelName 
    : `models/${config.modelName}`;

  console.log(`Using Gemini model: ${modelId}`);
  
  // Format conversation history for Gemini API
  const formattedHistory = history.map(msg => ({
    role: msg.role === "user" ? "user" : msg.role === "system" ? "user" : "model",
    parts: [{ text: msg.content }]
  }));

  // Use custom endpoint if provided, otherwise use default
  const endpoint = config.endpoint || 
    `https://generativelanguage.googleapis.com/v1beta/${modelId}:generateContent?key=${config.apiKey}`;

  // Send the request with conversation history
  const response = await fetch(
    endpoint.replace("{model}", modelId),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: formattedHistory,
      }),
    }
  );

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to get response from Gemini API");
  }

  // Extract the response text from the Gemini API response
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";
};

export const callOpenRouterApi = async (history: ChatMessage[], currentMessage: string, config: ModelConfig) => {
  console.log(`Using OpenRouter model: ${config.modelName}`);
  
  // Format conversation history for OpenRouter API (OpenAI compatible)
  const formattedHistory = history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Use custom endpoint if provided, otherwise use default
  const endpoint = config.endpoint || "https://openrouter.ai/api/v1/chat/completions";

  // Send the request
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: formattedHistory
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to get response from OpenRouter API");
  }

  // Extract the response text
  return data.choices?.[0]?.message?.content || "No response from AI";
};

export const callGroqApi = async (history: ChatMessage[], currentMessage: string, config: ModelConfig) => {
  console.log(`Using Groq model: ${config.modelName}`);
  
  // Format conversation history for Groq API (OpenAI compatible)
  const formattedHistory = history.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // Use custom endpoint if provided, otherwise use default
  const endpoint = config.endpoint || "https://api.groq.com/openai/v1/chat/completions";

  // Send the request
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: formattedHistory
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to get response from Groq API");
  }

  // Extract the response text
  return data.choices?.[0]?.message?.content || "No response from AI";
};

// Prepare message history for AI request with smart token management
export const prepareMessageHistory = (history: ChatMessage[]) => {
  if (history.length <= MAX_HISTORY_LENGTH) {
    return history;
  }
  
  // Always include system message(s) if present
  const systemMessages = history.filter(msg => msg.role === "system");
  
  // Include the most recent MAX_HISTORY_LENGTH/2 messages to capture immediate context
  const recentMessages = history.slice(-Math.floor(MAX_HISTORY_LENGTH/2));
  
  // Include some earlier messages with a larger gap between them to maintain long-term context
  // Skip messages to reduce token count while keeping the conversation flow
  const earlierMessages = history
    .filter(msg => msg.role !== "system") // Exclude system messages (already included)
    .slice(0, -Math.floor(MAX_HISTORY_LENGTH/2)) // Exclude recent messages (already included)
    .filter((_, index) => index % 3 === 0) // Take every third message
    .slice(-Math.floor(MAX_HISTORY_LENGTH/2)); // Limit to half the max length
  
  // Combine all parts of the history
  return [...systemMessages, ...earlierMessages, ...recentMessages];
};
