
import { useState, useEffect, useContext } from "react";
import { SyncService, UserDataWithMeta } from "@/services/syncService";
import { SupabaseContext } from "@/App";
import { useToast } from "@/components/ui/use-toast";

export const useDataSync = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [syncData, setSyncData] = useState<UserDataWithMeta | null>(null);
  const { user } = useContext(SupabaseContext);
  const { toast } = useToast();

  // Initial data sync when user changes
  useEffect(() => {
    const initializeData = async () => {
      if (user) {
        console.log('User logged in, syncing data...');
        setIsLoading(true);
        try {
          const result = await SyncService.syncData();
          setSyncData(result);
          console.log('Data sync completed:', result.syncMetadata);
          
          // Apply synced data to app immediately (except chat history)
          applyDataToApp(result);
          
          if (result.syncMetadata.syncSource === 'cloud') {
            toast({
              title: "Data Synced",
              description: "Your settings and data have been loaded from the cloud",
            });
          }
        } catch (error) {
          console.error('Error during data sync:', error);
          toast({
            title: "Sync Warning",
            description: "Some data may not have synced properly",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        // User not logged in, use local data only
        console.log('No user, loading local data only');
        const localData = SyncService.loadLocalData();
        const metadata = SyncService.getSyncMetadata();
        const result = {
          ...localData,
          syncMetadata: metadata
        };
        setSyncData(result);
        applyDataToApp(result);
        setIsLoading(false);
      }
    };

    initializeData();
  }, [user?.id]);

  // Helper function to apply synced data to the app (excluding chat history)
  const applyDataToApp = (data: UserDataWithMeta) => {
    // Apply model config if available
    if (data.modelConfig) {
      localStorage.setItem('ai-model-config', JSON.stringify(data.modelConfig));
    }
    
    // Apply speech settings if available
    if (data.speechSettings) {
      localStorage.setItem('speech-settings', JSON.stringify(data.speechSettings));
    }
    
    // Apply general settings if available
    if (data.generalSettings) {
      localStorage.setItem('general-settings', JSON.stringify(data.generalSettings));
    }
    
    // Apply integration settings if available
    if (data.integrationSettings) {
      localStorage.setItem('integration-settings', JSON.stringify(data.integrationSettings));
    }
    
    // Apply custom commands if available
    if (data.customCommands) {
      localStorage.setItem('custom-ai-commands', JSON.stringify(data.customCommands));
    }
    
    // Apply memories if available
    if (data.memories) {
      localStorage.setItem('ai-memories', JSON.stringify(data.memories));
    }
    
    // Apply integrations if available
    if (data.integrations) {
      localStorage.setItem('integrations-data', JSON.stringify(data.integrations));
    }
    
    // Apply commands tab settings if available
    if (data.commandsTabSettings) {
      localStorage.setItem('commands-tab-settings', JSON.stringify(data.commandsTabSettings));
    }
    
    // NOTE: Chat history is handled separately by useChatHistory hook
    // to avoid conflicts and ensure proper cross-device sync
  };

  const refreshSync = async () => {
    if (!user) return false;
    
    setIsLoading(true);
    try {
      const result = await SyncService.syncData();
      setSyncData(result);
      applyDataToApp(result);
      return true;
    } catch (error) {
      console.error('Error refreshing sync:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syncData,
    isLoading,
    refreshSync,
    isLoggedIn: !!user
  };
};
