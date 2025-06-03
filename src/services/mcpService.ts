
/**
 * MCP Service - Handles interactions with the Model Context Protocol server and direct APIs
 * 
 * This implementation manages custom MCP servers, direct APIs, and their configurations
 */

// Track active connections for custom servers
let activeConnections: Record<string, boolean> = {};
let lastConnectionAttempt: Record<string, number> = {};

export interface Integration {
  id: string;
  name: string;
  url: string;
  type: 'mcp' | 'api';
  category: string; // e.g., 'search', 'ai', 'custom', etc.
  apiKey?: string;
  description?: string;
  commands?: IntegrationCommand[];
  isActive: boolean;
  lastUsed?: number;
  headers?: Record<string, string>;
  endpoints?: ApiEndpoint[];
}

export interface ApiEndpoint {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  parameters?: Record<string, any>;
}

export interface IntegrationCommand {
  name: string;
  description: string;
  endpoint?: string;
  method?: string;
  parameters?: Record<string, any>;
  example?: string;
}

// Keep MCPServer for backward compatibility
export interface MCPServer extends Integration {
  type: 'mcp';
  commands?: MCPCommand[];
}

export interface MCPCommand extends IntegrationCommand {}

export interface MCPCall {
  serverId: string;
  method: string;
  params: Record<string, any>;
  id: number;
}

export interface MCPResponse {
  result?: any;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

/**
 * Creates a function that can make calls to integrations (MCP servers and APIs)
 */
export const getMcpClient = () => {
  /**
   * Get all configured integrations
   */
  const getServers = (): Integration[] => {
    try {
      const stored = localStorage.getItem('integrations');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load integrations:', error);
      return [];
    }
  };

  /**
   * Save integrations to localStorage
   */
  const saveServers = (integrations: Integration[]) => {
    try {
      localStorage.setItem('integrations', JSON.stringify(integrations));
      console.log('Saved integrations:', integrations.length);
    } catch (error) {
      console.error('Failed to save integrations:', error);
    }
  };

  /**
   * Add a new integration
   */
  const addServer = (integration: Omit<Integration, 'id' | 'isActive' | 'lastUsed'>): Integration => {
    const integrations = getServers();
    const newIntegration: Integration = {
      ...integration,
      id: `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isActive: false,
      lastUsed: undefined
    };
    
    integrations.push(newIntegration);
    saveServers(integrations);
    
    // Initialize connection tracking
    activeConnections[newIntegration.id] = false;
    lastConnectionAttempt[newIntegration.id] = 0;
    
    return newIntegration;
  };

  /**
   * Update an existing integration
   */
  const updateServer = (integrationId: string, updates: Partial<Integration>): boolean => {
    const integrations = getServers();
    const index = integrations.findIndex(s => s.id === integrationId);
    
    if (index === -1) return false;
    
    integrations[index] = { ...integrations[index], ...updates };
    saveServers(integrations);
    return true;
  };

  /**
   * Remove an integration
   */
  const removeServer = (integrationId: string): boolean => {
    const integrations = getServers();
    const filtered = integrations.filter(s => s.id !== integrationId);
    
    if (filtered.length === integrations.length) return false;
    
    saveServers(filtered);
    
    // Clean up connection tracking
    delete activeConnections[integrationId];
    delete lastConnectionAttempt[integrationId];
    
    return true;
  };

  /**
   * Test connection to an integration
   */
  const testServerConnection = async (integration: Integration): Promise<MCPResponse> => {
    console.log(`Testing connection to ${integration.name} at ${integration.url}`);
    
    // Update connection tracking
    lastConnectionAttempt[integration.id] = Date.now();
    activeConnections[integration.id] = true;

    try {
      // Try to validate URL format first
      new URL(integration.url);
    } catch (error) {
      activeConnections[integration.id] = false;
      return {
        error: {
          message: "Invalid URL format",
          code: "invalid_url",
          details: error
        }
      };
    }

    try {
      let testEndpoint = integration.url;
      
      // For MCP servers, try health check endpoints
      if (integration.type === 'mcp') {
        testEndpoint = `${integration.url}/health`;
      } else {
        // For APIs, try the base URL or first endpoint
        if (integration.endpoints && integration.endpoints.length > 0) {
          testEndpoint = `${integration.url}${integration.endpoints[0].path}`;
        }
      }

      const response = await fetch(testEndpoint, {
        method: integration.type === 'mcp' ? 'GET' : (integration.endpoints?.[0]?.method || 'GET'),
        headers: {
          'Content-Type': 'application/json',
          ...(integration.apiKey && { 'Authorization': `Bearer ${integration.apiKey}` }),
          ...(integration.headers || {})
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        activeConnections[integration.id] = false;
        return { result: { status: 'healthy', message: 'Integration is responding' } };
      }

      const errorText = await response.text();
      activeConnections[integration.id] = false;
      
      return {
        error: {
          message: `Integration not responding: ${response.status} ${response.statusText}`,
          code: `http_${response.status}`,
          details: errorText
        }
      };

    } catch (error) {
      activeConnections[integration.id] = false;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: {
              message: "Connection timeout - integration took too long to respond",
              code: "timeout",
              details: error.message
            }
          };
        }
        
        return {
          error: {
            message: `Connection failed: ${error.message}`,
            code: "connection_error",
            details: error
          }
        };
      }
      
      return {
        error: {
          message: "Unknown connection error occurred",
          code: "unknown_error",
          details: error
        }
      };
    }
  };

  /**
   * Make an API call to an integration
   */
  const callServer = async (integrationId: string, method: string, params: Record<string, any>): Promise<MCPResponse> => {
    const integrations = getServers();
    const integration = integrations.find(s => s.id === integrationId);
    
    if (!integration) {
      return {
        error: {
          message: "Integration not found",
          code: "integration_not_found"
        }
      };
    }

    console.log(`Calling ${integration.name} integration method: ${method}`);
    
    // Update connection tracking
    lastConnectionAttempt[integrationId] = Date.now();
    activeConnections[integrationId] = true;

    try {
      let endpoint: string;
      let httpMethod: string = 'POST';
      
      if (integration.type === 'mcp') {
        endpoint = `${integration.url}/api/${method}`;
        httpMethod = 'POST';
      } else {
        // For direct APIs, find the matching endpoint
        const apiEndpoint = integration.endpoints?.find(ep => ep.name === method);
        if (apiEndpoint) {
          endpoint = `${integration.url}${apiEndpoint.path}`;
          httpMethod = apiEndpoint.method;
        } else {
          endpoint = `${integration.url}/${method}`;
        }
      }
      
      console.log(`Making ${httpMethod} request to: ${endpoint}`);
      
      const requestOptions: RequestInit = {
        method: httpMethod,
        headers: {
          'Content-Type': 'application/json',
          ...(integration.apiKey && { 'Authorization': `Bearer ${integration.apiKey}` }),
          ...(integration.headers || {}),
          'X-Client': 'Chuself-AI'
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout for API calls
      };

      // Add body for POST/PUT requests
      if (['POST', 'PUT'].includes(httpMethod)) {
        requestOptions.body = JSON.stringify(params);
      }

      const response = await fetch(endpoint, requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        activeConnections[integrationId] = false;
        
        return {
          error: {
            message: `API call failed: ${response.status} ${response.statusText}`,
            code: `http_${response.status}`,
            details: errorText
          }
        };
      }

      const data = await response.json();
      
      // Update integration last used time
      updateServer(integrationId, { lastUsed: Date.now() });
      
      // Keep active for a bit then disable
      setTimeout(() => {
        activeConnections[integrationId] = false;
      }, 5000);
      
      return { result: data };

    } catch (error) {
      activeConnections[integrationId] = false;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: {
              message: "API call timeout - integration took too long to respond",
              code: "timeout",
              details: error.message
            }
          };
        }
        
        return {
          error: {
            message: `API call failed: ${error.message}`,
            code: "api_error",
            details: error
          }
        };
      }
      
      return {
        error: {
          message: "Unknown API error occurred",
          code: "unknown_error",
          details: error
        }
      };
    }
  };

  /**
   * Process an MCP call from the LLM response
   */
  const processMcpCall = async (mcpCall: MCPCall): Promise<MCPResponse> => {
    try {
      console.log("Processing MCP call:", mcpCall);
      return await callServer(mcpCall.serverId, mcpCall.method, mcpCall.params);
    } catch (error) {
      console.error("Failed to process MCP call:", error);
      return {
        error: {
          message: error instanceof Error ? error.message : "Unknown error processing MCP call",
          code: "processing_error",
          details: error
        }
      };
    }
  };

  /**
   * Check if a response contains an MCP call
   */
  const hasMcpCall = (text: string): boolean => {
    try {
      const parsedJson = JSON.parse(text);
      return parsedJson && parsedJson.mcp_call !== undefined;
    } catch (e) {
      return false;
    }
  };

  /**
   * Extract the MCP call from a response
   */
  const extractMcpCall = (text: string): MCPCall | null => {
    try {
      const parsedJson = JSON.parse(text);
      if (parsedJson && parsedJson.mcp_call) {
        return parsedJson.mcp_call as MCPCall;
      }
      return null;
    } catch (e) {
      console.error("Failed to extract MCP call:", e);
      return null;
    }
  };

  /**
   * Get the current active connection status
   */
  const getActiveConnections = () => {
    return { ...activeConnections };
  };

  /**
   * Check if any integration is actively connecting
   */
  const isAnyServerActive = () => {
    return Object.values(activeConnections).some(status => status === true);
  };

  /**
   * Get integrations with their active status
   */
  const getServersWithStatus = (): (Integration & { isCurrentlyActive: boolean })[] => {
    const integrations = getServers();
    return integrations.map(integration => ({
      ...integration,
      isCurrentlyActive: activeConnections[integration.id] || false
    }));
  };

  return {
    // Integration management
    getServers,
    addServer,
    updateServer,
    removeServer,
    getServersWithStatus,
    
    // Integration operations
    testServerConnection,
    callServer,
    
    // MCP processing
    processMcpCall,
    hasMcpCall,
    extractMcpCall,
    
    // Status tracking
    getActiveConnections,
    isAnyServerActive
  };
};

// Default export for easier imports
export default getMcpClient;
