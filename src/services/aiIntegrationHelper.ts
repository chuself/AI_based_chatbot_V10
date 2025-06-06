
import { fetchIntegrationsFromSupabase, fetchCommandsFromSupabase, StoredIntegration, saveIntegrationToSupabase, deleteIntegrationFromSupabase, forceResetAllCaches } from '@/services/supabaseIntegrationsService';

// Type definitions for integration checking
export interface IntegrationCheck {
  name: string;
  isAvailable: boolean;
  category: string;
  type: 'mcp' | 'api';
  commands?: string[];
  id?: string;
}

// Completely disable caching for debugging - always fetch fresh data
let integrationsCache: IntegrationCheck[] | null = null;
let cacheTimestamp = 0;
let cacheVersion = 0;
const CACHE_DURATION = 0; // Disabled caching for debugging

// Check if specific integrations are available - always force fresh data
export const isIntegrationAvailable = async (integrationName: string, forceFresh = true): Promise<boolean> => {
  try {
    console.log('🔍 Checking integration availability for:', integrationName);
    const integrations = await getAvailableIntegrations(forceFresh);
    const available = integrations.some(i => 
      i.name.toLowerCase() === integrationName.toLowerCase() || 
      i.category.toLowerCase() === integrationName.toLowerCase()
    );
    console.log('📊 Integration availability result:', available);
    return available;
  } catch (error) {
    console.error('Error checking integration availability:', error);
    return false;
  }
};

// Get available integrations for AI context - always fresh data for debugging
export const getAvailableIntegrations = async (forceRefresh = true): Promise<IntegrationCheck[]> => {
  const now = Date.now();
  
  // Always force refresh for debugging
  if (!forceRefresh && integrationsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('📋 Using cached AI integration data (version:', cacheVersion, ')');
    return integrationsCache;
  }

  try {
    console.log('🔍 Fetching completely fresh integrations for AI context...');
    
    // Always force fresh data from database
    const [storedIntegrations, storedCommands] = await Promise.all([
      fetchIntegrationsFromSupabase(true), // Always force fresh
      fetchCommandsFromSupabase(true) // Always force fresh
    ]);
    
    console.log('📊 Fresh integration data for AI:');
    console.log('- Integrations:', storedIntegrations.length, storedIntegrations);
    console.log('- Commands:', storedCommands.length, storedCommands);
    
    const result: IntegrationCheck[] = storedIntegrations
      .filter((integration: StoredIntegration) => {
        console.log(`🔍 Processing integration: ${integration.name}, active: ${integration.is_active}`);
        return integration.is_active;
      })
      .map((integration: StoredIntegration) => {
        // Get commands for this integration from both config and database
        const configCommands = integration.config?.commands?.map((cmd: any) => cmd.name) || [];
        const configEndpoints = integration.config?.endpoints?.map((ep: any) => ep.name) || [];
        const dbCommands = storedCommands
          .filter(cmd => cmd.integration_id === integration.id)
          .map(cmd => cmd.name);
        
        // Combine all available commands
        const allCommands = [...new Set([...configCommands, ...configEndpoints, ...dbCommands])];
        
        console.log(`📋 Integration ${integration.name}: ${allCommands.length} commands available:`, allCommands);
        
        return {
          id: integration.id,
          name: integration.name,
          isAvailable: true,
          category: integration.category,
          type: integration.type,
          commands: allCommands
        };
      });
    
    // Update cache (even though we're not using it for debugging)
    integrationsCache = result;
    cacheTimestamp = now;
    cacheVersion++;
    
    console.log(`✅ Updated AI integration data with ${result.length} active integrations (version: ${cacheVersion}):`, result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching integrations for AI:', error);
    return [];
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
    console.log('📝 No integrations to format for AI');
    return "";
  }

  const formatted = integrations
    .filter(integration => integration.commands && integration.commands.length > 0)
    .map(integration => {
      const commands = integration.commands!.join(', ');
      return `${integration.name} (${integration.category}): ${commands}`;
    })
    .join('\n');
    
  console.log('📝 Formatted integration commands for AI:', formatted);
  return formatted;
};

// Generate system prompt with available integrations - always fresh
export const generateIntegrationsSystemPrompt = async (forceFresh = true): Promise<string> => {
  try {
    console.log('🤖 Generating integrations system prompt...');
    const integrations = await getAvailableIntegrations(forceFresh);
    
    if (integrations.length === 0) {
      console.log('🤖 No integrations available for system prompt');
      return "";
    }
    
    const commandsList = formatIntegrationCommands(integrations);
    
    if (!commandsList) {
      console.log('🤖 No commands available for system prompt');
      return "";
    }
    
    const prompt = `\n\nAvailable integrations (fresh data):\n${commandsList}`;
    console.log('🤖 Generated system prompt:', prompt);
    return prompt;
  } catch (error) {
    console.error('❌ Error generating integrations prompt:', error);
    return "";
  }
};

// Save an integration and force cache refresh
export const saveIntegration = async (integration: any): Promise<boolean> => {
  try {
    console.log('💾 Saving integration via AI helper:', integration.name);
    const result = await saveIntegrationToSupabase(integration);
    
    if (result) {
      // Force clear all caches
      clearIntegrationsCache();
      forceResetAllCaches();
      
      // Verify the save by fetching fresh data
      setTimeout(async () => {
        const fresh = await getAvailableIntegrations(true);
        console.log('🔍 Verification - Fresh integrations after AI helper save:', fresh);
      }, 1000);
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error saving integration via AI helper:', error);
    return false;
  }
};

// Delete an integration and force cache refresh
export const deleteIntegration = async (integrationId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting integration via AI helper:', integrationId);
    const result = await deleteIntegrationFromSupabase(integrationId);
    
    if (result) {
      // Force clear all caches
      clearIntegrationsCache();
      forceResetAllCaches();
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error deleting integration via AI helper:', error);
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
