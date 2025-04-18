
import React, { useState, useEffect } from "react";
import { Cloud, Zap, Mail, Calendar, FolderOpen, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import getMcpClient from "@/services/mcpService";

const MCPStatusIndicator: React.FC = () => {
  const mcpClient = getMcpClient();
  const [activeConnections, setActiveConnections] = useState<Record<string, boolean>>({
    gmail: false,
    calendar: false,
    drive: false,
    search: false
  });
  const [isAnyActive, setIsAnyActive] = useState(false);
  
  useEffect(() => {
    // Check MCP connection status every second
    const interval = setInterval(() => {
      const connections = mcpClient.getActiveConnections();
      setActiveConnections(connections);
      setIsAnyActive(mcpClient.isAnyToolActive());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // If no connections are active, don't show the indicator
  if (!isAnyActive && Object.values(activeConnections).every(status => !status)) {
    return null;
  }
  
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
    <div className="fixed bottom-20 left-4 z-10">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`rounded-full p-2 flex items-center justify-center ${isAnyActive ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}>
            <Zap className="h-5 w-5 text-white" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="p-2">
            <h4 className="font-semibold mb-2">MCP Connection Status</h4>
            <div className="space-y-1">
              {Object.entries(activeConnections).map(([tool, isActive]) => (
                <div key={tool} className="flex items-center space-x-2">
                  <div className={`${isActive ? 'text-green-500' : 'text-gray-400'}`}>
                    {getIconForTool(tool)}
                  </div>
                  <span className={`text-sm ${isActive ? 'text-green-500 font-medium' : 'text-gray-400'}`}>
                    {tool.charAt(0).toUpperCase() + tool.slice(1)}
                    {isActive ? ' - Active' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default MCPStatusIndicator;
