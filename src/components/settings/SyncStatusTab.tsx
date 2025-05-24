
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { SyncService, SyncMetadata, CloudDataVersion, SyncStatus } from "@/services/syncService";
import { Cloud, Download, Upload, RefreshCw, HardDrive, Wifi, WifiOff, LogOut, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const SyncStatusTab = () => {
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [cloudVersions, setCloudVersions] = useState<CloudDataVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("latest");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const metadata = SyncService.getSyncMetadata();
    const status = SyncService.getSyncStatus();
    setSyncMetadata(metadata);
    setSyncStatus(status);
    loadCloudVersions();
  }, []);

  const loadCloudVersions = async () => {
    try {
      const versions = await SyncService.getCloudVersions();
      setCloudVersions(versions);
    } catch (error) {
      console.error('Error loading cloud versions:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      
      navigate("/auth");
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

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
        const status = SyncService.getSyncStatus();
        setSyncMetadata(metadata);
        setSyncStatus(status);
        await loadCloudVersions();
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
      const versionId = selectedVersion === "latest" ? undefined : selectedVersion;
      const success = await SyncService.downloadFromCloud(versionId);
      if (success) {
        toast({
          title: "Download Successful",
          description: "Cloud data has been downloaded and applied locally",
        });
        const metadata = SyncService.getSyncMetadata();
        const status = SyncService.getSyncStatus();
        setSyncMetadata(metadata);
        setSyncStatus(status);
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
      const versionId = selectedVersion === "latest" ? undefined : selectedVersion;
      const result = await SyncService.syncData(versionId);
      toast({
        title: "Sync Complete",
        description: `Data synced from ${result.syncMetadata.syncSource}`,
      });
      setSyncMetadata(result.syncMetadata);
      const status = SyncService.getSyncStatus();
      setSyncStatus(status);
      await loadCloudVersions();
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

  const getSyncStatusDisplay = () => {
    if (!syncStatus) return null;

    const statusItems = [
      { key: 'modelConfig', label: 'Model Configuration', synced: syncStatus.modelConfig },
      { key: 'speechSettings', label: 'Speech Settings', synced: syncStatus.speechSettings },
      { key: 'generalSettings', label: 'General Settings', synced: syncStatus.generalSettings },
      { key: 'integrationSettings', label: 'Integration Settings', synced: syncStatus.integrationSettings },
      { key: 'customCommands', label: 'Custom Commands', synced: syncStatus.customCommands },
      { key: 'memories', label: 'Memories', synced: syncStatus.memories },
      { key: 'chatHistory', label: 'Chat History', synced: syncStatus.chatHistory },
    ];

    return (
      <div className="space-y-2">
        {statusItems.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-sm font-medium">{item.label}:</span>
            <div className="flex items-center gap-1">
              {item.synced ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm text-gray-500">
                {item.synced ? 'Synced' : 'Not synced'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
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
          <CardTitle>Detailed Sync Status</CardTitle>
          <CardDescription>
            See what data has been successfully synced and what hasn't
          </CardDescription>
        </CardHeader>
        <CardContent>
          {getSyncStatusDisplay()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cloud Version Selection</CardTitle>
          <CardDescription>
            Select a specific cloud backup version to download
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedVersion} onValueChange={setSelectedVersion}>
            <SelectTrigger>
              <SelectValue placeholder="Latest version (default)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest version (default)</SelectItem>
              {cloudVersions.map((version) => (
                <SelectItem key={version.id} value={version.id}>
                  v{version.dataVersion} - {new Date(version.lastSyncedAt).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cloudVersions.length === 0 && (
            <p className="text-sm text-gray-500">No cloud versions available</p>
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
          <CardTitle>Account Management</CardTitle>
          <CardDescription>
            Manage your account and authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
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
