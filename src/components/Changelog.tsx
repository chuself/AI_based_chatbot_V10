
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

interface ChangelogProps {
  isOpen: boolean;
  onClose: () => void;
}

const changelogData: ChangelogEntry[] = [
  {
    version: "1.8.0",
    date: "2025-01-25",
    changes: [
      "Fixed model response fetching with improved API validation and error handling",
      "Added cloud data versioning - each sync creates a new version for rollback capability", 
      "Enhanced sync status display showing detailed sync information for each data type",
      "Moved MCP command logs toggle to General Settings page for better organization",
      "Improved model configuration loading from cloud sync with proper validation",
      "Fixed cloud version selection to show all available backup versions",
      "Added comprehensive sync troubleshooting with detailed status indicators"
    ]
  },
  {
    version: "1.7.0",
    date: "2025-01-25",
    changes: [
      "Fixed model response fetching issues with improved error handling and logging",
      "Added versioning support for cloud data - each upload creates a new version instead of overwriting",
      "Enhanced sync status display with detailed breakdown of synced components",
      "Moved MCP server status indicator from chat page to General Settings page",
      "Improved cloud version selection to show all available backup versions",
      "Fixed Gemini API message formatting for better compatibility",
      "Added comprehensive error logging for debugging model API calls"
    ]
  },
  {
    version: "1.6.0",
    date: "2025-04-17",
    changes: [
      "Added MCP server integration for Gmail, Calendar, and Drive",
      "Implemented Gmail OAuth connection in the integrations tab",
      "Added formatted display of Gmail data in chat responses",
      "Improved handling of API responses in the chat interface",
      "Fixed text-to-speech issues with more natural voice patterns"
    ]
  },
  {
    version: "1.5.0",
    date: "2025-04-16",
    changes: [
      "Added text-to-speech functionality for AI responses",
      "Improved memory search with highlighting and relevance scores",
      "Added loading indicators with animated message bubbles",
      "Optimized memory storage for better recall",
      "Centralized memory management in settings"
    ]
  },
  {
    version: "1.4.0", 
    date: "2025-04-14",
    changes: [
      "Added support for multiple AI model providers",
      "Added Google services integration (Gmail, Calendar, Drive)",
      "Implemented tabbed settings interface",
      "Fixed message display issues"
    ]
  },
  {
    version: "1.3.0", 
    date: "2025-03-15",
    changes: [
      "Added conversation history to maintain context between messages",
      "Added ability to clear conversation history",
      "Fixed model selection issues",
      "Added model refresh button to settings"
    ]
  },
  {
    version: "1.2.0", 
    date: "2025-03-15",
    changes: [
      "Added model selection dropdown",
      "Added scroll navigation for message history",
      "Improved settings page with API key management"
    ]
  }
];

const Changelog: React.FC<ChangelogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md relative overflow-hidden shadow-xl">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">What's New</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="max-h-[60vh] p-4">
          <div className="space-y-6">
            {changelogData.map((entry, index) => (
              <div key={entry.version} className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Version {entry.version}</h3>
                  <span className="text-xs text-gray-500">{entry.date}</span>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="text-sm text-gray-700">{change}</li>
                  ))}
                </ul>
                {index < changelogData.length - 1 && (
                  <div className="border-b border-gray-200 pt-2" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default Changelog;
