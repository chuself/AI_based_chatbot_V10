
import React, { useState } from "react";
import { 
  SettingsIcon,
  Cpu,
  Volume2, 
  Globe,
  RefreshCw
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemorySearch from "@/components/MemorySearch";
import SettingsHeader from "@/components/settings/SettingsHeader";
import GeneralSettings from "@/components/settings/GeneralSettings";
import ModelSettingsTab from "@/components/settings/ModelSettings";
import SpeechSettingsTab from "@/components/settings/SpeechSettingsTab";
import IntegrationsTab from "@/components/settings/IntegrationsTab";
import SyncStatusTab from "@/components/settings/SyncStatusTab";

const Settings = () => {
  const [isMemorySearchOpen, setIsMemorySearchOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-b from-pink-50 via-purple-50 to-indigo-50">
      <SettingsHeader />

      <div className="flex-1 pt-20 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                <span className="hidden sm:inline">Models</span>
              </TabsTrigger>
              <TabsTrigger value="speech" className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span className="hidden sm:inline">Speech</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Integrations</span>
              </TabsTrigger>
              <TabsTrigger value="sync" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Sync</span>
              </TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
              <TabsContent value="general">
                <GeneralSettings />
              </TabsContent>

              <TabsContent value="models">
                <ModelSettingsTab />
              </TabsContent>

              <TabsContent value="speech">
                <SpeechSettingsTab />
              </TabsContent>

              <TabsContent value="integrations">
                <IntegrationsTab />
              </TabsContent>

              <TabsContent value="sync">
                <SyncStatusTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {isMemorySearchOpen && (
        <MemorySearch onClose={() => setIsMemorySearchOpen(false)} />
      )}
    </div>
  );
};

export default Settings;
