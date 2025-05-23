
import { useState, useEffect, useCallback } from 'react';
import { AppSettings, initializeSettings, syncAllSettings, updateSettingCategory } from '@/services/settingsService';
import { useToast } from '@/hooks/use-toast';

export const useSettingsSync = () => {
  const [settings, setSettings] = useState<AppSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { toast } = useToast();

  // Initialize settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const initialSettings = await initializeSettings();
        setSettings(initialSettings);
        setLastSyncTime(new Date());
        console.log('Settings initialized successfully');
      } catch (error) {
        console.error('Failed to initialize settings:', error);
        toast({
          title: "Settings Error",
          description: "Failed to load settings from cloud",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  // Update a specific setting category
  const updateSettings = useCallback(async (
    category: keyof AppSettings, 
    categoryData: any
  ): Promise<boolean> => {
    try {
      const success = await updateSettingCategory(category, categoryData);
      
      if (success) {
        // Update local state
        setSettings(prev => ({
          ...prev,
          [category]: categoryData
        }));
        setLastSyncTime(new Date());
        
        console.log(`Successfully updated ${category} settings`);
        return true;
      } else {
        toast({
          title: "Sync Warning",
          description: `Failed to sync ${category} settings to cloud`,
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error(`Error updating ${category} settings:`, error);
      toast({
        title: "Settings Error",
        description: `Failed to update ${category} settings`,
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Sync all current settings to cloud
  const syncToCloud = useCallback(async (): Promise<boolean> => {
    try {
      const success = await syncAllSettings(settings);
      if (success) {
        setLastSyncTime(new Date());
        toast({
          title: "Settings Synced",
          description: "All settings have been synced to cloud",
        });
      }
      return success;
    } catch (error) {
      console.error('Error syncing to cloud:', error);
      toast({
        title: "Sync Error",
        description: "Failed to sync settings to cloud",
        variant: "destructive"
      });
      return false;
    }
  }, [settings, toast]);

  return {
    settings,
    isLoading,
    lastSyncTime,
    updateSettings,
    syncToCloud,
    // Helper functions for specific setting types
    updateModelSettings: (modelData: any) => updateSettings('model', modelData),
    updateCommandSettings: (commands: any) => updateSettings('commands', commands),
    updateSpeechSettings: (speechData: any) => updateSettings('speech', speechData),
    updateGeneralSettings: (generalData: any) => updateSettings('general', generalData),
  };
};
