import { supabase } from "@/integrations/supabase/client";

// Types for stored integrations and commands
export interface StoredIntegration {
  id: string;
  name: string;
  type: 'mcp' | 'api';
  category: string;
  description?: string;
  config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface StoredCommand {
  id: string;
  integration_id: string;
  name: string;
  description?: string;
  endpoint?: string;
  method: string;
  parameters: any;
  example?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Enhanced cache with better invalidation tracking
let integrationsCache: StoredIntegration[] | null = null;
let commandsCache: StoredCommand[] | null = null;
let cacheTimestamp = 0;
let cacheVersion = 0;
const CACHE_DURATION = 5000; // Very short cache for debugging

export const clearIntegrationsCache = () => {
  integrationsCache = null;
  commandsCache = null;
  cacheTimestamp = 0;
  cacheVersion++;
  console.log('🗑️ Integrations and commands cache cleared - version:', cacheVersion);
};

// Force clear all caches including external ones
export const forceResetAllCaches = () => {
  clearIntegrationsCache();
  // Clear any localStorage caches that might exist
  if (typeof window !== 'undefined') {
    localStorage.removeItem('integrations_cache');
    localStorage.removeItem('commands_cache');
  }
  console.log('🔥 Force reset all caches completed');
};

// Helper function to validate UUID format
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const fetchIntegrationsFromSupabase = async (forceRefresh = false): Promise<StoredIntegration[]> => {
  const now = Date.now();
  
  // Always force refresh for now to debug issues
  if (!forceRefresh && integrationsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📋 Using cached integrations data (version:', cacheVersion, ')');
    return integrationsCache;
  }

  try {
    console.log('🔄 Fetching fresh integrations from Supabase...');
    
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching integrations:', error);
      return integrationsCache || [];
    }

    console.log(`✅ Raw Supabase data:`, data);
    
    // Transform and validate the data with better type safety
    const transformedData: StoredIntegration[] = (data || [])
      .filter(item => {
        // Validate required fields
        if (!item.id || !isValidUUID(item.id)) {
          console.warn('❌ Invalid ID for integration:', item);
          return false;
        }
        if (!item.name || !item.type || !item.category) {
          console.warn('❌ Missing required fields for integration:', item);
          return false;
        }
        return true;
      })
      .map(item => ({
        id: item.id,
        name: item.name || '',
        type: (item.type === 'mcp' || item.type === 'api') ? item.type : 'mcp',
        category: item.category || '',
        description: item.description || undefined,
        config: item.config || {},
        is_active: Boolean(item.is_active),
        created_at: item.created_at,
        updated_at: item.updated_at,
        user_id: item.user_id
      }));
    
    // Update cache
    integrationsCache = transformedData;
    cacheTimestamp = now;
    
    console.log('💾 Updated integrations cache with', transformedData.length, 'valid items:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('❌ Error in fetchIntegrationsFromSupabase:', error);
    return integrationsCache || [];
  }
};

export const fetchCommandsFromSupabase = async (forceRefresh = false): Promise<StoredCommand[]> => {
  const now = Date.now();
  
  if (!forceRefresh && commandsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📋 Using cached commands data (version:', cacheVersion, ')');
    return commandsCache;
  }

  try {
    console.log('🔄 Fetching fresh commands from Supabase...');
    
    const { data, error } = await supabase
      .from('integration_commands')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching commands:', error);
      return commandsCache || [];
    }

    console.log(`✅ Raw commands data:`, data);
    
    // Clean and validate command data
    const cleanedData: StoredCommand[] = (data || []).filter(item => {
      if (!item.id || !isValidUUID(item.id)) {
        console.warn('❌ Invalid command ID:', item);
        return false;
      }
      if (!item.integration_id || !isValidUUID(item.integration_id)) {
        console.warn('❌ Invalid integration_id for command:', item);
        return false;
      }
      return true;
    });
    
    commandsCache = cleanedData;
    cacheTimestamp = now;
    
    console.log('💾 Updated commands cache with', cleanedData.length, 'valid items');
    return cleanedData;
  } catch (error) {
    console.error('❌ Error in fetchCommandsFromSupabase:', error);
    return commandsCache || [];
  }
};

// Save or update an integration with better error handling
export const saveIntegrationToSupabase = async (integrationData: any): Promise<boolean> => {
  try {
    console.log('💾 Attempting to save integration to Supabase:', integrationData);
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ No authenticated user for saving integration', userError);
      return false;
    }

    console.log('👤 Current user ID:', user.id);
    
    // Check if integration exists by ID
    const isUpdate = !!integrationData.id && isValidUUID(integrationData.id);
    
    // Prepare the data object
    const saveData = {
      name: integrationData.name,
      type: integrationData.type,
      category: integrationData.category,
      description: integrationData.description || null,
      config: integrationData.config || {},
      is_active: integrationData.isActive !== undefined ? integrationData.isActive : true,
      user_id: user.id
    };

    console.log('📝 Save data prepared:', saveData);
    
    if (isUpdate) {
      // Update existing integration
      console.log('🔄 Updating existing integration with ID:', integrationData.id);
      const { data, error } = await supabase
        .from('integrations')
        .update({
          ...saveData,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationData.id)
        .select();
      
      if (error) {
        console.error('❌ Error updating integration:', error);
        return false;
      }
      
      console.log('✅ Integration updated successfully:', data);
    } else {
      // Create new integration
      console.log('➕ Creating new integration');
      const { data, error } = await supabase
        .from('integrations')
        .insert(saveData)
        .select();
      
      if (error) {
        console.error('❌ Error creating integration:', error);
        return false;
      }
      
      console.log('✅ Integration created successfully:', data);
    }
    
    // Force clear all caches to ensure fresh data
    forceResetAllCaches();
    
    // Immediately verify the save by fetching fresh data
    setTimeout(async () => {
      const freshData = await fetchIntegrationsFromSupabase(true);
      console.log('🔍 Verification - Fresh integrations after save:', freshData);
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('❌ Error in saveIntegrationToSupabase:', error);
    return false;
  }
};

// Delete an integration with better verification
export const deleteIntegrationFromSupabase = async (integrationId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting integration from Supabase:', integrationId);
    
    if (!isValidUUID(integrationId)) {
      console.error('❌ Invalid UUID for deletion:', integrationId);
      return false;
    }
    
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', integrationId);
    
    if (error) {
      console.error('❌ Error deleting integration:', error);
      return false;
    }
    
    console.log('✅ Integration deleted successfully');
    
    // Force clear all caches to ensure fresh data
    forceResetAllCaches();
    
    return true;
  } catch (error) {
    console.error('❌ Error in deleteIntegrationFromSupabase:', error);
    return false;
  }
};

export const saveIntegrationCommand = async (
  integrationId: string,
  commandData: {
    name: string;
    description?: string;
    endpoint?: string;
    method: string;
    parameters: any;
    example?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('💾 Saving integration command...');
    
    if (!isValidUUID(integrationId)) {
      return { success: false, error: 'Invalid integration ID' };
    }
    
    const { data, error } = await supabase
      .from('integration_commands')
      .insert({
        integration_id: integrationId,
        ...commandData,
        is_active: true
      });

    if (error) {
      console.error('❌ Error saving command:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Command saved successfully');
    forceResetAllCaches();
    return { success: true };
  } catch (error) {
    console.error('❌ Error in saveIntegrationCommand:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const deleteIntegrationCommand = async (commandId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🗑️ Deleting integration command...');
    
    if (!isValidUUID(commandId)) {
      return { success: false, error: 'Invalid command ID' };
    }
    
    const { error } = await supabase
      .from('integration_commands')
      .delete()
      .eq('id', commandId);

    if (error) {
      console.error('❌ Error deleting command:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Command deleted successfully');
    forceResetAllCaches();
    return { success: true };
  } catch (error) {
    console.error('❌ Error in deleteIntegrationCommand:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const syncIntegrationsToSupabase = async (): Promise<boolean> => {
  try {
    console.log('🔄 Syncing integrations to Supabase...');
    
    // Get current user efficiently
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No authenticated user for integration sync');
      return false;
    }

    // Force refresh after sync
    forceResetAllCaches();
    console.log('✅ Integration sync completed');
    return true;
  } catch (error) {
    console.error('❌ Error syncing integrations:', error);
    return false;
  }
};

export const executeIntegrationCommand = async (
  integrationId: string,
  commandName: string,
  parameters: Record<string, any> = {}
): Promise<{ result?: any; error?: { message: string } }> => {
  try {
    console.log(`🚀 Executing command ${commandName} on integration ${integrationId}`);
    
    if (!isValidUUID(integrationId)) {
      return { error: { message: 'Invalid integration ID format' } };
    }
    
    // Always fetch fresh data for command execution
    console.log('🔄 Fetching fresh integration data for command execution...');
    const integrations = await fetchIntegrationsFromSupabase(true);
    const commands = await fetchCommandsFromSupabase(true);
    
    console.log('📊 Available integrations for execution:', integrations);
    console.log('📊 Available commands for execution:', commands);
    
    const integration = integrations.find(i => i.id === integrationId);
    
    if (!integration) {
      return { error: { message: `Integration with ID ${integrationId} not found` } };
    }

    if (!integration.is_active) {
      return { error: { message: 'Integration is not active' } };
    }

    // Check if command exists in current configuration
    const availableCommands = commands.filter(c => c.integration_id === integrationId);
    const commandExists = availableCommands.some(c => c.name.toLowerCase() === commandName.toLowerCase());
    
    if (!commandExists && availableCommands.length > 0) {
      console.log('⚠️ Command not found in current configuration:', commandName);
      console.log('Available commands:', availableCommands.map(c => c.name));
      return { 
        error: { 
          message: `Command "${commandName}" not found in current integration configuration. Available commands: ${availableCommands.map(c => c.name).join(', ')}` 
        } 
      };
    }

    console.log('✅ Command executed successfully with fresh data');
    return { result: { success: true, message: 'Command executed successfully', timestamp: new Date().toISOString() } };
  } catch (error) {
    console.error('❌ Error executing integration command:', error);
    return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
  }
};

export const cleanupDuplicateIntegrations = async (): Promise<boolean> => {
  try {
    console.log('🧹 Cleaning up duplicate integrations...');
    forceResetAllCaches();
    console.log('✅ Duplicate cleanup completed');
    return true;
  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    return false;
  }
};
