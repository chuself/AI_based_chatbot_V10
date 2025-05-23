import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./supabaseService";
import { updateSettingCategory, getSettingCategory } from "./settingsService";

export interface Command {
  id: string;
  name: string;
  instruction: string;
  condition?: string;
}

const LOCAL_STORAGE_KEY = "custom-ai-commands";

/**
 * Load commands using the new settings service
 */
export const loadCommands = async (): Promise<Command[]> => {
  try {
    const commands = await getSettingCategory<Command[]>(
      'commands', 
      LOCAL_STORAGE_KEY, 
      []
    );
    
    console.log('Loaded commands:', commands?.length || 0);
    return commands || [];
  } catch (error) {
    console.error('Error loading commands:', error);
    return [];
  }
};

/**
 * Save commands using the new settings service
 */
export const saveCommands = async (commands: Command[]): Promise<void> => {
  try {
    // Always save to local storage for immediate use
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(commands));
    
    // Sync to cloud using settings service
    const success = await updateSettingCategory('commands', commands);
    
    if (!success) {
      console.warn('Failed to sync commands with cloud. Changes saved locally only.');
    } else {
      console.log('Commands successfully synced to cloud');
    }
  } catch (error) {
    console.error('Error saving commands:', error);
  }
};

// Keep legacy functions for backward compatibility but mark as deprecated
/** @deprecated Use loadCommands instead */
export const fetchCommandsFromCloud = async (): Promise<Command[] | null> => {
  return await loadCommands();
};

/** @deprecated Use saveCommands instead */
export const syncCommandsToCloud = async (commands: Command[]): Promise<boolean> => {
  try {
    await saveCommands(commands);
    return true;
  } catch (error) {
    console.error('Error syncing commands:', error);
    return false;
  }
};
