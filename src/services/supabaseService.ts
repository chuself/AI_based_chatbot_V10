
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '@/hooks/useChatHistory';
import { MemoryEntry } from '@/types/memory';
import { ModelConfig } from '@/hooks/useGeminiConfig';
import { useState, useEffect } from 'react';
import { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

// Session ID storage key
const SESSION_ID_KEY = 'chat-session-id';

// Generate a new session ID or retrieve existing one
const getSessionId = (): string => {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}`;
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

/**
 * Convert ChatMessage[] to Json type for Supabase
 */
const convertChatMessagesToJson = (messages: ChatMessage[]): Json => {
  return JSON.parse(JSON.stringify(messages)) as Json;
};

/**
 * Convert Json to ChatMessage[] from Supabase
 */
const convertJsonToChatMessages = (json: Json | null): ChatMessage[] => {
  if (!json) return [];
  
  // Ensure we're handling an array
  const jsonArray = Array.isArray(json) ? json : [];
  
  // Convert each item in the array to a ChatMessage
  return jsonArray.map((item: any) => ({
    role: item.role || "assistant",
    content: item.content || "",
    timestamp: item.timestamp || Date.now(),
    isMcpResult: item.isMcpResult || false
  }));
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
};

/**
 * Sync chat history with Supabase
 */
export const syncChatHistory = async (chatHistory: ChatMessage[]): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('No authenticated user, storing chat history locally only');
      return false;
    }
    
    const sessionId = getSessionId();
    const messagesJson = convertChatMessagesToJson(chatHistory);
    
    console.log('Converting chat history for Supabase', { 
      originalLength: chatHistory.length, 
      jsonType: typeof messagesJson 
    });
    
    // Check if a record exists for this session
    const { data: existingSession } = await supabase
      .from('chat_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .single();
    
    if (existingSession) {
      // Update existing session
      const { error } = await supabase
        .from('chat_history')
        .update({
          messages: messagesJson,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSession.id);
      
      if (error) {
        console.error('Error updating chat history:', error);
        return false;
      }
    } else {
      // Create new session
      const { error } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          messages: messagesJson
        });
      
      if (error) {
        console.error('Error inserting chat history:', error);
        return false;
      }
    }
    
    console.log('Successfully synced chat history to Supabase');
    return true;
  } catch (error) {
    console.error('Error syncing chat history:', error);
    return false;
  }
};

/**
 * Fetch all chat history for current user
 */
export const fetchChatHistory = async (): Promise<ChatMessage[]> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.warn('No authenticated user, fetching chat history from local storage only');
      return [];
    }
    
    const sessionId = getSessionId();
    
    const { data, error } = await supabase
      .from('chat_history')
      .select('messages')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') { // PGRST116 is "No rows found" which is not an error for us
        console.error('Error fetching chat history:', error);
      }
      return [];
    }
    
    console.log('Received chat history data from Supabase', { 
      hasData: !!data,
      messagesType: data?.messages ? typeof data.messages : 'undefined',
      isArray: data?.messages ? Array.isArray(data.messages) : false
    });
    
    return convertJsonToChatMessages(data?.messages);
  } catch (error) {
    console.error('Error in fetchChatHistory:', error);
    return [];
  }
};

/**
 * Sync memories with Supabase
 */
export const syncMemories = async (memory: MemoryEntry): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('No authenticated user, storing memory locally only');
      return false;
    }
    
    // Check if this memory already exists
    const { data: existingMemory } = await supabase
      .from('memories')
      .select('id')
      .eq('user_id', user.id)
      .eq('id', memory.id)
      .single();
    
    if (existingMemory) {
      // Update existing memory
      const { error } = await supabase
        .from('memories')
        .update({
          content: memory.userInput + ' ' + memory.assistantReply,
          user_input: memory.userInput,
          assistant_reply: memory.assistantReply,
          intent: memory.intent,
          tags: memory.tags ? JSON.parse(JSON.stringify(memory.tags)) : [],
          updated_at: new Date().toISOString()
        })
        .eq('id', memory.id);
      
      if (error) {
        console.error('Error updating memory:', error);
        return false;
      }
    } else {
      // Create new memory
      const { error } = await supabase
        .from('memories')
        .insert({
          id: memory.id,
          user_id: user.id,
          content: memory.userInput + ' ' + memory.assistantReply,
          user_input: memory.userInput,
          assistant_reply: memory.assistantReply,
          intent: memory.intent,
          tags: memory.tags ? JSON.parse(JSON.stringify(memory.tags)) : []
        });
      
      if (error) {
        console.error('Error inserting memory:', error);
        return false;
      }
    }
    
    console.log('Successfully synced memory to Supabase');
    return true;
  } catch (error) {
    console.error('Error syncing memory:', error);
    return false;
  }
};

/**
 * Fetch all memories for current user
 */
export const fetchMemories = async (): Promise<MemoryEntry[]> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.warn('No authenticated user, fetching memories from local storage only');
      return [];
    }
    
    const { data, error } = await supabase
      .from('memories')
      .select('id, user_input, assistant_reply, intent, tags, timestamp: created_at')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error fetching memories:', error);
      return [];
    }
    
    // Convert to MemoryEntry format
    return data.map(item => ({
      id: item.id,
      userInput: item.user_input || '',
      assistantReply: item.assistant_reply || '',
      intent: item.intent || undefined,
      tags: item.tags as string[] || undefined,
      timestamp: new Date(item.timestamp).getTime()
    }));
  } catch (error) {
    console.error('Error in fetchMemories:', error);
    return [];
  }
};

/**
 * Sync user settings with Supabase
 */
export const syncSettings = async (settings: any): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.log('No authenticated user, storing settings locally only');
      return false;
    }
    
    // Prepare settings for storage by converting to pure JSON
    const settingsJson = JSON.parse(JSON.stringify(settings));
    
    // Check if settings exist for this user
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('user_id', user.id)
      .single();
    
    if (existingSettings) {
      // Update existing settings
      const { error } = await supabase
        .from('user_settings')
        .update({
          settings_data: settingsJson,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error updating settings:', error);
        return false;
      }
    } else {
      // Create new settings
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          settings_data: settingsJson
        });
      
      if (error) {
        console.error('Error inserting settings:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing settings:', error);
    return false;
  }
};

/**
 * Fetch user settings from Supabase
 */
export const fetchSettings = async (): Promise<any> => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      console.warn('No authenticated user, fetching settings from local storage only');
      return null;
    }
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings_data')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') { // Not Found is not an error for us
        console.error('Error fetching settings:', error);
      }
      return null;
    }
    
    return data?.settings_data;
  } catch (error) {
    console.error('Error in fetchSettings:', error);
    return null;
  }
};

/**
 * Create a hook to manage the Supabase sync status
 */
export const useSupabaseSync = () => {
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('offline');
  
  // Check connection status
  const checkConnection = async () => {
    try {
      setSyncStatus('syncing');
      const user = await getCurrentUser();
      setSyncStatus(user ? 'synced' : 'offline');
    } catch (error) {
      console.error('Error checking connection:', error);
      setSyncStatus('offline');
      toast({
        title: "Sync Error",
        description: "Failed to connect to the cloud database",
        variant: "destructive"
      });
    }
  };
  
  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return { syncStatus, checkConnection };
};
