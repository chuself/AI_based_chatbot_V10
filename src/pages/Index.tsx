import React, { useState, useEffect, useCallback } from "react";
import { ChatMessage } from "@/hooks/useChatHistory";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import Header from "@/components/Header";
import { useGemini } from "@/hooks/useGemini";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useCommands } from "@/hooks/useCommands";
import { useGeminiConfig } from "@/hooks/useGeminiConfig";
import { useMcpDebug } from "@/hooks/useMcpDebug";
import { Command } from "@/services/commandsService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingDots } from "@/components/ui/loading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Bug, Trash2 } from "lucide-react";
import getMcpClient from "@/services/mcpService";
import { syncIntegrationsToSupabase } from "@/services/supabaseIntegrationsService";
import { useIntegrationCommands } from "@/hooks/useIntegrationCommands";

const Index = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommandExecuting, setIsCommandExecuting] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const { sendMessage: sendMessageToGemini } = useGemini();
  const { chatHistory, setChatHistory } = useChatHistory();
  const { commands } = useCommands();
  const { modelConfig } = useGeminiConfig();
  const { 
    isDebugEnabled, 
    debugEntries, 
    toggleDebug, 
    logPrompt, 
    clearDebugEntries, 
    getDebugSummary 
  } = useMcpDebug();
  const mcpClient = getMcpClient();
  const { executeCommand: executeIntegrationCommand } = useIntegrationCommands();

  useEffect(() => {
    setMessages(chatHistory);
    
    // Sync integrations to Supabase when component mounts
    const syncIntegrations = async () => {
      try {
        console.log('Syncing integrations on app load...');
        await syncIntegrationsToSupabase();
      } catch (error) {
        console.error('Error syncing integrations on load:', error);
      }
    };
    
    syncIntegrations();
  }, [chatHistory]);

  const saveMessages = (newMessages: ChatMessage[]) => {
    setChatHistory(newMessages);
  };

  const handleRegenerateResponse = async (message: ChatMessage) => {
    setIsLoading(true);
    const previousMessages = messages.filter(m => m.timestamp < message.timestamp);

    try {
      const response = await sendMessageToGemini(message.content, undefined, previousMessages);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      const updatedMessages = [...previousMessages, assistantMessage];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
    } catch (error) {
      console.error("Error regenerating response:", error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I apologize, but I encountered an error while processing your request. Please try again.",
        timestamp: Date.now()
      };

      const errorMessages = [...previousMessages, errorMessage];
      setMessages(errorMessages);
      saveMessages(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (message: ChatMessage) => {
    navigator.clipboard.writeText(message.content);
  };

  const handleDeleteMessage = (message: ChatMessage) => {
    const updatedMessages = messages.filter(m => m.timestamp !== message.timestamp);
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
  };

  // Helper function to format integration results in a conversational way
  const formatIntegrationResult = (result: any, commandName: string, integrationName: string): string => {
    if (!result) return "The command was executed successfully.";
    
    // Handle task/reminder operations specifically
    if (integrationName.toLowerCase().includes('reminder') || integrationName.toLowerCase().includes('task')) {
      if (commandName.toLowerCase() === 'gettasks') {
        if (Array.isArray(result.data)) {
          if (result.data.length === 0) {
            return "You don't have any pending tasks at the moment.";
          }
          
          const taskList = result.data.map((task: any, index: number) => {
            const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date';
            return `${index + 1}. **${task.title}** - Due: ${dueDate} (Priority: ${task.priority || 'Medium'})`;
          }).join('\n');
          
          return `Here are your current tasks:\n\n${taskList}`;
        }
      } else if (commandName.toLowerCase() === 'createtask') {
        if (result.data && result.data.title) {
          const dueDate = result.data.due_date ? new Date(result.data.due_date).toLocaleDateString() : 'No due date set';
          return `Great! I've created a new task "${result.data.title}" for you. Due date: ${dueDate}`;
        }
      } else if (commandName.toLowerCase() === 'updatetask') {
        if (result.data && result.data.title) {
          return `Perfect! I've updated the task "${result.data.title}" successfully.`;
        } else {
          return "The task has been updated successfully.";
        }
      } else if (commandName.toLowerCase() === 'deletetask') {
        return "The task has been deleted successfully.";
      }
    }
    
    // For other integrations or when specific formatting isn't available
    if (typeof result === 'string') {
      return result;
    } else if (typeof result === 'object') {
      // Try to extract meaningful information from the result
      if (result.message) {
        return result.message;
      } else if (result.data) {
        if (Array.isArray(result.data)) {
          return `Found ${result.data.length} results.`;
        } else if (typeof result.data === 'object' && result.data.title) {
          return `Operation completed for: ${result.data.title}`;
        }
      }
    }
    
    return "The operation was completed successfully.";
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    const userMessage: ChatMessage = { 
      role: 'user', 
      content,
      timestamp: Date.now()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    
    setIsLoading(true);
    
    try {
      console.log("Sending message to AI...");
      
      // Log the prompt being sent to AI for debugging
      if (isDebugEnabled) {
        logPrompt(content, { 
          messageHistory: updatedMessages.slice(-5), // Last 5 messages for context
          modelConfig: modelConfig?.modelName 
        });
      }
      
      const response = await sendMessageToGemini(content, undefined, updatedMessages);
      
      console.log("AI Response received:", response);
      
      // ONLY process integration commands if they contain actual tool_code format
      let integrationResult = null;
      let finalResponse = response;
      
      // Look for tool_code format like "reminder.getTasks" or "reminder.createTask(...)"
      const toolCodeMatch = response.match(/```tool_code\s*\n\s*([^.]+)\.([^(\s]+)(?:\(([^)]*)\))?\s*\n\s*```/);
      
      if (toolCodeMatch) {
        console.log("Found tool_code pattern:", toolCodeMatch);
        const [, integrationName, commandName, parametersStr] = toolCodeMatch;
        let parameters = {};
        
        if (parametersStr) {
          try {
            // Parse function parameters like 'title="buy new car", due_date="2025-12-15"'
            const paramPairs = parametersStr.split(',').map(p => p.trim());
            for (const pair of paramPairs) {
              const [key, value] = pair.split('=').map(s => s.trim());
              if (key && value) {
                // Remove quotes from value
                parameters[key] = value.replace(/['"]/g, '');
              }
            }
          } catch (e) {
            console.error('Error parsing tool_code parameters:', e);
          }
        }
        
        console.log('Executing REAL integration command:', { integrationName, commandName, parameters });
        integrationResult = await executeIntegrationCommand(integrationName, commandName, parameters);
        
        if (integrationResult) {
          console.log("REAL Integration command executed, result:", integrationResult);
          
          if (integrationResult.result) {
            // Format the result in a conversational way
            const conversationalResult = formatIntegrationResult(
              integrationResult.result, 
              commandName, 
              integrationName
            );
            
            // Remove the tool_code block and replace with conversational response
            finalResponse = response.replace(/```tool_code[\s\S]*?```/g, '').trim() + 
                           (finalResponse.trim() ? '\n\n' : '') + conversationalResult;
          } else if (integrationResult.error) {
            console.error("Integration command error:", integrationResult.error);
            finalResponse = response.replace(/```tool_code[\s\S]*?```/g, '').trim() + 
                           `\n\nI encountered an error: ${integrationResult.error.message}`;
          }
        }
      } else if (mcpClient.hasMcpCall(response)) {
        console.log("Response contains MCP call, processing...");
        const mcpCall = mcpClient.extractMcpCall(response);
        
        if (mcpCall) {
          console.log("Extracted MCP call:", mcpCall);
          
          const mcpResponse = await mcpClient.processMcpCall(mcpCall);
          
          if (mcpResponse.result) {
            finalResponse += `\n\nMCP Result: ${JSON.stringify(mcpResponse.result, null, 2)}`;
          } else if (mcpResponse.error) {
            finalResponse += `\n\nMCP Error: ${mcpResponse.error.message}`;
          }
        }
      }
      
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: finalResponse,
        timestamp: Date.now(),
        isMcpResult: !!integrationResult
      };
      
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages);
      
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: ChatMessage = { 
        role: 'assistant', 
        content: "I apologize, but I encountered an error while processing your request. Please try again.",
        timestamp: Date.now()
      };
      
      const errorMessages = [...updatedMessages, errorMessage];
      setMessages(errorMessages);
      saveMessages(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceMessage = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-message.wav');

    setIsLoading(true);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.transcription) {
        // Send the transcribed text as a message
        await sendMessage(data.transcription);
      } else {
        console.error("Transcription failed: No transcription received");
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: "I'm sorry, I couldn't transcribe your voice message. Please try again.",
          timestamp: Date.now()
        };

        const errorMessages = [...messages, errorMessage];
        setMessages(errorMessages);
        saveMessages(errorMessages);
      }
    } catch (error) {
      console.error("Error sending voice message:", error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: "I apologize, but I encountered an error while processing your voice message. Please try again.",
        timestamp: Date.now()
      };

      const errorMessages = [...messages, errorMessage];
      setMessages(errorMessages);
      saveMessages(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommandClick = async (command: Command) => {
    setIsCommandExecuting(command.id);
    setIsLoading(true);

    try {
      if (command.type === 'mcp' && command.serverId) {
        // Handle MCP command
        const mcpCall = {
          serverId: command.serverId,
          method: command.endpoint || command.name,
          params: command.parameters || {},
          id: Date.now()
        };

        const mcpResponse = await mcpClient.processMcpCall(mcpCall);
        
        let responseContent = `Executed command: ${command.name}\n\n`;
        if (mcpResponse.result) {
          responseContent += `Result: ${JSON.stringify(mcpResponse.result, null, 2)}`;
        } else if (mcpResponse.error) {
          responseContent += `Error: ${mcpResponse.error.message}`;
        }

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: responseContent,
          timestamp: Date.now()
        };

        const updatedMessages = [...messages, assistantMessage];
        setMessages(updatedMessages);
        saveMessages(updatedMessages);
      } else {
        // Handle regular command
        await sendMessage(command.prompt || command.instruction);
      }
    } catch (error) {
      console.error("Error executing command:", error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error executing command "${command.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
      
      const errorMessages = [...messages, errorMessage];
      setMessages(errorMessages);
      saveMessages(errorMessages);
    } finally {
      setIsCommandExecuting(null);
      setIsLoading(false);
    }
  };

  // Get model display name
  const getModelDisplayName = () => {
    if (!modelConfig?.modelName) return "AI Assistant";
    
    // Extract just the model name from full path
    const modelParts = modelConfig.modelName.split('/');
    const modelName = modelParts[modelParts.length - 1];
    
    // Clean up common model name patterns
    return modelName
      .replace('-latest', '')
      .replace('models/', '')
      .replace(/^gemini-/, 'Gemini ')
      .replace(/^gpt-/, 'GPT-')
      .replace(/^claude-/, 'Claude ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-900 dark:to-indigo-900">
      <Header modelName={getModelDisplayName()} />
      
      {/* MCP Debug Panel */}
      {isDebugEnabled && (
        <div className="fixed top-20 right-4 w-80 z-50">
          <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-blue-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bug className="h-4 w-4 text-blue-500" />
                  MCP Debug Panel
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDebugEntries}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDebugPanel(!showDebugPanel)}
                    className="h-7 w-7 p-0"
                  >
                    {showDebugPanel ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {showDebugPanel && (
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                  {debugEntries.length === 0 ? (
                    <p className="text-gray-500">No debug entries yet...</p>
                  ) : (
                    debugEntries.slice(-10).map((entry) => (
                      <div key={entry.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded border-l-2 border-blue-300">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {entry.type}
                          </Badge>
                          <span className="text-gray-500 text-xs">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <pre className="whitespace-pre-wrap text-xs max-h-20 overflow-y-auto">
                          {entry.type === 'prompt' 
                            ? entry.content.fullMessage 
                            : entry.type === 'request' 
                              ? entry.content.requestDetails
                              : entry.content.responseDetails || JSON.stringify(entry.content, null, 2)
                          }
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      <div className="pt-20 pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* MCP Debug Control */}
          <div className="mb-4 flex justify-end">
            <div className="flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-4 py-2 border">
              <Bug className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">MCP Debug</span>
              <Switch
                checked={isDebugEnabled}
                onCheckedChange={toggleDebug}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>
          </div>

          {/* Welcome message for new users */}
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Welcome to Your AI Assistant
                </h1>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                  I'm here to help you with questions, creative tasks, analysis, and more. 
                  Start a conversation or try one of the quick commands below.
                </p>
                {isDebugEnabled && (
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    🔍 Debug mode is enabled - all AI prompts and external requests will be logged
                  </p>
                )}
              </div>
              
              {/* Quick Commands */}
              {commands.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                    Quick Commands
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {commands.slice(0, 6).map((command) => (
                      <Button
                        key={command.id}
                        variant="outline"
                        className="h-auto p-4 text-left flex flex-col items-start space-y-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700"
                        onClick={() => handleCommandClick(command)}
                        disabled={isCommandExecuting === command.id || isLoading}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{command.name}</span>
                          {command.type === 'mcp' && (
                            <Badge variant="secondary" className="text-xs">
                              {command.type.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {command.description}
                        </span>
                        {isCommandExecuting === command.id && (
                          <div className="flex items-center space-x-1 text-xs text-blue-600">
                            <LoadingDots />
                            <span>Executing...</span>
                          </div>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Message List */}
          {messages.length > 0 && (
            <MessageList 
              messages={messages} 
              isLoading={isLoading}
              onRegenerateResponse={handleRegenerateResponse}
              onCopyMessage={handleCopyMessage}
              onDeleteMessage={handleDeleteMessage}
            />
          )}
        </div>
      </div>

      {/* Message Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <MessageInput
            onSendMessage={sendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
