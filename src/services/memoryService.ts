
import { MemoryEntry, MemorySearchParams, MemorySearchResult } from "@/types/memory";

const MEMORY_STORAGE_KEY = "chat-memory-storage";
const MEMORY_INDEX_KEY = "chat-memory-index";
const MAX_MEMORIES = 200; // Limit number of stored memories

/**
 * Extracts potential intent from a user message
 */
const classifyIntent = (message: string): string | undefined => {
  const lowerMessage = message.toLowerCase();
  
  // Simple rule-based intent classification
  if (lowerMessage.includes("remind") || lowerMessage.includes("remember")) {
    return "reminder";
  }
  
  if (lowerMessage.includes("?") || lowerMessage.startsWith("what") || 
      lowerMessage.startsWith("how") || lowerMessage.startsWith("why") ||
      lowerMessage.startsWith("when") || lowerMessage.startsWith("where") ||
      lowerMessage.startsWith("who") || lowerMessage.startsWith("which")) {
    return "question";
  }
  
  if (lowerMessage.includes("thanks") || lowerMessage.includes("thank you")) {
    return "gratitude";
  }
  
  if (lowerMessage.includes("help")) {
    return "help_request";
  }
  
  // Default fallback
  return "general_statement";
};

/**
 * Extracts tags from a message and assistant response
 */
const extractTags = (userMessage: string, assistantResponse: string): string[] => {
  const tags: Set<string> = new Set();
  
  // Extract potential entities (simple approach - for production use NER)
  const words = [...userMessage.split(/\s+/), ...assistantResponse.split(/\s+/)];
  
  // Find capitalized words that might be entities
  words.forEach(word => {
    const cleanWord = word.replace(/[.,!?;:'"()]/g, '');
    // Words that start with capital letter and are at least 4 chars long
    if (cleanWord.length >= 4 && /^[A-Z][a-z]+$/.test(cleanWord)) {
      tags.add(cleanWord.toLowerCase());
    }
  });
  
  // Extract email references
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = [...userMessage.matchAll(emailRegex), ...assistantResponse.matchAll(emailRegex)];
  if (emails.length > 0) tags.add("email");
  
  // Extract date references
  const datePatterns = [
    /\b(today|tomorrow|yesterday)\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/
  ];
  
  let hasDate = false;
  for (const pattern of datePatterns) {
    if (pattern.test(userMessage) || pattern.test(assistantResponse)) {
      hasDate = true;
      break;
    }
  }
  if (hasDate) tags.add("date");
  
  // Extract topic keywords - important for memory retrieval
  const topicKeywords = [
    "project", "deadline", "meeting", "appointment", "event", 
    "birthday", "anniversary", "holiday", "vacation", "trip",
    "work", "job", "task", "assignment", "report", "presentation",
    "health", "doctor", "medication", "prescription", "symptom",
    "family", "friend", "contact", "address", "phone", "number",
    "finance", "money", "payment", "bill", "invoice", "budget",
    "food", "recipe", "restaurant", "reservation"
  ];
  
  const lowerUserMsg = userMessage.toLowerCase();
  const lowerAssistantMsg = assistantResponse.toLowerCase();
  
  topicKeywords.forEach(keyword => {
    if (lowerUserMsg.includes(keyword) || lowerAssistantMsg.includes(keyword)) {
      tags.add(keyword);
    }
  });
  
  return Array.from(tags);
};

/**
 * Improved text similarity function using BM25-inspired approach
 */
const calculateSimilarity = (text1: string, text2: string): number => {
  // Simple preprocessing - lowercase and tokenize
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Create word frequency maps
  const freqMap1 = new Map<string, number>();
  words1.forEach(word => {
    freqMap1.set(word, (freqMap1.get(word) || 0) + 1);
  });
  
  // Calculate IDF-like weights (simplified)
  const uniqueWords = new Set([...words1, ...words2]);
  
  // Count matches with term frequency consideration
  let matchScore = 0;
  let maxPossibleScore = words2.length; // Normalize by query length
  
  words2.forEach(word => {
    if (freqMap1.has(word)) {
      // Words that are rare get higher weight
      const rarity = 1.0;
      // Words that appear multiple times get higher weight, but with diminishing returns
      const frequency = Math.log(1 + freqMap1.get(word)!);
      // Position bias - earlier matches are weighted more (not implemented here for simplicity)
      
      matchScore += rarity * frequency;
    }
  });
  
  // Normalize score between 0 and 1
  return matchScore / maxPossibleScore;
};

/**
 * Get the most important terms from a query for matching
 */
const extractKeyTerms = (query: string): string[] => {
  // Remove stopwords
  const stopwords = new Set([
    "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", 
    "to", "of", "in", "for", "with", "by", "about", "like", "through"
  ]);
  
  // Extract terms
  return query.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopwords.has(word))
    .map(word => word.replace(/[.,!?;:'"()]/g, ''))
    .filter(word => word.length > 2);
};

export const MemoryService = {
  /**
   * Save a new memory entry
   */
  saveMemory: (userInput: string, assistantReply: string): void => {
    try {
      // Get existing memories
      const existingMemories = MemoryService.getAllMemories();
      
      // Create new memory entry
      const newMemory: MemoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        userInput,
        assistantReply,
        intent: classifyIntent(userInput),
        tags: extractTags(userInput, assistantReply)
      };
      
      // Add to existing memories
      existingMemories.unshift(newMemory); // Add to front for more efficient recent retrieval
      
      // Limit the number of memories stored to avoid excessive localStorage usage
      if (existingMemories.length > MAX_MEMORIES) {
        existingMemories.splice(MAX_MEMORIES);
      }
      
      // Save back to localStorage
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(existingMemories));
      console.log("Memory saved:", newMemory);
    } catch (error) {
      console.error("Failed to save memory:", error);
    }
  },
  
  /**
   * Get all stored memories
   */
  getAllMemories: (): MemoryEntry[] => {
    try {
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to retrieve memories:", error);
      return [];
    }
  },
  
  /**
   * Clear all memories
   */
  clearAllMemories: (): void => {
    localStorage.removeItem(MEMORY_STORAGE_KEY);
    localStorage.removeItem(MEMORY_INDEX_KEY);
  },
  
  /**
   * Search memories using natural language query
   */
  searchMemories: (params: MemorySearchParams): MemorySearchResult[] => {
    try {
      const memories = MemoryService.getAllMemories();
      if (memories.length === 0) return [];
      
      const { query, limit = 5, startDate, endDate, tags } = params;
      
      // Extract key terms from the query
      const keyTerms = extractKeyTerms(query);
      
      // Filter by date range if provided
      let filteredMemories = memories;
      if (startDate) {
        filteredMemories = filteredMemories.filter(
          memory => memory.timestamp >= startDate.getTime()
        );
      }
      if (endDate) {
        filteredMemories = filteredMemories.filter(
          memory => memory.timestamp <= endDate.getTime()
        );
      }
      
      // Filter by tags if provided
      if (tags && tags.length > 0) {
        filteredMemories = filteredMemories.filter(memory => 
          memory.tags && memory.tags.some(tag => tags.includes(tag))
        );
      }
      
      // Calculate relevance scores
      const results: MemorySearchResult[] = filteredMemories.map(memory => {
        // Weight the memory parts differently
        const userInputWeight = 1.0;
        const assistantReplyWeight = 0.7;
        const tagsWeight = 1.5;
        
        // Calculate similarity between query and memory content
        const userInputScore = calculateSimilarity(query, memory.userInput) * userInputWeight;
        const assistantReplyScore = calculateSimilarity(query, memory.assistantReply) * assistantReplyWeight;
        
        // Extra boost for tag matches
        let tagScore = 0;
        if (memory.tags && memory.tags.length > 0) {
          const tagMatchCount = keyTerms.filter(term => 
            memory.tags!.some(tag => tag.includes(term))
          ).length;
          
          if (tagMatchCount > 0) {
            tagScore = (tagMatchCount / keyTerms.length) * tagsWeight;
          }
        }
        
        // Recency boost - more recent memories get a slight boost
        const RECENCY_WEIGHT = 0.1;
        const now = Date.now();
        const ageInDays = (now - memory.timestamp) / (1000 * 60 * 60 * 24);
        const recencyBoost = Math.max(0, RECENCY_WEIGHT * (1 - Math.min(ageInDays / 30, 1)));
        
        // Combined relevance score
        const relevanceScore = Math.min(
          userInputScore + assistantReplyScore + tagScore + recencyBoost, 
          1.0 // Cap at 1.0
        );
        
        return {
          entry: memory,
          relevanceScore
        };
      });
      
      // Sort by relevance and limit results
      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .filter(result => result.relevanceScore > 0.05) // Only return somewhat relevant results
        .slice(0, limit);
    } catch (error) {
      console.error("Error searching memories:", error);
      return [];
    }
  },
  
  /**
   * Parse a natural language query to extract search parameters
   */
  parseNaturalLanguageQuery: (query: string): MemorySearchParams => {
    const params: MemorySearchParams = { query };
    const lowerQuery = query.toLowerCase();
    
    // Extract date ranges
    if (lowerQuery.includes("yesterday")) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      
      params.startDate = yesterday;
      params.endDate = endOfYesterday;
    } else if (lowerQuery.includes("last week")) {
      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      lastWeekStart.setHours(0, 0, 0, 0);
      
      params.startDate = lastWeekStart;
    } else if (lowerQuery.includes("two days ago")) {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);
      
      const endOfTwoDaysAgo = new Date(twoDaysAgo);
      endOfTwoDaysAgo.setHours(23, 59, 59, 999);
      
      params.startDate = twoDaysAgo;
      params.endDate = endOfTwoDaysAgo;
    }
    
    // Check for day of week mentions
    const daysOfWeek = [
      "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"
    ];
    
    for (let i = 0; i < daysOfWeek.length; i++) {
      if (lowerQuery.includes(daysOfWeek[i])) {
        const targetDay = i;
        const today = new Date();
        const currentDay = today.getDay();
        const daysAgo = (currentDay - targetDay + 7) % 7;
        
        if (daysAgo > 0 && daysAgo < 7) {
          const targetDate = new Date();
          targetDate.setDate(today.getDate() - daysAgo);
          targetDate.setHours(0, 0, 0, 0);
          
          const endOfTargetDate = new Date(targetDate);
          endOfTargetDate.setHours(23, 59, 59, 999);
          
          params.startDate = targetDate;
          params.endDate = endOfTargetDate;
        }
      }
    }
    
    // Extract topics/tags
    if (lowerQuery.includes("about")) {
      const aboutPattern = /\babout\s+(\w+)\b/i;
      const match = lowerQuery.match(aboutPattern);
      
      if (match && match[1]) {
        params.tags = [match[1].toLowerCase()];
      }
    }
    
    // Extract additional topics from question patterns
    const extractedKeywords = extractKeyTerms(query);
    if (extractedKeywords.length > 0 && !params.tags) {
      params.tags = extractedKeywords;
    }
    
    return params;
  }
};
