
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Settings, Info, ArrowUpRight, Check, X, Zap, Database, Cloud, Trash2, TestTube, Edit, Globe, Code } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getCurrentUser, useSupabaseSync } from "@/services/supabaseService";
import { supabase } from "@/integrations/supabase/client";
import getMcpClient, { Integration, IntegrationCommand, ApiEndpoint } from "@/services/mcpService";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const IntegrationsTab = () => {
  const [isAddIntegrationOpen, setIsAddIntegrationOpen] = useState(false);
  const [isEditIntegrationOpen, setIsEditIntegrationOpen] = useState(false);
  const [isCommandsOpen, setIsCommandsOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activeConnections, setActiveConnections] = useState<Record<string, boolean>>({});
  
  // Form states
  const [integrationName, setIntegrationName] = useState("");
  const [integrationUrl, setIntegrationUrl] = useState("");
  const [integrationType, setIntegrationType] = useState<'mcp' | 'api'>('mcp');
  const [integrationCategory, setIntegrationCategory] = useState("");
  const [integrationApiKey, setIntegrationApiKey] = useState("");
  const [integrationDescription, setIntegrationDescription] = useState("");
  const [integrationCommands, setIntegrationCommands] = useState<IntegrationCommand[]>([]);
  const [integrationHeaders, setIntegrationHeaders] = useState<Record<string, string>>({});
  const [integrationEndpoints, setIntegrationEndpoints] = useState<ApiEndpoint[]>([]);
  
  const { toast } = useToast();
  const mcpClient = getMcpClient();
  
  // Supabase related states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { syncStatus, checkConnection } = useSupabaseSync();
  const [syncEnabled, setSyncEnabled] = useState(true);

  // Load integrations on component mount
  useEffect(() => {
    setIntegrations(mcpClient.getServers());
  }, []);
  
  // Regularly check for active connections
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
    setIntegrationName("");
    setIntegrationUrl("");
    setIntegrationType('mcp');
    setIntegrationCategory("");
    setIntegrationApiKey("");
    setIntegrationDescription("");
    setIntegrationCommands([]);
    setIntegrationHeaders({});
    setIntegrationEndpoints([]);
  };

  const handleAddIntegration = async () => {
    if (!integrationName || !integrationUrl) {
      toast({
        title: "Missing Information",
        description: "Please provide both a name and URL",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(integrationUrl);
    } catch (e) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL including http:// or https://",
        variant: "destructive",
      });
      return;
    }

    const newIntegration = mcpClient.addServer({
      name: integrationName,
      url: integrationUrl,
      type: integrationType,
      category: integrationCategory || 'custom',
      apiKey: integrationApiKey || undefined,
      description: integrationDescription || undefined,
      commands: integrationCommands.length > 0 ? integrationCommands : undefined,
      headers: Object.keys(integrationHeaders).length > 0 ? integrationHeaders : undefined,
      endpoints: integrationEndpoints.length > 0 ? integrationEndpoints : undefined
    });
    
    setIntegrations(mcpClient.getServers());
    
    toast({
      title: "Integration Added",
      description: `${integrationName} has been added successfully`,
    });
    
    setIsAddIntegrationOpen(false);
    resetForm();
  };

  const handleEditIntegration = () => {
    if (!selectedIntegration) return;
    
    const success = mcpClient.updateServer(selectedIntegration.id, {
      name: integrationName,
      url: integrationUrl,
      type: integrationType,
      category: integrationCategory,
      apiKey: integrationApiKey || undefined,
      description: integrationDescription || undefined,
      commands: integrationCommands.length > 0 ? integrationCommands : undefined,
      headers: Object.keys(integrationHeaders).length > 0 ? integrationHeaders : undefined,
      endpoints: integrationEndpoints.length > 0 ? integrationEndpoints : undefined
    });
    
    if (success) {
      setIntegrations(mcpClient.getServers());
      toast({
        title: "Integration Updated",
        description: `${integrationName} has been updated successfully`,
      });
    }
    
    setIsEditIntegrationOpen(false);
    setSelectedIntegration(null);
    resetForm();
  };

  const handleDeleteIntegration = (integration: Integration) => {
    const success = mcpClient.removeServer(integration.id);
    
    if (success) {
      setIntegrations(mcpClient.getServers());
      toast({
        title: "Integration Removed",
        description: `${integration.name} has been removed`,
      });
    }
  };

  const handleTestConnection = async (integration: Integration) => {
    toast({
      title: "Testing Connection",
      description: `Checking connection to ${integration.name}...`,
    });
    
    const result = await mcpClient.testServerConnection(integration);
    
    if (result.error) {
      toast({
        title: "Connection Failed",
        description: result.error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Connection Successful",
        description: `${integration.name} is responding correctly`,
      });
    }
  };

  const openEditDialog = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIntegrationName(integration.name);
    setIntegrationUrl(integration.url);
    setIntegrationType(integration.type);
    setIntegrationCategory(integration.category);
    setIntegrationApiKey(integration.apiKey || "");
    setIntegrationDescription(integration.description || "");
    setIntegrationCommands(integration.commands || []);
    setIntegrationHeaders(integration.headers || {});
    setIntegrationEndpoints(integration.endpoints || []);
    setIsEditIntegrationOpen(true);
  };

  const openCommandsDialog = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIntegrationCommands(integration.commands || []);
    setIntegrationEndpoints(integration.endpoints || []);
    setIsCommandsOpen(true);
  };

  const addCommand = () => {
    setIntegrationCommands([...integrationCommands, { name: "", description: "" }]);
  };

  const addEndpoint = () => {
    setIntegrationEndpoints([...integrationEndpoints, { 
      name: "", 
      path: "", 
      method: 'GET', 
      description: "" 
    }]);
  };

  const updateCommand = (index: number, field: keyof IntegrationCommand, value: string) => {
    const updated = [...integrationCommands];
    updated[index] = { ...updated[index], [field]: value };
    setIntegrationCommands(updated);
  };

  const updateEndpoint = (index: number, field: keyof ApiEndpoint, value: string) => {
    const updated = [...integrationEndpoints];
    updated[index] = { ...updated[index], [field]: value };
    setIntegrationEndpoints(updated);
  };

  const removeCommand = (index: number) => {
    setIntegrationCommands(integrationCommands.filter((_, i) => i !== index));
  };

  const removeEndpoint = (index: number) => {
    setIntegrationEndpoints(integrationEndpoints.filter((_, i) => i !== index));
  };

  const saveCommands = () => {
    if (selectedIntegration) {
      mcpClient.updateServer(selectedIntegration.id, { 
        commands: integrationCommands,
        endpoints: integrationEndpoints 
      });
      setIntegrations(mcpClient.getServers());
      toast({
        title: "Configuration Updated",
        description: `Configuration for ${selectedIntegration.name} has been updated`,
      });
    }
    setIsCommandsOpen(false);
    setSelectedIntegration(null);
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

  const getIntegrationIcon = (integration: Integration) => {
    if (integration.type === 'mcp') {
      return <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-300" />;
    }
    return <Globe className="h-5 w-5 text-green-600 dark:text-green-300" />;
  };

  const mcpIntegrations = integrations.filter(i => i.type === 'mcp');
  const apiIntegrations = integrations.filter(i => i.type === 'api');

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

      {/* External Integrations Section */}
      <div className="border rounded-lg p-4 bg-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">External Integrations</h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  Connect MCP servers or direct APIs to extend AI capabilities
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Button onClick={() => setIsAddIntegrationOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>

        {integrations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No external integrations configured</p>
            <p className="text-xs mt-1">Add MCP servers or APIs to enable external integrations</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({integrations.length})</TabsTrigger>
              <TabsTrigger value="mcp">MCP ({mcpIntegrations.length})</TabsTrigger>
              <TabsTrigger value="api">APIs ({apiIntegrations.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    isActive={activeConnections[integration.id]}
                    onTest={() => handleTestConnection(integration)}
                    onEdit={() => openEditDialog(integration)}
                    onCommands={() => openCommandsDialog(integration)}
                    onDelete={() => handleDeleteIntegration(integration)}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="mcp" className="mt-4">
              <div className="space-y-3">
                {mcpIntegrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    isActive={activeConnections[integration.id]}
                    onTest={() => handleTestConnection(integration)}
                    onEdit={() => openEditDialog(integration)}
                    onCommands={() => openCommandsDialog(integration)}
                    onDelete={() => handleDeleteIntegration(integration)}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="api" className="mt-4">
              <div className="space-y-3">
                {apiIntegrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    isActive={activeConnections[integration.id]}
                    onTest={() => handleTestConnection(integration)}
                    onEdit={() => openEditDialog(integration)}
                    onCommands={() => openCommandsDialog(integration)}
                    onDelete={() => handleDeleteIntegration(integration)}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="text-xs text-gray-400 mt-4">
          <p className="font-semibold">Integration Types:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><strong>MCP Servers:</strong> Model Context Protocol servers with standardized interfaces</li>
            <li><strong>Direct APIs:</strong> REST APIs with custom endpoints and configurations</li>
          </ul>
        </div>
      </div>

      {/* Add Integration Dialog */}
      <Dialog open={isAddIntegrationOpen} onOpenChange={setIsAddIntegrationOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Integration</DialogTitle>
            <DialogDescription>
              Connect an MCP server or direct API to enhance your assistant
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="integrationName">Name *</Label>
                <Input
                  id="integrationName"
                  value={integrationName}
                  onChange={(e) => setIntegrationName(e.target.value)}
                  placeholder="My Custom Integration"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="integrationType">Type *</Label>
                <Select value={integrationType} onValueChange={(value: 'mcp' | 'api') => setIntegrationType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcp">MCP Server</SelectItem>
                    <SelectItem value="api">Direct API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="integrationUrl">URL *</Label>
                <Input
                  id="integrationUrl"
                  value={integrationUrl}
                  onChange={(e) => setIntegrationUrl(e.target.value)}
                  placeholder="https://your-service.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="integrationCategory">Category</Label>
                <Input
                  id="integrationCategory"
                  value={integrationCategory}
                  onChange={(e) => setIntegrationCategory(e.target.value)}
                  placeholder="search, ai, custom..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="integrationApiKey">API Key (Optional)</Label>
              <Input
                id="integrationApiKey"
                type="password"
                value={integrationApiKey}
                onChange={(e) => setIntegrationApiKey(e.target.value)}
                placeholder="Your API key if required"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="integrationDescription">Description (Optional)</Label>
              <Input
                id="integrationDescription"
                value={integrationDescription}
                onChange={(e) => setIntegrationDescription(e.target.value)}
                placeholder="Brief description of what this integration does"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddIntegrationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddIntegration}>
              Add Integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Integration Dialog */}
      <Dialog open={isEditIntegrationOpen} onOpenChange={setIsEditIntegrationOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Integration</DialogTitle>
            <DialogDescription>
              Update integration configuration
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editIntegrationName">Name *</Label>
                <Input
                  id="editIntegrationName"
                  value={integrationName}
                  onChange={(e) => setIntegrationName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editIntegrationType">Type *</Label>
                <Select value={integrationType} onValueChange={(value: 'mcp' | 'api') => setIntegrationType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcp">MCP Server</SelectItem>
                    <SelectItem value="api">Direct API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editIntegrationUrl">URL *</Label>
                <Input
                  id="editIntegrationUrl"
                  value={integrationUrl}
                  onChange={(e) => setIntegrationUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editIntegrationCategory">Category</Label>
                <Input
                  id="editIntegrationCategory"
                  value={integrationCategory}
                  onChange={(e) => setIntegrationCategory(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIntegrationApiKey">API Key (Optional)</Label>
              <Input
                id="editIntegrationApiKey"
                type="password"
                value={integrationApiKey}
                onChange={(e) => setIntegrationApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editIntegrationDescription">Description (Optional)</Label>
              <Input
                id="editIntegrationDescription"
                value={integrationDescription}
                onChange={(e) => setIntegrationDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditIntegrationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditIntegration}>
              Update Integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commands/Endpoints Dialog */}
      <Dialog open={isCommandsOpen} onOpenChange={setIsCommandsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedIntegration?.type === 'mcp' ? 'MCP Commands' : 'API Endpoints'}
            </DialogTitle>
            <DialogDescription>
              Define {selectedIntegration?.type === 'mcp' ? 'commands' : 'endpoints'} to help the AI understand what this integration can do
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="commands" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="commands">
                {selectedIntegration?.type === 'mcp' ? 'Commands' : 'General Commands'}
              </TabsTrigger>
              <TabsTrigger value="endpoints" disabled={selectedIntegration?.type === 'mcp'}>
                API Endpoints
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="commands" className="space-y-4 py-4">
              {integrationCommands.map((command, index) => (
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
            </TabsContent>
            
            <TabsContent value="endpoints" className="space-y-4 py-4">
              {integrationEndpoints.map((endpoint, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Endpoint {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEndpoint(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Endpoint Name</Label>
                      <Input
                        value={endpoint.name}
                        onChange={(e) => updateEndpoint(index, 'name', e.target.value)}
                        placeholder="search"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Path</Label>
                      <Input
                        value={endpoint.path}
                        onChange={(e) => updateEndpoint(index, 'path', e.target.value)}
                        placeholder="/api/search"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Method</Label>
                      <Select 
                        value={endpoint.method} 
                        onValueChange={(value) => updateEndpoint(index, 'method', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={endpoint.description}
                      onChange={(e) => updateEndpoint(index, 'description', e.target.value)}
                      placeholder="Search for information using this endpoint"
                      className="min-h-[60px]"
                    />
                  </div>
                </div>
              ))}
              
              <Button variant="outline" onClick={addEndpoint} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Endpoint
              </Button>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommandsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCommands}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Integration Card Component
const IntegrationCard: React.FC<{
  integration: Integration;
  isActive: boolean;
  onTest: () => void;
  onEdit: () => void;
  onCommands: () => void;
  onDelete: () => void;
}> = ({ integration, isActive, onTest, onEdit, onCommands, onDelete }) => {
  const getIntegrationIcon = () => {
    if (integration.type === 'mcp') {
      return <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-300" />;
    }
    return <Globe className="h-5 w-5 text-green-600 dark:text-green-300" />;
  };

  return (
    <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <div className="p-2 rounded-md bg-gray-100 dark:bg-gray-800">
              {getIntegrationIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{integration.name}</h4>
                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-blue-600 dark:text-blue-300">
                  {integration.type.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-500">{integration.category} • {integration.url}</p>
              {integration.description && (
                <p className="text-xs text-gray-400 mt-1">{integration.description}</p>
              )}
            </div>
          </div>
          {isActive && (
            <div className="flex items-center px-2 py-1 bg-green-500/20 rounded text-xs text-green-500">
              <Zap className="h-3 w-3 mr-1" />
              Active
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onTest}>
            <TestTube className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onCommands}>
            <Settings className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {(integration.commands && integration.commands.length > 0) || (integration.endpoints && integration.endpoints.length > 0) && (
        <div className="mt-2 pt-2 border-t">
          <p className="text-xs text-gray-500 mb-1">
            Available {integration.type === 'mcp' ? 'Commands' : 'Endpoints'}:
          </p>
          <div className="flex flex-wrap gap-1">
            {integration.commands?.map((cmd, idx) => (
              <span key={idx} className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                {cmd.name}
              </span>
            ))}
            {integration.endpoints?.map((endpoint, idx) => (
              <span key={idx} className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded">
                {endpoint.method} {endpoint.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsTab;
