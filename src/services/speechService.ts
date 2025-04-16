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

// Play.ht API integration
interface PlayHTVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  provider: string;
  sampleUrl?: string;
}

// Speech source options
type SpeechSource = 'browser' | 'playht';

class SpeechService {
  private speechSynthesis: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private playhtVoices: PlayHTVoice[] = [];
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private preferredPlayHTVoice: PlayHTVoice | null = null;
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private rate: number = 1;
  private pitch: number = 1;
  private volume: number = 1;
  private speechSource: SpeechSource = 'browser';
  
  // PlayHT API credentials
  private playhtUserId: string = 'svsk9HGgmQT5QMVR2S1DTArxVV42';
  private playhtSecretKey: string = 'ak-5ec13b1af38540eb9815368f5c54b3b5';
  private isPlayHTAvailable: boolean = false;
  
  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    this.loadVoices();
    
    // Handle the case where voices might load asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = this.loadVoices.bind(this);
    }
    
    // Load saved speech preferences
    this.loadSavedPreferences();
    
    // Load PlayHT voices
    this.loadPlayHTVoices();
  }
  
  private async loadPlayHTVoices(): Promise<void> {
    try {
      const response = await fetch('https://api.play.ht/api/v2/voices', {
        method: 'GET',
        headers: {
          'AUTHORIZATION': this.playhtSecretKey,
          'X-USER-ID': this.playhtUserId,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('Failed to load PlayHT voices:', await response.text());
        return;
      }
      
      const data = await response.json();
      this.playhtVoices = data.voices || [];
      this.isPlayHTAvailable = true;
      
      // Load preferred PlayHT voice if one was saved
      const savedPlayHTVoiceId = localStorage.getItem('preferred-playht-voice');
      if (savedPlayHTVoiceId) {
        const savedVoice = this.playhtVoices.find(v => v.id === savedPlayHTVoiceId);
        if (savedVoice) {
          this.preferredPlayHTVoice = savedVoice;
        }
      } else if (this.playhtVoices.length > 0) {
        // Default to first English female voice if available
        const englishFemaleVoices = this.playhtVoices.filter(
          v => v.language.includes('English') && v.gender === 'female'
        );
        
        if (englishFemaleVoices.length > 0) {
          const britishVoices = englishFemaleVoices.filter(v => 
            v.language.includes('British') || v.name.toLowerCase().includes('british')
          );
          
          this.preferredPlayHTVoice = britishVoices.length > 0 ? 
            britishVoices[0] : englishFemaleVoices[0];
        } else {
          this.preferredPlayHTVoice = this.playhtVoices[0];
        }
      }
      
      console.log('PlayHT voices loaded:', this.playhtVoices.length);
      console.log('Selected PlayHT voice:', this.preferredPlayHTVoice?.name);
    } catch (error) {
      console.error('Error loading PlayHT voices:', error);
    }
  }
  
  private loadSavedPreferences(): void {
    // Load saved voice and speech source
    const savedVoiceName = localStorage.getItem('preferred-voice');
    const savedSpeechSource = localStorage.getItem('speech-source') as SpeechSource;
    
    // Load saved rate, pitch and volume
    const savedRate = localStorage.getItem('speech-rate');
    const savedPitch = localStorage.getItem('speech-pitch');
    const savedVolume = localStorage.getItem('speech-volume');
    
    if (savedRate) this.rate = parseFloat(savedRate);
    if (savedPitch) this.pitch = parseFloat(savedPitch);
    if (savedVolume) this.volume = parseFloat(savedVolume);
    if (savedSpeechSource) this.speechSource = savedSpeechSource;
    
    // Voice will be set in loadVoices when voices are available
    console.log("Loaded speech preferences:", {
      rate: this.rate,
      pitch: this.pitch,
      volume: this.volume,
      voiceName: savedVoiceName,
      speechSource: this.speechSource
    });
  }
  
  private loadVoices(): void {
    this.voices = this.speechSynthesis.getVoices();
    console.log("Available browser voices:", this.voices.length);
    
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
  
  public getAvailablePlayHTVoices(): PlayHTVoice[] {
    return this.playhtVoices;
  }
  
  public isPlayHTServiceAvailable(): boolean {
    return this.isPlayHTAvailable;
  }
  
  public getCurrentSettings(): SpeechOptions & { speechSource: SpeechSource } {
    return {
      rate: this.rate,
      pitch: this.pitch,
      volume: this.volume,
      speechSource: this.speechSource
    };
  }
  
  public setSpeechSource(source: SpeechSource): void {
    this.speechSource = source;
    localStorage.setItem('speech-source', source);
  }
  
  public setPreferredVoice(voice: SpeechSynthesisVoice): void {
    this.preferredVoice = voice;
    localStorage.setItem('preferred-voice', voice.name);
  }
  
  public setPreferredPlayHTVoice(voice: PlayHTVoice): void {
    this.preferredPlayHTVoice = voice;
    localStorage.setItem('preferred-playht-voice', voice.id);
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
  
  private async generatePlayHTSpeech(text: string): Promise<string> {
    if (!this.preferredPlayHTVoice) {
      throw new Error('No PlayHT voice selected');
    }
    
    try {
      const response = await fetch('https://api.play.ht/api/v2/tts', {
        method: 'POST',
        headers: {
          'AUTHORIZATION': this.playhtSecretKey,
          'X-USER-ID': this.playhtUserId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          voice: this.preferredPlayHTVoice.id,
          output_format: 'mp3',
          quality: 'premium',
          speed: this.rate,
          sample_rate: 24000
        })
      });
      
      if (!response.ok) {
        throw new Error(`PlayHT API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.url) {
        throw new Error('No audio URL returned from PlayHT API');
      }
      
      return data.url;
    } catch (error) {
      console.error('Error generating PlayHT speech:', error);
      throw error;
    }
  }
  
  public async speak(text: string, options: SpeechOptions = {}): Promise<void> {
    // Cancel any ongoing speech
    this.stop();
    
    return new Promise(async (resolve) => {
      if (!text || text.trim() === '') {
        resolve();
        return;
      }
      
      // Use PlayHT if selected
      if (this.speechSource === 'playht' && this.isPlayHTAvailable) {
        try {
          this.isSpeaking = true;
          
          // Break text into smaller chunks if it's very long
          const chunks = this.splitIntoSentences(text);
          let audioUrls: string[] = [];
          
          for (const chunk of chunks) {
            if (chunk.trim() === '') continue;
            const audioUrl = await this.generatePlayHTSpeech(chunk);
            audioUrls.push(audioUrl);
          }
          
          // Play each audio file sequentially
          let currentIndex = 0;
          const audioElement = new Audio();
          
          audioElement.onended = () => {
            currentIndex++;
            if (currentIndex < audioUrls.length) {
              audioElement.src = audioUrls[currentIndex];
              audioElement.play().catch(err => console.error('Error playing audio:', err));
            } else {
              this.isSpeaking = false;
              resolve();
            }
          };
          
          audioElement.onerror = () => {
            console.error('Error playing audio');
            this.isSpeaking = false;
            resolve();
          };
          
          // Set volume
          audioElement.volume = options.volume !== undefined ? options.volume : this.volume;
          
          // Start playing the first chunk
          if (audioUrls.length > 0) {
            audioElement.src = audioUrls[0];
            audioElement.play().catch(err => {
              console.error('Error playing audio:', err);
              this.isSpeaking = false;
              resolve();
            });
          } else {
            this.isSpeaking = false;
            resolve();
          }
        } catch (error) {
          console.error('PlayHT speech error:', error);
          this.isSpeaking = false;
          resolve();
          
          // Fallback to browser speech if PlayHT fails
          this.useBrowserSpeech(text, options, resolve);
        }
      } else {
        // Use browser speech synthesis
        this.useBrowserSpeech(text, options, resolve);
      }
    });
  }
  
  private useBrowserSpeech(text: string, options: SpeechOptions, resolve: () => void): void {
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
  }
  
  public stop(): void {
    // Stop browser speech synthesis
    this.speechSynthesis.cancel();
    
    // Stop any playing audio elements (for PlayHT)
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause();
      audio.remove();
    });
    
    this.isSpeaking = false;
    this.currentUtterance = null;
  }
  
  public isCurrentlySpeaking(): boolean {
    return this.isSpeaking;
  }
  
  private splitIntoSentences(text: string): string[] {
    // Split by sentence ending punctuation, keeping the punctuation
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    // If text is very long, further split it into chunks
    const result: string[] = [];
    for (const sentence of sentences) {
      if (sentence.length > 200) {
        // Split at commas or other natural pauses
        const parts = sentence.split(/(?<=,|\(|\)|-|;|:)\s+/);
        result.push(...parts);
      } else {
        result.push(sentence);
      }
    }
    
    return result;
  }
}

// Expose PlayHTVoice interface for use in other components
export interface PlayHTVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  provider: string;
  sampleUrl?: string;
}

export type SpeechSource = 'browser' | 'playht';

// Singleton instance
const speechService = new SpeechService();
export default speechService;
