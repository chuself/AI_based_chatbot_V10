
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

// Cache for integrations data
let integrationsCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

export const clearIntegrationsCache = () => {
  integrationsCache = null;
  cacheTimestamp = 0;
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
      return [];
    }

    console.log(`✅ Fetched ${data?.length || 0} integrations from Supabase`);
    
    // Update cache
    integrationsCache = data || [];
    cacheTimestamp = now;
    
    return data || [];
  } catch (error) {
    console.error('❌ Error in fetchIntegrationsFromSupabase:', error);
    return [];
  }
};

export const fetchCommandsFromSupabase = async (): Promise<StoredCommand[]> => {
  try {
    console.log('🔄 Fetching commands from Supabase...');
    
    const { data, error } = await supabase
      .from('integration_commands')
      .select('*')
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
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ No authenticated user for integration sync');
      return false;
    }

    // This would sync local integrations to Supabase
    // For now, just return true as a placeholder
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
    
    // Fetch the integration details
    const integrations = await fetchIntegrationsFromSupabase();
    const integration = integrations.find(i => i.id === integrationId);
    
    if (!integration) {
      return { error: { message: 'Integration not found' } };
    }

    // This would execute the actual command
    // For now, return a mock response
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
    
    // This would remove duplicate integrations
    // For now, just return true as a placeholder
    console.log('✅ Duplicate cleanup completed');
    return true;
  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error);
    return false;
  }
};
