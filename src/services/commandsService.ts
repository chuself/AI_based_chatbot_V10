
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./supabaseService";

export interface Command {
  id: string;
  name: string;
  instruction: string;
  condition?: string;
}

const LOCAL_STORAGE_KEY = "custom-ai-commands";

/**
 * Sync commands to Supabase user_data table
 */
export const syncCommandsToCloud = async (commands: Command[]): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('No authenticated user, storing commands locally only');
      return false;
    }
    
    // Get existing user data
    const { data: existingData } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    const userData = {
      user_id: user.id,
      custom_commands: JSON.stringify(commands),
      model_config: existingData?.model_config || '{}',
      speech_settings: existingData?.speech_settings || '{}',
      general_settings: existingData?.general_settings || '{}',
      integration_settings: existingData?.integration_settings || '{}',
      memories: existingData?.memories || '[]',
      chat_history: existingData?.chat_history || '[]',
      sync_source: 'cloud' as const
    };

    if (existingData) {
      // Update existing data
      const { error } = await supabase
        .from('user_data')
        .update(userData)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error updating commands:', error);
        return false;
      }
    } else {
      // Create new data
      const { error } = await supabase
        .from('user_data')
        .insert(userData);
      
      if (error) {
        console.error('Error inserting commands:', error);
        return false;
      }
    }
    
    console.log('Successfully synced commands to cloud');
    return true;
  } catch (error) {
    console.error('Error syncing commands:', error);
    return false;
  }
};

/**
 * Fetch commands from Supabase user_data table
 */
export const fetchCommandsFromCloud = async (): Promise<Command[] | null> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.warn('No authenticated user, fetching commands from local storage only');
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_data')
      .select('custom_commands')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') { // Not Found is not an error for us
        console.error('Error fetching commands:', error);
      }
      return null;
    }
    
    // Parse the commands from JSON string
    try {
      const commands = typeof data.custom_commands === 'string' 
        ? JSON.parse(data.custom_commands) 
        : data.custom_commands;
      return commands || [];
    } catch (parseError) {
      console.error('Error parsing commands:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error in fetchCommandsFromCloud:', error);
    return null;
  }
};

/**
 * Load commands from both local storage and cloud
 * Prioritizing cloud if available
 */
export const loadCommands = async (): Promise<Command[]> => {
  // First try to get from cloud
  const cloudCommands = await fetchCommandsFromCloud();
  
  if (cloudCommands && cloudCommands.length > 0) {
    console.log('Loaded commands from cloud:', cloudCommands.length);
    // Update local storage for offline use
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudCommands));
    return cloudCommands;
  }
  
  // Fall back to local storage
  const localCommands = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (localCommands) {
    try {
      const parsedCommands = JSON.parse(localCommands) as Command[];
      console.log('Loaded commands from local storage:', parsedCommands.length);
      return parsedCommands;
    } catch (error) {
      console.error('Failed to parse commands from local storage:', error);
    }
  }
  
  return []; // Return empty array if nothing found
};

/**
 * Save commands to both local storage and cloud
 */
export const saveCommands = async (commands: Command[]): Promise<void> => {
  // Always save to local storage
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(commands));
  
  // Try to sync with cloud
  const cloudSyncSuccess = await syncCommandsToCloud(commands);
  if (!cloudSyncSuccess) {
    console.warn('Failed to sync commands with cloud. Changes saved locally only.');
  }
};
