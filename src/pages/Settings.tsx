
import React, { useState } from "react";
import { 
  SettingsIcon,
  Cpu,
  Volume2, 
  Globe,
  RefreshCw
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SettingsHeader from "@/components/settings/SettingsHeader";
import GeneralSettings from "@/components/settings/GeneralSettings";
import ModelSettingsTab from "@/components/settings/ModelSettings";
import SpeechSettingsTab from "@/components/settings/SpeechSettingsTab";
import IntegrationsTab from "@/components/settings/IntegrationsTab";
import SyncStatusTab from "@/components/settings/SyncStatusTab";

const Settings = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-900 dark:to-indigo-900">
      <SettingsHeader />

      <div className="pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="glass-card grid w-full grid-cols-5 mb-8 p-1">
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
                value="sync" 
                className="flex items-center gap-2 glass-button data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Sync</span>
              </TabsTrigger>
            </TabsList>

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
