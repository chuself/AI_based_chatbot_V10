
import { useState, useEffect, useContext, useCallback } from "react";
import { SyncService, UserDataWithMeta } from "@/services/syncService";
import { SupabaseContext } from "@/App";
import { useToast } from "@/components/ui/use-toast";
import { syncIntegrationsToSupabase, cleanupDuplicateIntegrations } from "@/services/supabaseIntegrationsService";

export const useDataSync = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [syncData, setSyncData] = useState<UserDataWithMeta | null>(null);
  const { user } = useContext(SupabaseContext);
  const { toast } = useToast();

  // Function to force sync data
  const forceSyncData = useCallback(async () => {
    if (user) {
      console.log('🔄 Force syncing data...');
      setIsLoading(true);
      try {
        // First cleanup duplicate integrations
        console.log('🧹 Cleaning up duplicate integrations...');
        await cleanupDuplicateIntegrations();
        
        // Then sync integrations to Supabase
        console.log('🔄 Syncing integrations to Supabase...');
        const syncSuccess = await syncIntegrationsToSupabase();
        if (syncSuccess) {
          console.log('✅ Integrations synced successfully');
        } else {
          console.warn('⚠️ Integration sync had issues but continuing...');
        }
        
        // Finally sync all other data
        console.log('🔄 Syncing user data...');
        const result = await SyncService.syncData();
        setSyncData(result);
        console.log('✅ Force sync completed:', result.syncMetadata);
        
        // Apply synced data to app immediately (except chat history)
        applyDataToApp(result);
        
        if (result.syncMetadata.syncSource === 'cloud') {
          toast({
            title: "Data Synced",
            description: "Your settings and data have been loaded from the cloud",
          });
        }
        
        return result;
      } catch (error) {
        console.error('❌ Error during force sync:', error);
        toast({
          title: "Sync Warning",
          description: "Some data may not have synced properly",
          variant: "destructive",
        });
        
        // Fallback to local data
        const localData = SyncService.loadLocalData();
        const metadata = SyncService.getSyncMetadata();
        const fallbackResult = {
          ...localData,
          syncMetadata: metadata
        };
        setSyncData(fallbackResult);
        applyDataToApp(fallbackResult);
        
        return fallbackResult;
      } finally {
        setIsLoading(false);
      }
    } else {
      // User not logged in, use local data only
      console.log('📱 No user, loading local data only');
      const localData = SyncService.loadLocalData();
      const metadata = SyncService.getSyncMetadata();
      const result = {
        ...localData,
        syncMetadata: metadata
      };
      setSyncData(result);
      applyDataToApp(result);
      setIsLoading(false);
      return result;
    }
  }, [user?.id, toast]);

  // Initial data sync when user changes or page loads
  useEffect(() => {
    const initializeData = async () => {
      console.log('🚀 Initializing data sync...');
      await forceSyncData();
    };

    initializeData();
  }, [forceSyncData]);

  // Listen for page reload/visibility change to trigger sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log('📄 Page became visible, triggering sync...');
        forceSyncData();
      }
    };

    const handleFocus = () => {
      if (user) {
        console.log('🔍 Window focused, triggering sync...');
        forceSyncData();
      }
    };

    // Add event listeners for page visibility and focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [forceSyncData, user]);

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
    
    // Apply commands tab settings if available
    if (data.commandsTabSettings) {
      localStorage.setItem('commands-tab-settings', JSON.stringify(data.commandsTabSettings));
    }
    
    // NOTE: Chat history is handled separately by useChatHistory hook
    // to avoid conflicts and ensure proper cross-device sync
  };

  const refreshSync = async () => {
    console.log('🔄 Manual refresh sync triggered');
    return await forceSyncData();
  };

  return {
    syncData,
    isLoading,
    refreshSync,
    forceSyncData,
    isLoggedIn: !!user
  };
};
