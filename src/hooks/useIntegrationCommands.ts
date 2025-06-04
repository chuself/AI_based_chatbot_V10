
import { useState } from 'react';
import { executeIntegrationCommand, fetchIntegrationsFromSupabase } from '@/services/supabaseIntegrationsService';
import { useMcpDebug } from './useMcpDebug';

export const useIntegrationCommands = () => {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const { logRequest, logResponse } = useMcpDebug();

  const executeCommand = async (
    integrationName: string,
    commandName: string,
    parameters: Record<string, any> = {}
  ): Promise<{ result?: any; error?: { message: string } }> => {
    try {
      setIsExecuting(`${integrationName}.${commandName}`);
      
      console.log(`Looking for integration with name: "${integrationName}"`);
      
      // Get integration from Supabase (which handles deduplication)
      const integrations = await fetchIntegrationsFromSupabase();
      console.log('Available integrations:', integrations.map(i => ({ name: i.name, category: i.category, id: i.id })));
      
      if (integrations.length === 0) {
        const errorResult = { 
          error: { 
            message: 'No integrations found. Please check your integration configuration and sync status.' 
          } 
        };
        logResponse(integrationName, commandName, errorResult);
        return errorResult;
      }
      
      // Try to find by exact name first
      let integration = integrations.find(i => i.name.toLowerCase() === integrationName.toLowerCase());
      
      // If not found by name, try by category (for backwards compatibility)
      if (!integration) {
        integration = integrations.find(i => i.category.toLowerCase() === integrationName.toLowerCase());
      }
      
      // If still not found, try partial matches
      if (!integration) {
        integration = integrations.find(i => 
          i.name.toLowerCase().includes(integrationName.toLowerCase()) ||
          i.category.toLowerCase().includes(integrationName.toLowerCase())
        );
      }
      
      if (!integration) {
        console.error(`No integration found for "${integrationName}". Available integrations:`, integrations);
        const errorResult = { 
          error: { 
            message: `Integration "${integrationName}" not found. Available integrations: ${integrations.map(i => i.name).join(', ') || 'none'}` 
          } 
        };
        logResponse(integrationName, commandName, errorResult);
        return errorResult;
      }

      console.log(`Found integration: ${integration.name} (${integration.category}) with ID: ${integration.id}`);

      // Normalize command names - handle common variations
      let normalizedCommandName = commandName.toLowerCase();
      
      // Map common command variations to the correct command names
      const commandMappings: Record<string, string> = {
        'deletetask': 'deleteTask',
        'delete_task': 'deleteTask',
        'updatetask': 'updateTask', 
        'update_task': 'updateTask',
        'gettasks': 'getTasks',
        'get_tasks': 'getTasks',
        'createtask': 'createTask',
        'create_task': 'createTask'
      };
      
      // Apply mapping if exists
      if (commandMappings[normalizedCommandName]) {
        normalizedCommandName = commandMappings[normalizedCommandName];
      }

      // Get available commands from config or database
      const availableCommands = integration.config?.commands || [];
      
      // Check if the command exists (case-insensitive)
      const commandExists = availableCommands.some((cmd: any) => 
        cmd.name?.toLowerCase() === normalizedCommandName.toLowerCase()
      );
      
      if (!commandExists && availableCommands.length > 0) {
        console.error(`Command "${commandName}" not found in integration "${integration.name}". Available commands:`, availableCommands.map((c: any) => c.name));
        const errorResult = { 
          error: { 
            message: `Command "${commandName}" not found in integration "${integration.name}". Available commands: ${availableCommands.map((c: any) => c.name).join(', ') || 'none'}` 
          } 
        };
        logResponse(integrationName, commandName, errorResult);
        return errorResult;
      }

      // Find the actual command name with correct casing
      const actualCommand = availableCommands.find((cmd: any) => 
        cmd.name?.toLowerCase() === normalizedCommandName.toLowerCase()
      );
      
      const finalCommandName = actualCommand ? actualCommand.name : normalizedCommandName;

      console.log(`Executing command ${finalCommandName} on integration ${integration.name} with parameters:`, parameters);
      
      // Log the request details for debugging
      const requestDetails = {
        integrationId: integration.id,
        integrationName: integration.name,
        commandName: finalCommandName,
        parameters,
        integrationConfig: integration.config,
        timestamp: new Date().toISOString()
      };
      logRequest(integrationName, finalCommandName, parameters, requestDetails);
      
      const result = await executeIntegrationCommand(
        integration.id,
        finalCommandName,
        parameters
      );

      console.log('Integration command result:', result);
      
      // Log the response for debugging
      logResponse(integrationName, finalCommandName, result);
      
      return result;
    } catch (error) {
      console.error('Error executing integration command:', error);
      const errorResult = { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
      logResponse(integrationName, commandName, errorResult);
      return errorResult;
    } finally {
      setIsExecuting(null);
    }
  };

  const isCommandExecuting = (integrationName: string, commandName: string): boolean => {
    return isExecuting === `${integrationName}.${commandName}`;
  };

  return {
    executeCommand,
    isExecuting,
    isCommandExecuting
  };
};
