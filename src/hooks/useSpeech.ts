
import { useState, useEffect } from 'react';
import speechService, { PlayHTVoice, SpeechSource } from '@/services/speechService';

export const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(() => {
    const saved = localStorage.getItem('speech-autoplay');
    return saved ? saved === 'true' : false;
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [availablePlayHTVoices, setAvailablePlayHTVoices] = useState<PlayHTVoice[]>([]);
  const [speechSource, setSpeechSource] = useState<SpeechSource>(
    speechService.getCurrentSettings().speechSource || 'browser'
  );
  
  const [rate, setRate] = useState(speechService.getCurrentSettings().rate || 1);
  const [pitch, setPitch] = useState(speechService.getCurrentSettings().pitch || 1);
  const [volume, setVolume] = useState(speechService.getCurrentSettings().volume || 1);
  const [isPlayHTAvailable, setIsPlayHTAvailable] = useState(false);
  
  useEffect(() => {
    // Initial load of voices
    const loadVoices = () => {
      setAvailableVoices(speechService.getAvailableVoices());
      setAvailablePlayHTVoices(speechService.getAvailablePlayHTVoices());
      setIsPlayHTAvailable(speechService.isPlayHTServiceAvailable());
    };
    
    loadVoices();
    
    // Listen for voice changes
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Poll for PlayHT voices to become available
    const playhtInterval = setInterval(() => {
      const playhtVoices = speechService.getAvailablePlayHTVoices();
      if (playhtVoices.length > 0) {
        setAvailablePlayHTVoices(playhtVoices);
        setIsPlayHTAvailable(true);
        clearInterval(playhtInterval);
      }
    }, 2000);
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      clearInterval(playhtInterval);
    };
  }, []);
  
  // Update localStorage when autoPlay changes
  useEffect(() => {
    localStorage.setItem('speech-autoplay', autoPlay.toString());
  }, [autoPlay]);
  
  // Update the speech service when settings change
  useEffect(() => {
    speechService.setSpeechRate(rate);
  }, [rate]);
  
  useEffect(() => {
    speechService.setSpeechPitch(pitch);
  }, [pitch]);
  
  useEffect(() => {
    speechService.setSpeechVolume(volume);
  }, [volume]);
  
  useEffect(() => {
    speechService.setSpeechSource(speechSource);
  }, [speechSource]);
  
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
  
  const selectPlayHTVoice = (voice: PlayHTVoice) => {
    speechService.setPreferredPlayHTVoice(voice);
  };
  
  const updateRate = (newRate: number) => {
    setRate(newRate);
  };
  
  const updatePitch = (newPitch: number) => {
    setPitch(newPitch);
  };
  
  const updateVolume = (newVolume: number) => {
    setVolume(newVolume);
  };
  
  const updateSpeechSource = (source: SpeechSource) => {
    setSpeechSource(source);
  };
  
  return {
    speak,
    stop,
    isSpeaking,
    autoPlay,
    toggleAutoPlay,
    availableVoices,
    availablePlayHTVoices,
    selectVoice,
    selectPlayHTVoice,
    rate,
    pitch,
    volume,
    updateRate,
    updatePitch,
    updateVolume,
    speechSource,
    updateSpeechSource,
    isPlayHTAvailable
  };
};
