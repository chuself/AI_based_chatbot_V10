
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Command, Search, Trash2, Moon, Sun, Palette } from "lucide-react";
import { useGemini } from "@/hooks/useGemini";
import { useToast } from "@/components/ui/use-toast";
import MCPStatusIndicator from "@/components/MCPStatusIndicator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";

const GeneralSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clearChatHistory } = useGemini();
  const { theme, toggleTheme } = useTheme();
  const [showCommandLogs, setShowCommandLogs] = React.useState(() => {
    const stored = localStorage.getItem('show-mcp-commands');
    return stored === 'true';
  });

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

  const handleCommandLogsToggle = (checked: boolean) => {
    setShowCommandLogs(checked);
    localStorage.setItem('show-mcp-commands', checked.toString());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">App Settings</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          General application settings and customization
        </p>
      </div>

      {/* Theme Settings */}
      <div className="space-y-2 p-6 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md transition-all hover:bg-white/80 dark:hover:bg-gray-800/80 duration-300 shadow-lg dark:shadow-gray-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
              <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Appearance</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Customize the look and feel of your app
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200/30 dark:border-gray-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-600" />
              )}
              <div>
                <Label htmlFor="theme-toggle" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Dark Mode
                </Label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Switch between light and dark themes
                </p>
              </div>
            </div>
            <Switch 
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
        </div>
      </div>
      
      {/* Memory Management */}
      <div className="space-y-2 p-6 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md transition-all hover:bg-white/80 dark:hover:bg-gray-800/80 duration-300 shadow-lg dark:shadow-gray-900/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
            <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Memory Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage your conversation history and stored memories
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Button 
            variant="outline" 
            className="flex justify-start transition-all hover:scale-[1.02] duration-200 bg-white/50 dark:bg-gray-700/50 border-gray-200/50 dark:border-gray-600/50 hover:bg-white/80 dark:hover:bg-gray-700/80"
            onClick={() => navigate('/memories')}
          >
            <Brain className="h-4 w-4 mr-2" />
            View Memories
          </Button>
          
          <Button 
            variant="outline" 
            className="flex justify-start transition-all hover:scale-[1.02] duration-200 bg-white/50 dark:bg-gray-700/50 border-gray-200/50 dark:border-gray-600/50 hover:bg-white/80 dark:hover:bg-gray-700/80"
            onClick={() => navigate('/memories/search')}
          >
            <Search className="h-4 w-4 mr-2" />
            Search Memories
          </Button>
          
          <Button 
            variant="destructive" 
            className="flex justify-start md:col-span-2 transition-all hover:scale-[1.02] duration-200 bg-red-500/20 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-500/30 dark:hover:bg-red-900/50"
            onClick={handleClearChat}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Chat History
          </Button>
        </div>
      </div>
      
      {/* Custom Commands */}
      <div className="space-y-2 p-6 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md transition-all hover:bg-white/80 dark:hover:bg-gray-800/80 duration-300 shadow-lg dark:shadow-gray-900/20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
              <Command className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Custom Commands</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create and edit instructions for the AI to follow
              </p>
            </div>
          </div>
          <Button 
            onClick={navigateToCommands} 
            variant="outline" 
            size="sm"
            className="transition-all hover:scale-105 duration-200 bg-white/50 dark:bg-gray-700/50 border-gray-200/50 dark:border-gray-600/50 hover:bg-white/80 dark:hover:bg-gray-700/80"
          >
            <Command className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </div>
      </div>

      {/* MCP Server Status */}
      <div className="space-y-2 p-6 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md transition-all hover:bg-white/80 dark:hover:bg-gray-800/80 duration-300 shadow-lg dark:shadow-gray-900/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30">
            <Command className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">MCP Server Status</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor the status of MCP server integrations
            </p>
          </div>
        </div>
        <MCPStatusIndicator />
        
        <div className="mt-4 pt-4 border-t border-gray-200/30 dark:border-gray-700/30">
          <div className="flex items-center space-x-2">
            <Switch 
              id="show-commands"
              checked={showCommandLogs}
              onCheckedChange={handleCommandLogsToggle}
            />
            <Label htmlFor="show-commands" className="text-sm text-gray-900 dark:text-gray-100">
              Show MCP Commands in Chat
            </Label>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Display MCP command logs in the chat interface
          </p>
        </div>
      </div>
      
      {/* Conversation Memory Info */}
      <div className="space-y-2 p-6 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md transition-all hover:bg-white/80 dark:hover:bg-gray-800/80 duration-300 shadow-lg dark:shadow-gray-900/20">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">Conversation Memory</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The app maintains conversation history to provide context between messages. Your 
          chat history is stored locally in your browser and sent with each request to help the 
          AI remember previous parts of your conversation.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          To clear your conversation history, use the clear button above or the trash icon in the chat interface.
        </p>
      </div>

      <Changelog />
    </div>
  );
};

const Changelog = () => (
  <div className="space-y-2 p-6 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md transition-all hover:bg-white/80 dark:hover:bg-gray-800/80 duration-300 shadow-lg dark:shadow-gray-900/20 mt-6">
    <h3 className="font-medium text-gray-900 dark:text-gray-100">Changelog</h3>
    <div className="text-xs text-gray-700 dark:text-gray-300">
      <p className="font-semibold">Version 1.9.0 (2025-01-25)</p>
      <ul className="list-disc pl-5 space-y-1 mt-1">
        <li>Added command editing functionality - you can now edit existing custom commands</li>
        <li>Implemented new translucent UI design with dark/light mode toggle</li>
        <li>Enhanced cloud upload functionality with better error handling and troubleshooting</li>
        <li>Improved sync service reliability with comprehensive error logging</li>
        <li>Added backdrop blur effects and smooth animations throughout the interface</li>
        <li>Fixed cloud data versioning to properly save each settings version separately</li>
        <li>Moved MCP command toggle to General Settings as requested</li>
        <li>Enhanced responsive design for both phone and PC layouts</li>
      </ul>
      
      <p className="font-semibold mt-2">Version 1.8.0 (2025-01-25)</p>
      <ul className="list-disc pl-5 space-y-1 mt-1">
        <li>Fixed model response fetching with improved API validation and error handling</li>
        <li>Added cloud data versioning - each sync creates a new version for rollback capability</li>
        <li>Enhanced sync status display showing detailed sync information for each data type</li>
        <li>Moved MCP command logs toggle to General Settings page for better organization</li>
        <li>Improved model configuration loading from cloud sync with proper validation</li>
        <li>Fixed cloud version selection to show all available backup versions</li>
        <li>Added comprehensive sync troubleshooting with detailed status indicators</li>
      </ul>
      
      <p className="font-semibold mt-2">Version 1.7.0 (2025-01-25)</p>
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
