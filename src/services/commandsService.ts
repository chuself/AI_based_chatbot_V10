import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./supabaseService";

export interface Command {
  id: string;
  name: string;
  instruction: string;
  condition?: string;
}

const LOCAL_STORAGE_KEY = "custom-ai-commands";

export const syncCommandsToCloud = async (commands: Command[]): Promise<boolean> => {
  try {
    console.log("📤 Starting commands sync to cloud...");
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('❌ No authenticated user, storing commands locally only');
      return false;
    }
    
    console.log("✅ User authenticated, syncing commands for user:", user.id);

    // Validate commands data
    if (!Array.isArray(commands)) {
      console.error('❌ Invalid commands data: not an array');
      return false;
    }

    const { data: existingData, error: fetchError } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching existing data:', fetchError.message, fetchError.details);
      return false;
    }
    
    const userData = {
      user_id: user.id,
      custom_commands: JSON.stringify(commands),
      model_config: existingData?.model_config || '{}',
      speech_settings: existingData?.speech_settings || '{}',
      general_settings: existingData?.general_settings || '{}',
      integration_settings: existingData?.integration_settings || '{}',
      memories: existingData?.memories || '[]',
      chat_history: existingData?.chat_history || '[]',
      sync_source: 'cloud' as const,
      last_synced_at: new Date().toISOString(),
      data_version: (existingData?.data_version || 0) + 1
    };

    console.log("📤 Uploading commands with version:", userData.data_version);
    const { error } = await supabase
      .from('user_data')
      .insert(userData);
    
    if (error) {
      console.error('❌ Error inserting commands:', error.message, error.details);
      return false;
    }
    
    console.log('✅ Successfully synced commands to cloud');
    return true;
  } catch (error) {
    console.error('❌ Network error syncing commands:', error);
    return false;
  }
};

export const fetchCommandsFromCloud = async (): Promise<Command[] | null> => {
  try {
    console.log("📥 Fetching commands from cloud...");
    const user = await getCurrentUser();
    
    if (!user) {
      console.warn('❌ No authenticated user, fetching commands from local storage only');
      return null;
    }
    
    console.log("🔍 Fetching latest commands for user:", user.id);
    const { data, error } = await supabase
      .from('user_data')
      .select('custom_commands')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('❌ Error fetching commands from cloud:', error.message, error.details);
      } else {
        console.log('ℹ️ No commands found in cloud for user');
      }
      return null;
    }

    if (!data) {
      console.log('ℹ️ No command data found in cloud');
      return null;
    }
    
    try {
      const commands = typeof data.custom_commands === 'string' 
        ? JSON.parse(data.custom_commands) 
        : data.custom_commands;
      
      if (!Array.isArray(commands)) {
        console.error('❌ Invalid commands data format from cloud');
        return null;
      }
      
      console.log("✅ Successfully fetched commands from cloud:", commands?.length || 0);
      return commands || [];
    } catch (parseError) {
      console.error('❌ Error parsing commands from cloud:', parseError);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error in fetchCommandsFromCloud:', error);
    return null;
  }
};

export const loadCommands = async (): Promise<Command[]> => {
  console.log("📖 Loading commands...");
  
  try {
    const cloudCommands = await fetchCommandsFromCloud();
    
    if (cloudCommands && cloudCommands.length > 0) {
      console.log('☁️ Loaded commands from cloud:', cloudCommands.length);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudCommands));
      return cloudCommands;
    }
  } catch (error) {
    console.error('❌ Error loading from cloud, falling back to local:', error);
  }
  
  try {
    const localCommands = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localCommands) {
      const parsedCommands = JSON.parse(localCommands) as Command[];
      console.log('💾 Loaded commands from local storage:', parsedCommands.length);
      return parsedCommands;
    }
  } catch (error) {
    console.error('❌ Failed to parse commands from local storage:', error);
  }
  
  console.log('ℹ️ No commands found, returning empty array');
  return [];
};

export const saveCommands = async (commands: Command[]): Promise<void> => {
  console.log("💾 Saving commands:", commands.length);
  
  if (!Array.isArray(commands)) {
    throw new Error("Invalid commands data: must be an array");
  }
  
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(commands));
    console.log("✅ Commands saved to local storage successfully");
  } catch (error) {
    console.error("❌ Failed to save commands to local storage:", error);
    throw new Error("Failed to save commands locally");
  }
  
  try {
    const cloudSyncSuccess = await syncCommandsToCloud(commands);
    if (!cloudSyncSuccess) {
      console.warn('⚠️ Failed to sync commands with cloud. Changes saved locally only.');
      throw new Error("Cloud sync failed - commands saved locally only");
    }
    console.log("✅ Commands successfully synced to cloud");
  } catch (error) {
    console.error("❌ Cloud sync error:", error);
    // Don't throw here as local save was successful
  }
};
