
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Clock, Settings } from "lucide-react";

interface ReminderSetupGuideProps {
  isVisible: boolean;
}

const ReminderSetupGuide: React.FC<ReminderSetupGuideProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <AlertCircle className="h-4 w-4 text-blue-600" />
      <AlertDescription>
        <div className="space-y-3">
          <h4 className="font-medium text-blue-800 dark:text-blue-200">
            Setting up your Reminder App Integration
          </h4>
          
          <div className="space-y-2 text-sm">
            <p className="text-blue-700 dark:text-blue-300">
              To make your reminder app work seamlessly with the AI, follow these steps:
            </p>
            
            <ol className="list-decimal list-inside space-y-2 text-blue-600 dark:text-blue-400">
              <li className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <strong>Configure API Endpoint:</strong> Go to Settings → Integrations and add your reminder app with category "reminders" or "tasks"
                </span>
              </li>
              
              <li className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <strong>Add API Commands:</strong> Define these essential commands for the AI:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li><code>get_pending_tasks</code> - Get all pending tasks</li>
                    <li><code>create_reminder</code> - Create new reminders</li>
                    <li><code>complete_task</code> - Mark tasks as done</li>
                    <li><code>search_tasks</code> - Search by keyword</li>
                  </ul>
                </span>
              </li>
              
              <li className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <strong>Test Connection:</strong> Use the "Test Connection" button to verify your API is accessible
                </span>
              </li>
              
              <li className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <strong>API Requirements:</strong> Ensure your reminder API:
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Returns JSON responses</li>
                    <li>Handles CORS properly (if browser-based)</li>
                    <li>Has endpoints that match your defined commands</li>
                    <li>Uses consistent data formats</li>
                  </ul>
                </span>
              </li>
            </ol>
            
            <div className="mt-3 p-3 bg-green-100 dark:bg-green-900 rounded-md">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Once configured correctly:</span>
              </div>
              <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                You can ask things like "Check my pending tasks", "Add a reminder to call mom tomorrow", 
                or "What do I have scheduled for today?" and the AI will automatically use your reminder app!
              </p>
            </div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ReminderSetupGuide;
