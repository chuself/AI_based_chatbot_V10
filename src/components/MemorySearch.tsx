
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Check } from "lucide-react";
import { MemoryService } from "@/services/memoryService";
import { MemoryEntry, MemorySearchResult } from "@/types/memory";
import { Progress } from "@/components/ui/progress";

interface MemorySearchProps {
  onSelectMemory?: (memory: MemoryEntry) => void;
}

const MemorySearch: React.FC<MemorySearchProps> = ({ onSelectMemory }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemorySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);

  const handleSearch = () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      // Parse natural language query
      const searchParams = MemoryService.parseNaturalLanguageQuery(query);
      
      // Search memories
      const searchResults = MemoryService.searchMemories(searchParams);
      setResults(searchResults);
      
      if (searchResults.length === 0) {
        console.log("No memories found matching query:", query);
      }
    } catch (error) {
      console.error("Error searching memories:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleMemorySelect = (memory: MemoryEntry) => {
    setSelectedMemory(memory.id);
    if (onSelectMemory) {
      onSelectMemory(memory);
    }
  };

  const highlightMatchingText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    try {
      const regex = new RegExp(`(${searchQuery.trim()})`, 'gi');
      return text.replace(regex, '<mark class="bg-yellow-200 text-gray-900">$1</mark>');
    } catch (e) {
      // If regex fails (e.g., with special characters), return original text
      return text;
    }
  };

  return (
    <div className="w-full">
      <div className="flex mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Search memories (e.g., What did we talk about yesterday?)"
          className="flex-1 mr-2"
        />
        <Button 
          onClick={handleSearch} 
          disabled={isSearching || !query.trim()}
          className="bg-gemini-primary hover:bg-gemini-secondary"
        >
          <Search size={18} className="mr-2" />
          Search
        </Button>
      </div>

      {isSearching && (
        <div className="py-8 flex flex-col items-center">
          <p className="mb-3 text-sm text-gray-500">Searching through memories...</p>
          <Progress value={65} className="w-64 h-2" />
        </div>
      )}

      {results.length > 0 ? (
        <div className="space-y-4 mt-4">
          {results.map((result) => (
            <Card 
              key={result.entry.id} 
              className={`border hover:border-gemini-primary transition-all ${
                selectedMemory === result.entry.id ? 'border-gemini-primary ring-1 ring-gemini-primary' : 'border-gray-200'
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex justify-between">
                  <span>{formatDate(result.entry.timestamp)}</span>
                  <span className="text-xs text-gray-500">
                    Relevance: {Math.round(result.relevanceScore * 100)}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="mb-2">
                  <p className="text-sm font-medium">You:</p>
                  <p 
                    className="text-sm text-gray-700"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightMatchingText(result.entry.userInput, query) 
                    }}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Assistant:</p>
                  <p 
                    className="text-sm text-gray-700"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightMatchingText(result.entry.assistantReply, query) 
                    }}
                  />
                </div>
              </CardContent>
              {result.entry.tags && result.entry.tags.length > 0 && (
                <CardFooter className="pt-0 pb-3 px-6">
                  <div className="flex flex-wrap gap-2">
                    {result.entry.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardFooter>
              )}
              {onSelectMemory && (
                <CardFooter className="pt-0">
                  <Button
                    variant={selectedMemory === result.entry.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleMemorySelect(result.entry)}
                    className="ml-auto"
                  >
                    {selectedMemory === result.entry.id ? (
                      <>
                        <Check size={16} className="mr-1" />
                        Selected
                      </>
                    ) : (
                      "Use this memory"
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      ) : query && !isSearching ? (
        <p className="text-center text-gray-500 my-8">No memories found matching your query.</p>
      ) : null}
    </div>
  );
};

export default MemorySearch;
