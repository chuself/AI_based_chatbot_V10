
import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { SyncService, UserDataWithMeta } from "@/services/syncService";
import { SupabaseContext } from "@/App";
import { useToast } from "@/components/ui/use-toast";
import { syncIntegrationsToSupabase, cleanupDuplicateIntegrations, clearIntegrationsCache } from "@/services/supabaseIntegrationsService";

export const useDataSync = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [syncData, setSyncData] = useState<UserDataWithMeta | null>(null);
  const { user } = useContext(SupabaseContext);
  const { toast } = useToast();
  
  // Prevent duplicate sync operations
  const syncInProgress = useRef(false);
  const lastSyncTime = useRef(0);
  const SYNC_COOLDOWN = 2000; // 2 seconds cooldown between syncs

  // Function to force sync data
  const forceSyncData = useCallback(async () => {
    // Prevent duplicate sync calls
    const now = Date.now();
    if (syncInProgress.current || (now - lastSyncTime.current) < SYNC_COOLDOWN) {
      console.log('🔄 Sync already in progress or in cooldown, skipping...');
      return syncData;
    }

    syncInProgress.current = true;
    lastSyncTime.current = now;

    if (user) {
      console.log('🔄 Force syncing data...');
      setIsLoading(true);
      try {
        // Clear integration cache first to prevent stale data
        clearIntegrationsCache();
        
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
        syncInProgress.current = false;
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
      syncInProgress.current = false;
      return result;
    }
  }, [user?.id, toast, syncData]);

  // Initial data sync when user changes or page loads - with debouncing
  useEffect(() => {
    const initializeData = async () => {
      // Small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('🚀 Initializing data sync...');
      await forceSyncData();
    };

    initializeData();
  }, [forceSyncData]);

  // Listen for page reload/visibility change to trigger sync - with throttling
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;
    let focusTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !syncInProgress.current) {
        console.log('📄 Page became visible, scheduling sync...');
        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          forceSyncData();
        }, 500); // Debounce visibility changes
      }
    };

    const handleFocus = () => {
      if (user && !syncInProgress.current) {
        console.log('🔍 Window focused, scheduling sync...');
        clearTimeout(focusTimeout);
        focusTimeout = setTimeout(() => {
          forceSyncData();
        }, 500); // Debounce focus events
      }
    };

    // Add event listeners for page visibility and focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearTimeout(visibilityTimeout);
      clearTimeout(focusTimeout);
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
    // Reset cooldown for manual refresh
    lastSyncTime.current = 0;
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
