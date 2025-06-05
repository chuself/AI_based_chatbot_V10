
export interface Integration {
  id: string;
  name: string;
  url: string;
  type: 'mcp' | 'api';
  category: string;
  apiKey?: string;
  description?: string;
  commands?: IntegrationCommand[];
  headers?: Record<string, string>;
  endpoints?: ApiEndpoint[];
  isActive?: boolean;
  config?: IntegrationConfig;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  is_active?: boolean;
}

export interface IntegrationCommand {
  name: string;
  description: string;
  example?: string;
}

export interface ApiEndpoint {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
}

export interface IntegrationConfig {
  commands?: IntegrationCommand[];
  endpoints?: ApiEndpoint[];
  headers?: Record<string, string>;
  url?: string;
}

export interface CombinedIntegration extends Integration {
  source: 'local' | 'stored';
  isStored: boolean;
}
