
import React from "react";
import ModelSettingsComponent from "@/components/ModelSettings";

const ModelSettingsTab = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-xl font-medium">Model Configuration</h2>
        <p className="text-sm text-gray-400">
          Configure different AI models and providers
        </p>
      </div>
      
      <ModelSettingsComponent />
      
      <div className="space-y-2">
        <h3 className="text-md font-medium">How to get API Keys</h3>
        <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5 transition-all hover:bg-white/10 duration-200">
          <h4 className="text-sm font-medium">Gemini API</h4>
          <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-300">
            <li>Visit the <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-gemini-primary hover:underline">Google AI Studio</a></li>
            <li>Sign in with your Google account</li>
            <li>Navigate to API keys in your account settings</li>
            <li>Create a new API key and copy it</li>
          </ol>
        </div>
        
        <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5 mt-2 transition-all hover:bg-white/10 duration-200">
          <h4 className="text-sm font-medium">Groq API</h4>
          <ol className="list-decimal pl-5 space-y-1 text-xs text-gray-300">
            <li>Visit <a href="https://console.groq.com/" target="_blank" rel="noopener noreferrer" className="text-gemini-primary hover:underline">Groq Console</a></li>
            <li>Sign up or sign in to your account</li>
            <li>Go to API Keys section</li>
            <li>Generate a new API key</li>
          </ol>
        </div>
        
        <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5 mt-2 transition-all hover:bg-white/10 duration-200">
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
};

export default ModelSettingsTab;
