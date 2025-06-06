
import { useState, useRef, useCallback } from 'react';
import { executeIntegrationCommand, fetchIntegrationsFromSupabase, clearIntegrationsCache } from '@/services/supabaseIntegrationsService';
import { useMcpDebug } from './useMcpDebug';
import { getAvailableIntegrations } from '@/services/aiIntegrationHelper';

export const useIntegrationCommands = () => {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const { logRequest, logResponse } = useMcpDebug();
  
  // Track execution to prevent duplicates
  const executingCommands = useRef(new Set<string>());

  // Fetch all available integrations with a force refresh option
  const refreshIntegrations = useCallback(async () => {
    console.log('🔄 Refreshing integrations via hook...');
    clearIntegrationsCache();
    const result = await getAvailableIntegrations(true);
    console.log('🔄 Refreshed integrations result:', result);
    return result;
  }, []);

  const executeCommand = async (
    integrationName: string,
    commandName: string,
    parameters: Record<string, any> = {}
  ): Promise<{ result?: any; error?: { message: string } }> => {
    // Create unique execution key to prevent duplicates
    const executionKey = `${integrationName}.${commandName}.${JSON.stringify(parameters)}`;
    
    console.log(`🚀 Starting command execution: ${executionKey}`);
    
    // Check if this exact command is already executing
    if (executingCommands.current.has(executionKey)) {
      console.log(`⚠️ Command already executing: ${executionKey}`);
      return { error: { message: 'Command is already being executed' } };
    }

    try {
      // Mark this command as executing
      executingCommands.current.add(executionKey);
      setIsExecuting(`${integrationName}.${commandName}`);
      
      console.log(`🔍 Looking for integration with name: "${integrationName}"`);
      
      // Force fresh integrations fetch to avoid stale data
      console.log('🔄 Forcing completely fresh integration data fetch...');
      clearIntegrationsCache(); // Clear any existing cache
      const integrations = await fetchIntegrationsFromSupabase(true); // Force bypass cache
      
      console.log('📊 Available integrations for command execution:', integrations.map(i => ({ 
        name: i.name, 
        category: i.category, 
        id: i.id,
        type: i.type,
        active: i.is_active 
      })));
      
      if (integrations.length === 0) {
        const errorResult = { 
          error: { 
            message: 'No integrations found in database. Please check your integration configuration and save status.' 
          } 
        };
        logResponse(integrationName, commandName, errorResult);
        return errorResult;
      }
      
      // Find integration using multiple strategies
      let integration = findIntegrationByName(integrations, integrationName);
      
      if (!integration) {
        console.error(`❌ No integration found for "${integrationName}". Available integrations:`, 
          integrations.map(i => `${i.name} (${i.category})`));
        const errorResult = { 
          error: { 
            message: `Integration "${integrationName}" not found in database. Available integrations: ${integrations.map(i => i.name).join(', ') || 'none'}. Please ensure your integration is saved in the cloud.` 
          } 
        };
        logResponse(integrationName, commandName, errorResult);
        return errorResult;
      }

      console.log(`✅ Found integration: ${integration.name} (${integration.category}) with ID: ${integration.id}`);

      // Normalize and validate command name
      const normalizedCommandName = normalizeCommandName(commandName);
      const validatedCommand = await validateCommand(integration, normalizedCommandName);
      
      if (!validatedCommand.isValid) {
        const errorResult = { 
          error: { 
            message: validatedCommand.error || `Command "${commandName}" not found` 
          } 
        };
        logResponse(integrationName, commandName, errorResult);
        return errorResult;
      }

      const finalCommandName = validatedCommand.commandName!;
      console.log(`🚀 Executing command ${finalCommandName} on integration ${integration.name} with parameters:`, parameters);
      
      // Log the request details for debugging
      const requestDetails = {
        integrationId: integration.id,
        integrationName: integration.name,
        commandName: finalCommandName,
        parameters,
        integrationConfig: integration.config,
        timestamp: new Date().toISOString(),
        executionKey
      };
      logRequest(integrationName, finalCommandName, parameters, requestDetails);
      
      // Execute with fresh connection
      console.log('📡 Executing with fresh connection to external API...');
      const result = await executeIntegrationCommand(
        integration.id,
        finalCommandName,
        parameters
      );

      console.log('✅ Integration command result:', result);
      
      // Log the response for debugging
      logResponse(integrationName, finalCommandName, result);
      
      return result;
    } catch (error) {
      console.error('❌ Error executing integration command:', error);
      const errorResult = { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
      logResponse(integrationName, commandName, errorResult);
      return errorResult;
    } finally {
      // Always clean up execution tracking
      executingCommands.current.delete(executionKey);
      setIsExecuting(null);
    }
  };

  const isCommandExecuting = (integrationName: string, commandName: string): boolean => {
    return isExecuting === `${integrationName}.${commandName}`;
  };

  // Clear all execution tracking (useful for reset)
  const clearExecutionTracking = () => {
    executingCommands.current.clear();
    setIsExecuting(null);
  };

  return {
    executeCommand,
    isExecuting,
    isCommandExecuting,
    clearExecutionTracking,
    refreshIntegrations
  };
};

// Helper function to find integration by name with multiple strategies
const findIntegrationByName = (integrations: any[], integrationName: string) => {
  const searchName = integrationName.toLowerCase();
  
  console.log(`🔍 Searching for integration: "${searchName}"`);
  console.log('🔍 Available integrations:', integrations.map(i => `"${i.name.toLowerCase()}" (${i.category.toLowerCase()})`));
  
  // Strategy 1: Exact name match
  let integration = integrations.find(i => i.name.toLowerCase() === searchName);
  if (integration) {
    console.log(`✅ Found by exact name match: ${integration.name}`);
    return integration;
  }
  
  // Strategy 2: Exact category match  
  integration = integrations.find(i => i.category.toLowerCase() === searchName);
  if (integration) {
    console.log(`✅ Found by category match: ${integration.name} (${integration.category})`);
    return integration;
  }
  
  // Strategy 3: Partial name match
  integration = integrations.find(i => i.name.toLowerCase().includes(searchName));
  if (integration) {
    console.log(`✅ Found by partial name match: ${integration.name}`);
    return integration;
  }
  
  // Strategy 4: Partial category match
  integration = integrations.find(i => i.category.toLowerCase().includes(searchName));
  if (integration) {
    console.log(`✅ Found by partial category match: ${integration.name} (${integration.category})`);
    return integration;
  }
  
  // Strategy 5: Common aliases
  const aliases: Record<string, string[]> = {
    'search': ['web search', 'websearch', 'web research', 'research'],
    'reminder': ['task', 'tasks', 'todo', 'reminders', 'task manager'],
    'web research assistant': ['search', 'websearch', 'research'],
    'task manager': ['reminder', 'tasks', 'todo', 'reminders']
  };
  
  for (const [alias, variations] of Object.entries(aliases)) {
    if (variations.includes(searchName)) {
      integration = integrations.find(i => 
        i.name.toLowerCase().includes(alias) || 
        i.category.toLowerCase().includes(alias)
      );
      if (integration) {
        console.log(`✅ Found by alias match: ${integration.name} (alias: ${alias})`);
        return integration;
      }
    }
  }
  
  console.log(`❌ No integration found for: "${searchName}"`);
  return null;
};

// Helper function to normalize command names
const normalizeCommandName = (commandName: string): string => {
  let normalized = commandName.toLowerCase().trim();
  
  // Map common command variations to the correct command names
  const commandMappings: Record<string, string> = {
    // Task/Reminder commands
    'deletetask': 'deleteTask',
    'delete_task': 'deleteTask',
    'updatetask': 'updateTask', 
    'update_task': 'updateTask',
    'gettasks': 'getTasks',
    'get_tasks': 'getTasks',
    'get_pending_tasks': 'getTasks',
    'createtask': 'createTask',
    'create_task': 'createTask',
    'create_reminder': 'createTask',
    'complete_task': 'updateTask',
    'search_tasks': 'searchTasks',
    'get_tasks_by_date': 'getTasksByDate',
    
    // Search commands
    'websearch': 'websearch',
    'web_search': 'websearch',
    'search': 'websearch'
  };
  
  // Apply mapping if exists
  if (commandMappings[normalized]) {
    normalized = commandMappings[normalized];
    console.log(`🔄 Mapped command "${commandName}" to "${normalized}"`);
  }
  
  return normalized;
};

// Helper function to validate command exists in integration
const validateCommand = async (integration: any, commandName: string): Promise<{
  isValid: boolean;
  commandName?: string;
  error?: string;
}> => {
  try {
    // Get available commands from config
    const configCommands = integration.config?.commands || [];
    const configEndpoints = integration.config?.endpoints || [];
    
    console.log(`🔍 Checking command "${commandName}" against ${configCommands.length} config commands and ${configEndpoints.length} endpoints`);
    
    // Check config commands first (case-insensitive)
    let foundCommand = configCommands.find((cmd: any) => 
      cmd.name?.toLowerCase() === commandName.toLowerCase()
    );
    
    if (foundCommand) {
      console.log(`✅ Found in config commands: ${foundCommand.name}`);
      return { isValid: true, commandName: foundCommand.name };
    }
    
    // Check config endpoints
    foundCommand = configEndpoints.find((endpoint: any) => 
      endpoint.name?.toLowerCase() === commandName.toLowerCase()
    );
    
    if (foundCommand) {
      console.log(`✅ Found in config endpoints: ${foundCommand.name}`);
      return { isValid: true, commandName: foundCommand.name };
    }
    
    // If no commands are configured, allow the command (for backwards compatibility)
    if (configCommands.length === 0 && configEndpoints.length === 0) {
      console.log(`⚠️ No commands configured for integration ${integration.name}, allowing command: ${commandName}`);
      return { isValid: true, commandName };
    }
    
    // Command not found
    const availableCommands = [
      ...configCommands.map((c: any) => c.name),
      ...configEndpoints.map((e: any) => e.name)
    ];
    
    console.error(`❌ Command "${commandName}" not found. Available commands:`, availableCommands);
    
    return { 
      isValid: false, 
      error: `Command "${commandName}" not found in integration "${integration.name}". Available commands: ${availableCommands.join(', ') || 'none'}` 
    };
    
  } catch (error) {
    console.error('❌ Error validating command:', error);
    return { 
      isValid: false, 
      error: `Error validating command: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};
