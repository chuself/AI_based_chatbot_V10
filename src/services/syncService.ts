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

export interface CloudDataVersion {
  id: string;
  lastSyncedAt: string;
  dataVersion: number;
  syncSource: string;
}

export interface SyncStatus {
  modelConfig: boolean;
  speechSettings: boolean;
  generalSettings: boolean;
  integrationSettings: boolean;
  customCommands: boolean;
  memories: boolean;
  chatHistory: boolean;
}

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

  getSyncStatus(): SyncStatus {
    const localData = this.loadLocalData();
    return {
      modelConfig: !!(localData.modelConfig && Object.keys(localData.modelConfig).length > 0),
      speechSettings: !!(localData.speechSettings && Object.keys(localData.speechSettings).length > 0),
      generalSettings: !!(localData.generalSettings && Object.keys(localData.generalSettings).length > 0),
      integrationSettings: !!(localData.integrationSettings && Object.keys(localData.integrationSettings).length > 0),
      customCommands: !!(localData.customCommands && localData.customCommands.length > 0),
      memories: !!(localData.memories && localData.memories.length > 0),
      chatHistory: !!(localData.chatHistory && localData.chatHistory.length > 0)
    };
  }

  private updateSyncMetadata(metadata: Partial<SyncMetadata>) {
    const current = this.getSyncMetadata();
    const updated = { ...current, ...metadata };
    localStorage.setItem(this.LOCAL_KEYS.SYNC_METADATA, JSON.stringify(updated));
  }

  loadLocalData(): UserData {
    const data: UserData = {};

    try {
      const modelConfigStr = localStorage.getItem(this.LOCAL_KEYS.MODEL_CONFIG);
      if (modelConfigStr) {
        const parsed = JSON.parse(modelConfigStr);
        if (parsed && typeof parsed === 'object') {
          data.modelConfig = parsed;
        }
      }

      const speechStr = localStorage.getItem(this.LOCAL_KEYS.SPEECH_SETTINGS);
      if (speechStr) {
        const parsed = JSON.parse(speechStr);
        if (parsed && typeof parsed === 'object') {
          data.speechSettings = parsed;
        }
      }

      const generalStr = localStorage.getItem(this.LOCAL_KEYS.GENERAL_SETTINGS);
      if (generalStr) {
        const parsed = JSON.parse(generalStr);
        if (parsed && typeof parsed === 'object') {
          data.generalSettings = parsed;
        }
      }

      const integrationStr = localStorage.getItem(this.LOCAL_KEYS.INTEGRATION_SETTINGS);
      if (integrationStr) {
        const parsed = JSON.parse(integrationStr);
        if (parsed && typeof parsed === 'object') {
          data.integrationSettings = parsed;
        }
      }

      const commandsStr = localStorage.getItem(this.LOCAL_KEYS.CUSTOM_COMMANDS);
      if (commandsStr) {
        const parsed = JSON.parse(commandsStr);
        if (Array.isArray(parsed)) {
          data.customCommands = parsed;
        }
      }

      const memoriesStr = localStorage.getItem(this.LOCAL_KEYS.MEMORIES);
      if (memoriesStr) {
        const parsed = JSON.parse(memoriesStr);
        if (Array.isArray(parsed)) {
          data.memories = parsed;
        }
      }

      const historyStr = localStorage.getItem(this.LOCAL_KEYS.CHAT_HISTORY);
      if (historyStr) {
        const parsed = JSON.parse(historyStr);
        if (Array.isArray(parsed)) {
          data.chatHistory = parsed;
        }
      }
    } catch (error) {
      console.error("Error loading local data:", error);
    }

    return data;
  }

  saveLocalData(data: UserData) {
    try {
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
    } catch (error) {
      console.error("Error saving local data:", error);
      throw error;
    }
  }

  async getCloudVersions(): Promise<CloudDataVersion[]> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log("❌ No user found for cloud versions");
        return [];
      }

      console.log("🔍 Fetching cloud versions for user:", user.id);
      const { data, error } = await supabase
        .from('user_data')
        .select('id, last_synced_at, data_version, sync_source, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching cloud versions:', error.message, error.details);
        return [];
      }

      console.log("✅ Found cloud versions:", data?.length || 0);
      return data?.map(item => ({
        id: item.id,
        lastSyncedAt: item.last_synced_at || item.created_at,
        dataVersion: item.data_version || 1,
        syncSource: item.sync_source || 'cloud'
      })) || [];
    } catch (error) {
      console.error('❌ Network error in getCloudVersions:', error);
      return [];
    }
  }

  async fetchCloudData(versionId?: string): Promise<UserDataWithMeta | null> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.warn('❌ No authenticated user for cloud sync');
        return null;
      }

      console.log("📥 Fetching cloud data for user:", user.id, "version:", versionId || 'latest');

      let query = supabase
        .from('user_data')
        .select('*')
        .eq('user_id', user.id);

      if (versionId) {
        query = query.eq('id', versionId);
      } else {
        query = query.order('created_at', { ascending: false }).limit(1);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('❌ Error fetching cloud data:', error.message, error.details);
        return null;
      }

      if (!data) {
        console.log("ℹ️ No cloud data found for user");
        return null;
      }

      console.log("✅ Successfully fetched cloud data");
      return {
        modelConfig: this.parseJsonField(data.model_config),
        speechSettings: this.parseJsonField(data.speech_settings),
        generalSettings: this.parseJsonField(data.general_settings),
        integrationSettings: this.parseJsonField(data.integration_settings),
        customCommands: this.parseJsonField(data.custom_commands),
        memories: this.parseJsonField(data.memories),
        chatHistory: this.parseJsonField(data.chat_history),
        syncMetadata: {
          lastSyncedAt: data.last_synced_at || data.created_at,
          syncSource: (data.sync_source as 'local' | 'cloud' | 'merged') || 'cloud',
          dataVersion: data.data_version || 1
        }
      };
    } catch (error) {
      console.error('❌ Network error in fetchCloudData:', error);
      return null;
    }
  }

  private parseJsonField(field: any): any {
    if (!field) return undefined;
    if (typeof field === 'object') return field;
    try {
      return JSON.parse(field);
    } catch (e) {
      console.error('❌ Failed to parse JSON field:', e);
      return undefined;
    }
  }

  async saveCloudData(data: UserData): Promise<boolean> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('❌ No authenticated user, cannot save to cloud');
        return false;
      }

      console.log("📤 Starting cloud data upload for user:", user.id);

      // Validate data before upload
      const dataSize = JSON.stringify(data).length;
      if (dataSize > 1024 * 1024) { // 1MB limit
        console.error('❌ Data too large for upload:', dataSize, 'bytes');
        return false;
      }

      // Get current highest version number with better error handling
      const { data: existingVersions, error: versionError } = await supabase
        .from('user_data')
        .select('data_version')
        .eq('user_id', user.id)
        .order('data_version', { ascending: false })
        .limit(1);

      if (versionError && versionError.code !== 'PGRST116') {
        console.error('❌ Error fetching version data:', versionError.message, versionError.details);
        return false;
      }

      const nextVersion = existingVersions && existingVersions.length > 0 
        ? (existingVersions[0].data_version || 0) + 1 
        : 1;

      const userData = {
        user_id: user.id,
        model_config: data.modelConfig ? JSON.stringify(data.modelConfig) : '{}',
        speech_settings: data.speechSettings ? JSON.stringify(data.speechSettings) : '{}',
        general_settings: data.generalSettings ? JSON.stringify(data.generalSettings) : '{}',
        integration_settings: data.integrationSettings ? JSON.stringify(data.integrationSettings) : '{}',
        custom_commands: data.customCommands ? JSON.stringify(data.customCommands) : '[]',
        memories: data.memories ? JSON.stringify(data.memories) : '[]',
        chat_history: data.chatHistory ? JSON.stringify(data.chatHistory) : '[]',
        sync_source: 'cloud' as const,
        last_synced_at: new Date().toISOString(),
        data_version: nextVersion
      };

      console.log('📤 Uploading data to cloud with version:', nextVersion);

      const { error: insertError } = await supabase
        .from('user_data')
        .insert(userData);

      if (insertError) {
        console.error('❌ Error saving to cloud:', insertError.message, insertError.details);
        if (insertError.code === '23505') {
          console.error('❌ Duplicate key error - version conflict');
        }
        return false;
      }

      console.log('✅ Successfully synced data to cloud with version', nextVersion);
      this.updateSyncMetadata({
        lastSyncedAt: new Date().toISOString(),
        syncSource: 'cloud',
        dataVersion: nextVersion
      });

      return true;
    } catch (error) {
      console.error('❌ Network error in saveCloudData:', error);
      return false;
    }
  }

  async syncData(versionId?: string): Promise<UserDataWithMeta> {
    console.log('🔄 Starting comprehensive data sync...');

    try {
      const cloudData = await this.fetchCloudData(versionId);
      
      if (cloudData) {
        console.log('☁️ Loaded data from cloud, updating local storage');
        this.saveLocalData(cloudData);
        this.updateSyncMetadata({
          lastSyncedAt: cloudData.syncMetadata.lastSyncedAt,
          syncSource: 'cloud',
          dataVersion: cloudData.syncMetadata.dataVersion
        });
        return cloudData;
      }

      console.log('💾 No cloud data found, using local data');
      const localData = this.loadLocalData();
      const syncMetadata = this.getSyncMetadata();

      const uploadSuccess = await this.saveCloudData(localData);
      if (uploadSuccess) {
        console.log('✅ Successfully uploaded local data to cloud');
      } else {
        console.warn('⚠️ Failed to upload local data to cloud');
      }

      return {
        ...localData,
        syncMetadata
      };
    } catch (error) {
      console.error('❌ Error during data sync:', error);
      
      // Fallback to local data
      const localData = this.loadLocalData();
      const syncMetadata = this.getSyncMetadata();
      
      return {
        ...localData,
        syncMetadata
      };
    }
  }

  async uploadToCloud(): Promise<boolean> {
    try {
      console.log('📤 Manual upload to cloud initiated');
      const localData = this.loadLocalData();
      const success = await this.saveCloudData(localData);
      
      if (success) {
        console.log('✅ Manual upload successful');
      } else {
        console.log('❌ Manual upload failed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error in manual upload:', error);
      return false;
    }
  }

  async downloadFromCloud(versionId?: string): Promise<boolean> {
    try {
      console.log('📥 Manual download from cloud initiated');
      const cloudData = await this.fetchCloudData(versionId);
      if (cloudData) {
        this.saveLocalData(cloudData);
        this.updateSyncMetadata({
          lastSyncedAt: cloudData.syncMetadata.lastSyncedAt,
          syncSource: 'cloud',
          dataVersion: cloudData.syncMetadata.dataVersion
        });
        console.log('✅ Manual download successful');
        return true;
      }
      console.log('❌ No cloud data to download');
      return false;
    } catch (error) {
      console.error('❌ Error in manual download:', error);
      return false;
    }
  }

  clearLocalData() {
    try {
      Object.values(this.LOCAL_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log("✅ Local data cleared successfully");
    } catch (error) {
      console.error("❌ Error clearing local data:", error);
    }
  }
}

export const SyncService = new SyncServiceImpl();
