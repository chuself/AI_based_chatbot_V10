
import React, { useState } from "react";
import { 
  SettingsIcon,
  Cpu,
  Volume2, 
  Globe,
  RefreshCw,
  Terminal
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SettingsHeader from "@/components/settings/SettingsHeader";
import GeneralSettings from "@/components/settings/GeneralSettings";
import ModelSettingsTab from "@/components/settings/ModelSettings";
import SpeechSettingsTab from "@/components/settings/SpeechSettingsTab";
import IntegrationsTab from "@/components/settings/IntegrationsTab";
import SyncStatusTab from "@/components/settings/SyncStatusTab";
import CommandsTab from "@/components/settings/CommandsTab";

const Settings = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-900 dark:to-indigo-900">
      <SettingsHeader />

      <div className="pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Tabs defaultValue="general" className="w-full">
            {/* Sticky Tab Navigation */}
            <div className="sticky top-16 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3 mb-6">
              <TabsList className="glass-card grid w-full grid-cols-6 p-1 max-w-4xl mx-auto">
                <TabsTrigger 
                  value="general" 
                  className="flex items-center gap-2 glass-button data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="models" 
                  className="flex items-center gap-2 glass-button data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                >
                  <Cpu className="h-4 w-4" />
                  <span className="hidden sm:inline">Models</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="speech" 
                  className="flex items-center gap-2 glass-button data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                >
                  <Volume2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Speech</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="integrations" 
                  className="flex items-center gap-2 glass-button data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Integrations</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="commands" 
                  className="flex items-center gap-2 glass-button data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                >
                  <Terminal className="h-4 w-4" />
                  <span className="hidden sm:inline">Commands</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="sync" 
                  className="flex items-center gap-2 glass-button data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Sync</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="space-y-6">
              <TabsContent value="general" className="animate-fade-in">
                <GeneralSettings />
              </TabsContent>

              <TabsContent value="models" className="animate-fade-in">
                <ModelSettingsTab />
              </TabsContent>

              <TabsContent value="speech" className="animate-fade-in">
                <SpeechSettingsTab />
              </TabsContent>

              <TabsContent value="integrations" className="animate-fade-in">
                <IntegrationsTab />
              </TabsContent>

              <TabsContent value="commands" className="animate-fade-in">
                <CommandsTab />
              </TabsContent>

              <TabsContent value="sync" className="animate-fade-in">
                <SyncStatusTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;
