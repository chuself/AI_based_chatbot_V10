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
  
  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    this.loadVoices();
    
    // Handle the case where voices might load asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = this.loadVoices.bind(this);
    }
  }
  
  private loadVoices(): void {
    this.voices = this.speechSynthesis.getVoices();
    console.log("Available voices:", this.voices.length);
    
    // Try to select a high-quality voice
    if (this.voices.length > 0) {
      // Try to find one of our preferred voices
      for (const preferredVoice of DEFAULT_VOICES) {
        const found = this.voices.find(
          v => v.name.includes(preferredVoice.name) && v.lang.includes(preferredVoice.lang)
        );
        if (found) {
          this.preferredVoice = found;
          console.log("Selected preferred voice:", found.name);
          break;
        }
      }
      
      // Fallback to any English voice if preferred not found
      if (!this.preferredVoice) {
        this.preferredVoice = this.voices.find(v => v.lang.includes('en-')) || this.voices[0];
        console.log("Selected fallback voice:", this.preferredVoice.name);
      }
    }
  }
  
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
  
  public setPreferredVoice(voice: SpeechSynthesisVoice): void {
    this.preferredVoice = voice;
    localStorage.setItem('preferred-voice', voice.name);
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
        
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
        
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
