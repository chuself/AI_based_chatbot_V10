
// Default voices available in most browsers
const DEFAULT_VOICES = [
  { name: "Daniel", lang: "en-GB" },
  { name: "Karen", lang: "en-AU" },
  { name: "Samantha", lang: "en-US" },
  { name: "Alex", lang: "en-US" }
];

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

class SpeechService {
  private speechSynthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private rate: number = 1;
  private pitch: number = 1;
  private volume: number = 1;
  
  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    this.loadVoices();
    
    // Handle the case where voices might load asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = this.loadVoices.bind(this);
    }
    
    // Load saved speech preferences
    this.loadSavedPreferences();
  }
  
  private loadSavedPreferences(): void {
    // Load saved voice
    const savedVoiceName = localStorage.getItem('preferred-voice');
    
    // Load saved rate, pitch and volume
    const savedRate = localStorage.getItem('speech-rate');
    const savedPitch = localStorage.getItem('speech-pitch');
    const savedVolume = localStorage.getItem('speech-volume');
    
    if (savedRate) this.rate = parseFloat(savedRate);
    if (savedPitch) this.pitch = parseFloat(savedPitch);
    if (savedVolume) this.volume = parseFloat(savedVolume);
    
    // Voice will be set in loadVoices when voices are available
    console.log("Loaded speech preferences:", {
      rate: this.rate,
      pitch: this.pitch,
      volume: this.volume,
      voiceName: savedVoiceName
    });
  }
  
  private loadVoices(): void {
    this.voices = this.speechSynthesis.getVoices();
    console.log("Available voices:", this.voices.length);
    
    // Try to load previously selected voice
    const savedVoiceName = localStorage.getItem('preferred-voice');
    
    if (savedVoiceName && this.voices.length > 0) {
      const savedVoice = this.voices.find(v => v.name === savedVoiceName);
      if (savedVoice) {
        this.preferredVoice = savedVoice;
        console.log("Loaded saved voice:", savedVoice.name);
        return;
      }
    }
    
    // If no saved voice or saved voice not found, select default
    if (this.voices.length > 0) {
      // First try to find British female voices specifically
      const britishFemaleVoices = this.voices.filter(
        v => v.lang.includes('en-GB') && 
             // Common female voice patterns
             (v.name.includes('Female') || 
              v.name.includes('woman') || 
              v.name.includes('girl') ||
              /^(Amy|Emma|Joanna|Salli|Kimberly|Kendra|Joanna|Ivy|Hannah|Ruth|Victoria|Queen|Elizabeth|Catherine|Kate|Sophie|Emily|Lily|Charlotte)/.test(v.name))
      );
      
      if (britishFemaleVoices.length > 0) {
        this.preferredVoice = britishFemaleVoices[0];
        console.log("Selected British female voice:", this.preferredVoice.name);
        return;
      }
      
      // Try to find one of our preferred voices
      for (const preferredVoice of DEFAULT_VOICES) {
        const found = this.voices.find(
          v => v.name.includes(preferredVoice.name) && v.lang.includes(preferredVoice.lang)
        );
        if (found) {
          this.preferredVoice = found;
          console.log("Selected preferred voice:", found.name);
          return;
        }
      }
      
      // Fallback to any English voice
      this.preferredVoice = this.voices.find(v => v.lang.includes('en-')) || this.voices[0];
      console.log("Selected fallback voice:", this.preferredVoice.name);
    }
  }
  
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
  
  public getCurrentSettings(): SpeechOptions {
    return {
      rate: this.rate,
      pitch: this.pitch,
      volume: this.volume
    };
  }
  
  public setPreferredVoice(voice: SpeechSynthesisVoice): void {
    this.preferredVoice = voice;
    localStorage.setItem('preferred-voice', voice.name);
  }
  
  public setSpeechRate(rate: number): void {
    this.rate = rate;
    localStorage.setItem('speech-rate', rate.toString());
  }
  
  public setSpeechPitch(pitch: number): void {
    this.pitch = pitch;
    localStorage.setItem('speech-pitch', pitch.toString());
  }
  
  public setSpeechVolume(volume: number): void {
    this.volume = volume;
    localStorage.setItem('speech-volume', volume.toString());
  }
  
  public async speak(text: string, options: SpeechOptions = {}): Promise<void> {
    // Cancel any ongoing speech
    this.stop();
    
    return new Promise((resolve) => {
      if (!text || text.trim() === '') {
        resolve();
        return;
      }
      
      // Break text into sentences for more natural pauses
      const sentences = this.splitIntoSentences(text);
      let currentIndex = 0;
      
      const speakNextSentence = () => {
        if (currentIndex >= sentences.length) {
          this.isSpeaking = false;
          resolve();
          return;
        }
        
        const sentence = sentences[currentIndex];
        currentIndex++;
        
        if (sentence.trim() === '') {
          speakNextSentence();
          return;
        }
        
        const utterance = new SpeechSynthesisUtterance(sentence);
        
        // Set voice and options
        if (this.preferredVoice) {
          utterance.voice = this.preferredVoice;
        }
        
        // Use provided options or defaults from service
        utterance.rate = options.rate !== undefined ? options.rate : this.rate;
        utterance.pitch = options.pitch !== undefined ? options.pitch : this.pitch;
        utterance.volume = options.volume !== undefined ? options.volume : this.volume;
        
        utterance.onend = () => {
          // Small delay between sentences for more natural speech
          setTimeout(speakNextSentence, 100);
        };
        
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          this.isSpeaking = false;
          resolve();
        };
        
        this.currentUtterance = utterance;
        this.isSpeaking = true;
        this.speechSynthesis.speak(utterance);
      };
      
      speakNextSentence();
    });
  }
  
  public stop(): void {
    this.speechSynthesis.cancel();
    this.isSpeaking = false;
    this.currentUtterance = null;
  }
  
  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
  
  private splitIntoSentences(text: string): string[] {
    // Split by sentence ending punctuation, keeping the punctuation
    return text.split(/(?<=[.!?])\s+/);
  }
}

// Singleton instance
const speechService = new SpeechService();
export default speechService;
