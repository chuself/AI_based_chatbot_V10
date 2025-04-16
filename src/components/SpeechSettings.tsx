
import React, { useEffect, useState } from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Volume2, VolumeX, Check, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface SpeechSettingsProps {
  className?: string;
}

const SpeechSettings: React.FC<SpeechSettingsProps> = ({ className }) => {
  const { 
    availableVoices, 
    selectVoice, 
    speak, 
    stop, 
    isSpeaking, 
    autoPlay, 
    toggleAutoPlay,
    rate,
    pitch,
    volume,
    updateRate,
    updatePitch,
    updateVolume
  } = useSpeech();
  
  const [testText, setTestText] = useState("Hello! This is a test of the text-to-speech system.");
  const [voiceFilter, setVoiceFilter] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
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
  
  const handleRefreshVoices = () => {
    // Force voice refresh
    window.speechSynthesis.getVoices();
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Group voices by language for better organization
  const groupedVoices = availableVoices.reduce((acc, voice) => {
    // Extract country code and language name
    const [langCode, countryCode] = voice.lang.split('-');
    const langName = new Intl.DisplayNames([navigator.language], {
      type: 'language'
    }).of(langCode) || langCode.toUpperCase();
    
    // Create a key that includes language name and country code
    const langKey = `${langName} (${countryCode || 'other'})`;
    
    if (!acc[langKey]) {
      acc[langKey] = [];
    }
    acc[langKey].push(voice);
    return acc;
  }, {} as Record<string, SpeechSynthesisVoice[]>);
  
  // Create a filtered view of voices based on search
  const filteredGroupedVoices: Record<string, SpeechSynthesisVoice[]> = Object.fromEntries(
    Object.entries(groupedVoices)
      .map(([lang, voices]) => {
        const filteredVoices = voices.filter(voice => 
          voice.name.toLowerCase().includes(voiceFilter.toLowerCase()) ||
          voice.lang.toLowerCase().includes(voiceFilter.toLowerCase())
        );
        return [lang, filteredVoices];
      })
      .filter(([_, voices]) => voices.length > 0)
  );
  
  // Count British female voices
  const britishFemaleVoices = availableVoices.filter(v => 
    v.lang.includes('en-GB') && 
    (v.name.toLowerCase().includes('female') || 
     // More patterns for likely female voices
     /^(amy|emma|joanna|salli|kimberly|kendra|joanna|ivy|hannah|ruth|victoria|queen|elizabeth|catherine|kate|sophie|emily|lily|charlotte)/i.test(v.name))
  );
  
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
        
        <Tabs defaultValue="voices" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="voices">Voice Selection</TabsTrigger>
            <TabsTrigger value="settings">Voice Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="voices" className="space-y-4 pt-4">
            <div className="flex items-center space-x-2">
              <Input 
                placeholder="Search voices..." 
                value={voiceFilter} 
                onChange={(e) => setVoiceFilter(e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleRefreshVoices}
                title="Refresh available voices"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {britishFemaleVoices.length > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  {britishFemaleVoices.length} British Female Voices Available
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  No British Female Voices Found
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {availableVoices.length} Total Voices
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="voice-select" className="font-medium">Voice</Label>
              <Select onValueChange={handleVoiceChange}>
                <SelectTrigger id="voice-select" className="w-full">
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(filteredGroupedVoices)
                    .sort(([langA], [langB]) => langA.localeCompare(langB))
                    .map(([lang, voices]) => (
                      <div key={`${lang}-${refreshTrigger}`}>
                        <div className="px-2 py-1.5 text-xs font-semibold bg-muted">{lang}</div>
                        {voices
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(voice => (
                            <SelectItem key={`${voice.name}-${refreshTrigger}`} value={voice.name}>
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
            
            <div className="space-y-2 pt-4">
              <Label htmlFor="test-text" className="font-medium">Test Text</Label>
              <Input
                id="test-text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to test voice"
                className="w-full"
              />
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
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="font-medium">Speaking Rate</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{rate.toFixed(1)}x</span>
                    <Input 
                      type="number" 
                      value={rate}
                      min={0.1}
                      max={3}
                      step={0.1}
                      onChange={(e) => updateRate(parseFloat(e.target.value) || 1)}
                      className="w-16 h-6 text-xs p-1"
                    />
                  </div>
                </div>
                <Slider 
                  value={[rate]} 
                  min={0.1} 
                  max={3} 
                  step={0.1} 
                  onValueChange={values => updateRate(values[0])} 
                />
                <p className="text-xs text-gray-400">
                  Slower values (0.1-0.8) for careful speaking, normal (1.0), faster (1.2-3.0) for quick reading
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="font-medium">Pitch</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{pitch.toFixed(1)}</span>
                    <Input 
                      type="number" 
                      value={pitch}
                      min={0.1}
                      max={2}
                      step={0.1}
                      onChange={(e) => updatePitch(parseFloat(e.target.value) || 1)}
                      className="w-16 h-6 text-xs p-1"
                    />
                  </div>
                </div>
                <Slider 
                  value={[pitch]} 
                  min={0.1} 
                  max={2} 
                  step={0.1} 
                  onValueChange={values => updatePitch(values[0])} 
                />
                <p className="text-xs text-gray-400">
                  Lower values (0.1-0.8) for deeper voices, normal (1.0), higher (1.2-2.0) for higher pitched voices
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="font-medium">Volume</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">{Math.round(volume * 100)}%</span>
                    <Input 
                      type="number" 
                      value={Math.round(volume * 100)}
                      min={0}
                      max={100}
                      step={5}
                      onChange={(e) => updateVolume(parseInt(e.target.value) / 100 || 1)}
                      className="w-16 h-6 text-xs p-1"
                    />
                  </div>
                </div>
                <Slider 
                  value={[volume]} 
                  min={0} 
                  max={1} 
                  step={0.05} 
                  onValueChange={values => updateVolume(values[0])} 
                />
                <p className="text-xs text-gray-400">
                  Adjust volume from silent (0%) to full volume (100%)
                </p>
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
                    Test Current Settings
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="text-xs text-gray-400 mt-2">
          <p>Individual messages can be played by hovering over them and clicking the speaker icon.</p>
          <p className="mt-1">Speech settings are saved automatically and apply to all voice playback.</p>
        </div>
      </div>
    </div>
  );
};

export default SpeechSettings;
