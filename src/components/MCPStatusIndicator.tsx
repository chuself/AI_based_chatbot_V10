
import React, { useState, useEffect } from "react";
import { Cloud, Zap, ArrowUpRight, TestTube, Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import getMcpClient, { MCPServer } from "@/services/mcpService";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

const MCPStatusIndicator: React.FC = () => {
  const mcpClient = getMcpClient();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [activeConnections, setActiveConnections] = useState<Record<string, boolean>>({});
  const [isAnyActive, setIsAnyActive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  useEffect(() => {
    // Load servers initially
    setServers(mcpClient.getServers());
    
    const interval = setInterval(() => {
      const connections = mcpClient.getActiveConnections();
      setActiveConnections(connections);
      setIsAnyActive(mcpClient.isAnyServerActive());
      
      // Refresh servers list in case it changed
      setServers(mcpClient.getServers());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

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
  
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">MCP Connection Status</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={() => setIsOpen(true)}
              className={`rounded-full p-2 flex items-center justify-center shadow-md ${
                isAnyActive 
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-blue-500 hover:bg-blue-600'
              } transition-all duration-300`}
            >
              <Zap className="h-5 w-5 text-white" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>MCP Connection Status</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {servers.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No MCP servers configured</p>
          <p className="text-xs mt-1">Add servers in the integration settings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => (
            <div key={server.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${activeConnections[server.id] ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                  <Cloud className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{server.name}</p>
                  <p className="text-xs text-gray-500">
                    {activeConnections[server.id] ? 'Active connection' : 'Standby'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 truncate max-w-[180px]">
                    {server.type} • {new URL(server.url).hostname}
                  </p>
                </div>
              </div>
              <div className={`h-3 w-3 rounded-full ${activeConnections[server.id] ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>
          ))}
        </div>
      )}

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <Cloud className="h-5 w-5 mr-2" />
              MCP Servers Status
            </SheetTitle>
            <SheetDescription>
              Current status of your MCP servers
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {servers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No MCP servers configured</p>
                <p className="text-xs mt-1">Add servers in the integration settings</p>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-medium">Available Servers</h3>
                <div className="space-y-3">
                  {servers.map((server) => (
                    <div key={server.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${activeConnections[server.id] ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                            <Cloud className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{server.name}</p>
                            <p className="text-xs text-gray-500">
                              {activeConnections[server.id] ? 'Active' : 'Standby'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTestConnection(server)}
                        >
                          <TestTube className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="text-xs text-gray-400 space-y-1">
                        <p><span className="font-medium">Type:</span> {server.type}</p>
                        <p><span className="font-medium">URL:</span> {new URL(server.url).hostname}</p>
                        {server.description && (
                          <p><span className="font-medium">Description:</span> {server.description}</p>
                        )}
                        {server.commands && server.commands.length > 0 && (
                          <div>
                            <p className="font-medium">Commands:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {server.commands.map((cmd, idx) => (
                                <span key={idx} className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-xs">
                                  {cmd.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">
                MCP servers allow your AI assistant to access external services and APIs.
              </p>
              <a 
                href="https://modelcontextprotocol.github.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-xs text-blue-500 hover:underline mt-2"
              >
                Learn more about MCP
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </a>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MCPStatusIndicator;
