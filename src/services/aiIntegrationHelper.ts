
import { fetchIntegrationsFromSupabase, StoredIntegration, saveIntegrationToSupabase, deleteIntegrationFromSupabase } from '@/services/supabaseIntegrationsService';

// Type definitions for integration checking
export interface IntegrationCheck {
  name: string;
  isAvailable: boolean;
  category: string;
  type: 'mcp' | 'api';
  commands?: string[];
  id?: string; // Added ID to track integrations
}

// Cache for integrations to avoid repeated API calls
let integrationsCache: IntegrationCheck[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Check if specific integrations are available - cached
export const isIntegrationAvailable = async (integrationName: string): Promise<boolean> => {
  try {
    const integrations = await getAvailableIntegrations();
    return integrations.some(i => 
      i.name.toLowerCase() === integrationName.toLowerCase() || 
      i.category.toLowerCase() === integrationName.toLowerCase()
    );
  } catch (error) {
    console.error('Error checking integration availability:', error);
    return false;
  }
};

// Get available integrations for AI context - cached and optimized
export const getAvailableIntegrations = async (forceRefresh = false): Promise<IntegrationCheck[]> => {
  const now = Date.now();
  
  // Return cached data if available and fresh, unless force refresh is requested
  if (!forceRefresh && integrationsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return integrationsCache;
  }

  try {
    console.log('🔍 Fetching available integrations...');
    const storedIntegrations = await fetchIntegrationsFromSupabase(true); // Force fresh data
    
    const result: IntegrationCheck[] = storedIntegrations
      .filter((integration: StoredIntegration) => integration.is_active)
      .map((integration: StoredIntegration) => {
        const commands = integration.config?.commands?.map((cmd: any) => cmd.name) || 
                        integration.config?.endpoints?.map((ep: any) => ep.name) || [];
        
        return {
          id: integration.id, // Include ID for tracking
          name: integration.name,
          isAvailable: true,
          category: integration.category,
          type: integration.type,
          commands
        };
      });
    
    // Cache the result
    integrationsCache = result;
    cacheTimestamp = now;
    
    console.log(`✅ Found ${result.length} active integrations`);
    return result;
  } catch (error) {
    console.error('❌ Error fetching integrations:', error);
    return [];
  }
};

// Format integration commands for AI context - optimized
export const formatIntegrationCommands = (integrations: IntegrationCheck[]): string => {
  if (integrations.length === 0) {
    return "";
  }

  return integrations
    .filter(integration => integration.commands && integration.commands.length > 0)
    .map(integration => {
      const commands = integration.commands!.join(', ');
      return `${integration.name} (${integration.category}): ${commands}`;
    })
    .join('\n');
};

// Generate system prompt with available integrations - efficient
export const generateIntegrationsSystemPrompt = async (): Promise<string> => {
  try {
    const integrations = await getAvailableIntegrations();
    
    if (integrations.length === 0) {
      return "";
    }
    
    const commandsList = formatIntegrationCommands(integrations);
    
    if (!commandsList) {
      return "";
    }
    
    return `\n\nAvailable integrations:\n${commandsList}`;
  } catch (error) {
    console.error('❌ Error generating integrations prompt:', error);
    return "";
  }
};

// Save an integration and update cache
export const saveIntegration = async (integration: any): Promise<boolean> => {
  try {
    console.log('💾 Saving integration:', integration.name);
    const result = await saveIntegrationToSupabase(integration);
    
    if (result) {
      // Invalidate cache to force reload on next request
      clearIntegrationsCache();
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error saving integration:', error);
    return false;
  }
};

// Delete an integration and update cache
export const deleteIntegration = async (integrationId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting integration:', integrationId);
    const result = await deleteIntegrationFromSupabase(integrationId);
    
    if (result) {
      // Invalidate cache to force reload on next request
      clearIntegrationsCache();
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error deleting integration:', error);
    return false;
  }
};

// Clear the cache manually if needed
export const clearIntegrationsCache = () => {
  integrationsCache = null;
  cacheTimestamp = 0;
  console.log('🗑️ Integrations cache cleared');
};

// Validate integration configuration - simplified
export const validateIntegrationConfig = (config: any): boolean => {
  return !!(config && typeof config === 'object' && config.name);
};

// Get integration status - simplified
export const getIntegrationStatus = (integration: any): 'active' | 'inactive' | 'error' => {
  try {
    if (!integration) return 'error';
    return integration.is_active === true ? 'active' : 'inactive';
  } catch {
    return 'error';
  }
};
