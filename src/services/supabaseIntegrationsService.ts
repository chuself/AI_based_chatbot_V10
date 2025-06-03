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
 * Sync local MCP integrations to Supabase
 */
export const syncIntegrationsToSupabase = async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('No authenticated user, skipping integration sync');
      return false;
    }

    const mcpClient = getMcpClient();
    const localIntegrations = mcpClient.getServers();

    console.log('Syncing integrations to Supabase:', localIntegrations.length);

    for (const integration of localIntegrations) {
      // Check if integration already exists in Supabase
      const { data: existingIntegration } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', integration.name)
        .eq('type', integration.type)
        .single();

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
 * Sync commands for a specific integration
 */
const syncCommandsForIntegration = async (
  integrationId: string, 
  commands: IntegrationCommand[]
): Promise<void> => {
  try {
    // Delete existing commands for this integration
    await supabase
      .from('integration_commands')
      .delete()
      .eq('integration_id', integrationId);

    // Insert new commands
    const commandsData = commands.map(cmd => ({
      integration_id: integrationId,
      name: cmd.name,
      description: cmd.description,
      endpoint: cmd.endpoint || `/${cmd.name}`,
      method: cmd.method || 'GET',
      parameters: cmd.parameters || {},
      example: cmd.example,
      is_active: true
    }));

    if (commandsData.length > 0) {
      const { error } = await supabase
        .from('integration_commands')
        .insert(commandsData);

      if (error) {
        console.error('Error syncing commands:', error);
      }
    }
  } catch (error) {
    console.error('Error syncing commands for integration:', error);
  }
};

/**
 * Fetch integrations from Supabase
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
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching integrations:', error);
      return [];
    }

    return (data || []).map(integration => ({
      ...integration,
      type: integration.type as 'mcp' | 'api',
      config: integration.config as any
    }));
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
 * Execute an API call to an integration
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

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError);
      return { error: { message: 'Integration not found' } };
    }

    console.log('Found integration:', integration.name, integration.config);

    // Get command details
    const { data: command, error: commandError } = await supabase
      .from('integration_commands')
      .select('*')
      .eq('integration_id', integrationId)
      .eq('name', commandName)
      .single();

    if (commandError || !command) {
      console.error('Command not found:', commandError);
      return { error: { message: `Command "${commandName}" not found` } };
    }

    console.log('Found command:', command);

    // Build the API URL
    const config = integration.config as any;
    const baseUrl = config.url;
    const endpoint = command.endpoint || `/${commandName}`;
    
    // For reminder API, ensure we're using the correct full URL
    let fullUrl: string;
    if (baseUrl.includes('supabase.co/functions/v1')) {
      // Already a full Supabase function URL
      fullUrl = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;
    } else {
      // Regular API URL
      fullUrl = `${baseUrl}${endpoint}`;
    }

    console.log('Full API URL:', fullUrl);

    // Prepare headers with correct Bearer token format
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.headers || {})
    };

    if (config.apiKey) {
      // Ensure Bearer format for API key
      if (config.apiKey.startsWith('sk_')) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      } else if (!config.apiKey.startsWith('Bearer ')) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      } else {
        headers['Authorization'] = config.apiKey;
      }
    }

    console.log('Request headers:', headers);

    // Make the API call
    const fetchOptions: RequestInit = {
      method: command.method,
      headers
    };

    if (command.method !== 'GET' && Object.keys(parameters).length > 0) {
      fetchOptions.body = JSON.stringify(parameters);
      console.log('Request body:', fetchOptions.body);
    } else if (command.method === 'GET' && Object.keys(parameters).length > 0) {
      const searchParams = new URLSearchParams(parameters);
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
 * Helper function to make the actual API call
 */
const makeApiCall = async (url: string, options: RequestInit): Promise<{ result?: any; error?: { message: string } }> => {
  try {
    console.log('Making API call to:', url);
    console.log('Request options:', options);
    
    const response = await fetch(url, options);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API call failed:', response.status, response.statusText, errorText);
      return { error: { message: `API call failed with status ${response.status}: ${response.statusText}. ${errorText}` } };
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

    // Check if command already exists
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
      // Update existing command
      const { error } = await supabase
        .from('integration_commands')
        .update(commandPayload)
        .eq('id', existingCommand.id);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Create new command
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
