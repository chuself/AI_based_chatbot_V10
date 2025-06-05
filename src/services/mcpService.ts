
import { Integration, IntegrationCommand, ApiEndpoint } from "@/types/integration";

export interface McpServerConfig {
  name: string;
  url: string;
  type: 'mcp' | 'api';
  category: string;
  apiKey?: string;
  description?: string;
  commands?: IntegrationCommand[];
  headers?: Record<string, string>;
  endpoints?: ApiEndpoint[];
}

class McpClient {
  private servers: Integration[] = [];
  private activeConnections: Record<string, boolean> = {};

  constructor() {
    this.loadServers();
  }

  private loadServers() {
    try {
      const stored = localStorage.getItem('mcp-servers');
      if (stored) {
        this.servers = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading MCP servers:', error);
    }
  }

  private saveServers() {
    try {
      localStorage.setItem('mcp-servers', JSON.stringify(this.servers));
    } catch (error) {
      console.error('Error saving MCP servers:', error);
    }
  }

  addServer(config: McpServerConfig): Integration {
    const newServer: Integration = {
      id: Date.now().toString(),
      name: config.name,
      url: config.url,
      type: config.type,
      category: config.category,
      apiKey: config.apiKey,
      description: config.description,
      commands: config.commands || [],
      headers: config.headers || {},
      endpoints: config.endpoints || [],
      isActive: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.servers.push(newServer);
    this.saveServers();
    return newServer;
  }

  updateServer(id: string, updates: Partial<McpServerConfig>): boolean {
    const index = this.servers.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.servers[index] = {
      ...this.servers[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    this.saveServers();
    return true;
  }

  removeServer(id: string): boolean {
    const index = this.servers.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.servers.splice(index, 1);
    delete this.activeConnections[id];
    this.saveServers();
    return true;
  }

  getServers(): Integration[] {
    return [...this.servers];
  }

  getActiveConnections(): Record<string, boolean> {
    return { ...this.activeConnections };
  }

  async testServerConnection(integration: Integration): Promise<{ error?: { message: string } }> {
    try {
      // Mock connection test
      console.log(`Testing connection to ${integration.name}...`);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock success for now
      this.activeConnections[integration.id] = true;
      return {};
    } catch (error) {
      this.activeConnections[integration.id] = false;
      return { error: { message: error instanceof Error ? error.message : 'Connection failed' } };
    }
  }
}

// Singleton instance
let mcpClientInstance: McpClient | null = null;

const getMcpClient = (): McpClient => {
  if (!mcpClientInstance) {
    mcpClientInstance = new McpClient();
  }
  return mcpClientInstance;
};

export default getMcpClient;
export { Integration, IntegrationCommand, ApiEndpoint };
