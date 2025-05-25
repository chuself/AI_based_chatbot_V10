
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SettingsHeader = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate("/");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="flex items-center p-4 max-w-6xl mx-auto">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleGoBack} 
          className="mr-4 glass-button hover:bg-primary/20 transition-all duration-200"
        >
          <ArrowLeft className="h-5 w-5 text-primary" />
        </Button>
        <h1 className="text-2xl font-semibold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
          Settings
        </h1>
      </div>
    </div>
  );
};

export default SettingsHeader;
