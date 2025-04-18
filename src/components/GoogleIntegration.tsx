
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Calendar, FolderOpen, Check, X, Zap, Activity } from "lucide-react";
import { getMcpClient } from "@/services/mcpService";

// MCP server auth URL
const MCP_SERVER_URL = "https://cloud-connect-mcp-server.onrender.com";
const AUTH_INIT_URL = `${MCP_SERVER_URL}/auth/init/gmail`;

// Storage key for connection state
const LOCAL_STORAGE_GMAIL_CONNECTED = "gmail-connected";

interface ConnectionStatus {
  gmail: boolean;
  calendar: boolean;
  drive: boolean;
  email?: string;
}

const GoogleIntegration: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    gmail: false,
    calendar: false,
    drive: false
  });
  const [activeServices, setActiveServices] = useState<Record<string, boolean>>({
    gmail: false,
    calendar: false,
    drive: false
  });
  const { toast } = useToast();
  const mcpClient = getMcpClient();

  // Check for connection status on component mount
  useEffect(() => {
    const checkConnectionStatus = () => {
      // Check if we have a stored connection status
      const storedStatus = localStorage.getItem(LOCAL_STORAGE_GMAIL_CONNECTED);
      if (storedStatus) {
        try {
          setConnectionStatus(JSON.parse(storedStatus));
        } catch (error) {
          console.error("Failed to parse stored connection status:", error);
        }
      }

      // Check for OAuth callback parameters in URL
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('auth_success');
      const email = urlParams.get('email');
      
      if (success === 'true' && email) {
        // Update connection status
        const newStatus = {
          gmail: true,
          calendar: false, // We're only supporting Gmail for now
          drive: false,
          email: email
        };
        
        setConnectionStatus(newStatus);
        localStorage.setItem(LOCAL_STORAGE_GMAIL_CONNECTED, JSON.stringify(newStatus));
        
        // Show success toast
        toast({
          title: "Gmail Connected",
          description: `Successfully connected Gmail for ${email}`,
        });
        
        // Remove query parameters from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    checkConnectionStatus();
  }, [toast]);
  
  // Regularly check for active MCP connections
  useEffect(() => {
    const interval = setInterval(() => {
      const connections = mcpClient.getActiveConnections();
      setActiveServices({
        gmail: connections.gmail || false,
        calendar: connections.calendar || false,
        drive: connections.drive || false
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleConnectGmail = () => {
    // Redirect to the MCP server's OAuth init endpoint
    window.location.href = AUTH_INIT_URL;
  };

  const handleDisconnect = () => {
    // In a real implementation, we would call an endpoint to revoke tokens
    // For now, just clear the local storage
    const newStatus = {
      gmail: false,
      calendar: false,
      drive: false
    };
    
    setConnectionStatus(newStatus);
    localStorage.setItem(LOCAL_STORAGE_GMAIL_CONNECTED, JSON.stringify(newStatus));
    
    toast({
      title: "Disconnected",
      description: "Google services have been disconnected",
    });
  };

  const getActivityIcon = (isActive: boolean) => {
    return isActive ? (
      <Activity className="h-3 w-3 text-green-500 animate-pulse" />
    ) : null;
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Google Integration</h3>
        <p className="text-sm text-gray-400">
          Connect your Google account to access Gmail through our MCP server
        </p>
      </div>
      
      {connectionStatus.email ? (
        <div className="space-y-4">
          <div className="bg-green-100/10 p-3 rounded-lg border border-green-200/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Connected as {connectionStatus.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDisconnect}
                className="border-red-300/30 hover:bg-red-100/10 text-red-400"
              >
                <X className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Connected Services</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg">
                <Mail className="h-5 w-5 text-gemini-primary" />
                <span className="text-sm">Gmail</span>
                <div className="flex items-center ml-auto">
                  {activeServices.gmail && (
                    <div className="flex items-center mr-2 px-1.5 py-0.5 bg-green-500/20 rounded text-xs text-green-500">
                      <Zap className="h-3 w-3 mr-1" />
                      Active
                    </div>
                  )}
                  <span className="text-xs bg-green-100/20 text-green-500 px-2 py-1 rounded-full">
                    Connected
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg">
                <Calendar className="h-5 w-5 text-gemini-secondary" />
                <span className="text-sm">Google Calendar</span>
                <div className="flex items-center ml-auto">
                  {activeServices.calendar && (
                    <div className="flex items-center mr-2 px-1.5 py-0.5 bg-green-500/20 rounded text-xs text-green-500">
                      <Zap className="h-3 w-3 mr-1" />
                      Active
                    </div>
                  )}
                  <span className="text-xs bg-gray-100/20 text-gray-500 px-2 py-1 rounded-full">
                    Not Connected
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg">
                <FolderOpen className="h-5 w-5 text-gemini-tertiary" />
                <span className="text-sm">Google Drive</span>
                <div className="flex items-center ml-auto">
                  {activeServices.drive && (
                    <div className="flex items-center mr-2 px-1.5 py-0.5 bg-green-500/20 rounded text-xs text-green-500">
                      <Zap className="h-3 w-3 mr-1" />
                      Active
                    </div>
                  )}
                  <span className="text-xs bg-gray-100/20 text-gray-500 px-2 py-1 rounded-full">
                    Not Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Button 
          className="w-full bg-gemini-primary hover:bg-gemini-secondary"
          onClick={handleConnectGmail}
        >
          <Mail className="h-4 w-4 mr-2" />
          Connect Gmail
        </Button>
      )}
      
      <div className="text-xs text-gray-400 mt-2">
        <p>
          When you connect Gmail, our assistant will be able to:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Read your emails when prompted</li>
          <li>Send emails on your behalf when requested</li>
          <li>Search and retrieve specific emails</li>
        </ul>
        <p className="mt-2">
          All communication happens securely through our MCP server.
        </p>
      </div>
    </div>
  );
};

export default GoogleIntegration;
