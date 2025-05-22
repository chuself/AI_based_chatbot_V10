
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./supabaseService";
import { Json } from "@/integrations/supabase/types";

export interface Command {
  id: string;
  name: string;
  instruction: string;
  condition?: string;
}

const LOCAL_STORAGE_KEY = "custom-ai-commands";

/**
 * Sync commands to Supabase user settings
 */
export const syncCommandsToCloud = async (commands: Command[]): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('No authenticated user, storing commands locally only');
      return false;
    }
    
    // Store commands in user_settings table, in a commands field
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('settings_data')
      .eq('user_id', user.id)
      .single();
    
    let settingsData: Record<string, any> = {};
    if (existingSettings && existingSettings.settings_data) {
      // Make sure we're working with a proper object
      settingsData = typeof existingSettings.settings_data === 'object' ? 
        existingSettings.settings_data as Record<string, any> : {};
    }
    
    // Update the commands field - convert Commands to JSON-compatible format
    settingsData = {
      ...settingsData,
      commands: commands
    };
    
    if (existingSettings) {
      // Update existing settings
      const { error } = await supabase
        .from('user_settings')
        .update({
          settings_data: settingsData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error updating commands in settings:', error);
        return false;
      }
    } else {
      // Create new settings
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          settings_data: settingsData
        });
      
      if (error) {
        console.error('Error inserting commands in settings:', error);
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
 * Fetch commands from Supabase
 */
export const fetchCommandsFromCloud = async (): Promise<Command[] | null> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.warn('No authenticated user, fetching commands from local storage only');
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings_data')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') { // Not Found is not an error for us
        console.error('Error fetching commands:', error);
      }
      return null;
    }
    
    const settingsData = data?.settings_data;
    
    // Return the commands from settings or null if not found
    if (settingsData && typeof settingsData === 'object' && 'commands' in settingsData) {
      // Cast the commands to Command[] type after validation
      const commandsData = settingsData.commands;
      
      if (Array.isArray(commandsData)) {
        // Validate that the array contains proper Command objects
        const validCommands = commandsData.filter(cmd => 
          typeof cmd === 'object' && cmd !== null && 
          'id' in cmd && 'name' in cmd && 'instruction' in cmd
        ) as Command[];
        
        return validCommands;
      }
    }
    
    return null;
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
      const parsedCommands = JSON.parse(localCommands);
      
      // Validate that we have an array of proper Command objects
      if (Array.isArray(parsedCommands)) {
        const validCommands = parsedCommands.filter(cmd => 
          typeof cmd === 'object' && cmd !== null && 
          'id' in cmd && 'name' in cmd && 'instruction' in cmd
        ) as Command[];
        
        console.log('Loaded commands from local storage:', validCommands.length);
        return validCommands;
      }
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
