
import React, { useState, useEffect } from "react";
import { Cloud, Zap, Mail, Calendar, FolderOpen, Search, ArrowUpRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import getMcpClient from "@/services/mcpService";
import { useIsMobile } from "@/hooks/use-mobile";

const MCPStatusIndicator: React.FC = () => {
  const mcpClient = getMcpClient();
  const [activeConnections, setActiveConnections] = useState<Record<string, boolean>>({
    gmail: false,
    calendar: false,
    drive: false,
    search: false
  });
  const [isAnyActive, setIsAnyActive] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [serverUrls, setServerUrls] = useState<Record<string, string>>({
    search: ""
  });
  const isMobile = useIsMobile();
  
  useEffect(() => {
    const interval = setInterval(() => {
      const connections = mcpClient.getActiveConnections();
      setActiveConnections(connections);
      setIsAnyActive(mcpClient.isAnyToolActive());
      
      // Update server URLs
      setServerUrls({
        search: mcpClient.getServerUrl('search')
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getIconForTool = (tool: string) => {
    switch(tool) {
      case 'gmail': return <Mail className="h-4 w-4" />;
      case 'calendar': return <Calendar className="h-4 w-4" />;
      case 'drive': return <FolderOpen className="h-4 w-4" />;
      case 'search': return <Search className="h-4 w-4" />;
      default: return <Cloud className="h-4 w-4" />;
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

      <div className="space-y-3">
        {Object.entries(activeConnections).map(([tool, isActive]) => (
          <div key={tool} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                {getIconForTool(tool)}
              </div>
              <div>
                <p className="font-medium">{tool.charAt(0).toUpperCase() + tool.slice(1)}</p>
                <p className="text-xs text-gray-500">
                  {isActive ? 'Active connection' : 'Not currently active'}
                </p>
                {tool === 'search' && (
                  <p className="text-xs text-gray-400 mt-1 truncate max-w-[180px]">
                    Server: {serverUrls.search || 'Not configured'}
                  </p>
                )}
              </div>
            </div>
            <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>
        ))}
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center">
              <Cloud className="h-5 w-5 mr-2" />
              MCP Connection Status
            </SheetTitle>
            <SheetDescription>
              Current status of external services
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-medium">Available Tools</h3>
            <div className="space-y-3">
              {Object.entries(activeConnections).map(([tool, isActive]) => (
                <div key={tool} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${isActive ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                      {getIconForTool(tool)}
                    </div>
                    <div>
                      <p className="font-medium">{tool.charAt(0).toUpperCase() + tool.slice(1)}</p>
                      <p className="text-xs text-gray-500">
                        {isActive ? 'Active connection' : 'Not currently active'}
                      </p>
                      {tool === 'search' && (
                        <p className="text-xs text-gray-400 mt-1 truncate max-w-[180px]">
                          Server: {serverUrls.search || 'Not configured'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
              ))}
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">
                These tools are called through MCP (Model Context Protocol) when the AI assistant needs to access external data.
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
