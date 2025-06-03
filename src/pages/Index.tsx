
import React, { useState, useEffect, useCallback } from "react";
import { ChatMessage } from "@/hooks/useChatHistory";
import MessageList from "@/components/MessageList";
import MessageInput from "@/components/MessageInput";
import Header from "@/components/Header";
import { useGemini } from "@/hooks/useGemini";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useCommands } from "@/hooks/useCommands";
import { useGeminiConfig } from "@/hooks/useGeminiConfig";
import { Command } from "@/services/commandsService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingDots } from "@/components/ui/loading";
import getMcpClient from "@/services/mcpService";
import { syncIntegrationsToSupabase } from "@/services/supabaseIntegrationsService";
import { generateIntegrationsSystemPrompt } from "@/services/aiIntegrationHelper";
import { useIntegrationCommands } from "@/hooks/useIntegrationCommands";

const Index = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommandExecuting, setIsCommandExecuting] = useState<string | null>(null);
  const { sendMessage: sendMessageToGemini } = useGemini();
  const { chatHistory, setChatHistory } = useChatHistory();
  const { commands } = useCommands();
  const { modelConfig } = useGeminiConfig();
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
      console.log("Sending message to AI with integration context...");
      
      const response = await sendMessageToGemini(content, undefined, updatedMessages);
      
      console.log("AI Response received:", response);
      
      // Check for different integration command patterns
      let integrationResult = null;
      let finalResponse = response;
      
      // Pattern 1: executeIntegrationCommand format
      const integrationCommandMatch = response.match(/executeIntegrationCommand\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`](?:\s*,\s*({[^}]*}))?\s*\)/);
      
      // Pattern 2: tool_code format like "reminder.getTasks" or "reminder.createTask(...)"
      const toolCodeMatch = response.match(/```tool_code\s*\n\s*([^.]+)\.([^(\s]+)(?:\(([^)]*)\))?\s*\n\s*```/);
      
      // Pattern 3: Simple tool format like "reminder.getTasks" without code blocks
      const simpleToolMatch = response.match(/([^.\s]+)\.([^(\s]+)(?:\(([^)]*)\))?/);
      
      if (integrationCommandMatch) {
        console.log("Found executeIntegrationCommand pattern");
        const [, integrationName, commandName, parametersStr] = integrationCommandMatch;
        let parameters = {};
        
        if (parametersStr) {
          try {
            parameters = JSON.parse(parametersStr);
          } catch (e) {
            console.error('Error parsing command parameters:', e);
          }
        }
        
        console.log('Executing integration command:', { integrationName, commandName, parameters });
        integrationResult = await executeIntegrationCommand(integrationName, commandName, parameters);
      } else if (toolCodeMatch) {
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
        
        console.log('Executing tool_code command:', { integrationName, commandName, parameters });
        integrationResult = await executeIntegrationCommand(integrationName, commandName, parameters);
      } else if (simpleToolMatch && response.includes('.')) {
        console.log("Found simple tool pattern:", simpleToolMatch);
        const [, integrationName, commandName, parametersStr] = simpleToolMatch;
        let parameters = {};
        
        if (parametersStr) {
          try {
            // Similar parameter parsing
            const paramPairs = parametersStr.split(',').map(p => p.trim());
            for (const pair of paramPairs) {
              const [key, value] = pair.split('=').map(s => s.trim());
              if (key && value) {
                parameters[key] = value.replace(/['"]/g, '');
              }
            }
          } catch (e) {
            console.error('Error parsing simple tool parameters:', e);
          }
        }
        
        console.log('Executing simple tool command:', { integrationName, commandName, parameters });
        integrationResult = await executeIntegrationCommand(integrationName, commandName, parameters);
      }
      
      // Process integration result
      if (integrationResult) {
        console.log("Integration command executed, result:", integrationResult);
        
        if (integrationResult.result) {
          // Format the result nicely
          let resultText = '';
          if (typeof integrationResult.result === 'object') {
            if (Array.isArray(integrationResult.result)) {
              resultText = `\n\n**Results:**\n${integrationResult.result.map(item => `• ${JSON.stringify(item)}`).join('\n')}`;
            } else {
              resultText = `\n\n**Result:**\n\`\`\`json\n${JSON.stringify(integrationResult.result, null, 2)}\n\`\`\``;
            }
          } else {
            resultText = `\n\n**Result:** ${integrationResult.result}`;
          }
          
          finalResponse = response.replace(/```tool_code[\s\S]*?```/g, '').trim() + resultText;
        } else if (integrationResult.error) {
          console.error("Integration command error:", integrationResult.error);
          finalResponse = response.replace(/```tool_code[\s\S]*?```/g, '').trim() + `\n\n**Error:** ${integrationResult.error.message}`;
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
      
      <div className="pt-20 pb-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
