
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Command, loadCommands, saveCommands } from "@/services/commandsService";
import { SupabaseContext } from "@/App";
import SupabaseSyncStatus from "@/components/SupabaseSyncStatus";

const Commands = () => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [newCommandName, setNewCommandName] = useState("");
  const [newCommandInstruction, setNewCommandInstruction] = useState("");
  const [newCommandCondition, setNewCommandCondition] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useContext(SupabaseContext);

  useEffect(() => {
    // Load saved commands on component mount
    const loadSavedCommands = async () => {
      setLoading(true);
      try {
        const savedCommands = await loadCommands();
        setCommands(savedCommands);
      } catch (e) {
        console.error("Failed to load commands:", e);
        toast({
          title: "Error Loading Commands",
          description: "Your saved commands could not be loaded properly.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSavedCommands();
  }, [user?.id]); // Reload when user changes

  // Save commands whenever they change
  useEffect(() => {
    if (!loading && commands.length > 0) {
      saveCommands(commands).catch(error => {
        console.error("Error saving commands:", error);
      });
    }
  }, [commands, loading]);

  const handleGoBack = () => {
    navigate("/settings");
  };

  const addCommand = () => {
    if (!newCommandName.trim() || !newCommandInstruction.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a name and instruction for your command.",
        variant: "destructive",
      });
      return;
    }

    const newCommand: Command = {
      id: Date.now().toString(),
      name: newCommandName.trim(),
      instruction: newCommandInstruction.trim(),
      condition: newCommandCondition.trim() || undefined,
    };

    const updatedCommands = [...commands, newCommand];
    setCommands(updatedCommands);
    
    // Reset form
    setNewCommandName("");
    setNewCommandInstruction("");
    setNewCommandCondition("");
    
    toast({
      title: "Command Added",
      description: `Your "${newCommandName}" command has been saved.`,
    });
  };

  const deleteCommand = (id: string) => {
    const updatedCommands = commands.filter(cmd => cmd.id !== id);
    setCommands(updatedCommands);
    
    toast({
      title: "Command Deleted",
      description: "Your command has been removed.",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-pink-50 via-purple-50 to-indigo-50">
      <div className="fixed top-0 left-0 right-0 z-10 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleGoBack} 
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Custom Commands</h1>
          </div>
          <div>
            <SupabaseSyncStatus />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-20 pb-16 px-4">
        {loading ? (
          <div className="flex justify-center pt-10">
            <div className="animate-pulse text-purple-600">Loading commands...</div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-medium">Add New Command</h2>
              <p className="text-sm text-gray-500">
                Create custom commands that will influence how the AI responds to your messages.
              </p>
              
              <div className="space-y-4 p-4 rounded-lg border border-gray-200 bg-white">
                <div>
                  <label htmlFor="commandName" className="block text-sm font-medium text-gray-700 mb-1">
                    Command Name:
                  </label>
                  <Input
                    id="commandName"
                    placeholder="e.g., Casual Tone, Professional Mode"
                    value={newCommandName}
                    onChange={(e) => setNewCommandName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="commandInstruction" className="block text-sm font-medium text-gray-700 mb-1">
                    Instruction:
                  </label>
                  <Textarea
                    id="commandInstruction"
                    placeholder="e.g., Respond in a casual, friendly tone with some humor."
                    value={newCommandInstruction}
                    onChange={(e) => setNewCommandInstruction(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                
                <div>
                  <label htmlFor="commandCondition" className="block text-sm font-medium text-gray-700 mb-1">
                    Activation Condition (Optional):
                  </label>
                  <Input
                    id="commandCondition"
                    placeholder="e.g., Before 10am, When I'm at work"
                    value={newCommandCondition}
                    onChange={(e) => setNewCommandCondition(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Specify when this command should be active, or leave blank to apply it always.
                  </p>
                </div>
                
                <Button onClick={addCommand} className="w-full mt-2">
                  <Plus className="h-4 w-4 mr-2" /> Add Command
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Your Commands</h2>
              
              {commands.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500">You haven't created any commands yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commands.map((command) => (
                    <div key={command.id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{command.name}</h3>
                          {command.condition && (
                            <p className="text-sm text-indigo-600 mt-1">
                              Active: {command.condition}
                            </p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteCommand(command.id)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-2 text-gray-700 text-sm whitespace-pre-wrap">
                        {command.instruction}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Commands;
