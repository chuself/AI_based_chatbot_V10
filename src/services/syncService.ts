
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
  integrations?: any[];
  commandsTabSettings?: any;
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
  integrations: boolean;
  commandsTabSettings: boolean;
}

export interface DataComparisonResult {
  isIdentical: boolean;
  hasLocalData: boolean;
  hasCloudData: boolean;
  differences: string[];
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
    INTEGRATIONS: 'integrations-data',
    COMMANDS_TAB_SETTINGS: 'commands-tab-settings',
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
      chatHistory: !!(localData.chatHistory && localData.chatHistory.length > 0),
      integrations: !!(localData.integrations && localData.integrations.length > 0),
      commandsTabSettings: !!(localData.commandsTabSettings && Object.keys(localData.commandsTabSettings).length > 0)
    };
  }

  private updateSyncMetadata(metadata: Partial<SyncMetadata>) {
    const current = this.getSyncMetadata();
    const updated = { ...current, ...metadata };
    localStorage.setItem(this.LOCAL_KEYS.SYNC_METADATA, JSON.stringify(updated));
  }

  // New method to compare local and cloud data
  async compareDataWithCloud(dataType?: keyof UserData): Promise<DataComparisonResult> {
    try {
      const localData = this.loadLocalData();
      const cloudData = await this.fetchCloudData();

      if (!cloudData) {
        return {
          isIdentical: false,
          hasLocalData: Object.values(localData).some(v => v && ((Array.isArray(v) && v.length > 0) || (typeof v === 'object' && Object.keys(v).length > 0))),
          hasCloudData: false,
          differences: ['No cloud data found']
        };
      }

      const differences: string[] = [];
      let isIdentical = true;

      // Compare specific data type or all data
      const typesToCompare = dataType ? [dataType] : Object.keys(localData) as (keyof UserData)[];
      
      for (const type of typesToCompare) {
        const localValue = localData[type];
        const cloudValue = cloudData[type];
        
        // Deep comparison
        const localStr = JSON.stringify(localValue || (Array.isArray(localValue) ? [] : {}));
        const cloudStr = JSON.stringify(cloudValue || (Array.isArray(cloudValue) ? [] : {}));
        
        if (localStr !== cloudStr) {
          isIdentical = false;
          differences.push(`${type}: Local and cloud data differ`);
        }
      }

      return {
        isIdentical,
        hasLocalData: Object.values(localData).some(v => v && ((Array.isArray(v) && v.length > 0) || (typeof v === 'object' && Object.keys(v).length > 0))),
        hasCloudData: Object.values(cloudData).some(v => v && ((Array.isArray(v) && v.length > 0) || (typeof v === 'object' && Object.keys(v).length > 0))),
        differences
      };
    } catch (error) {
      console.error('Error comparing data:', error);
      return {
        isIdentical: false,
        hasLocalData: true,
        hasCloudData: false,
        differences: ['Error during comparison']
      };
    }
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

      const integrationsStr = localStorage.getItem(this.LOCAL_KEYS.INTEGRATIONS);
      if (integrationsStr) {
        const parsed = JSON.parse(integrationsStr);
        if (Array.isArray(parsed)) {
          data.integrations = parsed;
        }
      }

      const commandsTabStr = localStorage.getItem(this.LOCAL_KEYS.COMMANDS_TAB_SETTINGS);
      if (commandsTabStr) {
        const parsed = JSON.parse(commandsTabStr);
        if (parsed && typeof parsed === 'object') {
          data.commandsTabSettings = parsed;
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
      if (data.integrations) {
        localStorage.setItem(this.LOCAL_KEYS.INTEGRATIONS, JSON.stringify(data.integrations));
      }
      if (data.commandsTabSettings) {
        localStorage.setItem(this.LOCAL_KEYS.COMMANDS_TAB_SETTINGS, JSON.stringify(data.commandsTabSettings));
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
        integrations: this.parseJsonField(data.integrations),
        commandsTabSettings: this.parseJsonField(data.commands_tab_settings),
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

      // Get current cloud data to merge with
      const currentCloudData = await this.fetchCloudData();
      const currentLocalData = this.loadLocalData();
      
      // Merge current cloud data with local data, then override with new data
      const mergedData = {
        model_config: data.modelConfig ? JSON.stringify(data.modelConfig) : 
                     (currentCloudData?.modelConfig ? JSON.stringify(currentCloudData.modelConfig) : 
                      (currentLocalData.modelConfig ? JSON.stringify(currentLocalData.modelConfig) : JSON.stringify({}))),
        speech_settings: data.speechSettings ? JSON.stringify(data.speechSettings) : 
                        (currentCloudData?.speechSettings ? JSON.stringify(currentCloudData.speechSettings) : 
                         (currentLocalData.speechSettings ? JSON.stringify(currentLocalData.speechSettings) : JSON.stringify({}))),
        general_settings: data.generalSettings ? JSON.stringify(data.generalSettings) : 
                         (currentCloudData?.generalSettings ? JSON.stringify(currentCloudData.generalSettings) : 
                          (currentLocalData.generalSettings ? JSON.stringify(currentLocalData.generalSettings) : JSON.stringify({}))),
        integration_settings: data.integrationSettings ? JSON.stringify(data.integrationSettings) : 
                             (currentCloudData?.integrationSettings ? JSON.stringify(currentCloudData.integrationSettings) : 
                              (currentLocalData.integrationSettings ? JSON.stringify(currentLocalData.integrationSettings) : JSON.stringify({}))),
        custom_commands: data.customCommands ? JSON.stringify(data.customCommands) : 
                        (currentCloudData?.customCommands ? JSON.stringify(currentCloudData.customCommands) : 
                         (currentLocalData.customCommands ? JSON.stringify(currentLocalData.customCommands) : JSON.stringify([]))),
        memories: data.memories ? JSON.stringify(data.memories) : 
                 (currentCloudData?.memories ? JSON.stringify(currentCloudData.memories) : 
                  (currentLocalData.memories ? JSON.stringify(currentLocalData.memories) : JSON.stringify([]))),
        chat_history: data.chatHistory ? JSON.stringify(data.chatHistory) : 
                     (currentCloudData?.chatHistory ? JSON.stringify(currentCloudData.chatHistory) : 
                      (currentLocalData.chatHistory ? JSON.stringify(currentLocalData.chatHistory) : JSON.stringify([]))),
        integrations: data.integrations ? JSON.stringify(data.integrations) : 
                     (currentCloudData?.integrations ? JSON.stringify(currentCloudData.integrations) : 
                      (currentLocalData.integrations ? JSON.stringify(currentLocalData.integrations) : JSON.stringify([]))),
        commands_tab_settings: data.commandsTabSettings ? JSON.stringify(data.commandsTabSettings) : 
                              (currentCloudData?.commandsTabSettings ? JSON.stringify(currentCloudData.commandsTabSettings) : 
                               (currentLocalData.commandsTabSettings ? JSON.stringify(currentLocalData.commandsTabSettings) : JSON.stringify({})))
      };

      // Check data size
      const dataSize = JSON.stringify(mergedData).length;
      console.log("📊 Data size:", dataSize, "bytes");
      if (dataSize > 2 * 1024 * 1024) { // 2MB limit
        console.error('❌ Data too large for upload:', dataSize, 'bytes');
        throw new Error('Data size exceeds 2MB limit');
      }

      // Check if user already has data
      const { data: existingData, error: checkError } = await supabase
        .from('user_data')
        .select('id, data_version')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking existing data:', checkError.message);
        return false;
      }

      const timestamp = new Date().toISOString();

      if (existingData) {
        // UPDATE existing record - only increment version if data actually changed
        console.log("🔄 Updating existing record ID:", existingData.id);
        
        // Check if data actually changed by comparing with current cloud data
        const comparison = await this.compareDataWithCloud();
        const nextVersion = comparison.isIdentical ? existingData.data_version : (existingData.data_version || 0) + 1;
        
        const updateData = {
          ...mergedData,
          sync_source: 'cloud' as const,
          last_synced_at: timestamp,
          data_version: nextVersion,
          updated_at: timestamp
        };

        const { error: updateError } = await supabase
          .from('user_data')
          .update(updateData)
          .eq('id', existingData.id);

        if (updateError) {
          console.error('❌ Error updating existing data:', updateError.message, updateError.details);
          return false;
        }

        console.log('✅ Successfully updated existing data with version', nextVersion);
        
        this.updateSyncMetadata({
          lastSyncedAt: timestamp,
          syncSource: 'cloud',
          dataVersion: nextVersion
        });

        return true;
      } else {
        // INSERT new record
        console.log("➕ Creating new record for user");
        
        const insertData = {
          user_id: user.id,
          ...mergedData,
          sync_source: 'cloud' as const,
          last_synced_at: timestamp,
          data_version: 1
        };

        const { error: insertError } = await supabase
          .from('user_data')
          .insert(insertData);

        if (insertError) {
          console.error('❌ Error inserting new data:', insertError.message, insertError.details);
          return false;
        }

        console.log('✅ Successfully created new data with version 1');
        
        this.updateSyncMetadata({
          lastSyncedAt: timestamp,
          syncSource: 'cloud',
          dataVersion: 1
        });

        return true;
      }
    } catch (error) {
      console.error('❌ Critical error in saveCloudData:', error);
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
      
      // Check if we have data to upload
      const hasData = Object.values(localData).some(value => 
        value && (
          (Array.isArray(value) && value.length > 0) || 
          (typeof value === 'object' && Object.keys(value).length > 0)
        )
      );

      if (!hasData) {
        console.log('ℹ️ No local data to upload');
        return false;
      }

      console.log('📊 Local data summary:', {
        hasModelConfig: !!localData.modelConfig,
        hasCommands: !!(localData.customCommands && localData.customCommands.length > 0),
        hasMemories: !!(localData.memories && localData.memories.length > 0),
        hasChatHistory: !!(localData.chatHistory && localData.chatHistory.length > 0)
      });

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
