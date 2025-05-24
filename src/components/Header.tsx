
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Menu, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MemorySearch from "@/components/MemorySearch";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  modelName?: string;
}

const Header: React.FC<HeaderProps> = ({ modelName = "AI Assistant" }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isMemorySearchOpen, setIsMemorySearchOpen] = useState(false);

  const handleSettingsClick = () => {
    navigate("/settings");
  };

  const handleMemorySearchClick = () => {
    setIsMemorySearchOpen(true);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-gray-800 leading-tight">
                Chuself AI
              </h1>
              <span className="text-xs text-gray-500 leading-tight">
                {modelName}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMemorySearchClick}
              className="h-9 w-9"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSettingsClick}
              className="h-9 w-9"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <MemorySearch 
        isOpen={isMemorySearchOpen} 
        onClose={() => setIsMemorySearchOpen(false)} 
      />
    </>
  );
};

export default Header;
