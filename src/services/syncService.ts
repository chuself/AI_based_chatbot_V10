
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./supabaseService";
import { ChatMessage } from "@/hooks/useChatHistory";
import { Command } from "./commandsService";
import { MemoryEntry } from "@/types/memory";
import { ModelConfig } from "@/hooks/useGeminiConfig";

export interface UserData {
  modelConfig?: ModelConfig;
  speechSettings?: any;
  generalSettings?: any;
  integrationSettings?: any;
  customCommands?: Command[];
  memories?: MemoryEntry[];
  chatHistory?: ChatMessage[];
}

export interface SyncMetadata {
  lastSyncedAt: string;
  syncSource: 'local' | 'cloud' | 'merged';
  dataVersion: number;
}

export interface UserDataWithMeta extends UserData {
  syncMetadata: SyncMetadata;
}

/**
 * Comprehensive sync service for all user data
 */
class SyncServiceImpl {
  private readonly LOCAL_KEYS = {
    MODEL_CONFIG: 'ai-model-config',
    SPEECH_SETTINGS: 'speech-settings',
    GENERAL_SETTINGS: 'general-settings',
    INTEGRATION_SETTINGS: 'integration-settings',
    CUSTOM_COMMANDS: 'custom-ai-commands',
    MEMORIES: 'ai-memories',
    CHAT_HISTORY: 'chat-history',
    SYNC_METADATA: 'sync-metadata'
  };

  /**
   * Get current sync metadata
   */
  getSyncMetadata(): SyncMetadata {
    const stored = localStorage.getItem(this.LOCAL_KEYS.SYNC_METADATA);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse sync metadata:', e);
      }
    }
    return {
      lastSyncedAt: new Date().toISOString(),
      syncSource: 'local',
      dataVersion: 1
    };
  }

  /**
   * Update sync metadata
   */
  private updateSyncMetadata(metadata: Partial<SyncMetadata>) {
    const current = this.getSyncMetadata();
    const updated = { ...current, ...metadata };
    localStorage.setItem(this.LOCAL_KEYS.SYNC_METADATA, JSON.stringify(updated));
  }

  /**
   * Load all user data from local storage
   */
  loadLocalData(): UserData {
    const data: UserData = {};

    // Load model config
    const modelConfigStr = localStorage.getItem(this.LOCAL_KEYS.MODEL_CONFIG);
    if (modelConfigStr) {
      try {
        data.modelConfig = JSON.parse(modelConfigStr);
      } catch (e) {
        console.error('Failed to parse model config:', e);
      }
    }

    // Load speech settings
    const speechStr = localStorage.getItem(this.LOCAL_KEYS.SPEECH_SETTINGS);
    if (speechStr) {
      try {
        data.speechSettings = JSON.parse(speechStr);
      } catch (e) {
        console.error('Failed to parse speech settings:', e);
      }
    }

    // Load general settings
    const generalStr = localStorage.getItem(this.LOCAL_KEYS.GENERAL_SETTINGS);
    if (generalStr) {
      try {
        data.generalSettings = JSON.parse(generalStr);
      } catch (e) {
        console.error('Failed to parse general settings:', e);
      }
    }

    // Load integration settings
    const integrationStr = localStorage.getItem(this.LOCAL_KEYS.INTEGRATION_SETTINGS);
    if (integrationStr) {
      try {
        data.integrationSettings = JSON.parse(integrationStr);
      } catch (e) {
        console.error('Failed to parse integration settings:', e);
      }
    }

    // Load custom commands
    const commandsStr = localStorage.getItem(this.LOCAL_KEYS.CUSTOM_COMMANDS);
    if (commandsStr) {
      try {
        data.customCommands = JSON.parse(commandsStr);
      } catch (e) {
        console.error('Failed to parse custom commands:', e);
      }
    }

    // Load memories
    const memoriesStr = localStorage.getItem(this.LOCAL_KEYS.MEMORIES);
    if (memoriesStr) {
      try {
        data.memories = JSON.parse(memoriesStr);
      } catch (e) {
        console.error('Failed to parse memories:', e);
      }
    }

    // Load chat history
    const historyStr = localStorage.getItem(this.LOCAL_KEYS.CHAT_HISTORY);
    if (historyStr) {
      try {
        data.chatHistory = JSON.parse(historyStr);
      } catch (e) {
        console.error('Failed to parse chat history:', e);
      }
    }

    return data;
  }

  /**
   * Save data to local storage
   */
  saveLocalData(data: UserData) {
    if (data.modelConfig) {
      localStorage.setItem(this.LOCAL_KEYS.MODEL_CONFIG, JSON.stringify(data.modelConfig));
    }
    if (data.speechSettings) {
      localStorage.setItem(this.LOCAL_KEYS.SPEECH_SETTINGS, JSON.stringify(data.speechSettings));
    }
    if (data.generalSettings) {
      localStorage.setItem(this.LOCAL_KEYS.GENERAL_SETTINGS, JSON.stringify(data.generalSettings));
    }
    if (data.integrationSettings) {
      localStorage.setItem(this.LOCAL_KEYS.INTEGRATION_SETTINGS, JSON.stringify(data.integrationSettings));
    }
    if (data.customCommands) {
      localStorage.setItem(this.LOCAL_KEYS.CUSTOM_COMMANDS, JSON.stringify(data.customCommands));
    }
    if (data.memories) {
      localStorage.setItem(this.LOCAL_KEYS.MEMORIES, JSON.stringify(data.memories));
    }
    if (data.chatHistory) {
      localStorage.setItem(this.LOCAL_KEYS.CHAT_HISTORY, JSON.stringify(data.chatHistory));
    }

    this.updateSyncMetadata({
      lastSyncedAt: new Date().toISOString(),
      syncSource: 'local'
    });
  }

  /**
   * Fetch user data from cloud
   */
  async fetchCloudData(): Promise<UserDataWithMeta | null> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.warn('No authenticated user for cloud sync');
        return null;
      }

      const { data, error } = await supabase
        .from('user_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found is acceptable
          console.error('Error fetching cloud data:', error);
        }
        return null;
      }

      return {
        modelConfig: data.model_config || undefined,
        speechSettings: data.speech_settings || undefined,
        generalSettings: data.general_settings || undefined,
        integrationSettings: data.integration_settings || undefined,
        customCommands: data.custom_commands || undefined,
        memories: data.memories || undefined,
        chatHistory: data.chat_history || undefined,
        syncMetadata: {
          lastSyncedAt: data.last_synced_at,
          syncSource: data.sync_source || 'cloud',
          dataVersion: data.data_version || 1
        }
      };
    } catch (error) {
      console.error('Error in fetchCloudData:', error);
      return null;
    }
  }

  /**
   * Save user data to cloud
   */
  async saveCloudData(data: UserData): Promise<boolean> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('No authenticated user, saving locally only');
        return false;
      }

      const userData = {
        user_id: user.id,
        model_config: data.modelConfig || {},
        speech_settings: data.speechSettings || {},
        general_settings: data.generalSettings || {},
        integration_settings: data.integrationSettings || {},
        custom_commands: data.customCommands || [],
        memories: data.memories || [],
        chat_history: data.chatHistory || [],
        sync_source: 'cloud' as const
      };

      const { error } = await supabase
        .from('user_data')
        .upsert(userData);

      if (error) {
        console.error('Error saving to cloud:', error);
        return false;
      }

      console.log('Successfully synced data to cloud');
      this.updateSyncMetadata({
        lastSyncedAt: new Date().toISOString(),
        syncSource: 'cloud'
      });

      return true;
    } catch (error) {
      console.error('Error in saveCloudData:', error);
      return false;
    }
  }

  /**
   * Comprehensive sync: load from cloud if available, fallback to local
   */
  async syncData(): Promise<UserDataWithMeta> {
    console.log('Starting comprehensive data sync...');

    // Try to load from cloud first
    const cloudData = await this.fetchCloudData();
    
    if (cloudData) {
      console.log('Loaded data from cloud, updating local storage');
      this.saveLocalData(cloudData);
      this.updateSyncMetadata({
        lastSyncedAt: cloudData.syncMetadata.lastSyncedAt,
        syncSource: 'cloud',
        dataVersion: cloudData.syncMetadata.dataVersion
      });
      return cloudData;
    }

    // Fallback to local data
    console.log('No cloud data found, using local data');
    const localData = this.loadLocalData();
    const syncMetadata = this.getSyncMetadata();

    // Try to sync local data to cloud
    await this.saveCloudData(localData);

    return {
      ...localData,
      syncMetadata
    };
  }

  /**
   * Force upload local data to cloud
   */
  async uploadToCloud(): Promise<boolean> {
    const localData = this.loadLocalData();
    return await this.saveCloudData(localData);
  }

  /**
   * Force download cloud data to local
   */
  async downloadFromCloud(): Promise<boolean> {
    const cloudData = await this.fetchCloudData();
    if (cloudData) {
      this.saveLocalData(cloudData);
      return true;
    }
    return false;
  }

  /**
   * Clear all local data
   */
  clearLocalData() {
    Object.values(this.LOCAL_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const SyncService = new SyncServiceImpl();
