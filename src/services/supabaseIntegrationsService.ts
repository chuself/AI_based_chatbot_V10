import { supabase } from '@/integrations/supabase/client';
import getMcpClient, { Integration, IntegrationCommand } from './mcpService';
import { getCurrentUser } from './supabaseService';

export interface StoredIntegration {
  id: string;
  user_id: string;
  name: string;
  type: 'mcp' | 'api';
  category: string;
  description?: string;
  config: {
    url: string;
    apiKey?: string;
    headers?: Record<string, string>;
    commands?: any[];
    endpoints?: any[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
}

/**
 * Clean up duplicate integrations for a user
 */
export const cleanupDuplicateIntegrations = async (): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('No authenticated user, skipping cleanup');
      return;
    }

    console.log('🧹 Starting cleanup of duplicate integrations');

    // Get all integrations grouped by name and type
    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching integrations for cleanup:', error);
      return;
    }

    if (!integrations || integrations.length === 0) {
      console.log('No integrations found for cleanup');
      return;
    }

    // Group by name and type to find duplicates
    const integrationGroups = new Map<string, StoredIntegration[]>();
    
    integrations.forEach(integration => {
      const key = `${integration.name}:${integration.type}`;
      if (!integrationGroups.has(key)) {
        integrationGroups.set(key, []);
      }
      integrationGroups.get(key)!.push(integration as StoredIntegration);
    });

    // Process duplicates
    for (const [key, group] of integrationGroups) {
      if (group.length > 1) {
        console.log(`Found ${group.length} duplicates for ${key}`);
        
        // Keep the most recent one, delete the rest
        const toKeep = group[group.length - 1];
        const toDelete = group.slice(0, -1);
        
        for (const duplicate of toDelete) {
          console.log(`Deleting duplicate integration: ${duplicate.id}`);
          
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
        
        console.log(`Kept integration: ${toKeep.id} for ${key}`);
      }
    }

    console.log('✅ Cleanup of duplicate integrations completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

/**
 * Sync local MCP integrations to Supabase with duplicate prevention
 */
export const syncIntegrationsToSupabase = async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('No authenticated user, skipping integration sync');
      return false;
    }

    // First cleanup any existing duplicates
    await cleanupDuplicateIntegrations();

    const mcpClient = getMcpClient();
    const localIntegrations = mcpClient.getServers();

    console.log('Syncing integrations to Supabase:', localIntegrations.length);

    for (const integration of localIntegrations) {
      // Check if integration already exists (by name, type, and URL to be more specific)
      const { data: existingIntegration } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', integration.name)
        .eq('type', integration.type)
        .eq('config->>url', integration.url)
        .maybeSingle();

      const integrationData = {
        user_id: user.id,
        name: integration.name,
        type: integration.type,
        category: integration.category,
        description: integration.description,
        config: {
          url: integration.url,
          apiKey: integration.apiKey,
          headers: integration.headers,
          commands: integration.commands || [],
          endpoints: integration.endpoints || []
        } as any,
        is_active: true
      };

      let integrationId: string;

      if (existingIntegration) {
        // Update existing integration
        const { error } = await supabase
          .from('integrations')
          .update(integrationData)
          .eq('id', existingIntegration.id);

        if (error) {
          console.error('Error updating integration:', error);
          continue;
        }
        integrationId = existingIntegration.id;
        console.log(`Updated existing integration: ${integration.name}`);
      } else {
        // Create new integration
        const { data, error } = await supabase
          .from('integrations')
          .insert(integrationData)
          .select('id')
          .single();

        if (error) {
          console.error('Error creating integration:', error);
          continue;
        }
        integrationId = data.id;
        console.log(`Created new integration: ${integration.name}`);
      }

      // Sync commands for this integration
      if (integration.commands && integration.commands.length > 0) {
        await syncCommandsForIntegration(integrationId, integration.commands);
      }
    }

    console.log('Successfully synced integrations to Supabase');
    return true;
  } catch (error) {
    console.error('Error syncing integrations:', error);
    return false;
  }
};

/**
 * Sync commands for a specific integration with better duplicate handling
 */
const syncCommandsForIntegration = async (
  integrationId: string, 
  commands: IntegrationCommand[]
): Promise<void> => {
  try {
    // Get existing commands to avoid duplicates
    const { data: existingCommands } = await supabase
      .from('integration_commands')
      .select('name, id')
      .eq('integration_id', integrationId);

    const existingCommandNames = new Set(existingCommands?.map(cmd => cmd.name) || []);

    // Only insert commands that don't already exist
    const newCommands = commands.filter(cmd => !existingCommandNames.has(cmd.name));

    if (newCommands.length > 0) {
      const commandsData = newCommands.map(cmd => ({
        integration_id: integrationId,
        name: cmd.name,
        description: cmd.description,
        endpoint: cmd.endpoint || `/${cmd.name}`,
        method: cmd.method || 'GET',
        parameters: cmd.parameters || {},
        example: cmd.example,
        is_active: true
      }));

      const { error } = await supabase
        .from('integration_commands')
        .insert(commandsData);

      if (error) {
        console.error('Error syncing commands:', error);
      } else {
        console.log(`Synced ${newCommands.length} new commands`);
      }
    }

    // Update existing commands if needed
    for (const cmd of commands) {
      if (existingCommandNames.has(cmd.name)) {
        const existingCmd = existingCommands?.find(ec => ec.name === cmd.name);
        if (existingCmd) {
          const { error } = await supabase
            .from('integration_commands')
            .update({
              description: cmd.description,
              endpoint: cmd.endpoint || `/${cmd.name}`,
              method: cmd.method || 'GET',
              parameters: cmd.parameters || {},
              example: cmd.example,
              is_active: true
            })
            .eq('id', existingCmd.id);

          if (error) {
            console.error('Error updating command:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error syncing commands for integration:', error);
  }
};

/**
 * Fetch integrations from Supabase with deduplication
 */
export const fetchIntegrationsFromSupabase = async (): Promise<StoredIntegration[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('No authenticated user, cannot fetch integrations');
      return [];
    }

    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching integrations:', error);
      return [];
    }

    // Remove duplicates based on name and type (keep most recent)
    const uniqueIntegrations = new Map<string, StoredIntegration>();
    
    (data || []).forEach(integration => {
      const key = `${integration.name}:${integration.type}`;
      if (!uniqueIntegrations.has(key)) {
        uniqueIntegrations.set(key, {
          ...integration,
          type: integration.type as 'mcp' | 'api',
          config: integration.config as any
        });
      }
    });

    return Array.from(uniqueIntegrations.values());
  } catch (error) {
    console.error('Error in fetchIntegrationsFromSupabase:', error);
    return [];
  }
};

/**
 * Fetch commands for integrations from Supabase
 */
export const fetchCommandsFromSupabase = async (): Promise<StoredCommand[]> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('No authenticated user, cannot fetch commands');
      return [];
    }

    const { data, error } = await supabase
      .from('integration_commands')
      .select(`
        *,
        integrations!inner(user_id)
      `)
      .eq('integrations.user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching commands:', error);
      return [];
    }

    return (data || []).map(cmd => ({
      ...cmd,
      parameters: cmd.parameters as any
    }));
  } catch (error) {
    console.error('Error in fetchCommandsFromSupabase:', error);
    return [];
  }
};

/**
 * Execute an API call to an integration with improved error handling
 */
export const executeIntegrationCommand = async (
  integrationId: string,
  commandName: string,
  parameters: Record<string, any> = {}
): Promise<{ result?: any; error?: { message: string } }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    console.log(`Executing integration command: ${commandName} for integration: ${integrationId}`);
    console.log('Parameters:', parameters);

    // Get integration details with better error handling
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (integrationError) {
      console.error('Integration query error:', integrationError);
      return { error: { message: `Database error: ${integrationError.message}` } };
    }

    if (!integration) {
      console.error('Integration not found or inactive:', integrationId);
      return { error: { message: 'Integration not found or inactive' } };
    }

    console.log('Found integration:', integration.name, integration.config);

    // Get command details with better error handling
    const { data: command, error: commandError } = await supabase
      .from('integration_commands')
      .select('*')
      .eq('integration_id', integrationId)
      .eq('name', commandName)
      .eq('is_active', true)
      .maybeSingle();

    if (commandError) {
      console.error('Command query error:', commandError);
      return { error: { message: `Database error: ${commandError.message}` } };
    }

    if (!command) {
      console.error('Command not found or inactive:', commandName);
      return { error: { message: `Command "${commandName}" not found or inactive` } };
    }

    console.log('Found command:', command);

    // Build the API URL with validation
    const config = integration.config as any;
    if (!config || !config.url) {
      return { error: { message: 'Integration configuration is missing or invalid' } };
    }

    const baseUrl = config.url;
    const endpoint = command.endpoint || `/${commandName}`;
    
    let fullUrl: string;
    try {
      if (baseUrl.includes('supabase.co/functions/v1')) {
        fullUrl = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;
      } else {
        fullUrl = `${baseUrl}${endpoint}`;
      }
      
      // Validate URL
      new URL(fullUrl);
    } catch (urlError) {
      console.error('Invalid URL:', urlError);
      return { error: { message: 'Invalid API URL configuration' } };
    }

    console.log('Full API URL:', fullUrl);

    // Prepare headers with validation
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.headers || {})
    };

    if (config.apiKey) {
      if (config.apiKey.startsWith('sk_')) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      } else if (!config.apiKey.startsWith('Bearer ')) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      } else {
        headers['Authorization'] = config.apiKey;
      }
    }

    console.log('Request headers:', { ...headers, Authorization: headers.Authorization ? '[REDACTED]' : undefined });

    // Make the API call with timeout
    const fetchOptions: RequestInit = {
      method: command.method,
      headers,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    };

    if (command.method !== 'GET' && Object.keys(parameters).length > 0) {
      fetchOptions.body = JSON.stringify(parameters);
      console.log('Request body:', fetchOptions.body);
    } else if (command.method === 'GET' && Object.keys(parameters).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(parameters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const urlWithParams = `${fullUrl}?${searchParams}`;
      console.log('GET URL with params:', urlWithParams);
      return await makeApiCall(urlWithParams, { ...fetchOptions, method: 'GET' });
    }

    return await makeApiCall(fullUrl, fetchOptions);
  } catch (error) {
    console.error('Error executing integration command:', error);
    return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
  }
};

/**
 * Helper function to make the actual API call with improved error handling
 */
const makeApiCall = async (url: string, options: RequestInit): Promise<{ result?: any; error?: { message: string } }> => {
  try {
    console.log('Making API call to:', url);
    console.log('Request options:', { ...options, headers: options.headers });
    
    const response = await fetch(url, options);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API call failed:', response.status, response.statusText, errorText);
      
      let errorMessage = `API call failed with status ${response.status}: ${response.statusText}`;
      if (errorText) {
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage += `. ${errorJson.message || errorText}`;
        } catch {
          errorMessage += `. ${errorText}`;
        }
      }
      
      return { error: { message: errorMessage } };
    }

    const contentType = response.headers.get('content-type');
    let result;
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }
    
    console.log('API call successful, result:', result);
    
    return { result };
  } catch (error) {
    console.error('Error making API call:', error);
    
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return { error: { message: 'Request timeout - the API took too long to respond' } };
    }
    
    return { error: { message: error instanceof Error ? error.message : 'Network error' } };
  }
};

/**
 * Create or update an integration command
 */
export const saveIntegrationCommand = async (
  integrationId: string,
  commandData: {
    name: string;
    description?: string;
    endpoint?: string;
    method: string;
    parameters?: Record<string, any>;
    example?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: existingCommand } = await supabase
      .from('integration_commands')
      .select('id')
      .eq('integration_id', integrationId)
      .eq('name', commandData.name)
      .single();

    const commandPayload = {
      integration_id: integrationId,
      name: commandData.name,
      description: commandData.description,
      endpoint: commandData.endpoint || `/${commandData.name}`,
      method: commandData.method,
      parameters: commandData.parameters || {},
      example: commandData.example,
      is_active: true
    };

    if (existingCommand) {
      const { error } = await supabase
        .from('integration_commands')
        .update(commandPayload)
        .eq('id', existingCommand.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from('integration_commands')
        .insert(commandPayload);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving integration command:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Delete an integration command
 */
export const deleteIntegrationCommand = async (commandId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('integration_commands')
      .delete()
      .eq('id', commandId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting integration command:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
