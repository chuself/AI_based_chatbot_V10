
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Settings, Info, ArrowUpRight, Check, X, Zap, Database, Cloud, Trash2, TestTube, Edit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCurrentUser, useSupabaseSync } from "@/services/supabaseService";
import { supabase } from "@/integrations/supabase/client";
import getMcpClient, { MCPServer, MCPCommand } from "@/services/mcpService";
import { Textarea } from "@/components/ui/textarea";

const IntegrationsTab = () => {
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  const [isEditServerOpen, setIsEditServerOpen] = useState(false);
  const [isCommandsOpen, setIsCommandsOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [activeConnections, setActiveConnections] = useState<Record<string, boolean>>({});
  
  // Form states
  const [serverName, setServerName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [serverType, setServerType] = useState("");
  const [serverApiKey, setServerApiKey] = useState("");
  const [serverDescription, setServerDescription] = useState("");
  const [serverCommands, setServerCommands] = useState<MCPCommand[]>([]);
  
  const { toast } = useToast();
  const mcpClient = getMcpClient();
  
  // Supabase related states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { syncStatus, checkConnection } = useSupabaseSync();
  const [syncEnabled, setSyncEnabled] = useState(true);

  // Load servers on component mount
  useEffect(() => {
    setServers(mcpClient.getServers());
  }, []);
  
  // Regularly check for active MCP connections
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveConnections(mcpClient.getActiveConnections());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Get current Supabase user
  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    
    fetchUser();
  }, []);

  const resetForm = () => {
    setServerName("");
    setServerUrl("");
    setServerType("");
    setServerApiKey("");
    setServerDescription("");
    setServerCommands([]);
  };

  const handleAddServer = async () => {
    if (!serverName || !serverUrl) {
      toast({
        title: "Missing Information",
        description: "Please provide both a server name and URL",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(serverUrl);
    } catch (e) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL including http:// or https://",
        variant: "destructive",
      });
      return;
    }

    const newServer = mcpClient.addServer({
      name: serverName,
      url: serverUrl,
      type: serverType || 'custom',
      apiKey: serverApiKey || undefined,
      description: serverDescription || undefined,
      commands: serverCommands.length > 0 ? serverCommands : undefined
    });
    
    setServers(mcpClient.getServers());
    
    toast({
      title: "Server Added",
      description: `${serverName} has been added successfully`,
    });
    
    setIsAddServerOpen(false);
    resetForm();
  };

  const handleEditServer = () => {
    if (!selectedServer) return;
    
    const success = mcpClient.updateServer(selectedServer.id, {
      name: serverName,
      url: serverUrl,
      type: serverType,
      apiKey: serverApiKey || undefined,
      description: serverDescription || undefined,
      commands: serverCommands.length > 0 ? serverCommands : undefined
    });
    
    if (success) {
      setServers(mcpClient.getServers());
      toast({
        title: "Server Updated",
        description: `${serverName} has been updated successfully`,
      });
    }
    
    setIsEditServerOpen(false);
    setSelectedServer(null);
    resetForm();
  };

  const handleDeleteServer = (server: MCPServer) => {
    const success = mcpClient.removeServer(server.id);
    
    if (success) {
      setServers(mcpClient.getServers());
      toast({
        title: "Server Removed",
        description: `${server.name} has been removed`,
      });
    }
  };

  const handleTestConnection = async (server: MCPServer) => {
    toast({
      title: "Testing Connection",
      description: `Checking connection to ${server.name}...`,
    });
    
    const result = await mcpClient.testServerConnection(server);
    
    if (result.error) {
      toast({
        title: "Connection Failed",
        description: result.error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Connection Successful",
        description: `${server.name} is responding correctly`,
      });
    }
  };

  const openEditDialog = (server: MCPServer) => {
    setSelectedServer(server);
    setServerName(server.name);
    setServerUrl(server.url);
    setServerType(server.type);
    setServerApiKey(server.apiKey || "");
    setServerDescription(server.description || "");
    setServerCommands(server.commands || []);
    setIsEditServerOpen(true);
  };

  const openCommandsDialog = (server: MCPServer) => {
    setSelectedServer(server);
    setServerCommands(server.commands || []);
    setIsCommandsOpen(true);
  };

  const addCommand = () => {
    setServerCommands([...serverCommands, { name: "", description: "" }]);
  };

  const updateCommand = (index: number, field: keyof MCPCommand, value: string) => {
    const updated = [...serverCommands];
    updated[index] = { ...updated[index], [field]: value };
    setServerCommands(updated);
  };

  const removeCommand = (index: number) => {
    setServerCommands(serverCommands.filter((_, i) => i !== index));
  };

  const saveCommands = () => {
    if (selectedServer) {
      mcpClient.updateServer(selectedServer.id, { commands: serverCommands });
      setServers(mcpClient.getServers());
      toast({
        title: "Commands Updated",
        description: `Commands for ${selectedServer.name} have been updated`,
      });
    }
    setIsCommandsOpen(false);
    setSelectedServer(null);
  };

  // Toggle Supabase sync
  const toggleSupabaseSync = async () => {
    const newState = !syncEnabled;
    setSyncEnabled(newState);
    
    if (newState) {
      await checkConnection();
      toast({
        title: "Sync Enabled",
        description: "Your data will be synchronized with the cloud",
      });
    } else {
      toast({
        title: "Sync Disabled",
        description: "Your data will only be stored locally",
      });
    }
  };

  const getSyncStatusText = () => {
    if (!syncEnabled) return "Disabled";
    switch (syncStatus) {
      case 'synced': return "Connected & Synced";
      case 'syncing': return "Syncing...";
      case 'offline': return "Offline";
      default: return "Unknown";
    }
  };

  const getSyncStatusColor = () => {
    if (!syncEnabled) return "bg-gray-400";
    switch (syncStatus) {
      case 'synced': return "bg-green-500";
      case 'syncing': return "bg-yellow-500";
      case 'offline': return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-xl font-medium">Integrations</h2>
        <p className="text-sm text-gray-400">
          Connect external services to enhance your assistant's capabilities
        </p>
      </div>
      
      {/* Supabase Integration Section */}
      <div className="border rounded-lg p-4 bg-white/5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900">
              <Database className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h3 className="font-medium">Supabase Database</h3>
              <div className="flex items-center mt-1">
                <div className={`h-2 w-2 rounded-full ${getSyncStatusColor()} mr-2`}></div>
                <p className="text-xs text-gray-500">{getSyncStatusText()}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={toggleSupabaseSync}>
            {syncEnabled ? "Disable" : "Enable"}
          </Button>
        </div>

        <div className="text-sm text-gray-500 space-y-2 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md">
          <div className="flex items-center justify-between">
            <span>Cloud User ID:</span>
            <span className="font-mono text-xs">{currentUser?.id || 'Not connected'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Sync Status:</span>
            <span>{getSyncStatusText()}</span>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Your chat history, memories, and settings are automatically synchronized with Supabase.
        </p>
      </div>

      {/* MCP Servers Section */}
      <div className="border rounded-lg p-4 bg-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">MCP Servers</h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Model Context Protocol servers allow AI to interact with external services
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Button onClick={() => setIsAddServerOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No MCP servers configured</p>
            <p className="text-xs mt-1">Add a server to enable external integrations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map((server) => (
              <div key={server.id} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${activeConnections[server.id] ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                      <div>
                        <h4 className="font-medium">{server.name}</h4>
                        <p className="text-xs text-gray-500">{server.type} • {server.url}</p>
                        {server.description && (
                          <p className="text-xs text-gray-400 mt-1">{server.description}</p>
                        )}
                      </div>
                    </div>
                    {activeConnections[server.id] && (
                      <div className="flex items-center px-2 py-1 bg-green-500/20 rounded text-xs text-green-500">
                        <Zap className="h-3 w-3 mr-1" />
                        Active
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleTestConnection(server)}>
                      <TestTube className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openCommandsDialog(server)}>
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(server)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteServer(server)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {server.commands && server.commands.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-gray-500 mb-1">Available Commands:</p>
                    <div className="flex flex-wrap gap-1">
                      {server.commands.map((cmd, idx) => (
                        <span key={idx} className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                          {cmd.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-400 mt-4">
          <p className="font-semibold">How to use MCP servers:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Add your custom MCP server with its API endpoint</li>
            <li>Define commands to help the AI understand what the server can do</li>
            <li>The AI will automatically call your server when relevant</li>
          </ul>
        </div>
      </div>

      {/* Add Server Dialog */}
      <Dialog open={isAddServerOpen} onOpenChange={setIsAddServerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add MCP Server</DialogTitle>
            <DialogDescription>
              Connect to an external MCP server to enhance your assistant
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serverName">Server Name *</Label>
                <Input
                  id="serverName"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="My Custom Server"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverType">Type</Label>
                <Input
                  id="serverType"
                  value={serverType}
                  onChange={(e) => setServerType(e.target.value)}
                  placeholder="search, api, custom..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serverUrl">Server URL *</Label>
              <Input
                id="serverUrl"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://your-mcp-server.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serverApiKey">API Key (Optional)</Label>
              <Input
                id="serverApiKey"
                type="password"
                value={serverApiKey}
                onChange={(e) => setServerApiKey(e.target.value)}
                placeholder="Your API key if required"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serverDescription">Description (Optional)</Label>
              <Input
                id="serverDescription"
                value={serverDescription}
                onChange={(e) => setServerDescription(e.target.value)}
                placeholder="Brief description of what this server does"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddServerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddServer}>
              Add Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Server Dialog */}
      <Dialog open={isEditServerOpen} onOpenChange={setIsEditServerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit MCP Server</DialogTitle>
            <DialogDescription>
              Update server configuration
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editServerName">Server Name *</Label>
                <Input
                  id="editServerName"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="My Custom Server"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editServerType">Type</Label>
                <Input
                  id="editServerType"
                  value={serverType}
                  onChange={(e) => setServerType(e.target.value)}
                  placeholder="search, api, custom..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editServerUrl">Server URL *</Label>
              <Input
                id="editServerUrl"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://your-mcp-server.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editServerApiKey">API Key (Optional)</Label>
              <Input
                id="editServerApiKey"
                type="password"
                value={serverApiKey}
                onChange={(e) => setServerApiKey(e.target.value)}
                placeholder="Your API key if required"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editServerDescription">Description (Optional)</Label>
              <Input
                id="editServerDescription"
                value={serverDescription}
                onChange={(e) => setServerDescription(e.target.value)}
                placeholder="Brief description of what this server does"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditServerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditServer}>
              Update Server
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MCP Commands Dialog */}
      <Dialog open={isCommandsOpen} onOpenChange={setIsCommandsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>MCP Commands</DialogTitle>
            <DialogDescription>
              Define commands to help the AI understand what this server can do
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {serverCommands.map((command, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Command {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCommand(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Command Name</Label>
                    <Input
                      value={command.name}
                      onChange={(e) => updateCommand(index, 'name', e.target.value)}
                      placeholder="search_web"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={command.description}
                      onChange={(e) => updateCommand(index, 'description', e.target.value)}
                      placeholder="Search the web for information"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Example Usage (Optional)</Label>
                  <Textarea
                    value={command.example || ''}
                    onChange={(e) => updateCommand(index, 'example', e.target.value)}
                    placeholder="Example: search_web(query='latest AI news')"
                    className="min-h-[60px]"
                  />
                </div>
              </div>
            ))}
            
            <Button variant="outline" onClick={addCommand} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Command
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommandsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCommands}>
              Save Commands
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsTab;
