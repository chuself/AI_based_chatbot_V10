/**
 * MCP Service - Handles interactions with the Model Context Protocol server
 * 
 * This implementation manages custom MCP servers and their configurations
 */

// Track active connections for custom servers
let activeConnections: Record<string, boolean> = {};
let lastConnectionAttempt: Record<string, number> = {};

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  type: string;
  apiKey?: string;
  description?: string;
  commands?: MCPCommand[];
  isActive: boolean;
  lastUsed?: number;
}

export interface MCPCommand {
  name: string;
  description: string;
  parameters?: Record<string, any>;
  example?: string;
}

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
 * Creates a function that can make calls to MCP servers
 */
export const getMcpClient = () => {
  /**
   * Get all configured MCP servers
   */
  const getServers = (): MCPServer[] => {
    try {
      const stored = localStorage.getItem('mcp-servers');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
      return [];
    }
  };

  /**
   * Save MCP servers to localStorage
   */
  const saveServers = (servers: MCPServer[]) => {
    try {
      localStorage.setItem('mcp-servers', JSON.stringify(servers));
      console.log('Saved MCP servers:', servers.length);
    } catch (error) {
      console.error('Failed to save MCP servers:', error);
    }
  };

  /**
   * Add a new MCP server
   */
  const addServer = (server: Omit<MCPServer, 'id' | 'isActive' | 'lastUsed'>): MCPServer => {
    const servers = getServers();
    const newServer: MCPServer = {
      ...server,
      id: `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isActive: false,
      lastUsed: undefined
    };
    
    servers.push(newServer);
    saveServers(servers);
    
    // Initialize connection tracking
    activeConnections[newServer.id] = false;
    lastConnectionAttempt[newServer.id] = 0;
    
    return newServer;
  };

  /**
   * Update an existing MCP server
   */
  const updateServer = (serverId: string, updates: Partial<MCPServer>): boolean => {
    const servers = getServers();
    const index = servers.findIndex(s => s.id === serverId);
    
    if (index === -1) return false;
    
    servers[index] = { ...servers[index], ...updates };
    saveServers(servers);
    return true;
  };

  /**
   * Remove an MCP server
   */
  const removeServer = (serverId: string): boolean => {
    const servers = getServers();
    const filtered = servers.filter(s => s.id !== serverId);
    
    if (filtered.length === servers.length) return false;
    
    saveServers(filtered);
    
    // Clean up connection tracking
    delete activeConnections[serverId];
    delete lastConnectionAttempt[serverId];
    
    return true;
  };

  /**
   * Test connection to an MCP server
   */
  const testServerConnection = async (server: MCPServer): Promise<MCPResponse> => {
    console.log(`Testing connection to ${server.name} at ${server.url}`);
    
    // Update connection tracking
    lastConnectionAttempt[server.id] = Date.now();
    activeConnections[server.id] = true;

    try {
      // Try to validate URL format first
      new URL(server.url);
    } catch (error) {
      activeConnections[server.id] = false;
      return {
        error: {
          message: "Invalid server URL format",
          code: "invalid_url",
          details: error
        }
      };
    }

    try {
      // Try a basic health check first
      const healthResponse = await fetch(`${server.url}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(server.apiKey && { 'Authorization': `Bearer ${server.apiKey}` })
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (healthResponse.ok) {
        activeConnections[server.id] = false;
        return { result: { status: 'healthy', message: 'Server is responding' } };
      }

      // If health check fails, try a generic status endpoint
      const statusResponse = await fetch(`${server.url}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(server.apiKey && { 'Authorization': `Bearer ${server.apiKey}` })
        },
        signal: AbortSignal.timeout(10000)
      });

      if (statusResponse.ok) {
        const data = await statusResponse.json();
        activeConnections[server.id] = false;
        return { result: { status: 'available', data } };
      }

      // If both fail, return the error from status endpoint
      const errorText = await statusResponse.text();
      activeConnections[server.id] = false;
      
      return {
        error: {
          message: `Server not responding: ${statusResponse.status} ${statusResponse.statusText}`,
          code: `http_${statusResponse.status}`,
          details: errorText
        }
      };

    } catch (error) {
      activeConnections[server.id] = false;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: {
              message: "Connection timeout - server took too long to respond",
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
   * Make an API call to an MCP server
   */
  const callServer = async (serverId: string, method: string, params: Record<string, any>): Promise<MCPResponse> => {
    const servers = getServers();
    const server = servers.find(s => s.id === serverId);
    
    if (!server) {
      return {
        error: {
          message: "Server not found",
          code: "server_not_found"
        }
      };
    }

    console.log(`Calling ${server.name} server method: ${method}`);
    
    // Update connection tracking
    lastConnectionAttempt[serverId] = Date.now();
    activeConnections[serverId] = true;

    try {
      const endpoint = `${server.url}/api/${method}`;
      console.log(`Making request to: ${endpoint}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(server.apiKey && { 'Authorization': `Bearer ${server.apiKey}` }),
          'X-Client': 'Chuself-AI'
        },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(30000) // 30 second timeout for API calls
      });

      if (!response.ok) {
        const errorText = await response.text();
        activeConnections[serverId] = false;
        
        return {
          error: {
            message: `API call failed: ${response.status} ${response.statusText}`,
            code: `http_${response.status}`,
            details: errorText
          }
        };
      }

      const data = await response.json();
      
      // Update server last used time
      updateServer(serverId, { lastUsed: Date.now() });
      
      // Keep active for a bit then disable
      setTimeout(() => {
        activeConnections[serverId] = false;
      }, 5000);
      
      return { result: data };

    } catch (error) {
      activeConnections[serverId] = false;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            error: {
              message: "API call timeout - server took too long to respond",
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
   * Check if any server is actively connecting
   */
  const isAnyServerActive = () => {
    return Object.values(activeConnections).some(status => status === true);
  };

  /**
   * Get servers with their active status
   */
  const getServersWithStatus = (): (MCPServer & { isCurrentlyActive: boolean })[] => {
    const servers = getServers();
    return servers.map(server => ({
      ...server,
      isCurrentlyActive: activeConnections[server.id] || false
    }));
  };

  return {
    // Server management
    getServers,
    addServer,
    updateServer,
    removeServer,
    getServersWithStatus,
    
    // Server operations
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
