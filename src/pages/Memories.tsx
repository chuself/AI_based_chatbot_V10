
import React from "react";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemoryViewer from "@/components/MemoryViewer";
import MemorySearch from "@/components/MemorySearch";
import { Search, Clock } from "lucide-react";

const Memories: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-indigo-50">
      <Header modelName="Memory Archive" />
      
      <div className="flex-1 overflow-hidden p-4 pt-16">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full">
          <Tabs defaultValue="viewer" className="h-full flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="viewer" className="flex items-center">
                <Clock size={16} className="mr-2" />
                Memory Timeline
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center">
                <Search size={16} className="mr-2" />
                Search Memories
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="viewer" className="flex-1">
              <MemoryViewer />
            </TabsContent>
            
            <TabsContent value="search" className="flex-1">
              <MemorySearch />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Memories;
