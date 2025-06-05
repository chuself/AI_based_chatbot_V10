
import { useState, useCallback } from 'react';

interface DebugLogEntry {
  timestamp: string;
  type: 'request' | 'response';
  integration: string;
  command: string;
  data: any;
}

export const useMcpDebug = () => {
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);

  const logRequest = useCallback((integration: string, command: string, parameters: any, details?: any) => {
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'request',
      integration,
      command,
      data: { parameters, details }
    };
    
    setDebugLogs(prev => [...prev, entry].slice(-100)); // Keep last 100 entries
    console.log('🔍 MCP Request:', entry);
  }, []);

  const logResponse = useCallback((integration: string, command: string, response: any) => {
    const entry: DebugLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'response',
      integration,
      command,
      data: response
    };
    
    setDebugLogs(prev => [...prev, entry].slice(-100)); // Keep last 100 entries
    console.log('📥 MCP Response:', entry);
  }, []);

  const clearLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  return {
    debugLogs,
    logRequest,
    logResponse,
    clearLogs
  };
};
