
import { useState, useCallback } from 'react';

interface McpDebugEntry {
  id: string;
  timestamp: number;
  type: 'prompt' | 'request' | 'response';
  content: any;
  integrationName?: string;
  commandName?: string;
}

export const useMcpDebug = () => {
  const [isDebugEnabled, setIsDebugEnabled] = useState(() => {
    const stored = localStorage.getItem('mcp-debug-enabled');
    return stored ? JSON.parse(stored) : false;
  });
  
  const [debugEntries, setDebugEntries] = useState<McpDebugEntry[]>([]);

  const toggleDebug = useCallback(() => {
    const newState = !isDebugEnabled;
    setIsDebugEnabled(newState);
    localStorage.setItem('mcp-debug-enabled', JSON.stringify(newState));
    
    if (!newState) {
      // Clear debug entries when disabling
      setDebugEntries([]);
    }
  }, [isDebugEnabled]);

  const logPrompt = useCallback((prompt: string, context?: any) => {
    if (!isDebugEnabled) return;
    
    const entry: McpDebugEntry = {
      id: `prompt-${Date.now()}`,
      timestamp: Date.now(),
      type: 'prompt',
      content: {
        prompt,
        context,
        fullMessage: `AI Model Prompt:\n\n${prompt}${context ? `\n\nContext: ${JSON.stringify(context, null, 2)}` : ''}`
      }
    };
    
    setDebugEntries(prev => [...prev, entry].slice(-50)); // Keep last 50 entries
    console.log('🤖 MCP Debug - AI Prompt:', entry);
  }, [isDebugEnabled]);

  const logRequest = useCallback((integrationName: string, commandName: string, parameters: any, fullRequest: any) => {
    if (!isDebugEnabled) return;
    
    const entry: McpDebugEntry = {
      id: `request-${Date.now()}`,
      timestamp: Date.now(),
      type: 'request',
      integrationName,
      commandName,
      content: {
        integration: integrationName,
        command: commandName,
        parameters,
        fullRequest,
        requestDetails: `Integration: ${integrationName}\nCommand: ${commandName}\nParameters: ${JSON.stringify(parameters, null, 2)}\n\nFull Request:\n${JSON.stringify(fullRequest, null, 2)}`
      }
    };
    
    setDebugEntries(prev => [...prev, entry].slice(-50));
    console.log('📡 MCP Debug - External Request:', entry);
  }, [isDebugEnabled]);

  const logResponse = useCallback((integrationName: string, commandName: string, response: any) => {
    if (!isDebugEnabled) return;
    
    const entry: McpDebugEntry = {
      id: `response-${Date.now()}`,
      timestamp: Date.now(),
      type: 'response',
      integrationName,
      commandName,
      content: {
        integration: integrationName,
        command: commandName,
        response,
        responseDetails: `Integration: ${integrationName}\nCommand: ${commandName}\n\nResponse:\n${JSON.stringify(response, null, 2)}`
      }
    };
    
    setDebugEntries(prev => [...prev, entry].slice(-50));
    console.log('📥 MCP Debug - External Response:', entry);
  }, [isDebugEnabled]);

  const clearDebugEntries = useCallback(() => {
    setDebugEntries([]);
  }, []);

  const getDebugSummary = useCallback(() => {
    if (!isDebugEnabled || debugEntries.length === 0) {
      return 'MCP Debug is ' + (isDebugEnabled ? 'enabled but no entries yet' : 'disabled');
    }
    
    const recent = debugEntries.slice(-10);
    return recent.map(entry => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      switch (entry.type) {
        case 'prompt':
          return `[${time}] 🤖 AI Prompt: ${entry.content.prompt.substring(0, 100)}...`;
        case 'request':
          return `[${time}] 📡 Request: ${entry.integrationName}.${entry.commandName}`;
        case 'response':
          return `[${time}] 📥 Response: ${entry.integrationName}.${entry.commandName}`;
        default:
          return `[${time}] ${entry.type}: ${JSON.stringify(entry.content).substring(0, 50)}...`;
      }
    }).join('\n');
  }, [isDebugEnabled, debugEntries]);

  return {
    isDebugEnabled,
    debugEntries,
    toggleDebug,
    logPrompt,
    logRequest,
    logResponse,
    clearDebugEntries,
    getDebugSummary
  };
};
