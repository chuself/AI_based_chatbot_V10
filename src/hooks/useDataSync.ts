
import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { SyncService, UserDataWithMeta } from "@/services/syncService";
import { SupabaseContext } from "@/App";
import { useToast } from "@/components/ui/use-toast";
import { clearIntegrationsCache, forceResetAllCaches } from "@/services/supabaseIntegrationsService";

export const useDataSync = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [syncData, setSyncData] = useState<UserDataWithMeta | null>(null);
  const { user } = useContext(SupabaseContext);
  const { toast } = useToast();
  
  // Prevent duplicate sync operations
  const syncInProgress = useRef(false);
  const lastSyncTime = useRef(0);
  const SYNC_COOLDOWN = 2000; // Reduced cooldown for better responsiveness
  const mounted = useRef(true);

  // Function to force sync data - optimized
  const forceSyncData = useCallback(async () => {
    const now = Date.now();
    if (syncInProgress.current || (now - lastSyncTime.current) < SYNC_COOLDOWN) {
      console.log('🔄 Sync blocked - in progress or cooldown');
      return syncData;
    }

    if (!mounted.current) return syncData;

    syncInProgress.current = true;
    lastSyncTime.current = now;

    try {
      if (user) {
        console.log('🔄 Starting efficient sync...');
        setIsLoading(true);
        
        // Clear all caches to ensure completely fresh data
        clearIntegrationsCache();
        forceResetAllCaches();
        
        // Sync data from cloud
        const result = await SyncService.syncData();
        
        if (mounted.current) {
          setSyncData(result);
          applyDataToApp(result);
          
          if (result.syncMetadata.syncSource === 'cloud') {
            toast({
              title: "Data Synced",
              description: "Settings loaded from cloud",
            });
          }
        }
        
        return result;
      } else {
        // User not logged in - quick local load
        console.log('📱 Loading local data');
        const localData = SyncService.loadLocalData();
        const metadata = SyncService.getSyncMetadata();
        const result = {
          ...localData,
          syncMetadata: metadata
        };
        
        if (mounted.current) {
          setSyncData(result);
          applyDataToApp(result);
        }
        
        return result;
      }
    } catch (error) {
      console.error('❌ Sync error:', error);
      
      if (mounted.current) {
        // Quick fallback to local data
        const localData = SyncService.loadLocalData();
        const metadata = SyncService.getSyncMetadata();
        const fallbackResult = {
          ...localData,
          syncMetadata: metadata
        };
        setSyncData(fallbackResult);
        applyDataToApp(fallbackResult);
      }
      
      return syncData;
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
      syncInProgress.current = false;
    }
  }, [user?.id, toast, syncData]);

  // Initial data sync - only once on mount
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const initializeData = async () => {
      // Small delay to batch multiple rapid calls
      timeoutId = setTimeout(async () => {
        if (mounted.current) {
          console.log('🚀 Initial data sync');
          await forceSyncData();
        }
      }, 100);
    };

    initializeData();
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [user?.id, forceSyncData]);

  // Listen for page visibility changes
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !syncInProgress.current) {
        clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          if (mounted.current) {
            console.log('👁️ Page visible - syncing');
            forceSyncData();
          }
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(visibilityTimeout);
    };
  }, [forceSyncData, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // Helper function to apply synced data efficiently
  const applyDataToApp = (data: UserDataWithMeta) => {
    try {
      // Batch localStorage updates to reduce reflows
      const updates: [string, string][] = [];
      
      if (data.modelConfig) {
        updates.push(['ai-model-config', JSON.stringify(data.modelConfig)]);
      }
      if (data.speechSettings) {
        updates.push(['speech-settings', JSON.stringify(data.speechSettings)]);
      }
      if (data.generalSettings) {
        updates.push(['general-settings', JSON.stringify(data.generalSettings)]);
      }
      if (data.integrationSettings) {
        updates.push(['integration-settings', JSON.stringify(data.integrationSettings)]);
      }
      if (data.customCommands) {
        updates.push(['custom-ai-commands', JSON.stringify(data.customCommands)]);
      }
      if (data.memories) {
        updates.push(['ai-memories', JSON.stringify(data.memories)]);
      }
      if (data.commandsTabSettings) {
        updates.push(['commands-tab-settings', JSON.stringify(data.commandsTabSettings)]);
      }
      
      // Apply all updates at once
      updates.forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      
      // Trigger storage event to notify other components of the change
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      console.error('❌ Error applying data:', error);
    }
  };

  const refreshSync = async () => {
    console.log('🔄 Manual refresh');
    lastSyncTime.current = 0; // Reset cooldown for manual refresh
    
    // Force clear all caches before manual refresh
    clearIntegrationsCache();
    forceResetAllCaches();
    
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
