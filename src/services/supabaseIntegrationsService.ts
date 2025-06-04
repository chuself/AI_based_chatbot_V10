import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "./supabaseService";
import getMcpClient, { Integration } from './mcpService';

export interface StoredIntegration {
  id: string;
  name: string;
  type: 'mcp' | 'api';
  category: string;
  description?: string;
  config: {
    url?: string;
    apiKey?: string;
    headers?: Record<string, string>;
    commands?: Array<{
      name: string;
      description?: string;
      example?: string;
      parameters?: Record<string, any>;
    }>;
    endpoints?: Array<{
      name: string;
      path: string;
      method: string;
      description?: string;
    }>;
  };
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface StoredCommand {
  id: string;
  integration_id: string;
  name: string;
  description?: string;
  example?: string;
  parameters?: Record<string, any>;
  method?: string;
  endpoint?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

let cachedIntegrations: StoredIntegration[] | null = null;
let cachedCommands: StoredCommand[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Clear cache when needed
export const clearIntegrationsCache = () => {
  cachedIntegrations = null;
  cachedCommands = null;
  lastFetchTime = 0;
};

export const fetchIntegrationsFromSupabase = async (): Promise<StoredIntegration[]> => {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedIntegrations && (now - lastFetchTime) < CACHE_DURATION) {
      console.log('📋 Using cached integrations');
      return cachedIntegrations;
    }

    const user = await getCurrentUser();
    if (!user) {
      console.log('❌ No authenticated user for fetching integrations');
      return [];
    }

    console.log('📥 Fetching integrations from Supabase for user:', user.id);

    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching integrations:', error.message, error.details);
      return [];
    }

    const integrations = data || [];
    console.log('✅ Fetched integrations from Supabase:', integrations.length);
    
    // Update cache
    cachedIntegrations = integrations;
    lastFetchTime = now;
    
    return integrations;
  } catch (error) {
    console.error('❌ Network error fetching integrations:', error);
    return [];
  }
};

export const fetchCommandsFromSupabase = async (): Promise<StoredCommand[]> => {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedCommands && (now - lastFetchTime) < CACHE_DURATION) {
      console.log('📋 Using cached commands');
      return cachedCommands;
    }

    const user = await getCurrentUser();
    if (!user) {
      console.log('❌ No authenticated user for fetching commands');
      return [];
    }

    console.log('📥 Fetching commands from Supabase for user:', user.id);

    // Get all commands for user's integrations
    const { data, error } = await supabase
      .from('integration_commands')
      .select(`
        *,
        integrations!inner(user_id)
      `)
      .eq('integrations.user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching commands:', error.message, error.details);
      return [];
    }

    const commands = data || [];
    console.log('✅ Fetched commands from Supabase:', commands.length);
    
    // Update cache
    cachedCommands = commands;
    lastFetchTime = now;
    
    return commands;
  } catch (error) {
    console.error('❌ Network error fetching commands:', error);
    return [];
  }
};

export const executeIntegrationCommand = async (
  integrationId: string,
  commandName: string,
  parameters: Record<string, any> = {}
): Promise<{ result?: any; error?: { message: string } }> => {
  try {
    console.log(`🚀 Executing command ${commandName} on integration ${integrationId}`);
    console.log('📊 Parameters:', parameters);

    // Get the integration details
    const integrations = await fetchIntegrationsFromSupabase();
    const integration = integrations.find(i => i.id === integrationId);

    if (!integration) {
      console.error(`❌ Integration ${integrationId} not found`);
      return { error: { message: `Integration ${integrationId} not found` } };
    }

    console.log(`📍 Found integration: ${integration.name} (${integration.category})`);

    // Get the command details
    const commands = await fetchCommandsFromSupabase();
    const command = commands.find(c => 
      c.integration_id === integrationId && 
      c.name.toLowerCase() === commandName.toLowerCase()
    );

    if (!command) {
      console.error(`❌ Command ${commandName} not found for integration ${integration.name}`);
      return { 
        error: { 
          message: `Command ${commandName} not found for integration ${integration.name}` 
        } 
      };
    }

    console.log(`📍 Found command: ${command.name}`);

    // Execute based on integration type
    if (integration.type === 'mcp') {
      // Use MCP client for MCP integrations
      const mcpClient = getMcpClient();
      return await mcpClient.executeCommand(integration.name, command.name, parameters);
    } else {
      // Execute API call for direct API integrations
      return await executeApiCommand(integration, command, parameters);
    }

  } catch (error) {
    console.error('❌ Error executing integration command:', error);
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Unknown error during command execution' 
      } 
    };
  }
};

const executeApiCommand = async (
  integration: StoredIntegration,
  command: StoredCommand,
  parameters: Record<string, any>
): Promise<{ result?: any; error?: { message: string } }> => {
  try {
    const baseUrl = integration.config.url;
    if (!baseUrl) {
      return { error: { message: 'No base URL configured for integration' } };
    }

    // Build the request URL
    let url = baseUrl;
    if (command.endpoint) {
      url = url.endsWith('/') ? url + command.endpoint.replace(/^\//, '') : url + command.endpoint;
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...integration.config.headers
    };

    if (integration.config.apiKey) {
      headers['Authorization'] = `Bearer ${integration.config.apiKey}`;
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method: command.method || 'GET',
      headers
    };

    // Add body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(command.method || 'GET')) {
      requestOptions.body = JSON.stringify(parameters);
    } else if (Object.keys(parameters).length > 0) {
      // Add query parameters for GET requests
      const searchParams = new URLSearchParams();
      Object.entries(parameters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      if (searchParams.toString()) {
        url += (url.includes('?') ? '&' : '?') + searchParams.toString();
      }
    }

    console.log(`🌐 Making ${command.method || 'GET'} request to: ${url}`);

    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API request failed: ${response.status} ${response.statusText}`, errorText);
      return { 
        error: { 
          message: `API request failed: ${response.status} ${response.statusText}. ${errorText}` 
        } 
      };
    }

    const result = await response.json();
    console.log('✅ API command executed successfully');
    
    return { result };

  } catch (error) {
    console.error('❌ Error executing API command:', error);
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Unknown API error' 
      } 
    };
  }
};

export const syncIntegrationsToSupabase = async (): Promise<boolean> => {
  try {
    console.log('🔄 Starting integration sync to Supabase...');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('❌ No authenticated user, cannot sync integrations');
      return false;
    }

    const mcpClient = getMcpClient();
    const localIntegrations = mcpClient.getServers();
    
    console.log(`📊 Found ${localIntegrations.length} local integrations to sync`);

    if (localIntegrations.length === 0) {
      console.log('ℹ️ No local integrations to sync');
      return true;
    }

    // Clear cache before syncing
    clearIntegrationsCache();

    for (const localIntegration of localIntegrations) {
      try {
        console.log(`🔄 Syncing integration: ${localIntegration.name}`);

        // Check if integration already exists
        const { data: existingIntegration, error: fetchError } = await supabase
          .from('integrations')
          .select('id, name, category, type')
          .eq('user_id', user.id)
          .eq('name', localIntegration.name)
          .eq('category', localIntegration.category)
          .eq('type', localIntegration.type)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('❌ Error checking existing integration:', fetchError.message);
          continue;
        }

        let integrationId: string;

        if (existingIntegration) {
          // Update existing integration
          console.log(`🔄 Updating existing integration: ${existingIntegration.id}`);
          
          const { data: updatedIntegration, error: updateError } = await supabase
            .from('integrations')
            .update({
              description: localIntegration.description,
              config: {
                url: localIntegration.url,
                apiKey: localIntegration.apiKey,
                headers: localIntegration.headers,
                commands: localIntegration.commands,
                endpoints: localIntegration.endpoints
              },
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingIntegration.id)
            .select('id')
            .single();

          if (updateError) {
            console.error('❌ Error updating integration:', updateError.message);
            continue;
          }

          integrationId = updatedIntegration.id;
        } else {
          // Create new integration
          console.log(`➕ Creating new integration: ${localIntegration.name}`);
          
          const { data: newIntegration, error: insertError } = await supabase
            .from('integrations')
            .insert({
              user_id: user.id,
              name: localIntegration.name,
              type: localIntegration.type,
              category: localIntegration.category,
              description: localIntegration.description,
              config: {
                url: localIntegration.url,
                apiKey: localIntegration.apiKey,
                headers: localIntegration.headers,
                commands: localIntegration.commands,
                endpoints: localIntegration.endpoints
              },
              is_active: true
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('❌ Error creating integration:', insertError.message);
            continue;
          }

          integrationId = newIntegration.id;
        }

        // Sync commands for this integration
        await syncCommandsForIntegration(integrationId, localIntegration);

      } catch (error) {
        console.error(`❌ Error syncing integration ${localIntegration.name}:`, error);
        continue;
      }
    }

    // Clear cache after successful sync
    clearIntegrationsCache();
    
    console.log('✅ Integration sync completed successfully');
    return true;

  } catch (error) {
    console.error('❌ Error during integration sync:', error);
    return false;
  }
};

const syncCommandsForIntegration = async (
  integrationId: string,
  localIntegration: Integration
): Promise<void> => {
  try {
    console.log(`🔄 Syncing commands for integration: ${localIntegration.name}`);

    // Deactivate existing commands first
    await supabase
      .from('integration_commands')
      .update({ is_active: false })
      .eq('integration_id', integrationId);

    // Process commands from integration config
    const commandsToSync = [
      ...(localIntegration.commands || []).map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        example: cmd.example,
        parameters: cmd.parameters || {},
        method: 'POST',
        endpoint: null
      })),
      ...(localIntegration.endpoints || []).map(endpoint => ({
        name: endpoint.name,
        description: endpoint.description,
        example: `${endpoint.method} ${endpoint.path}`,
        parameters: {},
        method: endpoint.method,
        endpoint: endpoint.path
      }))
    ];

    console.log(`📊 Found ${commandsToSync.length} commands to sync`);

    for (const commandData of commandsToSync) {
      try {
        // Check if command already exists
        const { data: existingCommand, error: fetchError } = await supabase
          .from('integration_commands')
          .select('id')
          .eq('integration_id', integrationId)
          .eq('name', commandData.name)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('❌ Error checking existing command:', fetchError.message);
          continue;
        }

        if (existingCommand) {
          // Update existing command
          const { error: updateError } = await supabase
            .from('integration_commands')
            .update({
              description: commandData.description,
              example: commandData.example,
              parameters: commandData.parameters,
              method: commandData.method,
              endpoint: commandData.endpoint,
              is_active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCommand.id);

          if (updateError) {
            console.error('❌ Error updating command:', updateError.message);
          } else {
            console.log(`✅ Updated command: ${commandData.name}`);
          }
        } else {
          // Create new command
          const { error: insertError } = await supabase
            .from('integration_commands')
            .insert({
              integration_id: integrationId,
              name: commandData.name,
              description: commandData.description,
              example: commandData.example,
              parameters: commandData.parameters,
              method: commandData.method,
              endpoint: commandData.endpoint,
              is_active: true
            });

          if (insertError) {
            console.error('❌ Error creating command:', insertError.message);
          } else {
            console.log(`✅ Created command: ${commandData.name}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error syncing command ${commandData.name}:`, error);
      }
    }

    console.log(`✅ Commands sync completed for integration: ${localIntegration.name}`);
  } catch (error) {
    console.error('❌ Error syncing commands:', error);
  }
};

export const cleanupDuplicateIntegrations = async (): Promise<void> => {
  try {
    console.log('🧹 Cleaning up duplicate integrations...');
    
    const user = await getCurrentUser();
    if (!user) {
      console.log('❌ No authenticated user for cleanup');
      return;
    }

    // Get all integrations for the user
    const { data: allIntegrations, error } = await supabase
      .from('integrations')
      .select('id, name, category, type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching integrations for cleanup:', error.message);
      return;
    }

    if (!allIntegrations || allIntegrations.length === 0) {
      console.log('ℹ️ No integrations found for cleanup');
      return;
    }

    // Group by unique key (name + category + type)
    const groupedIntegrations = new Map<string, typeof allIntegrations>();
    
    for (const integration of allIntegrations) {
      const key = `${integration.name}-${integration.category}-${integration.type}`;
      if (!groupedIntegrations.has(key)) {
        groupedIntegrations.set(key, []);
      }
      groupedIntegrations.get(key)!.push(integration);
    }

    // Find and remove duplicates (keep the most recent one)
    for (const [key, duplicates] of groupedIntegrations) {
      if (duplicates.length > 1) {
        console.log(`🔍 Found ${duplicates.length} duplicates for: ${key}`);
        
        // Keep the first one (most recent due to order by created_at desc)
        const toKeep = duplicates[0];
        const toDelete = duplicates.slice(1);
        
        console.log(`📌 Keeping integration: ${toKeep.id} (${toKeep.created_at})`);
        
        for (const duplicate of toDelete) {
          console.log(`🗑️ Deleting duplicate: ${duplicate.id} (${duplicate.created_at})`);
          
          // Delete associated commands first
          await supabase
            .from('integration_commands')
            .delete()
            .eq('integration_id', duplicate.id);
          
          // Delete the integration
          await supabase
            .from('integrations')
            .delete()
            .eq('id', duplicate.id);
        }
      }
    }

    // Clear cache after cleanup
    clearIntegrationsCache();
    
    console.log('✅ Duplicate cleanup completed');
  } catch (error) {
    console.error('❌ Error during duplicate cleanup:', error);
  }
};
