
import React, { useState } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Volume2, VolumeX, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface SpeechSettingsProps {
  className?: string;
}

const SpeechSettings: React.FC<SpeechSettingsProps> = ({ className }) => {
  const { availableVoices, selectVoice, speak, stop, isSpeaking, autoPlay, toggleAutoPlay } = useSpeech();
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [testText, setTestText] = useState("Hello! This is a test of the text-to-speech system.");
  
  const handleVoiceChange = (voiceName: string) => {
    const voice = availableVoices.find(v => v.name === voiceName);
    if (voice) {
      selectVoice(voice);
    }
  };
  
  const handleTestVoice = () => {
    if (isSpeaking) {
      stop();
      return;
    }
    
    speak(testText);
  };
  
  // Group voices by language for better organization
  const groupedVoices = availableVoices.reduce((acc, voice) => {
    const lang = voice.lang.split('-')[0].toUpperCase();
    if (!acc[lang]) {
      acc[lang] = [];
    }
    acc[lang].push(voice);
    return acc;
  }, {} as Record<string, SpeechSynthesisVoice[]>);
  
  return (
    <div className={className}>
      <div className="space-y-1 mb-4">
        <h2 className="text-lg font-medium">Text to Speech</h2>
        <p className="text-sm text-gray-400">
          Configure how AI responses are spoken aloud
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4 text-gray-500" />
            <Label htmlFor="auto-speak" className="font-medium">Auto-speak responses</Label>
          </div>
          <Switch 
            id="auto-speak" 
            checked={autoPlay} 
            onCheckedChange={toggleAutoPlay}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="voice-select" className="font-medium">Voice</Label>
          <Select onValueChange={handleVoiceChange}>
            <SelectTrigger id="voice-select" className="w-full">
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedVoices)
                .sort(([langA], [langB]) => langA.localeCompare(langB))
                .map(([lang, voices]) => (
                  <div key={lang}>
                    <div className="px-2 py-1.5 text-xs font-semibold bg-muted">{lang}</div>
                    {voices
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(voice => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name}
                        </SelectItem>
                      ))
                    }
                  </div>
                ))
              }
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-medium">Speaking Rate</Label>
              <span className="text-xs text-gray-500">{rate.toFixed(1)}x</span>
            </div>
            <Slider 
              value={[rate]} 
              min={0.5} 
              max={2} 
              step={0.1} 
              onValueChange={values => setRate(values[0])} 
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-medium">Pitch</Label>
              <span className="text-xs text-gray-500">{pitch.toFixed(1)}</span>
            </div>
            <Slider 
              value={[pitch]} 
              min={0.5} 
              max={2} 
              step={0.1} 
              onValueChange={values => setPitch(values[0])} 
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-medium">Volume</Label>
              <span className="text-xs text-gray-500">{Math.round(volume * 100)}%</span>
            </div>
            <Slider 
              value={[volume]} 
              min={0} 
              max={1} 
              step={0.05} 
              onValueChange={values => setVolume(values[0])} 
            />
          </div>
        </div>
        
        <div className="pt-2">
          <Button 
            onClick={handleTestVoice} 
            className="w-full flex items-center justify-center"
            variant={isSpeaking ? "destructive" : "default"}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="mr-2 h-4 w-4" />
                Stop Test
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-4 w-4" />
                Test Voice
              </>
            )}
          </Button>
        </div>
        
        <div className="text-xs text-gray-400 mt-2">
          <p>Individual messages can be played by hovering over them and clicking the speaker icon.</p>
        </div>
      </div>
    </div>
  );
};

export default SpeechSettings;
