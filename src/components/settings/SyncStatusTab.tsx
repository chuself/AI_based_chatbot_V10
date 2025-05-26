import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { SyncService, SyncMetadata, CloudDataVersion, SyncStatus } from "@/services/syncService";
import { Cloud, Download, Upload, RefreshCw, HardDrive, Wifi, WifiOff, LogOut, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface IndividualSyncItem {
  key: keyof SyncStatus;
  label: string;
  description: string;
  localStorageKey: string;
  icon: React.ReactNode;
}

const SYNC_ITEMS: IndividualSyncItem[] = [
  {
    key: 'modelConfig',
    label: 'Model Configuration',
    description: 'AI model settings and API keys',
    localStorageKey: 'ai-model-config',
    icon: <Cloud className="h-4 w-4" />
  },
  {
    key: 'speechSettings',
    label: 'Speech Settings',
    description: 'Voice and speech configuration',
    localStorageKey: 'speech-settings',
    icon: <Wifi className="h-4 w-4" />
  },
  {
    key: 'generalSettings',
    label: 'General Settings',
    description: 'Application preferences',
    localStorageKey: 'general-settings',
    icon: <HardDrive className="h-4 w-4" />
  },
  {
    key: 'integrationSettings',
    label: 'Integration Settings',
    description: 'Third-party integrations',
    localStorageKey: 'integration-settings',
    icon: <WifiOff className="h-4 w-4" />
  },
  {
    key: 'customCommands',
    label: 'Custom Commands',
    description: 'User-defined AI commands',
    localStorageKey: 'custom-ai-commands',
    icon: <RefreshCw className="h-4 w-4" />
  },
  {
    key: 'memories',
    label: 'Memories',
    description: 'Conversation memories',
    localStorageKey: 'ai-memories',
    icon: <CheckCircle className="h-4 w-4" />
  },
  {
    key: 'chatHistory',
    label: 'Chat History',
    description: 'Conversation history',
    localStorageKey: 'chat-history',
    icon: <XCircle className="h-4 w-4" />
  }
];

const SyncStatusTab = () => {
  const [syncMetadata, setSyncMetadata] = useState<SyncMetadata | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [cloudVersions, setCloudVersions] = useState<CloudDataVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("latest");
  const [isLoading, setIsLoading] = useState(false);
  const [itemLoadingStates, setItemLoadingStates] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
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

  const setItemLoading = (itemKey: string, loading: boolean) => {
    setItemLoadingStates(prev => ({ ...prev, [itemKey]: loading }));
  };

  const toggleExpanded = (itemKey: string) => {
    setExpandedItems(prev => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const getItemData = (item: IndividualSyncItem) => {
    const stored = localStorage.getItem(item.localStorageKey);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  };

  const hasLocalData = (item: IndividualSyncItem) => {
    const data = getItemData(item);
    if (!data) return false;
    
    if (Array.isArray(data)) {
      return data.length > 0;
    }
    
    if (typeof data === 'object') {
      return Object.keys(data).length > 0;
    }
    
    return true;
  };

  const uploadIndividualItem = async (item: IndividualSyncItem) => {
    setItemLoading(item.key, true);
    try {
      console.log(`📤 Uploading ${item.label}...`);
      
      // Get current local data
      const localData = SyncService.loadLocalData();
      
      // Create a data object with only this item
      const itemData: any = {};
      
      switch (item.key) {
        case 'modelConfig':
          itemData.modelConfig = localData.modelConfig || {};
          break;
        case 'speechSettings':
          itemData.speechSettings = localData.speechSettings || {};
          break;
        case 'generalSettings':
          itemData.generalSettings = localData.generalSettings || {};
          break;
        case 'integrationSettings':
          itemData.integrationSettings = localData.integrationSettings || {};
          break;
        case 'customCommands':
          itemData.customCommands = localData.customCommands || [];
          break;
        case 'memories':
          itemData.memories = localData.memories || [];
          break;
        case 'chatHistory':
          itemData.chatHistory = localData.chatHistory || [];
          break;
      }
      
      // Always force a new version by updating the current data with a timestamp
      const timestampedData = {
        ...itemData,
        _lastManualSync: new Date().toISOString()
      };
      
      const success = await SyncService.saveCloudData(timestampedData);
      
      if (success) {
        toast({
          title: "Upload Successful",
          description: `${item.label} has been uploaded to the cloud`,
        });
        
        // Refresh metadata and status
        const metadata = SyncService.getSyncMetadata();
        const status = SyncService.getSyncStatus();
        setSyncMetadata(metadata);
        setSyncStatus(status);
        await loadCloudVersions();
      } else {
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${item.label} to cloud`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Upload error for ${item.label}:`, error);
      toast({
        title: "Upload Error",
        description: `An error occurred while uploading ${item.label}`,
        variant: "destructive",
      });
    } finally {
      setItemLoading(item.key, false);
    }
  };

  const downloadIndividualItem = async (item: IndividualSyncItem) => {
    setItemLoading(item.key, true);
    try {
      console.log(`📥 Downloading ${item.label}...`);
      
      const versionId = selectedVersion === "latest" ? undefined : selectedVersion;
      const cloudData = await SyncService.fetchCloudData(versionId);
      
      if (cloudData) {
        // Apply only this specific item's data
        switch (item.key) {
          case 'modelConfig':
            if (cloudData.modelConfig) {
              localStorage.setItem(item.localStorageKey, JSON.stringify(cloudData.modelConfig));
            }
            break;
          case 'speechSettings':
            if (cloudData.speechSettings) {
              localStorage.setItem(item.localStorageKey, JSON.stringify(cloudData.speechSettings));
            }
            break;
          case 'generalSettings':
            if (cloudData.generalSettings) {
              localStorage.setItem(item.localStorageKey, JSON.stringify(cloudData.generalSettings));
            }
            break;
          case 'integrationSettings':
            if (cloudData.integrationSettings) {
              localStorage.setItem(item.localStorageKey, JSON.stringify(cloudData.integrationSettings));
            }
            break;
          case 'customCommands':
            if (cloudData.customCommands) {
              localStorage.setItem(item.localStorageKey, JSON.stringify(cloudData.customCommands));
            }
            break;
          case 'memories':
            if (cloudData.memories) {
              localStorage.setItem(item.localStorageKey, JSON.stringify(cloudData.memories));
            }
            break;
          case 'chatHistory':
            if (cloudData.chatHistory) {
              localStorage.setItem(item.localStorageKey, JSON.stringify(cloudData.chatHistory));
            }
            break;
        }
        
        toast({
          title: "Download Successful",
          description: `${item.label} has been downloaded from the cloud`,
        });
        
        // Refresh status
        const status = SyncService.getSyncStatus();
        setSyncStatus(status);
        
        // Reload page for chat history to take effect immediately
        if (item.key === 'chatHistory') {
          window.location.reload();
        }
      } else {
        toast({
          title: "Download Failed",
          description: `No cloud data found for ${item.label}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`Download error for ${item.label}:`, error);
      toast({
        title: "Download Error",
        description: `An error occurred while downloading ${item.label}`,
        variant: "destructive",
      });
    } finally {
      setItemLoading(item.key, false);
    }
  };

  const getItemStatusIndicator = (item: IndividualSyncItem) => {
    if (!syncStatus) return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    
    const isLatest = syncStatus[item.key];
    return (
      <div className={`w-3 h-3 rounded-full ${isLatest ? 'bg-green-500' : 'bg-red-500'}`} />
    );
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
          <CardTitle>Individual Item Sync Control</CardTitle>
          <CardDescription>
            Manually sync specific data items. Green indicator = latest version, Red = needs sync
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SYNC_ITEMS.map((item) => (
            <div key={item.key} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getItemStatusIndicator(item)}
                  {item.icon}
                  <div>
                    <h4 className="font-medium text-sm">{item.label}</h4>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={hasLocalData(item) ? "default" : "secondary"} className="text-xs">
                    {hasLocalData(item) ? "Has Data" : "No Data"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(item.key)}
                  >
                    {expandedItems[item.key] ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Collapsible open={expandedItems[item.key]} onOpenChange={() => toggleExpanded(item.key)}>
                <CollapsibleContent className="space-y-3">
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => uploadIndividualItem(item)}
                      disabled={itemLoadingStates[item.key]}
                      className="flex-1"
                    >
                      <Upload className="h-3 w-3 mr-2" />
                      {itemLoadingStates[item.key] ? 'Uploading...' : 'Upload'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadIndividualItem(item)}
                      disabled={itemLoadingStates[item.key]}
                      className="flex-1"
                    >
                      <Download className="h-3 w-3 mr-2" />
                      {itemLoadingStates[item.key] ? 'Downloading...' : 'Download'}
                    </Button>
                  </div>
                  
                  {hasLocalData(item) && (
                    <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                      <strong>Local Data Preview:</strong>
                      <pre className="mt-1 max-h-20 overflow-auto">
                        {JSON.stringify(getItemData(item), null, 2).substring(0, 200)}
                        {JSON.stringify(getItemData(item), null, 2).length > 200 ? '...' : ''}
                      </pre>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
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
          <CardTitle>Bulk Sync Actions</CardTitle>
          <CardDescription>
            Sync all data at once or perform bulk operations
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
              Upload All to Cloud
            </Button>
            
            <Button
              onClick={handleDownload}
              disabled={isLoading}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Download All from Cloud
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
    </div>
  );
};

export default SyncStatusTab;
