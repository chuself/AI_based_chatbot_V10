import { fetchIntegrationsFromSupabase, fetchCommandsFromSupabase, StoredIntegration, saveIntegrationToSupabase, deleteIntegrationFromSupabase, forceResetAllCaches } from '@/services/supabaseIntegrationsService';

// Type definitions for integration checking
export interface IntegrationCheck {
  name: string;
  isAvailable: boolean;
  category: string;
  type: 'mcp' | 'api';
  commands?: string[];
  id?: string; // Added ID to track integrations
}

// Enhanced cache with better invalidation
let integrationsCache: IntegrationCheck[] | null = null;
let cacheTimestamp = 0;
let cacheVersion = 0;
const CACHE_DURATION = 15000; // Reduced to 15 seconds for better freshness

// Check if specific integrations are available - with fresh data option
export const isIntegrationAvailable = async (integrationName: string, forceFresh = false): Promise<boolean> => {
  try {
    const integrations = await getAvailableIntegrations(forceFresh);
    return integrations.some(i => 
      i.name.toLowerCase() === integrationName.toLowerCase() || 
      i.category.toLowerCase() === integrationName.toLowerCase()
    );
  } catch (error) {
    console.error('Error checking integration availability:', error);
    return false;
  }
};

// Get available integrations for AI context - with enhanced invalidation
export const getAvailableIntegrations = async (forceRefresh = false): Promise<IntegrationCheck[]> => {
  const now = Date.now();
  
  // Return cached data if available and fresh, unless force refresh is requested
  if (!forceRefresh && integrationsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📋 Using cached AI integration data (version:', cacheVersion, ')');
    return integrationsCache;
  }

  try {
    console.log('🔍 Fetching fresh integrations for AI context...');
    
    // Force fresh data from database
    const [storedIntegrations, storedCommands] = await Promise.all([
      fetchIntegrationsFromSupabase(true), // Force fresh
      fetchCommandsFromSupabase(true) // Force fresh
    ]);
    
    console.log('📊 Fresh data - Integrations:', storedIntegrations.length, 'Commands:', storedCommands.length);
    
    const result: IntegrationCheck[] = storedIntegrations
      .filter((integration: StoredIntegration) => integration.is_active)
      .map((integration: StoredIntegration) => {
        // Get commands for this integration from both config and database
        const configCommands = integration.config?.commands?.map((cmd: any) => cmd.name) || [];
        const configEndpoints = integration.config?.endpoints?.map((ep: any) => ep.name) || [];
        const dbCommands = storedCommands
          .filter(cmd => cmd.integration_id === integration.id)
          .map(cmd => cmd.name);
        
        // Combine all available commands
        const allCommands = [...new Set([...configCommands, ...configEndpoints, ...dbCommands])];
        
        console.log(`📋 Integration ${integration.name}: ${allCommands.length} commands available`);
        
        return {
          id: integration.id,
          name: integration.name,
          isAvailable: true,
          category: integration.category,
          type: integration.type,
          commands: allCommands
        };
      });
    
    // Update cache
    integrationsCache = result;
    cacheTimestamp = now;
    cacheVersion++;
    
    console.log(`✅ Updated AI integration cache with ${result.length} active integrations (version: ${cacheVersion})`);
    return result;
  } catch (error) {
    console.error('❌ Error fetching integrations for AI:', error);
    return integrationsCache || [];
  }
};

// Clear the AI integration cache
export const clearIntegrationsCache = () => {
  integrationsCache = null;
  cacheTimestamp = 0;
  cacheVersion++;
  console.log('🗑️ AI integrations cache cleared - version:', cacheVersion);
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
export const generateIntegrationsSystemPrompt = async (forceFresh = false): Promise<string> => {
  try {
    const integrations = await getAvailableIntegrations(forceFresh);
    
    if (integrations.length === 0) {
      return "";
    }
    
    const commandsList = formatIntegrationCommands(integrations);
    
    if (!commandsList) {
      return "";
    }
    
    return `\n\nAvailable integrations (fresh data):\n${commandsList}`;
  } catch (error) {
    console.error('❌ Error generating integrations prompt:', error);
    return "";
  }
};

// Save an integration and force cache refresh
export const saveIntegration = async (integration: any): Promise<boolean> => {
  try {
    console.log('💾 Saving integration:', integration.name);
    const result = await saveIntegrationToSupabase(integration);
    
    if (result) {
      // Force clear all caches
      clearIntegrationsCache();
      forceResetAllCaches();
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error saving integration:', error);
    return false;
  }
};

// Delete an integration and force cache refresh
export const deleteIntegration = async (integrationId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting integration:', integrationId);
    const result = await deleteIntegrationFromSupabase(integrationId);
    
    if (result) {
      // Force clear all caches
      clearIntegrationsCache();
      forceResetAllCaches();
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error deleting integration:', error);
    return false;
  }
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
