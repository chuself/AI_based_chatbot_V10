
import React from "react";
import SpeechSettingsComponent from "@/components/SpeechSettings";

const SpeechSettingsTab = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-xl font-medium">Speech Settings</h2>
        <p className="text-sm text-gray-400">
          Configure voice and speech recognition settings
        </p>
      </div>
      <SpeechSettingsComponent className="space-y-4 p-4 rounded-lg border border-white/10 bg-white/5 transition-all hover:bg-white/10 duration-200" />
    </div>
  );
};

export default SpeechSettingsTab;
