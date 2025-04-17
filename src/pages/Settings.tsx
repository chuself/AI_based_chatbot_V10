
import React, { useState } from "react";
import { 
  SettingsIcon,
  Cpu,
  Volume2, 
  Globe
} from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import MemorySearch from "@/components/MemorySearch";
import SettingsHeader from "@/components/settings/SettingsHeader";
import SettingsSidebar from "@/components/settings/SettingsSidebar";
import GeneralSettings from "@/components/settings/GeneralSettings";
import ModelSettingsTab from "@/components/settings/ModelSettings";
import SpeechSettingsTab from "@/components/settings/SpeechSettingsTab";
import IntegrationsTab from "@/components/settings/IntegrationsTab";

const Settings = () => {
  const [isMemorySearchOpen, setIsMemorySearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General", icon: <SettingsIcon className="h-5 w-5" /> },
    { id: "models", label: "Models", icon: <Cpu className="h-5 w-5" /> },
    { id: "speech", label: "Speech", icon: <Volume2 className="h-5 w-5" /> },
    { id: "integrations", label: "Integrations", icon: <Globe className="h-5 w-5" /> }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "general":
        return <GeneralSettings />;
      case "models":
        return <ModelSettingsTab />;
      case "speech":
        return <SpeechSettingsTab />;
      case "integrations":
        return <IntegrationsTab />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen w-full bg-gradient-to-b from-pink-50 via-purple-50 to-indigo-50">
        <SettingsHeader />

        <div className="flex flex-1 pt-28 overflow-hidden"> {/* Increased top padding to move content down */}
          <SettingsSidebar tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

          <div className="flex-1 overflow-y-auto px-6 pb-16 pt-4">
            <div className="max-w-2xl mx-auto animate-in fade-in-50 duration-500 slide-in-from-bottom-5">
              {renderTabContent()}
            </div>
          </div>
        </div>

        <Sheet open={isMemorySearchOpen} onOpenChange={setIsMemorySearchOpen}>
          <SheetContent className="w-[400px] sm:w-[540px] p-4">
            <SheetHeader>
              <SheetTitle>Search Memories</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <MemorySearch />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
