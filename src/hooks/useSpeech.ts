
import { useState, useEffect, useCallback } from 'react';

export const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [autoPlay, setAutoPlay] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  // Check if speech synthesis is supported
  const isVoiceSupported = 'speechSynthesis' in window;

  // Load voices
  useEffect(() => {
    if (!isVoiceSupported) return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Set default voice if none selected
      if (!selectedVoice && voices.length > 0) {
        const englishVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        setSelectedVoice(englishVoice);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [isVoiceSupported, selectedVoice]);

  // Load settings from localStorage
  useEffect(() => {
    const settings = localStorage.getItem('speech-settings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        setAutoPlay(parsed.autoPlay || false);
        setRate(parsed.rate || 1);
        setPitch(parsed.pitch || 1);
        setVolume(parsed.volume || 1);
        
        if (parsed.selectedVoiceIndex && availableVoices.length > 0) {
          setSelectedVoice(availableVoices[parsed.selectedVoiceIndex]);
        }
      } catch (error) {
        console.error('Error loading speech settings:', error);
      }
    }
  }, [availableVoices]);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    const settings = {
      autoPlay,
      rate,
      pitch,
      volume,
      selectedVoiceIndex: selectedVoice ? availableVoices.indexOf(selectedVoice) : -1
    };
    localStorage.setItem('speech-settings', JSON.stringify(settings));
  }, [autoPlay, rate, pitch, volume, selectedVoice, availableVoices]);

  // Speak function
  const speak = useCallback(async (text: string) => {
    if (!isVoiceSupported || !text.trim()) {
      console.warn('Speech synthesis not supported or empty text');
      return;
    }

    // Stop any current speech
    speechSynthesis.cancel();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
      };

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error during speech synthesis:', error);
      setIsSpeaking(false);
    }
  }, [isVoiceSupported, selectedVoice, rate, pitch, volume]);

  // Stop function
  const stop = useCallback(() => {
    if (isVoiceSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isVoiceSupported]);

  // Toggle auto play
  const toggleAutoPlay = useCallback(() => {
    setAutoPlay(prev => !prev);
  }, []);

  // Update voice
  const updateVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
  }, []);

  // Update rate
  const updateRate = useCallback((newRate: number) => {
    setRate(newRate);
  }, []);

  // Update pitch
  const updatePitch = useCallback((newPitch: number) => {
    setPitch(newPitch);
  }, []);

  // Update volume
  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
  }, []);

  // Save settings when they change
  useEffect(() => {
    saveSettings();
  }, [saveSettings]);

  return {
    speak,
    stop,
    isSpeaking,
    isVoiceSupported,
    autoPlay,
    toggleAutoPlay,
    availableVoices,
    selectedVoice,
    updateVoice,
    rate,
    updateRate,
    pitch,
    updatePitch,
    volume,
    updateVolume,
    isPlayHTAvailable: false // Placeholder for future PlayHT integration
  };
};
