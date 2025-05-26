
import React, { useState, useEffect, useContext } from "react";
import Header from "@/components/Header";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import Changelog from "@/components/Changelog";
import { Message } from "@/components/MessageItem";
import { useGemini } from "@/hooks/useGemini";
import { useSpeech } from "@/hooks/useSpeech";
import { useToast } from "@/components/ui/use-toast";
import { App } from '@capacitor/app';
import { checkGoogleConnection, getEmails, getCalendarEvents, getDriveFiles } from "@/utils/googleService";
import { MemoryService } from "@/services/memoryService";
import { useIsMobile } from "@/hooks/use-mobile";
import getMcpClient from "@/services/mcpService";
import SupabaseSyncStatus from "@/components/SupabaseSyncStatus";
import { SupabaseContext } from "@/App";
import { Command, loadCommands } from "@/services/commandsService";
import { useDataSync } from "@/hooks/useDataSync";

const STORAGE_KEY_SHOW_CHANGELOG = "show-changelog-1.9.0";
const STORAGE_KEY_SESSION_MESSAGES = "session-messages";

interface CommandLog {
  timestamp: Date;
  tool: string;
  method: string;
  params: Record<string, any>;
}

const Index = () => {
  // Session messages (preserved during navigation, cleared on logout)
  const [messages, setMessages] = useState<Message[]>([]);
  const { sendMessage, isLoading, error, selectedModel } = useGemini();
  const { speak, autoPlay } = useSpeech();
  const { toast } = useToast();
  const [googleConnected, setGoogleConnected] = useState(false);
  const [customCommands, setCustomCommands] = useState<Command[]>([]);
  const [showChangelog, setShowChangelog] = useState(false);
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [showCommandLogs, setShowCommandLogs] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useContext(SupabaseContext);
  const [loadingCommands, setLoadingCommands] = useState(true);
  
  const { syncData, isLoading: syncLoading } = useDataSync();
  
  // Load and save session messages (separate from persistent chat history)
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY_SESSION_MESSAGES);
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages) as Message[];
        setMessages(parsedMessages);
      } catch (error) {
        console.error("Failed to parse saved session messages:", error);
        // Initialize with welcome message if parsing fails
        initializeWelcomeMessage();
      }
    } else {
      initializeWelcomeMessage();
    }
  }, []);

  // Save session messages on change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY_SESSION_MESSAGES, JSON.stringify(messages));
    }
  }, [messages]);

  // Clear session messages on logout
  useEffect(() => {
    if (!user) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY_SESSION_MESSAGES);
      initializeWelcomeMessage();
    }
  }, [user]);

  const initializeWelcomeMessage = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: "👋 Hi! I'm your Chuself AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };
  
  // Load command visibility preference from localStorage
  useEffect(() => {
    const showCommands = localStorage.getItem('show-mcp-commands');
    setShowCommandLogs(showCommands === 'true');
    
    // Listen for changes to this setting
    const handleStorageChange = () => {
      const showCommands = localStorage.getItem('show-mcp-commands');
      setShowCommandLogs(showCommands === 'true');
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for manual changes within the same tab
    const interval = setInterval(() => {
      const showCommands = localStorage.getItem('show-mcp-commands');
      setShowCommandLogs(showCommands === 'true');
    }, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  useEffect(() => {
    const hasSeenChangelog = localStorage.getItem(STORAGE_KEY_SHOW_CHANGELOG);
    if (!hasSeenChangelog) {
      setShowChangelog(true);
    }
  }, []);
  
  const handleCloseChangelog = () => {
    localStorage.setItem(STORAGE_KEY_SHOW_CHANGELOG, 'true');
    setShowChangelog(false);
  };
  
  // Load commands from synced data
  useEffect(() => {
    if (syncData?.customCommands) {
      setCustomCommands(syncData.customCommands);
      setLoadingCommands(false);
      console.log(`Loaded ${syncData.customCommands.length} commands from synced data`);
    } else if (!syncLoading) {
      // Fallback to legacy loading if no synced data
      const fetchCommands = async () => {
        setLoadingCommands(true);
        try {
          const commands = await loadCommands();
          setCustomCommands(commands);
          console.log(`Loaded ${commands.length} commands from legacy storage`);
        } catch (e) {
          console.error("Failed to load commands:", e);
        } finally {
          setLoadingCommands(false);
        }
      };
      
      fetchCommands();
    }
  }, [syncData, syncLoading]);
  
  useEffect(() => {
    const googleStatus = checkGoogleConnection();
    setGoogleConnected(googleStatus.gmail || googleStatus.calendar || googleStatus.drive);
  }, []);
  
  useEffect(() => {
    const backButtonHandler = App.addListener('backButton', (data) => {
      if (window.location.pathname === '/') {
        App.exitApp();
      }
    });

    return () => {
      backButtonHandler.then(listener => {
        listener.remove();
      }).catch(error => {
        console.error('Error with back button handler:', error);
      });
    };
  }, []);
  
  // Initialize with welcome message only (fresh start each session)
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: "👋 Hi! I'm your Chuself AI assistant. How can I help you today?",
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages([welcomeMessage]);
    }
  }, [messages.length]);
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  // Monitor MCP calls
  useEffect(() => {
    const originalExtractMcpCall = getMcpClient().extractMcpCall;
    
    // Override the extractMcpCall method to log calls
    getMcpClient().extractMcpCall = (text: string) => {
      const mcpCall = originalExtractMcpCall(text);
      
      if (mcpCall) {
        // Log the MCP call
        const logEntry: CommandLog = {
          timestamp: new Date(),
          tool: mcpCall.tool,
          method: mcpCall.method,
          params: mcpCall.params
        };
        
        setCommandLogs(prev => [...prev, logEntry]);
      }
      
      return mcpCall;
    };
    
    return () => {
      getMcpClient().extractMcpCall = originalExtractMcpCall;
    };
  }, []);
  
  const getActiveCommands = (): string => {
    if (loadingCommands) {
      console.log("Commands still loading, returning empty instructions");
      return "";
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    
    const activeCommands = customCommands.filter(cmd => {
      if (!cmd.condition) return true;
      
      const condition = cmd.condition.toLowerCase();
      
      if (condition.includes('before') && condition.includes('am')) {
        const timeMatch = condition.match(/before\s+(\d+)(?:am|a\.m\.)/i);
        if (timeMatch && currentHour < parseInt(timeMatch[1])) {
          return true;
        }
      }
      
      if (condition.includes('after') && condition.includes('pm')) {
        const timeMatch = condition.match(/after\s+(\d+)(?:pm|p\.m\.)/i);
        if (timeMatch && currentHour > (parseInt(timeMatch[1]) + 12)) {
          return true;
        }
      }
      
      if (condition.includes('morning') && currentHour >= 5 && currentHour < 12) {
        return true;
      }
      
      if (condition.includes('afternoon') && currentHour >= 12 && currentHour < 17) {
        return true;
      }
      
      if (condition.includes('evening') && currentHour >= 17 && currentHour < 21) {
        return true;
      }
      
      if (condition.includes('night') && (currentHour >= 21 || currentHour < 5)) {
        return true;
      }
      
      const hourMatch = condition.match(/at\s+(\d+)(?:am|a\.m\.|pm|p\.m\.)/i);
      if (hourMatch) {
        let hour = parseInt(hourMatch[1]);
        if (condition.includes('pm') && hour < 12) hour += 12;
        if (currentHour === hour) return true;
      }
      
      return false;
    });
    
    return activeCommands.map(cmd => cmd.instruction).join('\n\n');
  };

  const detectMemoryQuery = (text: string): boolean => {
    const memoryKeywords = [
      "remember", "remind me", "what did we talk about", 
      "what did I tell you", "previous conversation", 
      "last time", "you told me", "recall", "memory",
      "we discussed", "you mentioned", "we talked about",
      "I asked you", "fetch memory", "search memory"
    ];
    
    const lowerText = text.toLowerCase();
    
    return memoryKeywords.some(keyword => lowerText.includes(keyword));
  };
  
  const handleMemoryQuery = async (query: string): Promise<string> => {
    const searchParams = MemoryService.parseNaturalLanguageQuery(query);
    const results = MemoryService.searchMemories({
      ...searchParams,
      limit: 5
    });
    
    if (results.length === 0) {
      return "I don't have any memories matching that query. Could you try a different question or be more specific?";
    }
    
    let response = "I found these memories from our previous conversations:\n\n";
    
    results.forEach((result, index) => {
      const memory = result.entry;
      const formattedDate = new Date(memory.timestamp).toLocaleString();
      
      response += `Memory ${index + 1} (${formattedDate}):\n`;
      response += `You asked: "${memory.userInput}"\n`;
      response += `I responded: "${memory.assistantReply}"\n`;
      
      if (memory.tags && memory.tags.length > 0) {
        response += `Tags: ${memory.tags.join(", ")}\n`;
      }
      
      response += "\n";
    });
    
    response += "Is there something specific from these memories you'd like me to elaborate on?";
    
    return response;
  };
  
  const detectServiceRequest = (text: string) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("email") || lowerText.includes("gmail") || lowerText.includes("inbox") || 
        lowerText.includes("message") || lowerText.includes("mail")) {
      return "gmail";
    }
    
    if (lowerText.includes("calendar") || lowerText.includes("schedule") || lowerText.includes("meeting") || 
        lowerText.includes("event") || lowerText.includes("appointment")) {
      return "calendar";
    }
    
    if (lowerText.includes("drive") || lowerText.includes("file") || lowerText.includes("document") || 
        lowerText.includes("upload") || lowerText.includes("folder")) {
      return "drive";
    }
    
    if (lowerText.includes("search") || lowerText.includes("find information") || 
        lowerText.includes("look up") || lowerText.includes("news") || 
        lowerText.includes("what is") || lowerText.includes("tell me about")) {
      return "search";
    }
    
    return null;
  };
  
  const handleEmailRequest = async (query: string) => {
    try {
      const emails = await getEmails(5);
      return `Here are your recent emails:\n\n${emails.map(email => 
        `From: ${email.sender}\nSubject: ${email.subject}\nDate: ${new Date(email.date).toLocaleString()}\n${email.snippet}\n\n`
      ).join('---\n\n')}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'Could not access your emails'}. Please connect your Gmail account in Settings.`;
    }
  };
  
  const handleCalendarRequest = async (query: string) => {
    try {
      const events = await getCalendarEvents(7);
      return `Here are your upcoming events:\n\n${events.map(event => 
        `${event.title}\nWhen: ${new Date(event.start).toLocaleString()} to ${new Date(event.end).toLocaleString()}\nWhere: ${event.location}\n\n`
      ).join('---\n\n')}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'Could not access your calendar'}. Please connect your Google Calendar in Settings.`;
    }
  };
  
  const handleDriveRequest = async (query: string) => {
    try {
      const files = await getDriveFiles(query);
      return `Here are your files:\n\n${files.map(file => 
        `${file.name}\nType: ${file.mimeType}\nLast modified: ${new Date(file.lastModified).toLocaleString()}\n\n`
      ).join('---\n\n')}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'Could not access your files'}. Please connect your Google Drive in Settings.`;
    }
  };
  
  const handleSearchRequest = async (query: string) => {
    const mcpClient = getMcpClient();
    try {
      const mcpCall = {
        tool: "search",
        method: "search",
        params: { query },
        id: 1
      };
      
      const response = await mcpClient.processMcpCall(mcpCall);
      if (response.error) {
        return `Error performing search: ${response.error.message}. Please check your search server configuration in Settings > Integrations.`;
      }
      
      return `Search results for "${query}":\n\n${JSON.stringify(response.result, null, 2)}`;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : 'Could not perform search'}. Please check your search server configuration in Settings > Integrations.`;
    }
  };
  
  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    const loadingMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = {
      id: loadingMessageId,
      text: "",
      isUser: false,
      timestamp: new Date(),
      isLoading: true,
    };
    
    setMessages((prevMessages) => [...prevMessages, loadingMessage]);

    const commandInstructions = getActiveCommands();
    
    const isExplicitMemoryQuery = detectMemoryQuery(text);
    let response;
    
    if (isExplicitMemoryQuery) {
      response = await handleMemoryQuery(text);
    } else {
      // Pass chat history from synced data (background context) but don't display it
      const backgroundHistory = syncData?.chatHistory || [];
      response = await sendMessage(text, commandInstructions, backgroundHistory);
    }
    
    MemoryService.saveMemory(text, response);
    
    if (autoPlay && response) {
      speak(response);
    }
    
    setMessages((prevMessages) => 
      prevMessages
        .filter(msg => msg.id !== loadingMessageId)
        .concat({
          id: (Date.now() + 2).toString(),
          text: response,
          isUser: false,
          timestamp: new Date(),
        })
    );
  };
  
  // Clear command logs
  const clearCommandLogs = () => {
    setCommandLogs([]);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-900 dark:to-indigo-900 overscroll-none">
      <Header modelName={selectedModel} />
      
      {showCommandLogs && commandLogs.length > 0 && (
        <div className="fixed top-16 left-0 right-0 z-10 bg-black/80 text-green-400 p-2 max-h-40 overflow-y-auto font-mono text-xs">
          <div className="flex justify-between items-center mb-1">
            <h4>MCP Command Logs</h4>
            <div className="flex items-center gap-2">
              <button 
                onClick={clearCommandLogs}
                className="px-2 py-0.5 bg-red-900/50 text-red-300 rounded text-xs hover:bg-red-800/50"
              >
                Clear
              </button>
              <button
                onClick={() => setShowCommandLogs(false)}
                className="px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded text-xs hover:bg-gray-600/50"
              >
                Hide
              </button>
            </div>
          </div>
          {commandLogs.map((log, i) => (
            <div key={i} className="border-t border-green-900/50 pt-1 mt-1">
              <div className="text-green-200">
                [{log.timestamp.toLocaleTimeString()}] {log.tool}.{log.method}
              </div>
              <div className="pl-2">
                {JSON.stringify(log.params, null, 2)}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex-1 overflow-hidden pt-16 pb-16">
        <MessageList messages={messages} />
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 w-full">
        <div className="glass border-t border-white/20 dark:border-slate-700/50 flex items-center justify-center px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
          <SupabaseSyncStatus className="ml-1" />
        </div>
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
      
      <div className={`fixed ${isMobile ? 'bottom-24 left-4' : 'bottom-20 right-4'} z-10 opacity-60 hover:opacity-100 transition-opacity`}>
        <a 
          href="https://lovable.ai" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-gray-500 flex items-center hover:text-blue-600 dark:hover:text-blue-400"
        >
          Made with Lovable
        </a>
      </div>
      
      <Changelog isOpen={showChangelog} onClose={handleCloseChangelog} />
    </div>
  );
};

export default Index;
