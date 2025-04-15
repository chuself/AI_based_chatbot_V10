
import React, { useState, useEffect } from "react";
import { MemoryService } from "@/services/memoryService";
import { MemoryEntry } from "@/types/memory";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Memory, Clock, Tag, Trash } from "lucide-react";

const MemoryViewer: React.FC = () => {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState("timeline");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = () => {
    const allMemories = MemoryService.getAllMemories();
    setMemories(allMemories.sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleClearMemories = () => {
    if (confirm("Are you sure you want to clear all stored memories? This action cannot be undone.")) {
      MemoryService.clearAllMemories();
      setMemories([]);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const filterMemories = () => {
    if (!filter) return memories;
    
    const lowerFilter = filter.toLowerCase();
    return memories.filter(memory => 
      memory.userInput.toLowerCase().includes(lowerFilter) ||
      memory.assistantReply.toLowerCase().includes(lowerFilter) ||
      (memory.tags && memory.tags.some(tag => tag.toLowerCase().includes(lowerFilter)))
    );
  };

  const groupByDate = (entries: MemoryEntry[]) => {
    const groups: { [date: string]: MemoryEntry[] } = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });
    
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());
  };

  const groupedMemories = groupByDate(filterMemories());
  const uniqueTags = new Set<string>();
  memories.forEach(memory => {
    if (memory.tags) {
      memory.tags.forEach(tag => uniqueTags.add(tag));
    }
  });

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gemini-dark">Memory Archive</h2>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearMemories}
          className="flex items-center"
        >
          <Trash size={16} className="mr-2" />
          Clear All
        </Button>
      </div>
      
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter memories..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="timeline" className="flex items-center">
            <Clock size={16} className="mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center">
            <Tag size={16} className="mr-2" />
            Tags
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="flex-1">
          {memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Memory size={48} className="mb-4" />
              <p>No memories stored yet</p>
            </div>
          ) : groupedMemories.length === 0 ? (
            <p className="text-center text-gray-500 my-8">No memories match your filter.</p>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              {groupedMemories.map(([date, entries]) => (
                <div key={date} className="mb-6">
                  <h3 className="text-md font-semibold text-gray-700 mb-2 sticky top-0 bg-white py-2">
                    {date}
                  </h3>
                  <div className="space-y-3">
                    {entries.map(memory => (
                      <Card key={memory.id} className="border border-gray-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            {formatDate(memory.timestamp)}
                            {memory.intent && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
                                {memory.intent}
                              </span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-2">
                          <div className="mb-2">
                            <p className="text-sm font-medium">You:</p>
                            <p className="text-sm text-gray-700">{memory.userInput}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Assistant:</p>
                            <p className="text-sm text-gray-700">{memory.assistantReply}</p>
                          </div>
                        </CardContent>
                        {memory.tags && memory.tags.length > 0 && (
                          <CardFooter className="pt-0">
                            <div className="flex flex-wrap gap-2">
                              {memory.tags.map(tag => (
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
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          )}
        </TabsContent>
        
        <TabsContent value="tags" className="flex-1">
          {uniqueTags.size === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Tag size={48} className="mb-4" />
              <p>No tags available</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from(uniqueTags).sort().map(tag => (
                <Button 
                  key={tag}
                  variant="outline"
                  className="justify-start"
                  onClick={() => setFilter(tag)}
                >
                  <Tag size={14} className="mr-2" />
                  {tag} ({memories.filter(m => m.tags?.includes(tag)).length})
                </Button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MemoryViewer;
