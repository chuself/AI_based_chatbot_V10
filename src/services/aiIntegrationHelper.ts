
/**
 * AI Integration Helper - Provides context and prompts for AI to understand integrations
 * 
 * This service helps the AI model understand what integrations are available
 * and how to use them effectively.
 */

import getMcpClient, { Integration } from './mcpService';

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
}

/**
 * Get AI-friendly context for all configured integrations
 */
export const getIntegrationsContext = (): IntegrationContext[] => {
  const mcpClient = getMcpClient();
  const integrations = mcpClient.getServersWithStatus();
  
  return integrations.map(integration => {
    const context = buildIntegrationContext(integration);
    return context;
  });
};

/**
 * Build detailed context for a specific integration
 */
const buildIntegrationContext = (integration: Integration & { isCurrentlyActive: boolean }): IntegrationContext => {
  const baseContext: IntegrationContext = {
    id: integration.id,
    name: integration.name,
    type: integration.type,
    category: integration.category,
    description: integration.description || '',
    capabilities: [],
    usageExamples: [],
    commonCommands: [],
    setupInstructions: [],
    isActive: integration.isCurrentlyActive,
    isConfigured: true
  };

  // Add category-specific context
  switch (integration.category.toLowerCase()) {
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
        commonCommands: [
          {
            name: 'get_pending_tasks',
            description: 'Retrieve all pending/incomplete tasks',
            example: 'get_pending_tasks()',
            parameters: []
          },
          {
            name: 'get_tasks_by_date',
            description: 'Get tasks for a specific date',
            example: 'get_tasks_by_date(date="2024-01-15")',
            parameters: ['date (YYYY-MM-DD format)']
          },
          {
            name: 'create_reminder',
            description: 'Create a new reminder/task',
            example: 'create_reminder(title="Meeting with client", due_date="2024-01-15", priority="high")',
            parameters: ['title', 'due_date', 'priority (optional)']
          },
          {
            name: 'complete_task',
            description: 'Mark a task as completed',
            example: 'complete_task(task_id="123")',
            parameters: ['task_id']
          },
          {
            name: 'search_tasks',
            description: 'Search tasks by keyword',
            example: 'search_tasks(query="grocery")',
            parameters: ['query']
          }
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
        commonCommands: [
          {
            name: 'search',
            description: 'Search the web for information',
            example: 'search(query="latest AI developments")',
            parameters: ['query']
          }
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
        commonCommands: [
          {
            name: 'get_emails',
            description: 'Retrieve recent emails',
            example: 'get_emails(limit=10)',
            parameters: ['limit (optional)']
          },
          {
            name: 'send_email',
            description: 'Send a new email',
            example: 'send_email(to="john@example.com", subject="Meeting", body="Let\'s meet tomorrow")',
            parameters: ['to', 'subject', 'body']
          }
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
        usageExamples: [`Interact with ${integration.name} service`],
        commonCommands: integration.commands?.map(cmd => ({
          name: cmd.name,
          description: cmd.description,
          example: cmd.example || `${cmd.name}()`,
          parameters: cmd.parameters ? Object.keys(cmd.parameters) : []
        })) || [],
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
export const generateIntegrationsSystemPrompt = (): string => {
  const integrations = getIntegrationsContext();
  const activeIntegrations = integrations.filter(i => i.isConfigured);
  
  if (activeIntegrations.length === 0) {
    return '';
  }

  let prompt = '\n\n## Available Integrations\n\n';
  prompt += 'You have access to the following external services through MCP (Model Context Protocol):\n\n';

  activeIntegrations.forEach(integration => {
    prompt += `### ${integration.name} (${integration.category})\n`;
    prompt += `**Status:** ${integration.isActive ? '🟢 Active' : '⚪ Available'}\n`;
    prompt += `**Type:** ${integration.type.toUpperCase()}\n`;
    
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
  prompt += '1. When users ask about tasks, reminders, emails, or other integrated services, use the appropriate commands\n';
  prompt += '2. Always provide helpful context about what you\'re doing ("Let me check your pending tasks...")\n';
  prompt += '3. If an integration isn\'t working, suggest checking the configuration in Settings > Integrations\n';
  prompt += '4. Format responses in a user-friendly way, not just raw API data\n\n';

  return prompt;
};

/**
 * Get setup instructions for a specific integration type
 */
export const getSetupInstructions = (category: string): string[] => {
  const integrations = getIntegrationsContext();
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
export const isIntegrationAvailable = (category: string): boolean => {
  const integrations = getIntegrationsContext();
  return integrations.some(i => 
    i.category.toLowerCase() === category.toLowerCase() && i.isConfigured
  );
};

/**
 * Get integration by category
 */
export const getIntegrationByCategory = (category: string): IntegrationContext | undefined => {
  const integrations = getIntegrationsContext();
  return integrations.find(i => i.category.toLowerCase() === category.toLowerCase());
};
