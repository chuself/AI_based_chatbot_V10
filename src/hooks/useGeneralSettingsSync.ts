
import { useEffect, useCallback } from 'react';
import { SyncService } from '@/services/syncService';

interface GeneralSettingsData {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications?: {
    enabled?: boolean;
    sound?: boolean;
    desktop?: boolean;
  };
  privacy?: {
    analytics?: boolean;
    crashReporting?: boolean;
    dataCollection?: boolean;
  };
  performance?: {
    animationsEnabled?: boolean;
    autoSave?: boolean;
    autoSaveInterval?: number;
  };
  accessibility?: {
    highContrast?: boolean;
    reducedMotion?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
  };
  developer?: {
    debugMode?: boolean;
    verboseLogging?: boolean;
    showConsole?: boolean;
  };
  ui?: {
    compactMode?: boolean;
    showWelcomePage?: boolean;
    defaultPage?: string;
  };
}

export const useGeneralSettingsSync = () => {
  const saveGeneralSettings = useCallback((settings: Partial<GeneralSettingsData>) => {
    try {
      // Get current general settings
      const currentSettings = getGeneralSettings();
      
      // Deep merge with new settings
      const updatedSettings = deepMerge(currentSettings, settings);
      
      // Save to localStorage
      localStorage.setItem('general-settings', JSON.stringify(updatedSettings));
      
      // Update sync service with general settings only
      const userData = { generalSettings: updatedSettings };
      SyncService.saveCloudData(userData);
      
      console.log('General settings saved:', updatedSettings);
    } catch (error) {
      console.error('Error saving general settings:', error);
    }
  }, []);

  const getGeneralSettings = useCallback((): GeneralSettingsData => {
    try {
      const stored = localStorage.getItem('general-settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading general settings:', error);
    }
    
    // Return default settings
    return {
      theme: 'system',
      language: 'en',
      notifications: {
        enabled: true,
        sound: true,
        desktop: false
      },
      privacy: {
        analytics: true,
        crashReporting: true,
        dataCollection: false
      },
      performance: {
        animationsEnabled: true,
        autoSave: true,
        autoSaveInterval: 30000 // 30 seconds
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        fontSize: 'medium'
      },
      developer: {
        debugMode: false,
        verboseLogging: false,
        showConsole: false
      },
      ui: {
        compactMode: false,
        showWelcomePage: true,
        defaultPage: 'chat'
      }
    };
  }, []);

  // Helper function for deep merging objects
  const deepMerge = (target: any, source: any): any => {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  };

  // Individual setting update methods
  const updateTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    saveGeneralSettings({ theme });
  }, [saveGeneralSettings]);

  const updateLanguage = useCallback((language: string) => {
    saveGeneralSettings({ language });
  }, [saveGeneralSettings]);

  const updateNotificationSettings = useCallback((notifications: Partial<GeneralSettingsData['notifications']>) => {
    const current = getGeneralSettings();
    saveGeneralSettings({ 
      notifications: { ...current.notifications, ...notifications }
    });
  }, [saveGeneralSettings, getGeneralSettings]);

  const updatePrivacySettings = useCallback((privacy: Partial<GeneralSettingsData['privacy']>) => {
    const current = getGeneralSettings();
    saveGeneralSettings({ 
      privacy: { ...current.privacy, ...privacy }
    });
  }, [saveGeneralSettings, getGeneralSettings]);

  const updatePerformanceSettings = useCallback((performance: Partial<GeneralSettingsData['performance']>) => {
    const current = getGeneralSettings();
    saveGeneralSettings({ 
      performance: { ...current.performance, ...performance }
    });
  }, [saveGeneralSettings, getGeneralSettings]);

  const updateAccessibilitySettings = useCallback((accessibility: Partial<GeneralSettingsData['accessibility']>) => {
    const current = getGeneralSettings();
    saveGeneralSettings({ 
      accessibility: { ...current.accessibility, ...accessibility }
    });
  }, [saveGeneralSettings, getGeneralSettings]);

  const updateDeveloperSettings = useCallback((developer: Partial<GeneralSettingsData['developer']>) => {
    const current = getGeneralSettings();
    saveGeneralSettings({ 
      developer: { ...current.developer, ...developer }
    });
  }, [saveGeneralSettings, getGeneralSettings]);

  const updateUISettings = useCallback((ui: Partial<GeneralSettingsData['ui']>) => {
    const current = getGeneralSettings();
    saveGeneralSettings({ 
      ui: { ...current.ui, ...ui }
    });
  }, [saveGeneralSettings, getGeneralSettings]);

  // Load settings on hook initialization
  useEffect(() => {
    const settings = getGeneralSettings();
    console.log('Loaded general settings:', settings);
  }, [getGeneralSettings]);

  return {
    saveGeneralSettings,
    getGeneralSettings,
    updateTheme,
    updateLanguage,
    updateNotificationSettings,
    updatePrivacySettings,
    updatePerformanceSettings,
    updateAccessibilitySettings,
    updateDeveloperSettings,
    updateUISettings
  };
};
