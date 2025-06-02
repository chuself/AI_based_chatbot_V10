
/**
 * AI Integration Helper - Provides context and prompts for AI to understand integrations
 * 
 * This service helps the AI model understand what integrations are available
 * and how to use them effectively.
 */

import getMcpClient, { Integration } from './mcpService';
import { 
  fetchIntegrationsFromSupabase, 
  fetchCommandsFromSupabase, 
  StoredIntegration, 
  StoredCommand 
} from './supabaseIntegrationsService';

export interface IntegrationContext {
  id: string;
  name: string;
  type: 'mcp' | 'api';
  category: string;
  description: string;
  capabilities: string[];
  usageExamples: string[];
  commonCommands: Array<{
    name: string;
    description: string;
    example: string;
    parameters?: string[];
  }>;
  setupInstructions: string[];
  isActive: boolean;
  isConfigured: boolean;
  supabaseId?: string; // For stored integrations
}

/**
 * Get AI-friendly context for all configured integrations
 */
export const getIntegrationsContext = async (): Promise<IntegrationContext[]> => {
  try {
    // Get integrations from both local MCP client and Supabase
    const mcpClient = getMcpClient();
    const localIntegrations = mcpClient.getServersWithStatus();
    const storedIntegrations = await fetchIntegrationsFromSupabase();
    const storedCommands = await fetchCommandsFromSupabase();

    console.log('Fetched integrations:', { 
      local: localIntegrations.length, 
      stored: storedIntegrations.length,
      commands: storedCommands.length 
    });

    // Combine and prioritize stored integrations
    const combinedIntegrations = new Map<string, IntegrationContext>();

    // Add stored integrations first (these have priority)
    for (const stored of storedIntegrations) {
      const commands = storedCommands.filter(cmd => cmd.integration_id === stored.id);
      const context = buildStoredIntegrationContext(stored, commands);
      combinedIntegrations.set(stored.name, context);
    }

    // Add local integrations that aren't already stored
    for (const local of localIntegrations) {
      if (!combinedIntegrations.has(local.name)) {
        const context = buildLocalIntegrationContext(local);
        combinedIntegrations.set(local.name, context);
      }
    }

    return Array.from(combinedIntegrations.values());
  } catch (error) {
    console.error('Error getting integrations context:', error);
    // Fallback to local integrations only
    const mcpClient = getMcpClient();
    const integrations = mcpClient.getServersWithStatus();
    return integrations.map(integration => buildLocalIntegrationContext(integration));
  }
};

/**
 * Build context for stored Supabase integration
 */
const buildStoredIntegrationContext = (
  integration: StoredIntegration, 
  commands: StoredCommand[]
): IntegrationContext => {
  const baseContext: IntegrationContext = {
    id: integration.id,
    name: integration.name,
    type: integration.type,
    category: integration.category,
    description: integration.description || '',
    capabilities: [],
    usageExamples: [],
    commonCommands: commands.map(cmd => ({
      name: cmd.name,
      description: cmd.description || '',
      example: cmd.example || `${cmd.name}()`,
      parameters: Object.keys(cmd.parameters || {})
    })),
    setupInstructions: [],
    isActive: integration.is_active,
    isConfigured: true,
    supabaseId: integration.id
  };

  return enhanceContextByCategory(baseContext);
};

/**
 * Build context for local MCP integration
 */
const buildLocalIntegrationContext = (integration: Integration & { isCurrentlyActive: boolean }): IntegrationContext => {
  const baseContext: IntegrationContext = {
    id: integration.id,
    name: integration.name,
    type: integration.type,
    category: integration.category,
    description: integration.description || '',
    capabilities: [],
    usageExamples: [],
    commonCommands: (integration.commands || []).map(cmd => ({
      name: cmd.name,
      description: cmd.description || '',
      example: cmd.example || `${cmd.name}()`,
      parameters: cmd.parameters ? Object.keys(cmd.parameters) : []
    })),
    setupInstructions: [],
    isActive: integration.isCurrentlyActive,
    isConfigured: true
  };

  return enhanceContextByCategory(baseContext);
};

/**
 * Enhance context based on integration category
 */
const enhanceContextByCategory = (baseContext: IntegrationContext): IntegrationContext => {
  switch (baseContext.category.toLowerCase()) {
    case 'reminders':
    case 'reminder':
    case 'tasks':
    case 'todo':
      return {
        ...baseContext,
        capabilities: [
          'Retrieve pending tasks and reminders',
          'Create new reminders with due dates',
          'Mark tasks as completed',
          'Update reminder details',
          'Delete reminders',
          'Search tasks by title or date'
        ],
        usageExamples: [
          'Check my pending tasks',
          'What reminders do I have for today?',
          'Add a reminder to call John tomorrow at 3 PM',
          'Mark the grocery shopping task as done',
          'Show me all overdue reminders'
        ],
        setupInstructions: [
          '1. Ensure your reminder app API is accessible via the configured URL',
          '2. Verify API key authentication is working (if required)',
          '3. Test the connection using the "Test Connection" button in integrations',
          '4. Make sure your API returns data in JSON format',
          '5. Check that CORS is properly configured if calling from browser'
        ]
      };

    case 'search':
      return {
        ...baseContext,
        capabilities: [
          'Search the web for current information',
          'Find specific facts and data',
          'Get recent news and updates',
          'Research topics and questions'
        ],
        usageExamples: [
          'Search for latest AI news',
          'What\'s the weather like today?',
          'Find information about quantum computing',
          'Search for restaurant reviews near me'
        ],
        setupInstructions: [
          '1. Configure the search server URL (default: DuckDuckGo MCP server)',
          '2. Test the connection to ensure search is working',
          '3. No API key required for basic search functionality'
        ]
      };

    case 'email':
    case 'gmail':
      return {
        ...baseContext,
        capabilities: [
          'Read and search emails',
          'Send new emails',
          'Reply to messages',
          'Manage email folders'
        ],
        usageExamples: [
          'Check my recent emails',
          'Send an email to John about the meeting',
          'Search for emails from my manager',
          'Reply to the last email from Sarah'
        ],
        setupInstructions: [
          '1. Connect your Gmail account using OAuth',
          '2. Grant necessary permissions for reading and sending emails',
          '3. Test the connection to verify access'
        ]
      };

    default:
      return {
        ...baseContext,
        capabilities: ['Custom API integration'],
        usageExamples: [`Interact with ${baseContext.name} service`],
        setupInstructions: [
          '1. Configure the API endpoint URL',
          '2. Add API key if required',
          '3. Test the connection',
          '4. Define available commands/endpoints'
        ]
      };
  }
};

/**
 * Generate AI system prompt with integration context
 */
export const generateIntegrationsSystemPrompt = async (): Promise<string> => {
  const integrations = await getIntegrationsContext();
  const activeIntegrations = integrations.filter(i => i.isConfigured);
  
  if (activeIntegrations.length === 0) {
    return '';
  }

  let prompt = '\n\n## Available Integrations\n\n';
  prompt += 'You have access to the following external services through integrations:\n\n';

  activeIntegrations.forEach(integration => {
    prompt += `### ${integration.name} (${integration.category})\n`;
    prompt += `**Status:** ${integration.isActive ? '🟢 Active' : '⚪ Available'}\n`;
    prompt += `**Type:** ${integration.type.toUpperCase()}\n`;
    prompt += `**Integration ID:** ${integration.supabaseId || integration.id}\n`;
    
    if (integration.description) {
      prompt += `**Description:** ${integration.description}\n`;
    }

    if (integration.capabilities.length > 0) {
      prompt += `**Capabilities:**\n`;
      integration.capabilities.forEach(cap => {
        prompt += `- ${cap}\n`;
      });
    }

    if (integration.commonCommands.length > 0) {
      prompt += `**Available Commands:**\n`;
      integration.commonCommands.forEach(cmd => {
        prompt += `- \`${cmd.name}\`: ${cmd.description}\n`;
        prompt += `  Example: \`${cmd.example}\`\n`;
        if (cmd.parameters && cmd.parameters.length > 0) {
          prompt += `  Parameters: ${cmd.parameters.join(', ')}\n`;
        }
      });
    }

    if (integration.usageExamples.length > 0) {
      prompt += `**Usage Examples:**\n`;
      integration.usageExamples.forEach(example => {
        prompt += `- "${example}"\n`;
      });
    }

    prompt += '\n';
  });

  prompt += '\n**How to use integrations:**\n';
  prompt += '1. When users ask about tasks, reminders, emails, or other integrated services, use the executeIntegrationCommand function\n';
  prompt += '2. Always provide helpful context about what you\'re doing ("Let me check your pending tasks...")\n';
  prompt += '3. If an integration isn\'t working, suggest checking the configuration in Settings > Integrations\n';
  prompt += '4. Format responses in a user-friendly way, not just raw API data\n';
  prompt += '5. Use the integration ID and command name to execute commands\n\n';

  return prompt;
};

/**
 * Get setup instructions for a specific integration type
 */
export const getSetupInstructions = async (category: string): Promise<string[]> => {
  const integrations = await getIntegrationsContext();
  const integration = integrations.find(i => i.category.toLowerCase() === category.toLowerCase());
  
  return integration?.setupInstructions || [
    '1. Add the integration in Settings > Integrations',
    '2. Configure the API endpoint URL',
    '3. Add authentication credentials if required',
    '4. Test the connection',
    '5. Define available commands for the AI to use'
  ];
};

/**
 * Check if a specific integration category is available and configured
 */
export const isIntegrationAvailable = async (category: string): Promise<boolean> => {
  const integrations = await getIntegrationsContext();
  return integrations.some(i => 
    i.category.toLowerCase() === category.toLowerCase() && i.isConfigured
  );
};

/**
 * Get integration by category
 */
export const getIntegrationByCategory = async (category: string): Promise<IntegrationContext | undefined> => {
  const integrations = await getIntegrationsContext();
  return integrations.find(i => i.category.toLowerCase() === category.toLowerCase());
};
