
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
      
      // Get integration context to find the Supabase ID
      const integrations = await getIntegrationsContext();
      const integration = integrations.find(i => i.name === integrationName);
      
      if (!integration) {
        return { error: { message: `Integration "${integrationName}" not found` } };
      }

      if (!integration.supabaseId) {
        return { error: { message: `Integration "${integrationName}" is not synced to Supabase` } };
      }

      console.log(`Executing command ${commandName} on integration ${integrationName} with parameters:`, parameters);
      
      const result = await executeIntegrationCommand(
        integration.supabaseId,
        commandName,
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
