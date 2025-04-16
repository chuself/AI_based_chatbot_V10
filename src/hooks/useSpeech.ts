
import { useState, useEffect } from 'react';
import speechService from '@/services/speechService';

export const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(() => {
    const saved = localStorage.getItem('speech-autoplay');
    return saved ? saved === 'true' : false;
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  useEffect(() => {
    // Initial load of voices
    const loadVoices = () => {
      setAvailableVoices(speechService.getAvailableVoices());
    };
    
    loadVoices();
    
    // Listen for voice changes
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);
  
  // Update localStorage when autoPlay changes
  useEffect(() => {
    localStorage.setItem('speech-autoplay', autoPlay.toString());
  }, [autoPlay]);
  
  const speak = async (text: string) => {
    setIsSpeaking(true);
    try {
      await speechService.speak(text);
    } finally {
      setIsSpeaking(false);
    }
  };
  
  const stop = () => {
    speechService.stop();
    setIsSpeaking(false);
  };
  
  const toggleAutoPlay = () => {
    setAutoPlay(prev => !prev);
  };
  
  const selectVoice = (voice: SpeechSynthesisVoice) => {
    speechService.setPreferredVoice(voice);
  };
  
  return {
    speak,
    stop,
    isSpeaking,
    autoPlay,
    toggleAutoPlay,
    availableVoices,
    selectVoice
  };
};
