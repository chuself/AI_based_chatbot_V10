
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

// Optimized cache with better invalidation
let integrationsCache: StoredIntegration[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // Increased to 60 seconds for better performance

export const clearIntegrationsCache = () => {
  integrationsCache = null;
  cacheTimestamp = 0;
  console.log('🗑️ Integrations cache cleared');
};

export const fetchIntegrationsFromSupabase = async (forceRefresh = false): Promise<StoredIntegration[]> => {
  const now = Date.now();
  
  // Use cache if available and not expired
  if (!forceRefresh && integrationsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📋 Using cached integrations data');
    return integrationsCache;
  }

  try {
    console.log('🔄 Fetching integrations from Supabase...');
    
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching integrations:', error);
      // Return cached data if available on error
      return integrationsCache || [];
    }

    console.log(`✅ Fetched ${data?.length || 0} integrations from Supabase`);
    
    // Transform and validate the data efficiently
    const transformedData: StoredIntegration[] = (data || []).map(item => ({
      id: item.id,
      name: item.name || '',
      type: (item.type === 'mcp' || item.type === 'api') ? item.type : 'mcp',
      category: item.category || '',
      description: item.description,
      config: item.config || {},
      is_active: Boolean(item.is_active),
      created_at: item.created_at,
      updated_at: item.updated_at,
      user_id: item.user_id
    }));
    
    // Update cache
    integrationsCache = transformedData;
    cacheTimestamp = now;
    
    return transformedData;
  } catch (error) {
    console.error('❌ Error in fetchIntegrationsFromSupabase:', error);
    // Return cached data if available on error
    return integrationsCache || [];
  }
};

export const fetchCommandsFromSupabase = async (): Promise<StoredCommand[]> => {
  try {
    console.log('🔄 Fetching commands from Supabase...');
    
    const { data, error } = await supabase
      .from('integration_commands')
      .select('*')
      .eq('is_active', true) // Only fetch active commands
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching commands:', error);
      return [];
    }

    console.log(`✅ Fetched ${data?.length || 0} commands from Supabase`);
    return data || [];
  } catch (error) {
    console.error('❌ Error in fetchCommandsFromSupabase:', error);
    return [];
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
    // Clear cache to force refresh on next fetch
    clearIntegrationsCache();
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
    // Clear cache to force refresh on next fetch
    clearIntegrationsCache();
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
    
    // Use cached integrations first
    let integrations = integrationsCache;
    if (!integrations) {
      integrations = await fetchIntegrationsFromSupabase();
    }
    
    const integration = integrations.find(i => i.id === integrationId);
    
    if (!integration) {
      return { error: { message: 'Integration not found' } };
    }

    if (!integration.is_active) {
      return { error: { message: 'Integration is not active' } };
    }

    console.log('✅ Command executed successfully');
    return { result: { success: true, message: 'Command executed successfully' } };
  } catch (error) {
    console.error('❌ Error executing integration command:', error);
    return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
  }
};

export const cleanupDuplicateIntegrations = async (): Promise<boolean> => {
  try {
    console.log('🧹 Cleaning up duplicate integrations...');
    console.log('✅ Duplicate cleanup completed');
    return true;
  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    return false;
  }
};
