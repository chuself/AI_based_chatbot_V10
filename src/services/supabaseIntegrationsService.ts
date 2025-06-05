import { supabase } from '@/integrations/supabase/client';
import getMcpClient from './mcpService';
import type { Integration } from './mcpService';

// Cache for integrations to avoid excessive fetching
let integrationsCache: any[] | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

export const clearIntegrationsCache = () => {
  console.log('🗑️ Clearing integrations cache...');
  integrationsCache = null;
  lastCacheTime = 0;
};

export const fetchIntegrationsFromSupabase = async (forceBypassCache = false): Promise<any[]> => {
  const now = Date.now();
  
  // Return cached data if available and not expired (unless forcing bypass)
  if (!forceBypassCache && integrationsCache && (now - lastCacheTime) < CACHE_DURATION) {
    console.log('📦 Returning cached integrations data');
    return integrationsCache;
  }

  try {
    console.log('🔄 Fetching integrations from Supabase...');
    
    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching integrations:', error);
      return [];
    }

    console.log(`✅ Fetched ${integrations?.length || 0} integrations from Supabase`);
    
    // Update cache
    integrationsCache = integrations || [];
    lastCacheTime = now;
    
    return integrations || [];
  } catch (error) {
    console.error('❌ Unexpected error fetching integrations:', error);
    return [];
  }
};

export const syncIntegrationsToSupabase = async (): Promise<boolean> => {
  try {
    console.log('🔄 Starting integration sync to Supabase...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️ No authenticated user, skipping integration sync');
      return false;
    }

    const mcpClient = getMcpClient();
    const localIntegrations = mcpClient.getServers();
    
    console.log(`📊 Local integrations to sync: ${localIntegrations.length}`);
    
    if (localIntegrations.length === 0) {
      console.log('📝 No local integrations to sync');
      return true;
    }

    // Get existing integrations from Supabase
    const existingIntegrations = await fetchIntegrationsFromSupabase(true); // Force fresh fetch
    
    for (const integration of localIntegrations) {
      // Check if integration already exists
      const existing = existingIntegrations.find(existing => 
        existing.name === integration.name && 
        existing.category === integration.category &&
        existing.user_id === user.id
      );

      const integrationData = {
        user_id: user.id,
        name: integration.name,
        category: integration.category || 'custom',
        type: integration.type || 'mcp',
        description: integration.description || null,
        is_active: integration.isActive || false,
        config: {
          url: integration.url,
          apiKey: integration.apiKey || null,
          headers: integration.headers || {},
          commands: integration.commands || [],
          endpoints: integration.endpoints || []
        }
      };

      if (existing) {
        // Update existing integration
        console.log(`🔄 Updating existing integration: ${integration.name}`);
        
        const { error: updateError } = await supabase
          .from('integrations')
          .update(integrationData)
          .eq('id', existing.id)
          .eq('user_id', user.id);

        if (updateError) {
          console.error(`❌ Error updating integration ${integration.name}:`, updateError);
        } else {
          console.log(`✅ Updated integration: ${integration.name}`);
        }
      } else {
        // Insert new integration
        console.log(`➕ Inserting new integration: ${integration.name}`);
        
        const { error: insertError } = await supabase
          .from('integrations')
          .insert(integrationData);

        if (insertError) {
          console.error(`❌ Error inserting integration ${integration.name}:`, insertError);
        } else {
          console.log(`✅ Inserted integration: ${integration.name}`);
        }
      }
    }

    // Clear cache to force fresh fetch next time
    clearIntegrationsCache();
    
    console.log('✅ Integration sync completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error syncing integrations to Supabase:', error);
    return false;
  }
};

export const executeIntegrationCommand = async (
  integrationId: string,
  commandName: string,
  parameters: Record<string, any> = {}
): Promise<{ result?: any; error?: { message: string } }> => {
  try {
    console.log(`🚀 Executing integration command: ${commandName} on integration ${integrationId}`);
    
    // Get the integration from Supabase
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (error || !integration) {
      console.error('❌ Integration not found:', error);
      return { error: { message: 'Integration not found' } };
    }

    // Check if integration is active
    if (!integration.is_active) {
      console.error('❌ Integration is not active');
      return { error: { message: 'Integration is not active' } };
    }

    const config = integration.config || {};
    const baseUrl = config.url;
    
    if (!baseUrl) {
      return { error: { message: 'Integration URL not configured' } };
    }

    // Build the request based on integration type
    let requestUrl = baseUrl;
    let requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {})
      }
    };

    // Add API key if configured
    if (config.apiKey) {
      requestOptions.headers = {
        ...requestOptions.headers,
        'Authorization': `Bearer ${config.apiKey}`
      };
    }

    if (integration.type === 'api') {
      // For API integrations, find the matching endpoint
      const endpoints = config.endpoints || [];
      const endpoint = endpoints.find((ep: any) => ep.name === commandName);
      
      if (!endpoint) {
        return { error: { message: `Endpoint ${commandName} not found` } };
      }

      requestUrl = `${baseUrl}${endpoint.path}`;
      requestOptions.method = endpoint.method || 'GET';
      
      if (['POST', 'PUT', 'PATCH'].includes(requestOptions.method) && Object.keys(parameters).length > 0) {
        requestOptions.body = JSON.stringify(parameters);
      } else if (requestOptions.method === 'GET' && Object.keys(parameters).length > 0) {
        const searchParams = new URLSearchParams(parameters);
        requestUrl += `?${searchParams.toString()}`;
      }
    } else {
      // For MCP integrations, use the standard MCP protocol
      requestOptions.body = JSON.stringify({
        command: commandName,
        parameters
      });
    }

    console.log(`📡 Making request to: ${requestUrl}`);
    console.log(`📋 Request options:`, { ...requestOptions, headers: { ...requestOptions.headers } });

    const response = await fetch(requestUrl, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Request failed with status ${response.status}:`, errorText);
      return { 
        error: { 
          message: `Request failed: ${response.status} ${response.statusText}. ${errorText}` 
        } 
      };
    }

    const result = await response.json();
    console.log('✅ Command executed successfully:', result);

    return { result };
  } catch (error) {
    console.error('❌ Error executing integration command:', error);
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      } 
    };
  }
};

export const cleanupDuplicateIntegrations = async (): Promise<boolean> => {
  try {
    console.log('🧹 Starting cleanup of duplicate integrations...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️ No authenticated user, skipping cleanup');
      return false;
    }

    // Get all integrations for the user
    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }); // Keep the oldest ones

    if (error) {
      console.error('❌ Error fetching integrations for cleanup:', error);
      return false;
    }

    if (!integrations || integrations.length === 0) {
      console.log('📝 No integrations found for cleanup');
      return true;
    }

    // Group by name and category to find duplicates
    const groupedIntegrations = new Map<string, any[]>();
    
    for (const integration of integrations) {
      const key = `${integration.name}-${integration.category}`;
      if (!groupedIntegrations.has(key)) {
        groupedIntegrations.set(key, []);
      }
      groupedIntegrations.get(key)!.push(integration);
    }

    let duplicatesRemoved = 0;

    // Remove duplicates (keep the first/oldest one)
    for (const [key, group] of groupedIntegrations.entries()) {
      if (group.length > 1) {
        console.log(`🔍 Found ${group.length} duplicates for ${key}`);
        
        // Keep the first one, remove the rest
        const toKeep = group[0];
        const toRemove = group.slice(1);
        
        for (const duplicate of toRemove) {
          const { error: deleteError } = await supabase
            .from('integrations')
            .delete()
            .eq('id', duplicate.id)
            .eq('user_id', user.id);

          if (deleteError) {
            console.error(`❌ Error removing duplicate ${duplicate.id}:`, deleteError);
          } else {
            console.log(`🗑️ Removed duplicate integration: ${duplicate.name} (${duplicate.id})`);
            duplicatesRemoved++;
          }
        }
      }
    }

    // Also cleanup commands table if needed
    const { error: commandsError } = await supabase
      .from('integration_commands')
      .select('integration_id')
      .not('integration_id', 'in', `(${integrations.map(i => `'${i.id}'`).join(',')})`);

    if (!commandsError) {
      // Remove orphaned commands
      const { error: deleteCommandsError } = await supabase
        .from('integration_commands')
        .delete()
        .not('integration_id', 'in', `(${integrations.map(i => `'${i.id}'`).join(',')})`);

      if (deleteCommandsError) {
        console.error('❌ Error cleaning up orphaned commands:', deleteCommandsError);
      } else {
        console.log('🧹 Cleaned up orphaned integration commands');
      }
    }

    // Clear cache after cleanup
    clearIntegrationsCache();

    console.log(`✅ Cleanup completed. Removed ${duplicatesRemoved} duplicate integrations`);
    return true;
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return false;
  }
};

// Sync commands for an integration
export const syncIntegrationCommands = async (integrationId: string, commands: any[]): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }

    // First, delete existing commands for this integration
    await supabase
      .from('integration_commands')
      .delete()
      .eq('integration_id', integrationId);

    // Insert new commands
    if (commands.length > 0) {
      const commandsData = commands.map(cmd => ({
        integration_id: integrationId,
        name: cmd.name,
        description: cmd.description || null,
        example: cmd.example || null,
        parameters: cmd.parameters || {},
        method: cmd.method || 'GET',
        endpoint: cmd.endpoint || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('integration_commands')
        .insert(commandsData);

      if (error) {
        console.error('❌ Error syncing commands:', error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error syncing integration commands:', error);
    return false;
  }
};
