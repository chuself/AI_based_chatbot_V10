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
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          App Settings
        </h2>
        <p className="text-muted-foreground">
          General application settings and customization
        </p>
      </div>

      {/* Theme Settings */}
      <div className="glass-card p-6 space-y-4 animate-scale-in">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 glass">
            <Palette className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Appearance</h3>
            <p className="text-sm text-muted-foreground">
              Customize the look and feel of your app
            </p>
          </div>
        </div>

        <div className="glass p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-blue-500" />
              ) : (
                <Sun className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <Label htmlFor="theme-toggle" className="text-sm font-medium">
                  Dark Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Switch between light and dark themes
                </p>
              </div>
            </div>
            <Switch 
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </div>
      
      {/* Memory Management */}
      <div className="glass-card p-6 space-y-4 animate-scale-in">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 glass">
            <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium">Memory Management</h3>
            <p className="text-sm text-muted-foreground">
              Manage your conversation history and stored memories
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Button 
            variant="outline" 
            className="glass-button justify-start hover:bg-primary/10 border-0"
            onClick={() => navigate('/memories')}
          >
            <Brain className="h-4 w-4 mr-2" />
            View Memories
          </Button>
          
          <Button 
            variant="outline" 
            className="glass-button justify-start hover:bg-primary/10 border-0"
            onClick={() => navigate('/memories/search')}
          >
            <Search className="h-4 w-4 mr-2" />
            Search Memories
          </Button>
          
          <Button 
            variant="destructive" 
            className="glass-button justify-start md:col-span-2 bg-red-500/20 hover:bg-red-500/30 text-red-600 border-0"
            onClick={handleClearChat}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Chat History
          </Button>
        </div>
      </div>
      
      {/* Custom Commands */}
      <div className="glass-card p-6 space-y-4 animate-scale-in">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 glass">
              <Command className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Custom Commands</h3>
              <p className="text-sm text-muted-foreground">
                Create and edit instructions for the AI to follow
              </p>
            </div>
          </div>
          <Button 
            onClick={navigateToCommands} 
            className="glass-button bg-primary/20 hover:bg-primary/30 text-primary border-0"
            size="sm"
          >
            <Command className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </div>
      </div>

      {/* MCP Server Status */}
      <div className="glass-card p-6 space-y-4 animate-scale-in">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 glass">
            <Command className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium">MCP Server Status</h3>
            <p className="text-sm text-muted-foreground">
              Monitor the status of MCP server integrations
            </p>
          </div>
        </div>
        
        <MCPStatusIndicator />
        
        <div className="glass p-4 rounded-xl">
          <div className="flex items-center space-x-3">
            <Switch 
              id="show-commands"
              checked={showCommandLogs}
              onCheckedChange={handleCommandLogsToggle}
              className="data-[state=checked]:bg-primary"
            />
            <div>
              <Label htmlFor="show-commands" className="text-sm font-medium">
                Show MCP Commands in Chat
              </Label>
              <p className="text-xs text-muted-foreground">
                Display MCP command logs in the chat interface
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Conversation Memory Info */}
      <div className="glass-card p-6 space-y-4 animate-scale-in">
        <h3 className="text-lg font-medium">Conversation Memory</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            The app maintains conversation history to provide context between messages. Your 
            chat history is stored locally in your browser and sent with each request to help the 
            AI remember previous parts of your conversation.
          </p>
          <p>
            To clear your conversation history, use the clear button above or the trash icon in the chat interface.
          </p>
        </div>
      </div>

      <Changelog />
    </div>
  );
};

const Changelog = () => (
  <div className="glass-card p-6 space-y-4 animate-scale-in">
    <h3 className="text-lg font-medium">Recent Updates</h3>
    <div className="text-xs space-y-4 text-muted-foreground">
      <div>
        <p className="font-semibold text-sm mb-2 text-foreground">Version 1.9.1 (2025-01-25)</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Implemented glassmorphism UI design with translucent effects</li>
          <li>Enhanced dark/light mode theming system</li>
          <li>Fixed cloud sync upload functionality with improved error handling</li>
          <li>Added custom command editing capabilities</li>
          <li>Improved responsive design for all device types</li>
          <li>Added smooth animations and backdrop blur effects</li>
          <li>Enhanced troubleshooting messages for better debugging</li>
        </ul>
      </div>
      
      <p className="font-semibold mt-2">Version 1.9.0 (2025-01-25)</p>
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
