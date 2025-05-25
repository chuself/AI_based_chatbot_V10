
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Command, Search, Trash2, Terminal } from "lucide-react";
import { useGemini } from "@/hooks/useGemini";
import { useToast } from "@/components/ui/use-toast";
import { MCPStatusIndicator } from "@/components/MCPStatusIndicator";

const GeneralSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clearChatHistory } = useGemini();

  const handleClearChat = () => {
    clearChatHistory();
    
    toast({
      title: "Chat Cleared",
      description: "Your conversation history has been cleared.",
    });
  };

  const navigateToCommands = () => {
    navigate("/commands");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-xl font-medium">App Settings</h2>
        <p className="text-sm text-gray-400">
          General application settings
        </p>
      </div>
      
      <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5 transition-all hover:bg-white/10 duration-200">
        <h3 className="text-md font-medium">Memory Management</h3>
        <p className="text-sm text-gray-400 mb-4">
          Manage your conversation history and stored memories
        </p>
        
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Button 
            variant="outline" 
            className="flex justify-start transition-all hover:scale-102 duration-200"
            onClick={() => navigate('/memories')}
          >
            <Brain className="h-4 w-4 mr-2" />
            View Memories
          </Button>
          
          <Button 
            variant="outline" 
            className="flex justify-start transition-all hover:scale-102 duration-200"
            onClick={() => navigate('/memories/search')}
          >
            <Search className="h-4 w-4 mr-2" />
            Search Memories
          </Button>
          
          <Button 
            variant="destructive" 
            className="flex justify-start md:col-span-2 transition-all hover:scale-102 duration-200"
            onClick={handleClearChat}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Chat History
          </Button>
        </div>
      </div>
      
      <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5 transition-all hover:bg-white/10 duration-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-md font-medium">Custom Commands</h3>
            <p className="text-sm text-gray-400">
              Create instructions for the AI to follow
            </p>
          </div>
          <Button 
            onClick={navigateToCommands} 
            variant="outline" 
            size="sm"
            className="transition-all hover:scale-105 duration-200"
          >
            <Command className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </div>
      </div>

      <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5 transition-all hover:bg-white/10 duration-200">
        <h3 className="text-md font-medium">MCP Server Status</h3>
        <p className="text-sm text-gray-400 mb-4">
          Monitor the status of MCP server integrations
        </p>
        <MCPStatusIndicator />
      </div>
      
      <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5 transition-all hover:bg-white/10 duration-200">
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

      <Changelog />
    </div>
  );
};

const Changelog = () => (
  <div className="space-y-2 p-4 rounded-lg border border-white/10 bg-white/5 mt-6 transition-all hover:bg-white/10 duration-200">
    <h3 className="text-md font-medium">Changelog</h3>
    <div className="text-xs text-gray-300">
      <p className="font-semibold">Version 1.7.0 (2025-01-25)</p>
      <ul className="list-disc pl-5 space-y-1 mt-1">
        <li>Fixed model response fetching issues with improved error handling</li>
        <li>Added versioning support for cloud data - each upload creates a new version</li>
        <li>Enhanced sync status display with detailed breakdown of synced components</li>
        <li>Moved MCP server status indicator to General Settings page</li>
        <li>Improved cloud version selection to show all available backup versions</li>
        <li>Fixed Gemini API message formatting for better compatibility</li>
      </ul>
      
      <p className="font-semibold mt-2">Version 1.6.0 (2025-04-17)</p>
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
);

export default GeneralSettings;
