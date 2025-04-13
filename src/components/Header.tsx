
import React from "react";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderProps {
  modelName?: string;
}

const Header: React.FC<HeaderProps> = ({ modelName }) => {
  // Extract just the model name without the path
  const displayModelName = modelName 
    ? modelName.split("/").pop() 
    : "Loading model...";

  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-black/10 backdrop-blur-lg border-b border-white/10">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <img 
            src="https://seeklogo.com/images/G/google-gemini-logo-F4B15CF417-seeklogo.com.png" 
            alt="Gemini Logo" 
            className="h-5 w-5 mr-2"
          />
          <h1 className="text-lg font-semibold">Gemini Chat</h1>
        </div>
        
        <div className="flex items-center">
          <div className="text-xs text-gray-300 px-3 py-1 rounded-full bg-gray-800 mr-2">
            {displayModelName}
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/settings">
                <Button variant="ghost" size="icon" className="ml-1">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};

export default Header;
