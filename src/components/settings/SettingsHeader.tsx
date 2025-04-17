
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
    <div className="fixed top-0 left-0 right-0 z-10 bg-white/60 backdrop-blur-lg border-b border-white/20 shadow-sm">
      <div className="flex items-center p-4 max-w-screen-2xl mx-auto">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleGoBack} 
          className="mr-4 transition-all hover:scale-105 hover:bg-gemini-primary/10 duration-200"
        >
          <ArrowLeft className="h-5 w-5 text-gemini-primary" />
        </Button>
        <h1 className="text-xl font-medium bg-gradient-to-r from-gemini-primary to-gemini-secondary bg-clip-text text-transparent">Settings</h1>
      </div>
    </div>
  );
};

export default SettingsHeader;
