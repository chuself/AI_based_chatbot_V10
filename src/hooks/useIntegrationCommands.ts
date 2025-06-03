
import { useState } from 'react';
import { executeIntegrationCommand } from '@/services/supabaseIntegrationsService';
import { getIntegrationsContext } from '@/services/aiIntegrationHelper';

export const useIntegrationCommands = () => {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);

  const executeCommand = async (
    integrationName: string,
    commandName: string,
    parameters: Record<string, any> = {}
  ): Promise<{ result?: any; error?: { message: string } }> => {
    try {
      setIsExecuting(`${integrationName}.${commandName}`);
      
      console.log(`Looking for integration with name: "${integrationName}"`);
      
      // Get integration context to find the integration by name or category
      const integrations = await getIntegrationsContext();
      console.log('Available integrations:', integrations.map(i => ({ name: i.name, category: i.category, id: i.id })));
      
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
        return { 
          error: { 
            message: `Integration "${integrationName}" not found. Available integrations: ${integrations.map(i => i.name).join(', ') || 'none'}` 
          } 
        };
      }

      console.log(`Found integration: ${integration.name} (${integration.category}) with ID: ${integration.supabaseId || integration.id}`);

      if (!integration.supabaseId) {
        console.error(`Integration "${integration.name}" is not synced to Supabase`);
        return { 
          error: { 
            message: `Integration "${integration.name}" is not synced to Supabase. Please check your integration configuration.` 
          } 
        };
      }

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

      // Check if the command exists (case-insensitive)
      const commandExists = integration.commonCommands.some(cmd => 
        cmd.name.toLowerCase() === normalizedCommandName.toLowerCase()
      );
      
      if (!commandExists) {
        console.error(`Command "${commandName}" not found in integration "${integration.name}". Available commands:`, integration.commonCommands.map(c => c.name));
        return { 
          error: { 
            message: `Command "${commandName}" not found in integration "${integration.name}". Available commands: ${integration.commonCommands.map(c => c.name).join(', ') || 'none'}` 
          } 
        };
      }

      // Find the actual command name with correct casing
      const actualCommand = integration.commonCommands.find(cmd => 
        cmd.name.toLowerCase() === normalizedCommandName.toLowerCase()
      );
      
      const finalCommandName = actualCommand ? actualCommand.name : normalizedCommandName;

      console.log(`Executing command ${finalCommandName} on integration ${integration.name} with parameters:`, parameters);
      
      const result = await executeIntegrationCommand(
        integration.supabaseId,
        finalCommandName,
        parameters
      );

      console.log('Integration command result:', result);
      return result;
    } catch (error) {
      console.error('Error executing integration command:', error);
      return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
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
