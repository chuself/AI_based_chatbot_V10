import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit, Save, X, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchIntegrationsFromSupabase, 
  fetchCommandsFromSupabase, 
  saveIntegrationCommand, 
  deleteIntegrationCommand,
  StoredIntegration,
  StoredCommand 
} from '@/services/supabaseIntegrationsService';

const IntegrationCommandManager = () => {
  const [integrations, setIntegrations] = useState<StoredIntegration[]>([]);
  const [commands, setCommands] = useState<StoredCommand[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingCommand, setEditingCommand] = useState<string | null>(null);
  const [showNewCommandForm, setShowNewCommandForm] = useState(false);
  const [newCommand, setNewCommand] = useState({
    name: '',
    description: '',
    endpoint: '',
    method: 'GET',
    parameters: '{}',
    example: ''
  });
  const { toast } = useToast();

  // Reminder API command templates
  const reminderTemplates = [
    {
      name: 'getTasks',
      description: 'Get all reminders/tasks for the user',
      endpoint: '/api-reminders',
      method: 'GET',
      parameters: '{}',
      example: 'Get my pending tasks'
    },
    {
      name: 'createTask',
      description: 'Create a new reminder/task',
      endpoint: '/api-reminders',
      method: 'POST',
      parameters: '{"title": "string", "description": "string", "due_date": "YYYY-MM-DD", "due_time": "HH:MM", "priority": "High|Medium|Low", "tags": ["array", "of", "strings"]}',
      example: 'Create a reminder to call John tomorrow at 3 PM'
    },
    {
      name: 'updateTask',
      description: 'Update an existing reminder/task',
      endpoint: '/api-reminders/{id}',
      method: 'PUT',
      parameters: '{"title": "string", "description": "string", "completed_at": "ISO_DATE_STRING"}',
      example: 'Mark the grocery shopping task as completed'
    },
    {
      name: 'getProfile',
      description: 'Get user profile information',
      endpoint: '/api-profile',
      method: 'GET',
      parameters: '{}',
      example: 'Show my profile information'
    },
    {
      name: 'getUsage',
      description: 'Get API usage statistics',
      endpoint: '/api-usage',
      method: 'GET',
      parameters: '{}',
      example: 'Show my API usage stats'
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [integrationsData, commandsData] = await Promise.all([
        fetchIntegrationsFromSupabase(),
        fetchCommandsFromSupabase()
      ]);
      
      setIntegrations(integrationsData);
      setCommands(commandsData);
      
      if (integrationsData.length > 0 && !selectedIntegrationId) {
        setSelectedIntegrationId(integrationsData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load integrations and commands",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCommand = async (commandData: any, commandId?: string) => {
    if (!selectedIntegrationId) {
      toast({
        title: "Error",
        description: "Please select an integration first",
        variant: "destructive"
      });
      return;
    }

    try {
      const parameters = JSON.parse(commandData.parameters || '{}');
      
      const result = await saveIntegrationCommand(selectedIntegrationId, {
        ...commandData,
        parameters
      });

      if (result.success) {
        toast({
          title: "Success",
          description: commandId ? "Command updated successfully" : "Command created successfully"
        });
        
        setEditingCommand(null);
        setShowNewCommandForm(false);
        setNewCommand({
          name: '',
          description: '',
          endpoint: '',
          method: 'GET',
          parameters: '{}',
          example: ''
        });
        
        await loadData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save command",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid JSON in parameters field",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCommand = async (commandId: string) => {
    const result = await deleteIntegrationCommand(commandId);
    
    if (result.success) {
      toast({
        title: "Success",
        description: "Command deleted successfully"
      });
      await loadData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete command",
        variant: "destructive"
      });
    }
  };

  const useTemplate = (template: any) => {
    setNewCommand(template);
    setShowNewCommandForm(true);
  };

  const selectedIntegration = integrations.find(i => i.id === selectedIntegrationId);
  const filteredCommands = commands.filter(c => c.integration_id === selectedIntegrationId);
  const isReminderIntegration = selectedIntegration?.category.toLowerCase().includes('reminder') || 
                                 selectedIntegration?.name.toLowerCase().includes('reminder') ||
                                 selectedIntegration?.description?.toLowerCase().includes('reminder');

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integration Command Manager</CardTitle>
          <CardDescription>
            Manage commands that the AI can use to interact with your integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No integrations found. Please add integrations in the Integrations tab first.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="integration-select">Select Integration</Label>
                <Select value={selectedIntegrationId} onValueChange={setSelectedIntegrationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an integration" />
                  </SelectTrigger>
                  <SelectContent>
                    {integrations.map((integration) => (
                      <SelectItem key={integration.id} value={integration.id}>
                        {integration.name} ({integration.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedIntegration && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="font-medium text-lg">{selectedIntegration.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedIntegration.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{selectedIntegration.type.toUpperCase()}</Badge>
                      <Badge variant="outline">{selectedIntegration.category}</Badge>
                    </div>
                  </div>

                  {/* Show templates for reminder integrations */}
                  {isReminderIntegration && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Quick Setup - Reminder API Commands</CardTitle>
                        <CardDescription>
                          Click any template below to quickly add pre-configured commands for your reminder API
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {reminderTemplates.map((template, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              onClick={() => useTemplate(template)}
                              className="h-auto p-3 text-left flex flex-col items-start"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Copy className="h-4 w-4" />
                                <span className="font-medium">{template.name}</span>
                                <Badge variant="secondary" className="ml-auto">
                                  {template.method}
                                </Badge>
                              </div>
                              <span className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {template.description}
                              </span>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Commands ({filteredCommands.length})</h3>
                    <Button onClick={() => setShowNewCommandForm(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Command
                    </Button>
                  </div>

                  {showNewCommandForm && (
                    <NewCommandForm
                      command={newCommand}
                      onChange={setNewCommand}
                      onSave={(data) => handleSaveCommand(data)}
                      onCancel={() => {
                        setShowNewCommandForm(false);
                        setNewCommand({
                          name: '',
                          description: '',
                          endpoint: '',
                          method: 'GET',
                          parameters: '{}',
                          example: ''
                        });
                      }}
                    />
                  )}

                  <div className="space-y-4">
                    {filteredCommands.map((command) => (
                      <CommandCard
                        key={command.id}
                        command={command}
                        isEditing={editingCommand === command.id}
                        onEdit={() => setEditingCommand(command.id)}
                        onSave={(data) => handleSaveCommand(data, command.id)}
                        onDelete={() => handleDeleteCommand(command.id)}
                        onCancel={() => setEditingCommand(null)}
                      />
                    ))}
                  </div>

                  {filteredCommands.length === 0 && !showNewCommandForm && (
                    <div className="text-center py-8 text-gray-500">
                      No commands found for this integration. 
                      {isReminderIntegration ? ' Use the quick setup templates above or add your first command to get started.' : ' Add your first command to get started.'}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface CommandFormProps {
  command: any;
  onChange: (command: any) => void;
  onSave: (command: any) => void;
  onCancel: () => void;
}

const NewCommandForm: React.FC<CommandFormProps> = ({ command, onChange, onSave, onCancel }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add New Command</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Command Name</Label>
            <Input
              id="name"
              value={command.name}
              onChange={(e) => onChange({ ...command, name: e.target.value })}
              placeholder="e.g., getTasks"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="method">HTTP Method</Label>
            <Select value={command.method} onValueChange={(value) => onChange({ ...command, method: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={command.description}
            onChange={(e) => onChange({ ...command, description: e.target.value })}
            placeholder="What does this command do?"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endpoint">Endpoint Path</Label>
          <Input
            id="endpoint"
            value={command.endpoint}
            onChange={(e) => onChange({ ...command, endpoint: e.target.value })}
            placeholder="e.g., /api-reminders"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="parameters">Parameters (JSON)</Label>
          <Textarea
            id="parameters"
            value={command.parameters}
            onChange={(e) => onChange({ ...command, parameters: e.target.value })}
            placeholder='{"key": "value"}'
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="example">Usage Example</Label>
          <Input
            id="example"
            value={command.example}
            onChange={(e) => onChange({ ...command, example: e.target.value })}
            placeholder="e.g., Get all pending tasks"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => onSave(command)} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save Command
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface CommandCardProps {
  command: StoredCommand;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (command: any) => void;
  onDelete: () => void;
  onCancel: () => void;
}

const CommandCard: React.FC<CommandCardProps> = ({ 
  command, 
  isEditing, 
  onEdit, 
  onSave, 
  onDelete, 
  onCancel 
}) => {
  const [editData, setEditData] = useState({
    name: command.name,
    description: command.description || '',
    endpoint: command.endpoint || '',
    method: command.method,
    parameters: JSON.stringify(command.parameters || {}, null, 2),
    example: command.example || ''
  });

  if (isEditing) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Command Name</Label>
              <Input
                id="edit-name"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-method">HTTP Method</Label>
              <Select value={editData.method} onValueChange={(value) => setEditData({ ...editData, method: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input
              id="edit-description"
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-endpoint">Endpoint Path</Label>
            <Input
              id="edit-endpoint"
              value={editData.endpoint}
              onChange={(e) => setEditData({ ...editData, endpoint: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-parameters">Parameters (JSON)</Label>
            <Textarea
              id="edit-parameters"
              value={editData.parameters}
              onChange={(e) => setEditData({ ...editData, parameters: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-example">Usage Example</Label>
            <Input
              id="edit-example"
              value={editData.example}
              onChange={(e) => setEditData({ ...editData, example: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => onSave(editData)} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{command.name}</h4>
              <Badge variant="outline">{command.method}</Badge>
            </div>
            
            {command.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{command.description}</p>
            )}
            
            {command.endpoint && (
              <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {command.endpoint}
              </p>
            )}
            
            {command.example && (
              <p className="text-sm italic text-gray-500">Example: {command.example}</p>
            )}
            
            {command.parameters && Object.keys(command.parameters).length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
                  Parameters
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                  {JSON.stringify(command.parameters, null, 2)}
                </pre>
              </details>
            )}
          </div>
          
          <div className="flex gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntegrationCommandManager;
