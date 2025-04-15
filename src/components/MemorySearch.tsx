
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { MemoryService } from "@/services/memoryService";
import { MemoryEntry, MemorySearchResult } from "@/types/memory";

interface MemorySearchProps {
  onSelectMemory?: (memory: MemoryEntry) => void;
}

const MemorySearch: React.FC<MemorySearchProps> = ({ onSelectMemory }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemorySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

      {results.length > 0 ? (
        <div className="space-y-4 mt-4">
          {results.map((result) => (
            <Card key={result.entry.id} className="border border-gray-200 hover:border-gemini-primary transition-all">
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
                  <p className="text-sm text-gray-700">{result.entry.userInput}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Assistant:</p>
                  <p className="text-sm text-gray-700">{result.entry.assistantReply}</p>
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
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectMemory(result.entry)}
                    className="ml-auto text-gemini-primary hover:text-gemini-secondary"
                  >
                    Use this memory
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
