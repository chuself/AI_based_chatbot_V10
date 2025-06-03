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
      // Use a composite key to avoid conflicts
      const key = `${stored.name}-${stored.category}`;
      combinedIntegrations.set(key, context);
    }

    // Add local integrations that aren't already stored
    for (const local of localIntegrations) {
      const key = `${local.name}-${local.category}`;
      if (!combinedIntegrations.has(key)) {
        const context = buildLocalIntegrationContext(local);
        combinedIntegrations.set(key, context);
      }
    }

    const result = Array.from(combinedIntegrations.values());
    console.log('Final integrations context:', result.map(i => ({ name: i.name, category: i.category, commands: i.commonCommands.length })));
    
    return result;
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
      example: cmd.example || `${integration.name}.${cmd.name}()`,
      parameters: Object.keys(cmd.parameters || {})
    })),
    setupInstructions: [],
    isActive: integration.is_active,
    isConfigured: true,
    supabaseId: integration.id
  };

  // CRITICAL: Only provide capabilities and examples if commands actually exist
  if (commands.length === 0) {
    // No commands exist - provide NO capabilities or examples that suggest the AI can use this integration
    baseContext.capabilities = [];
    baseContext.usageExamples = [];
    baseContext.setupInstructions = [
      '1. Go to Settings > Commands',
      '2. Select this integration',
      '3. Add commands that define how the AI can interact with this service'
    ];
  } else {
    // Commands exist - enhance with capabilities
    return enhanceContextByCategory(baseContext);
  }

  return baseContext;
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
      example: cmd.example || `${integration.name}.${cmd.name}()`,
      parameters: cmd.parameters ? Object.keys(cmd.parameters) : []
    })),
    setupInstructions: [],
    isActive: integration.isCurrentlyActive,
    isConfigured: true
  };

  // CRITICAL: Only provide capabilities and examples if commands actually exist
  if (!integration.commands || integration.commands.length === 0) {
    // No commands exist - provide NO capabilities or examples that suggest the AI can use this integration
    baseContext.capabilities = [];
    baseContext.usageExamples = [];
    baseContext.setupInstructions = [
      '1. Ensure your integration server is running',
      '2. Check that commands are properly exposed',
      '3. Verify the connection in Settings > Integrations'
    ];
  } else {
    // Commands exist - enhance with capabilities
    return enhanceContextByCategory(baseContext);
  }

  return baseContext;
};

/**
 * Enhance context based on integration category - ONLY when commands exist
 */
const enhanceContextByCategory = (baseContext: IntegrationContext): IntegrationContext => {
  // Double-check: Only provide enhanced capabilities if there are actual commands
  if (baseContext.commonCommands.length === 0) {
    return baseContext;
  }

  const category = baseContext.category.toLowerCase();
  
  if (['reminders', 'reminder', 'tasks', 'todo'].includes(category)) {
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
  }

  if (category === 'search') {
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
  }

  if (['email', 'gmail'].includes(category)) {
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
  }

  // Default case
  return {
    ...baseContext,
    capabilities: ['Custom API integration with configured commands'],
    usageExamples: [`Use the configured commands to interact with ${baseContext.name}`],
    setupInstructions: [
      '1. Configure the API endpoint URL',
      '2. Add API key if required',
      '3. Test the connection',
      '4. Define available commands/endpoints'
    ]
  };
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

  // Separate integrations with commands from those without
  const integrationsWithCommands = activeIntegrations.filter(i => i.commonCommands.length > 0);
  const integrationsWithoutCommands = activeIntegrations.filter(i => i.commonCommands.length === 0);

  // Only show integrations with commands in the active section
  if (integrationsWithCommands.length > 0) {
    integrationsWithCommands.forEach(integration => {
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

      prompt += `**Available Commands:**\n`;
      integration.commonCommands.forEach(cmd => {
        prompt += `- \`${cmd.name}\`: ${cmd.description}\n`;
        prompt += `  Example: \`${cmd.example}\`\n`;
        if (cmd.parameters && cmd.parameters.length > 0) {
          prompt += `  Parameters: ${cmd.parameters.join(', ')}\n`;
        }
      });

      if (integration.usageExamples.length > 0) {
        prompt += `**Usage Examples:**\n`;
        integration.usageExamples.forEach(example => {
          prompt += `- "${example}"\n`;
        });
      }

      prompt += '\n';
    });

    prompt += '\n**CRITICAL: How to use integrations:**\n';
    prompt += '1. When users ask about tasks, reminders, emails, or other integrated services, use this EXACT format:\n';
    prompt += '   ```tool_code\n';
    prompt += '   integrationName.commandName(parameter1="value1", parameter2="value2")\n';
    prompt += '   ```\n';
    prompt += '2. For example, to get tasks: ```tool_code\nreminder.getTasks\n```\n';
    prompt += '3. To create a task: ```tool_code\nreminder.createTask(title="Buy groceries", due_date="2024-12-15")\n```\n';
    prompt += '4. Always use the exact integration name and command name as shown above\n';
    prompt += '5. Always provide helpful context about what you\'re doing ("Let me check your pending tasks...")\n';
    prompt += '6. If an integration isn\'t working, suggest checking the configuration in Settings > Integrations\n';
    prompt += '7. Format responses in a user-friendly way, not just raw API data\n';
  }

  // Show integrations without commands in a separate section
  if (integrationsWithoutCommands.length > 0) {
    prompt += '\n**Integrations Awaiting Configuration:**\n';
    integrationsWithoutCommands.forEach(integration => {
      prompt += `- **${integration.name}** (${integration.category}): No commands configured yet. Commands must be added in Settings > Commands before this integration can be used.\n`;
    });
  }

  // CRITICAL: If no integrations have commands, don't provide usage instructions
  if (integrationsWithCommands.length === 0) {
    prompt += '\n**Note:** All integrations are configured but no commands are available yet. Users need to configure commands in Settings > Commands to enable AI interaction with these services. Do not attempt to use any integration commands until commands are properly configured.\n';
  }

  prompt += '\n';

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
