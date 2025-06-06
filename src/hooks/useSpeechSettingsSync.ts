
import { useEffect, useCallback, useState } from 'react';
import { SyncService } from '@/services/syncService';

interface SpeechSettingsData {
  selectedVoice?: string;
  selectedPlayHTVoice?: string;
  autoPlay?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
  speechSource?: 'browser' | 'playht';
  playhtApiKey?: string;
  playhtUserId?: string;
}

export const useSpeechSettingsSync = () => {
  const [settings, setSettings] = useState<SpeechSettingsData>({
    autoPlay: false,
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    speechSource: 'browser'
  });
  
  // Load settings on mount
  useEffect(() => {
    const loadedSettings = getSpeechSettings();
    setSettings(loadedSettings);
    
    // Add storage event listener for cross-component updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'speech-settings') {
        const updatedSettings = getSpeechSettings();
        setSettings(updatedSettings);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const saveSpeechSettings = useCallback((newSettings: Partial<SpeechSettingsData>) => {
    try {
      // Get current speech settings
      const currentSettings = getSpeechSettings();
      
      // Merge with new settings
      const updatedSettings = {
        ...currentSettings,
        ...newSettings
      };
      
      // Save to localStorage
      localStorage.setItem('speech-settings', JSON.stringify(updatedSettings));
      
      // Update local state
      setSettings(updatedSettings);
      
      // Update sync service with speech settings only
      const userData = { speechSettings: updatedSettings };
      SyncService.saveCloudData(userData);
      
      // Trigger storage event for other components
      window.dispatchEvent(new Event('storage'));
      
      console.log('Speech settings saved:', updatedSettings);
    } catch (error) {
      console.error('Error saving speech settings:', error);
    }
  }, []);

  const getSpeechSettings = useCallback((): SpeechSettingsData => {
    try {
      const stored = localStorage.getItem('speech-settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading speech settings:', error);
    }
    
    // Return default settings
    return {
      autoPlay: false,
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      speechSource: 'browser'
    };
  }, []);

  const updateVoiceSelection = useCallback((voiceName: string) => {
    saveSpeechSettings({ selectedVoice: voiceName });
  }, [saveSpeechSettings]);

  const updatePlayHTVoiceSelection = useCallback((voiceId: string) => {
    saveSpeechSettings({ selectedPlayHTVoice: voiceId });
  }, [saveSpeechSettings]);

  const updateAutoPlay = useCallback((enabled: boolean) => {
    saveSpeechSettings({ autoPlay: enabled });
  }, [saveSpeechSettings]);

  const updateSpeechRate = useCallback((rate: number) => {
    saveSpeechSettings({ rate });
  }, [saveSpeechSettings]);

  const updateSpeechPitch = useCallback((pitch: number) => {
    saveSpeechSettings({ pitch });
  }, [saveSpeechSettings]);

  const updateSpeechVolume = useCallback((volume: number) => {
    saveSpeechSettings({ volume });
  }, [saveSpeechSettings]);

  const updateSpeechSource = useCallback((source: 'browser' | 'playht') => {
    saveSpeechSettings({ speechSource: source });
  }, [saveSpeechSettings]);

  const updatePlayHTCredentials = useCallback((apiKey: string, userId: string) => {
    saveSpeechSettings({ playhtApiKey: apiKey, playhtUserId: userId });
  }, [saveSpeechSettings]);

  return {
    settings,
    saveSpeechSettings,
    getSpeechSettings,
    updateVoiceSelection,
    updatePlayHTVoiceSelection,
    updateAutoPlay,
    updateSpeechRate,
    updateSpeechPitch,
    updateSpeechVolume,
    updateSpeechSource,
    updatePlayHTCredentials
  };
};
