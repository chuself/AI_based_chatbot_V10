/**
 * MCP Service - Handles interactions with the Model Context Protocol server
 * 
 * This implementation uses fetch rather than a dedicated MCP client library
 * to avoid dependency issues.
 */

// MCP Server base URL
const MCP_SERVER_URL = "https://cloud-connect-mcp-server.onrender.com";

// Track active connections
let activeConnections: Record<string, boolean> = {
  gmail: false,
  calendar: false,
  drive: false,
  search: false
};

let lastConnectionAttempt: Record<string, number> = {
  gmail: 0,
  calendar: 0,
  drive: 0,
  search: 0
};

export interface MCPCall {
  tool: string;
  method: string;
  params: Record<string, any>;
  id: number;
}

export interface MCPResponse {
  result?: any;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Creates a function that can make calls to the MCP server
 */
export const getMcpClient = () => {
  // Check if Gmail is connected
  const isGmailConnected = () => {
    const storedStatus = localStorage.getItem("gmail-connected");
    if (!storedStatus) return false;
    
    try {
      const status = JSON.parse(storedStatus);
      return status.gmail === true;
    } catch (e) {
      console.error("Failed to parse Gmail connection status:", e);
      return false;
    }
  };

  /**
   * Makes a call to the MCP server
   */
  const callMcp = async (tool: string, method: string, params: Record<string, any>, id: number): Promise<MCPResponse> => {
    // For Gmail-related calls, check if connected
    if (tool === "gmail" && !isGmailConnected()) {
      return {
        error: {
          message: "Please connect your Gmail account first",
          code: "not_authenticated"
        }
      };
    }

    // Update last connection attempt time
    lastConnectionAttempt[tool] = Date.now();
    // Set active connection status to true while making the call
    activeConnections[tool] = true;

    try {
      const response = await fetch(`${MCP_SERVER_URL}/tools/${tool}/${method}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
        credentials: "include" // Sends cookies with the request
      });

      if (!response.ok) {
        activeConnections[tool] = false; // Connection failed
        
        if (response.status === 401) {
          return {
            error: {
              message: "Authentication required. Please reconnect your Google account.",
              code: "authentication_required"
            }
          };
        }
        
        const errorText = await response.text();
        return {
          error: {
            message: `Error calling MCP server: ${errorText}`,
            code: `http_${response.status}`
          }
        };
      }

      const data = await response.json();
      // Successfully got data, keep active status for 10 seconds
      setTimeout(() => {
        activeConnections[tool] = false;
      }, 10000);
      
      return { result: data };
    } catch (error) {
      // Connection failed
      activeConnections[tool] = false;
      
      console.error("MCP call failed:", error);
      return {
        error: {
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "network_error"
        }
      };
    }
  };

  /**
   * Processes an MCP call from the LLM response
   */
  const processMcpCall = async (mcpCall: MCPCall): Promise<MCPResponse> => {
    try {
      return await callMcp(
        mcpCall.tool,
        mcpCall.method,
        mcpCall.params,
        mcpCall.id
      );
    } catch (error) {
      console.error("Failed to process MCP call:", error);
      return {
        error: {
          message: error instanceof Error ? error.message : "Unknown error processing MCP call",
          code: "processing_error"
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
   * Check if any tool is actively connecting
   */
  const isAnyToolActive = () => {
    return Object.values(activeConnections).some(status => status === true);
  };

  /**
   * Get the time since last connection attempt
   */
  const getTimeSinceLastConnection = () => {
    const now = Date.now();
    const result: Record<string, number> = {};
    
    for (const tool in lastConnectionAttempt) {
      if (lastConnectionAttempt[tool] > 0) {
        result[tool] = now - lastConnectionAttempt[tool];
      } else {
        result[tool] = -1; // Never connected
      }
    }
    
    return result;
  };

  return {
    callMcp,
    processMcpCall,
    hasMcpCall,
    extractMcpCall,
    isGmailConnected,
    getActiveConnections,
    isAnyToolActive,
    getTimeSinceLastConnection
  };
};

// Default export for easier imports
export default getMcpClient;
