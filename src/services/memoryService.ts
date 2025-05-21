
// Services to manage the memory storage and retrieval
import { MemoryEntry, MemorySearchParams, MemorySearchResult } from '@/types/memory';
import { syncMemories, fetchMemories } from '@/services/supabaseService';

// Utility function to generate a unique ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Local storage key for memories
const MEMORY_STORAGE_KEY = 'ai-memories';

class MemoryServiceImpl {
  private memories: MemoryEntry[] = [];
  private isLoaded = false;
  private isSyncing = false;

  constructor() {
    this.loadMemories();
  }

  /**
   * Load memories from cloud or local storage
   */
  async loadMemories(): Promise<void> {
    try {
      if (this.isLoaded) return;

      // First try to load from cloud
      const cloudMemories = await fetchMemories();
      
      if (cloudMemories && cloudMemories.length > 0) {
        this.memories = cloudMemories;
        console.log(`Loaded ${cloudMemories.length} memories from cloud`);
        this.isLoaded = true;
        
        // Update local storage with cloud data
        localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.memories));
        return;
      }
      
      // If cloud fetch fails or returns empty, fall back to local storage
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as MemoryEntry[];
          this.memories = parsed;
          console.log(`Loaded ${parsed.length} memories from local storage`);
          
          // Sync the local memories to cloud
          for (const memory of this.memories) {
            await syncMemories(memory);
          }
        } catch (e) {
          console.error('Failed to parse stored memories:', e);
          this.memories = [];
        }
      } else {
        this.memories = [];
      }
      
      this.isLoaded = true;
    } catch (e) {
      console.error('Error loading memories:', e);
      
      // Fall back to local storage
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (stored) {
        try {
          this.memories = JSON.parse(stored) as MemoryEntry[];
        } catch (e) {
          console.error('Failed to parse stored memories:', e);
          this.memories = [];
        }
      }
      this.isLoaded = true;
    }
  }

  /**
   * Save a memory from a conversation
   */
  async saveMemory(userInput: string, assistantReply: string, tags?: string[]): Promise<void> {
    if (!userInput || !assistantReply) return;
    
    // Make sure memories are loaded
    if (!this.isLoaded) {
      await this.loadMemories();
    }
    
    const memoryEntry: MemoryEntry = {
      id: generateId(),
      timestamp: Date.now(),
      userInput,
      assistantReply,
      tags
    };
    
    this.memories.push(memoryEntry);
    
    // Save to local storage
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.memories));
    
    // Sync to cloud
    syncMemories(memoryEntry).catch(e => {
      console.error('Failed to sync memory:', e);
    });
  }

  /**
   * Get all memories
   */
  getAllMemories(): MemoryEntry[] {
    return [...this.memories];
  }

  /**
   * Delete a memory by ID
   */
  async deleteMemory(id: string): Promise<void> {
    this.memories = this.memories.filter(m => m.id !== id);
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.memories));
    
    // We could add a delete endpoint to the cloud service if needed
  }

  /**
   * Search for memories based on parameters
   */
  searchMemories(params: MemorySearchParams): MemorySearchResult[] {
    const { query, limit = 10, startDate, endDate, tags } = params;
    
    const filteredMemories = this.memories.filter(memory => {
      // Filter by date range
      if (startDate && memory.timestamp < startDate.getTime()) {
        return false;
      }
      if (endDate && memory.timestamp > endDate.getTime()) {
        return false;
      }
      
      // Filter by tags
      if (tags && tags.length > 0) {
        if (!memory.tags || !memory.tags.some(tag => tags.includes(tag))) {
          return false;
        }
      }
      
      // All filters passed
      return true;
    });
    
    // Calculate relevance score based on query
    const scoredMemories = filteredMemories.map(memory => {
      let relevanceScore = 0;
      
      if (query) {
        const lowerQuery = query.toLowerCase();
        const lowerUserInput = memory.userInput.toLowerCase();
        const lowerAssistantReply = memory.assistantReply.toLowerCase();
        
        // Exact matches are weighted more heavily
        if (lowerUserInput.includes(lowerQuery) || lowerAssistantReply.includes(lowerQuery)) {
          relevanceScore += 10;
        }
        
        // Check for partial word matches
        const queryWords = lowerQuery.split(/\s+/);
        queryWords.forEach(word => {
          if (word.length > 2) { // Only check words longer than 2 chars
            if (lowerUserInput.includes(word)) relevanceScore += 2;
            if (lowerAssistantReply.includes(word)) relevanceScore += 1;
          }
        });
      } else {
        // If no query, sort by recency
        relevanceScore = memory.timestamp / 1000000000; // Normalize timestamp for scoring
      }
      
      return {
        entry: memory,
        relevanceScore
      };
    });
    
    // Sort by relevance and limit results
    return scoredMemories
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Parse a natural language query into search params
   */
  parseNaturalLanguageQuery(query: string): MemorySearchParams {
    // Extract date filters
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    // Try to extract date ranges
    if (query.match(/last week/i)) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (query.match(/last month/i)) {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (query.match(/yesterday/i)) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Extract any explicit tags
    const tags: string[] = [];
    const tagMatches = query.match(/#(\w+)/g);
    if (tagMatches) {
      tagMatches.forEach(tag => {
        tags.push(tag.substring(1)); // Remove the # symbol
      });
    }
    
    // Clean up the query
    let cleanQuery = query
      .replace(/(last week|last month|yesterday)/gi, '')
      .replace(/#\w+/g, '')
      .trim();
    
    return {
      query: cleanQuery,
      startDate,
      endDate,
      tags: tags.length > 0 ? tags : undefined
    };
  }
}

export const MemoryService = new MemoryServiceImpl();
