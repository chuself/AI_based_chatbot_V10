
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import IntegrationCommandManager from '@/components/IntegrationCommandManager';

const CommandsTab = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Integration Commands</CardTitle>
          <CardDescription>
            Configure commands that the AI model can use to interact with your integrations.
            These commands teach the AI how to access your APIs and what parameters to use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How AI Integration Commands Work</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Commands define how the AI can interact with your integrated services</li>
                <li>• Each command specifies an endpoint, method, and expected parameters</li>
                <li>• The AI uses these commands when users ask about related functionality</li>
                <li>• Commands are automatically synced and available to the AI model</li>
              </ul>
            </div>
            
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-2">Example Usage</h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                When you ask "What are my pending tasks?", the AI will use the configured "getTasks" 
                command to fetch data from your reminder API and present it in a user-friendly format.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <IntegrationCommandManager />
    </div>
  );
};

export default CommandsTab;
