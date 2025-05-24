
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
        setSyncData({
          ...localData,
          syncMetadata: metadata
        });
        setIsLoading(false);
      }
    };

    initializeData();
  }, [user?.id]);

  const refreshSync = async () => {
    if (!user) return false;
    
    setIsLoading(true);
    try {
      const result = await SyncService.syncData();
      setSyncData(result);
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
