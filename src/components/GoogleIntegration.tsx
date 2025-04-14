
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Calendar, FolderOpen, Check, X } from "lucide-react";

// Mock localStorage key to store the connection status (in a real app, you'd use OAuth tokens)
const LOCAL_STORAGE_GOOGLE_SERVICES = "google-services-connected";

interface GoogleServices {
  gmail: boolean;
  calendar: boolean;
  drive: boolean;
  account?: string;
}

const GoogleIntegration: React.FC = () => {
  const [connected, setConnected] = useState<GoogleServices>({
    gmail: false,
    calendar: false,
    drive: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    const savedServices = localStorage.getItem(LOCAL_STORAGE_GOOGLE_SERVICES);
    if (savedServices) {
      try {
        setConnected(JSON.parse(savedServices));
      } catch (error) {
        console.error("Failed to parse saved Google services:", error);
      }
    }
  }, []);

  const handleConnectGoogle = () => {
    // In a real implementation, this would initiate the OAuth2 flow
    // For this mock, we'll just simulate a successful connection
    const newConnected = {
      gmail: true,
      calendar: true,
      drive: true,
      account: "user@gmail.com",
    };
    
    setConnected(newConnected);
    localStorage.setItem(LOCAL_STORAGE_GOOGLE_SERVICES, JSON.stringify(newConnected));
    
    toast({
      title: "Connected",
      description: "Successfully connected to Google services",
    });
  };

  const handleDisconnect = () => {
    const newConnected = {
      gmail: false,
      calendar: false,
      drive: false,
    };
    
    setConnected(newConnected);
    localStorage.setItem(LOCAL_STORAGE_GOOGLE_SERVICES, JSON.stringify(newConnected));
    
    toast({
      title: "Disconnected",
      description: "Google services have been disconnected",
    });
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Google Integration</h3>
        <p className="text-sm text-gray-400">
          Connect your Google account to access Gmail, Calendar, and Drive
        </p>
      </div>
      
      {connected.account ? (
        <div className="space-y-4">
          <div className="bg-green-100/10 p-3 rounded-lg border border-green-200/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Connected as {connected.account}</span>
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
                <span className="ml-auto text-xs bg-green-100/20 text-green-500 px-2 py-1 rounded-full">
                  Connected
                </span>
              </div>
              
              <div className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg">
                <Calendar className="h-5 w-5 text-gemini-secondary" />
                <span className="text-sm">Google Calendar</span>
                <span className="ml-auto text-xs bg-green-100/20 text-green-500 px-2 py-1 rounded-full">
                  Connected
                </span>
              </div>
              
              <div className="flex items-center space-x-3 p-2 bg-white/5 rounded-lg">
                <FolderOpen className="h-5 w-5 text-gemini-tertiary" />
                <span className="text-sm">Google Drive</span>
                <span className="ml-auto text-xs bg-green-100/20 text-green-500 px-2 py-1 rounded-full">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Button 
          className="w-full bg-gemini-primary hover:bg-gemini-secondary"
          onClick={handleConnectGoogle}
        >
          Connect Google Account
        </Button>
      )}
      
      <div className="text-xs text-gray-400 mt-2">
        <p>
          Connecting your Google account will allow the AI assistant to:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Read and compose emails (Gmail)</li>
          <li>View and create calendar events (Calendar)</li>
          <li>Access and manage files (Drive)</li>
        </ul>
      </div>
    </div>
  );
};

export default GoogleIntegration;
