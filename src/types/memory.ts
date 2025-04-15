
export interface MemoryEntry {
  id: string;
  timestamp: number;
  userInput: string;
  assistantReply: string;
  intent?: string;
  tags?: string[];
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  relevanceScore: number;
}

export interface MemorySearchParams {
  query: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
}
