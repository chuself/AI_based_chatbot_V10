
import React from "react";
import GoogleIntegration from "@/components/GoogleIntegration";
import MCPStatusIndicator from "@/components/MCPStatusIndicator";

const IntegrationsTab = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-xl font-medium">Integrations</h2>
        <p className="text-sm text-gray-400">
          Connect external services to enhance your assistant's capabilities
        </p>
      </div>
      
      <div className="relative">
        <MCPStatusIndicator />
        <GoogleIntegration />
      </div>
      
      <div className="text-xs text-gray-400 mt-4">
        <p className="font-semibold">How does this work?</p>
        <p className="mt-1">
          When connected to Google services, you can ask your AI assistant to:
        </p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Check your recent emails by asking "Check my latest emails"</li>
          <li>Create calendar events with "Schedule a meeting with John on Friday"</li>
          <li>Manage files with "Upload this document to Drive" or "Find my resume"</li>
          <li>Search the web with "Search for the latest news about AI"</li>
        </ul>
      </div>
    </div>
  );
};

export default IntegrationsTab;
