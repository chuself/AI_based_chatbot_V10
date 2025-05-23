
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./supabaseService";
import { ModelConfig } from "@/hooks/useGeminiConfig";
import { Command } from "./commandsService";
import { MemoryEntry } from "@/types/memory";

// Define the comprehensive settings structure
export interface AppSettings {
  general?: {
    theme?: string;
    language?: string;
    autoSave?: boolean;
  };
  model?: {
    selectedModel?: string;
    provider?: string;
    apiKey?: string;
    endpoint?: string;
    temperature?: number;
    maxTokens?: number;
  };
  speech?: {
    enabled?: boolean;
    autoSpeak?: boolean;
    voice?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  };
  commands?: Command[];
  memories?: MemoryEntry[];
  history?: {
    enabled?: boolean;
    store_limit?: number;
    auto_clear?: boolean;
  };
}

/**
 * Sync all settings to Supabase
 */
export const syncAllSettings = async (settings: AppSettings): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('No authenticated user, storing settings locally only');
      return false;
    }

    console.log('Syncing comprehensive settings to cloud:', Object.keys(settings));

    // Check if settings exist for this user
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('settings_data')
      .eq('user_id', user.id)
      .single();

    const settingsToStore = JSON.parse(JSON.stringify(settings));

    if (existingSettings) {
      // Update existing settings - the trigger will handle merging
      const { error } = await supabase
        .from('user_settings')
        .update({
          settings_data: settingsToStore,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating comprehensive settings:', error);
        return false;
      }
    } else {
      // Create new settings entry
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          settings_data: settingsToStore
        });

      if (error) {
        console.error('Error inserting comprehensive settings:', error);
        return false;
      }
    }

    console.log('Successfully synced all settings to cloud');
    return true;
  } catch (error) {
    console.error('Error syncing comprehensive settings:', error);
    return false;
  }
};

/**
 * Fetch all settings from Supabase
 */
export const fetchAllSettings = async (): Promise<AppSettings | null> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.warn('No authenticated user, cannot fetch settings from cloud');
      return null;
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('settings_data')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // Not Found is not an error for us
        console.error('Error fetching comprehensive settings:', error);
      }
      return null;
    }

    if (data?.settings_data) {
      console.log('Successfully fetched settings from cloud:', Object.keys(data.settings_data as object));
      return data.settings_data as AppSettings;
    }

    return null;
  } catch (error) {
    console.error('Error in fetchAllSettings:', error);
    return null;
  }
};

/**
 * Update specific setting category
 */
export const updateSettingCategory = async (
  category: keyof AppSettings, 
  categoryData: any
): Promise<boolean> => {
  try {
    // Get current settings
    const currentSettings = await fetchAllSettings() || {};
    
    // Update the specific category
    const updatedSettings = {
      ...currentSettings,
      [category]: categoryData
    };

    // Sync back to cloud
    return await syncAllSettings(updatedSettings);
  } catch (error) {
    console.error(`Error updating ${category} settings:`, error);
    return false;
  }
};

/**
 * Get specific setting category with fallback to local storage
 */
export const getSettingCategory = async <T>(
  category: keyof AppSettings,
  localStorageKey?: string,
  defaultValue?: T
): Promise<T | null> => {
  try {
    // First try to get from cloud
    const cloudSettings = await fetchAllSettings();
    
    if (cloudSettings && cloudSettings[category]) {
      // Update local storage for offline use
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, JSON.stringify(cloudSettings[category]));
      }
      return cloudSettings[category] as T;
    }

    // Fall back to local storage
    if (localStorageKey) {
      const localData = localStorage.getItem(localStorageKey);
      if (localData) {
        try {
          return JSON.parse(localData) as T;
        } catch (error) {
          console.error(`Failed to parse ${category} from local storage:`, error);
        }
      }
    }

    return defaultValue || null;
  } catch (error) {
    console.error(`Error getting ${category} settings:`, error);
    return defaultValue || null;
  }
};

/**
 * Initialize settings on app start - loads all settings from cloud to local storage
 */
export const initializeSettings = async (): Promise<AppSettings> => {
  try {
    console.log('Initializing comprehensive settings...');
    
    const cloudSettings = await fetchAllSettings();
    
    if (cloudSettings) {
      console.log('Loaded settings from cloud, updating local storage');
      
      // Update all local storage keys with cloud data
      if (cloudSettings.model) {
        localStorage.setItem('ai-model-config', JSON.stringify(cloudSettings.model));
      }
      
      if (cloudSettings.commands) {
        localStorage.setItem('custom-ai-commands', JSON.stringify(cloudSettings.commands));
      }
      
      if (cloudSettings.speech) {
        localStorage.setItem('speech-settings', JSON.stringify(cloudSettings.speech));
      }
      
      if (cloudSettings.general) {
        localStorage.setItem('general-settings', JSON.stringify(cloudSettings.general));
      }

      return cloudSettings;
    }

    // If no cloud settings, create from existing local storage
    console.log('No cloud settings found, creating from local storage');
    
    const localSettings: AppSettings = {};
    
    // Gather existing local storage data
    const modelConfig = localStorage.getItem('ai-model-config');
    if (modelConfig) {
      try {
        localSettings.model = JSON.parse(modelConfig);
      } catch (e) {
        console.error('Failed to parse model config:', e);
      }
    }
    
    const commands = localStorage.getItem('custom-ai-commands');
    if (commands) {
      try {
        localSettings.commands = JSON.parse(commands);
      } catch (e) {
        console.error('Failed to parse commands:', e);
      }
    }
    
    const speechSettings = localStorage.getItem('speech-settings');
    if (speechSettings) {
      try {
        localSettings.speech = JSON.parse(speechSettings);
      } catch (e) {
        console.error('Failed to parse speech settings:', e);
      }
    }

    // Sync local settings to cloud
    if (Object.keys(localSettings).length > 0) {
      await syncAllSettings(localSettings);
      console.log('Synced existing local settings to cloud');
    }

    return localSettings;
  } catch (error) {
    console.error('Error initializing settings:', error);
    return {};
  }
};
