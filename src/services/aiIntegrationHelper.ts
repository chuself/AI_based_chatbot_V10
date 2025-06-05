
import { useIntegrationCommands } from '@/hooks/useIntegrationCommands';

// Type definitions for integration checking
export interface IntegrationCheck {
  name: string;
  isAvailable: boolean;
  category: string;
  type: 'mcp' | 'api';
  commands?: string[];
}

// Check if specific integrations are available
export const isIntegrationAvailable = (integrationName: string): boolean => {
  // This would normally check against configured integrations
  // For now, we'll return false as a safe default
  return false;
};

// Get available integrations for AI context
export const getAvailableIntegrations = (): IntegrationCheck[] => {
  // This would normally fetch from the integration service
  // For now, return empty array as safe default
  return [];
};

// Format integration commands for AI context
export const formatIntegrationCommands = (integrations: IntegrationCheck[]): string => {
  if (integrations.length === 0) {
    return "No external integrations are currently configured.";
  }

  return integrations.map(integration => {
    const commands = integration.commands?.join(', ') || 'No commands defined';
    return `${integration.name} (${integration.category}): ${commands}`;
  }).join('\n');
};

// Generate system prompt with available integrations
export const generateIntegrationsSystemPrompt = (): string => {
  const integrations = getAvailableIntegrations();
  const commandsList = formatIntegrationCommands(integrations);
  
  return `Available integrations and commands:\n${commandsList}`;
};

// Helper to execute integration commands through the hook
export const createIntegrationExecutor = () => {
  const { executeCommand } = useIntegrationCommands();
  
  return {
    execute: async (integrationName: string, commandName: string, parameters: Record<string, any> = {}) => {
      try {
        const result = await executeCommand(integrationName, commandName, parameters);
        return result;
      } catch (error) {
        console.error('Integration execution error:', error);
        return { error: { message: error instanceof Error ? error.message : 'Unknown error' } };
      }
    }
  };
};

// Validate integration configuration
export const validateIntegrationConfig = (config: any): boolean => {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // Basic validation - ensure required fields exist
  return !!(config.name && config.url && config.type);
};

// Get integration status
export const getIntegrationStatus = (integration: any): 'active' | 'inactive' | 'error' => {
  try {
    if (!integration) return 'error';
    if (integration.is_active === true) return 'active';
    if (integration.is_active === false) return 'inactive';
    return 'error';
  } catch {
    return 'error';
  }
};
