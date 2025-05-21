
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Settings, Info, ArrowUpRight, Check, X, Zap } from "lucide-react";
import MCPStatusIndicator from "@/components/MCPStatusIndicator";
import getMcpClient from "@/services/mcpService";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Default search server URL
const DEFAULT_SEARCH_SERVER = "https://duckduckgo-mcp-server.onrender.com";

const IntegrationsTab = () => {
  const [isAddIntegrationOpen, setIsAddIntegrationOpen] = useState(false);
  const [integrationType, setIntegrationType] = useState<string>("");
  const [serverUrl, setServerUrl] = useState<string>("");
  const [serverName, setServerName] = useState<string>("");
  const [integrationCode, setIntegrationCode] = useState<string>("");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [activeServices, setActiveServices] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const mcpClient = getMcpClient();
  
  // Regularly check for active MCP connections
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveServices(mcpClient.getActiveConnections());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleAddIntegration = () => {
    if (!serverName || !serverUrl) {
      toast({
        title: "Missing Information",
        description: "Please provide both a server name and URL",
        variant: "destructive",
      });
      return;
    }

    // Validate URL format
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

    // Add the integration
    mcpClient.updateServerUrl(integrationType, serverUrl);
    
    toast({
      title: "Integration Added",
      description: `${serverName} integration has been added successfully`,
    });
    
    setIsAddIntegrationOpen(false);
    setServerName("");
    setServerUrl("");
    setIntegrationType("");
  };

  const handleConfigureService = (service: string) => {
    setSelectedService(service);
    
    // Set initial URL value based on current configuration
    const currentUrl = mcpClient.getServerUrl(service);
    setServerUrl(currentUrl);
    
    setIsConfiguring(true);
  };

  const handleSaveServiceConfig = () => {
    if (!selectedService || !serverUrl) return;
    
    // Validate URL
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
    
    mcpClient.updateServerUrl(selectedService, serverUrl);
    toast({
      title: "Server Configuration Saved",
      description: `Updated ${selectedService} server configuration`,
    });
    
    setIsConfiguring(false);
    setSelectedService(null);
    setServerUrl("");
  };

  const handleResetToDefault = () => {
    if (!selectedService) return;
    
    if (selectedService === 'search') {
      mcpClient.updateServerUrl(selectedService, DEFAULT_SEARCH_SERVER);
      setServerUrl(DEFAULT_SEARCH_SERVER);
      
      toast({
        title: "Default Configuration Restored",
        description: `Reset ${selectedService} server to default`,
      });
    }
  };

  // Test integration connection
  const testIntegration = async () => {
    toast({
      title: "Testing Connection",
      description: "Checking connection to the server...",
    });
    
    try {
      // Implement a simple connection test based on server type
      const response = await fetch(`${serverUrl}/status`, { method: 'GET' });
      
      if (response.ok) {
        toast({
          title: "Connection Successful",
          description: "Server is responding correctly",
        });
      } else {
        throw new Error(`Server responded with status: ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Could not connect to server",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-xl font-medium">Integrations</h2>
        <p className="text-sm text-gray-400">
          Connect external MCP servers to enhance your assistant's capabilities
        </p>
      </div>
      
      <div className="border rounded-lg p-4 bg-white/5">
        <MCPStatusIndicator />
        
        <div className="mt-6">
          <Button 
            onClick={() => setIsAddIntegrationOpen(true)} 
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>
      </div>
      
      <div className="text-xs text-gray-400 mt-4">
        <p className="font-semibold">How does this work?</p>
        <p className="mt-1">
          When connected to MCP servers, you can ask your AI assistant to:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Search the web with "Search for the latest news about AI"</li>
          <li>Access email with "Check my latest emails" (if connected)</li>
          <li>Manage calendar with "Schedule a meeting" (if connected)</li>
          <li>Use any other MCP-compatible services you configure</li>
        </ul>
      </div>
      
      {/* Add Integration Dialog */}
      <Dialog open={isAddIntegrationOpen} onOpenChange={setIsAddIntegrationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add MCP Integration</DialogTitle>
            <DialogDescription>
              Connect to an external MCP server to enhance your assistant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="integrationName">Integration Name</Label>
              <Input
                id="integrationName"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="Search Server"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="integrationType">Integration Type</Label>
              <select
                id="integrationType"
                value={integrationType}
                onChange={(e) => setIntegrationType(e.target.value)}
                className="w-full rounded-md border border-input px-3 py-2 bg-background text-sm"
              >
                <option value="">Select a type</option>
                <option value="search">Search</option>
                <option value="gmail">Gmail</option>
                <option value="calendar">Calendar</option>
                <option value="drive">Drive</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serverUrl">Server URL</Label>
              <Input
                id="serverUrl"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://example-mcp-server.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="integrationCode">Integration Code (Optional)</Label>
              <textarea
                id="integrationCode"
                value={integrationCode}
                onChange={(e) => setIntegrationCode(e.target.value)}
                placeholder="Paste any custom integration code here"
                className="w-full min-h-24 rounded-md border border-input px-3 py-2 bg-background text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddIntegrationOpen(false)}>
              Cancel
            </Button>
            <Button onClick={testIntegration}>
              Test Connection
            </Button>
            <Button onClick={handleAddIntegration}>
              Add Integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Configure Server Dialog */}
      <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure MCP Server</DialogTitle>
            <DialogDescription>
              {selectedService === 'search' ? 
                "Set the URL for the search server" :
                `Configure ${selectedService} server settings`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Server URL</Label>
              <Input
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder={selectedService === 'search' ? 
                  "https://duckduckgo-mcp-server.onrender.com" : 
                  "Enter MCP server URL"
                }
              />
              <p className="text-xs text-gray-500">
                {selectedService === 'search' ? 
                  "Default: https://duckduckgo-mcp-server.onrender.com" : 
                  "Enter the complete URL including http:// or https://"
                }
              </p>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {selectedService === 'search' && (
              <Button 
                variant="outline" 
                onClick={handleResetToDefault}
                className="sm:mr-auto"
              >
                Reset to Default
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsConfiguring(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveServiceConfig}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegrationsTab;
