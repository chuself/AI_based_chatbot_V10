
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
    <div className="fixed top-0 left-0 right-0 z-10 bg-black/10 backdrop-blur-lg border-b border-white/10">
      <div className="flex items-center p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleGoBack} 
          className="mr-2 transition-all hover:scale-105 duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
    </div>
  );
};

export default SettingsHeader;
