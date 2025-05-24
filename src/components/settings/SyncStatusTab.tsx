
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { SyncService, SyncMetadata } from "@/services/syncService";
import { Cloud, Download, Upload, RefreshCw, HardDrive, Wifi, WifiOff } from "lucide-react";

const SyncStatusTab = () => {
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const metadata = SyncService.getSyncMetadata();
    setSyncMetadata(metadata);
  }, []);

  const handleUpload = async () => {
    setIsLoading(true);
    try {
      const success = await SyncService.uploadToCloud();
      if (success) {
        toast({
          title: "Upload Successful",
          description: "Local data has been uploaded to the cloud",
        });
        const metadata = SyncService.getSyncMetadata();
        setSyncMetadata(metadata);
      } else {
        toast({
          title: "Upload Failed",
          description: "Failed to upload data to cloud",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: "An error occurred while uploading",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const success = await SyncService.downloadFromCloud();
      if (success) {
        toast({
          title: "Download Successful",
          description: "Cloud data has been downloaded and applied locally",
        });
        const metadata = SyncService.getSyncMetadata();
        setSyncMetadata(metadata);
        // Refresh the page to apply changes
        window.location.reload();
      } else {
        toast({
          title: "Download Failed",
          description: "No cloud data found or download failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "An error occurred while downloading",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullSync = async () => {
    setIsLoading(true);
    try {
      const result = await SyncService.syncData();
      toast({
        title: "Sync Complete",
        description: `Data synced from ${result.syncMetadata.syncSource}`,
      });
      setSyncMetadata(result.syncMetadata);
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Error",
        description: "An error occurred during sync",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'cloud':
        return <Cloud className="h-4 w-4" />;
      case 'local':
        return <HardDrive className="h-4 w-4" />;
      case 'merged':
        return <Wifi className="h-4 w-4" />;
      default:
        return <WifiOff className="h-4 w-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'cloud':
        return 'bg-blue-500';
      case 'local':
        return 'bg-gray-500';
      case 'merged':
        return 'bg-green-500';
      default:
        return 'bg-red-500';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-xl font-medium">Data Sync Status</h2>
        <p className="text-sm text-gray-400">
          Manage synchronization between local storage and cloud
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {syncMetadata && getSourceIcon(syncMetadata.syncSource)}
            Current Sync Status
          </CardTitle>
          <CardDescription>
            View information about your data synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {syncMetadata && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Data Source:</span>
                <Badge 
                  className={`${getSourceColor(syncMetadata.syncSource)} text-white`}
                >
                  {syncMetadata.syncSource.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Synced:</span>
                <span className="text-sm text-gray-500">
                  {new Date(syncMetadata.lastSyncedAt).toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Data Version:</span>
                <Badge variant="outline">
                  v{syncMetadata.dataVersion}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Actions</CardTitle>
          <CardDescription>
            Manually control data synchronization between devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleFullSync}
            disabled={isLoading}
            className="w-full"
            variant="default"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Full Sync'}
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleUpload}
              disabled={isLoading}
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload to Cloud
            </Button>
            
            <Button
              onClick={handleDownload}
              disabled={isLoading}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download from Cloud
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Gets Synced</CardTitle>
          <CardDescription>
            All your settings and data are automatically synchronized
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Model configurations and API keys
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Speech and voice settings
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Custom commands and instructions
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              Conversation memories
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Chat history (background reference)
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
              Integration settings
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncStatusTab;
