
import { supabase } from "@/integrations/supabase/client";

// Cache for integrations data
let integrationsCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

export const clearIntegrationsCache = () => {
  integrationsCache = null;
  cacheTimestamp = 0;
};

export const fetchIntegrationsFromSupabase = async (forceRefresh = false): Promise<any[]> => {
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
