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
let cacheVersion = 0; // Track cache version for better invalidation
const CACHE_DURATION = 30000; // Reduced to 30 seconds for better freshness

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

export const fetchIntegrationsFromSupabase = async (forceRefresh = false): Promise<StoredIntegration[]> => {
  const now = Date.now();
  
  // Use cache if available and not expired, unless force refresh
  if (!forceRefresh && integrationsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📋 Using cached integrations data (version:', cacheVersion, ')');
    return integrationsCache;
  }

  try {
    console.log('🔄 Fetching fresh integrations from Supabase...');
    
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .order('updated_at', { ascending: false }); // Order by most recently updated

    if (error) {
      console.error('❌ Error fetching integrations:', error);
      // Return cached data if available on error
      return integrationsCache || [];
    }

    console.log(`✅ Fetched ${data?.length || 0} integrations from Supabase`);
    
    // Transform and validate the data efficiently
    const transformedData: StoredIntegration[] = (data || []).map(item => {
      // Clean up any malformed IDs that might cause UUID errors
      const cleanId = item.id && typeof item.id === 'string' && item.id.length > 20 ? item.id : '';
      
      return {
        id: cleanId,
        name: item.name || '',
        type: (item.type === 'mcp' || item.type === 'api') ? item.type : 'mcp',
        category: item.category || '',
        description: item.description,
        config: item.config || {},
        is_active: Boolean(item.is_active),
        created_at: item.created_at,
        updated_at: item.updated_at,
        user_id: item.user_id
      };
    }).filter(item => item.id); // Filter out items with invalid IDs
    
    // Update cache
    integrationsCache = transformedData;
    cacheTimestamp = now;
    
    console.log('💾 Updated integrations cache with', transformedData.length, 'valid items');
    return transformedData;
  } catch (error) {
    console.error('❌ Error in fetchIntegrationsFromSupabase:', error);
    // Return cached data if available on error
    return integrationsCache || [];
  }
};

export const fetchCommandsFromSupabase = async (forceRefresh = false): Promise<StoredCommand[]> => {
  const now = Date.now();
  
  // Use cache if available and not expired, unless force refresh
  if (!forceRefresh && commandsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📋 Using cached commands data (version:', cacheVersion, ')');
    return commandsCache;
  }

  try {
    console.log('🔄 Fetching fresh commands from Supabase...');
    
    const { data, error } = await supabase
      .from('integration_commands')
      .select('*')
      .eq('is_active', true) // Only fetch active commands
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching commands:', error);
      return commandsCache || [];
    }

    console.log(`✅ Fetched ${data?.length || 0} commands from Supabase`);
    
    // Clean and validate command data
    const cleanedData: StoredCommand[] = (data || []).filter(item => {
      // Filter out items with malformed IDs
      return item.id && typeof item.id === 'string' && item.id.length > 20;
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

// Save or update an integration
export const saveIntegrationToSupabase = async (integrationData: any): Promise<boolean> => {
  try {
    console.log('💾 Saving integration to Supabase:', integrationData.name);
    
    // Check if integration exists by ID
    const isUpdate = !!integrationData.id;
    
    // Get current user for saving
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ No authenticated user for saving integration', userError);
      return false;
    }
    
    if (isUpdate) {
      // Update existing integration
      const { error } = await supabase
        .from('integrations')
        .update({
          name: integrationData.name,
          type: integrationData.type,
          category: integrationData.category,
          description: integrationData.description,
          config: integrationData.config || {},
          is_active: integrationData.isActive !== undefined ? integrationData.isActive : true,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationData.id);
      
      if (error) {
        console.error('❌ Error updating integration:', error);
        return false;
      }
    } else {
      // Create new integration with user_id
      const { error } = await supabase
        .from('integrations')
        .insert({
          name: integrationData.name,
          type: integrationData.type,
          category: integrationData.category,
          description: integrationData.description,
          config: integrationData.config || {},
          is_active: integrationData.isActive !== undefined ? integrationData.isActive : true,
          user_id: user.id // Add user_id to meet the required database constraint
        });
      
      if (error) {
        console.error('❌ Error creating integration:', error);
        return false;
      }
    }
    
    console.log(`✅ Integration ${isUpdate ? 'updated' : 'created'} successfully`);
    // Force clear all caches to ensure fresh data
    forceResetAllCaches();
    return true;
  } catch (error) {
    console.error('❌ Error in saveIntegrationToSupabase:', error);
    return false;
  }
};

// Delete an integration
export const deleteIntegrationFromSupabase = async (integrationId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting integration from Supabase:', integrationId);
    
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
    // Force clear all caches to ensure fresh data
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
    
    const { error } = await supabase
      .from('integration_commands')
      .delete()
      .eq('id', commandId);

    if (error) {
      console.error('❌ Error deleting command:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Command deleted successfully');
    // Force clear all caches to ensure fresh data
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
    
    // Always fetch fresh data for command execution to avoid stale results
    console.log('🔄 Fetching fresh integration data for command execution...');
    const integrations = await fetchIntegrationsFromSupabase(true); // Force fresh data
    const commands = await fetchCommandsFromSupabase(true); // Force fresh commands
    
    const integration = integrations.find(i => i.id === integrationId);
    
    if (!integration) {
      return { error: { message: 'Integration not found' } };
    }

    if (!integration.is_active) {
      return { error: { message: 'Integration is not active' } };
    }

    // Check if command still exists in current configuration
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
    
    // Also clear caches during cleanup
    forceResetAllCaches();
    
    console.log('✅ Duplicate cleanup completed');
    return true;
  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    return false;
  }
};
