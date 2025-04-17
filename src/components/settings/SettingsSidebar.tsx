
import React from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

type Tab = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

interface SettingsSidebarProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (tabId: string) => void;
}

const SettingsSidebar = ({
  tabs,
  activeTab,
  setActiveTab
}: SettingsSidebarProps) => {
  return (
    <div className="h-full">
      <Sidebar 
        variant="floating" 
        collapsible="icon" 
        className="pt-2 h-full px-0 mx-[2px] my-[65px]"
      >
        <SidebarContent className="py-[57px]">
          <SidebarMenu>
            {tabs.map(tab => (
              <SidebarMenuItem key={tab.id}>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <SidebarMenuButton 
                      isActive={activeTab === tab.id} 
                      tooltip={tab.label} 
                      onClick={() => setActiveTab(tab.id)} 
                      className={`
                        relative rounded-xl transition-all duration-300 
                        ${activeTab === tab.id 
                          ? 'bg-gradient-to-r from-gemini-primary/20 to-gemini-secondary/20 text-gemini-primary shadow-sm' 
                          : 'hover:bg-gemini-light/30 hover:scale-105'}
                      `}
                    >
                      <div className={`
                        flex items-center justify-center 
                        ${activeTab === tab.id ? 'text-gemini-primary' : 'text-gemini-dark/70'}
                      `}>
                        {tab.icon}
                      </div>
                      <span className="font-medium">{tab.label}</span>
                      {activeTab === tab.id && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-[60%] bg-gemini-primary rounded-r-md" />
                      )}
                    </SidebarMenuButton>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" className="w-52 bg-white/90 backdrop-blur-sm border border-gemini-primary/10 shadow-lg animate-in slide-in-from-right-5 duration-300">
                    <p className="text-sm font-medium text-gemini-primary">{tab.label} Settings</p>
                    <p className="text-xs text-muted-foreground">
                      {tab.id === "general" && "Configure general app settings"}
                      {tab.id === "models" && "Configure AI models and providers"}
                      {tab.id === "speech" && "Configure text-to-speech settings"}
                      {tab.id === "integrations" && "Connect external services"}
                    </p>
                  </HoverCardContent>
                </HoverCard>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
    </div>
  );
};

export default SettingsSidebar;
