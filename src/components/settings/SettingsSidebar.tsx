
import React from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

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

const SettingsSidebar = ({ tabs, activeTab, setActiveTab }: SettingsSidebarProps) => {
  return (
    <div className="h-full">
      <Sidebar variant="floating" collapsible="icon" className="pt-2 h-full">
        <SidebarContent>
          <SidebarMenu>
            {tabs.map((tab) => (
              <SidebarMenuItem key={tab.id}>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <SidebarMenuButton 
                      isActive={activeTab === tab.id}
                      tooltip={tab.label}
                      onClick={() => setActiveTab(tab.id)}
                      className="transition-all duration-200 hover:scale-105"
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </SidebarMenuButton>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" className="w-52">
                    <p className="text-sm font-medium">{tab.label} Settings</p>
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
