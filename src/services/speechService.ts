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
export interface PlayHTVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  provider: string;
  sampleUrl?: string;
}

// Speech source options
export type SpeechSource = 'browser' | 'playht';

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
    // Advanced text preprocessing for more natural speech
    text = this.preprocessText(text);
    
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
      
      // Add SSML-like markup for emphasis (will be ignored by browsers that don't support it)
      const enhancedSentence = this.enhanceSentence(sentence);
      
      const utterance = new SpeechSynthesisUtterance(enhancedSentence);
      
      // Set voice and options
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }
      
      // Use provided options or defaults from service with humanization adjustments
      utterance.rate = options.rate !== undefined ? this.humanizeRate(options.rate) : this.humanizeRate(this.rate);
      utterance.pitch = options.pitch !== undefined ? this.humanizePitch(options.pitch) : this.humanizePitch(this.pitch);
      utterance.volume = options.volume !== undefined ? options.volume : this.volume;
      
      // Add slight randomness to rate and pitch for more natural speech
      utterance.rate += (Math.random() * 0.1) - 0.05; // +/- 0.05 variation
      utterance.pitch += (Math.random() * 0.1) - 0.05; // +/- 0.05 variation
      
      utterance.onend = () => {
        // Dynamic pause between sentences based on punctuation
        const pauseTime = this.getPauseTime(sentence);
        setTimeout(speakNextSentence, pauseTime);
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
  
  // Enhanced text preprocessing for more natural speech
  private preprocessText(text: string): string {
    // Replace common abbreviations with expanded forms
    text = text.replace(/Dr\./g, 'Doctor ');
    text = text.replace(/Mr\./g, 'Mister ');
    text = text.replace(/Mrs\./g, 'Misses ');
    text = text.replace(/Ms\./g, 'Miss ');
    text = text.replace(/Prof\./g, 'Professor ');
    text = text.replace(/Inc\./g, 'Incorporated ');
    text = text.replace(/Corp\./g, 'Corporation ');
    text = text.replace(/Dept\./g, 'Department ');
    text = text.replace(/St\./g, 'Street ');
    text = text.replace(/Rd\./g, 'Road ');
    text = text.replace(/Ave\./g, 'Avenue ');
    
    // Add spaces after punctuation if missing
    text = text.replace(/([.!?])([A-Z])/g, '$1 $2');
    
    // Ensure proper spacing around punctuation
    text = text.replace(/\s+([.,;:!?])/g, '$1');
    
    // Convert numbers to words for better pronunciation
    text = this.convertNumbersToWords(text);
    
    return text;
  }
  
  // Convert numbers to words for better pronunciation
  private convertNumbersToWords(text: string): string {
    // Replace isolated numbers with their word forms
    return text.replace(/\b(\d+)\b/g, (match, number) => {
      // This is a simplified version - in a real implementation, 
      // you'd want a more comprehensive number-to-words conversion
      if (number.length === 4 && number >= 1900 && number <= 2100) {
        // Year format: 1984 -> nineteen eighty-four
        const century = Math.floor(number / 100);
        const year = number % 100;
        
        let centuryWord = '';
        if (century === 19) centuryWord = 'nineteen';
        else if (century === 20) centuryWord = 'twenty';
        else if (century === 21) centuryWord = 'twenty-one';
        
        let yearWord = '';
        if (year < 10) yearWord = `oh-${year}`;
        else if (year < 20) {
          const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 
                         'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
          yearWord = teens[year - 10];
        } else {
          const tens = ['twenty', 'thirty', 'forty', 'fifty', 
                        'sixty', 'seventy', 'eighty', 'ninety'];
          const ones = ['', 'one', 'two', 'three', 'four', 
                        'five', 'six', 'seven', 'eight', 'nine'];
          
          const tensDigit = Math.floor(year / 10);
          const onesDigit = year % 10;
          
          yearWord = tens[tensDigit - 2];
          if (onesDigit > 0) yearWord += `-${ones[onesDigit]}`;
        }
        
        return `${centuryWord} ${yearWord}`;
      }
      
      // For simplicity, we'll keep other numbers as is
      // In a real implementation, you would convert all numbers to words
      return match;
    });
  }
  
  // Add natural variations to speech rate
  private humanizeRate(rate: number): number {
    // For slower rates, make them slightly faster
    // For faster rates, make them slightly slower
    // This helps avoid extremely unnatural speeds
    if (rate < 0.8) return rate * 1.1;
    if (rate > 1.5) return rate * 0.95;
    return rate;
  }
  
  // Add natural variations to pitch
  private humanizePitch(pitch: number): number {
    // Avoid extreme pitch values
    if (pitch < 0.7) return 0.7;
    if (pitch > 1.3) return 1.3;
    return pitch;
  }
  
  // Enhance sentence with emphasis and pauses
  private enhanceSentence(sentence: string): string {
    // Add emphasis to words after colons and question marks
    sentence = sentence.replace(/:(\s+)([A-Za-z]+)/g, ': <emphasis>$2</emphasis>');
    
    // Add emphasis to words in quotes
    sentence = sentence.replace(/"([^"]+)"/g, '"<emphasis>$1</emphasis>"');
    
    // Add emphasis to words in ALL CAPS
    sentence = sentence.replace(/\b([A-Z]{2,})\b/g, '<emphasis>$1</emphasis>');
    
    return sentence;
  }
  
  // Get appropriate pause time based on sentence ending
  private getPauseTime(sentence: string): number {
    // Longer pauses for periods and exclamation points
    if (sentence.trim().endsWith('.')) return 350;
    if (sentence.trim().endsWith('!')) return 400;
    if (sentence.trim().endsWith('?')) return 400;
    
    // Medium pauses for semicolons and colons
    if (sentence.trim().endsWith(';')) return 300;
    if (sentence.trim().endsWith(':')) return 300;
    
    // Shorter pauses for commas
    if (sentence.trim().endsWith(',')) return 200;
    
    // Default pause
    return 150;
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
    // More sophisticated sentence splitting that preserves punctuation
    // and handles abbreviations better
    
    // First, protect common abbreviations from being split
    text = text.replace(/Mr\./g, 'Mr@');
    text = text.replace(/Mrs\./g, 'Mrs@');
    text = text.replace(/Ms\./g, 'Ms@');
    text = text.replace(/Dr\./g, 'Dr@');
    text = text.replace(/Prof\./g, 'Prof@');
    text = text.replace(/Inc\./g, 'Inc@');
    text = text.replace(/Ltd\./g, 'Ltd@');
    text = text.replace(/St\./g, 'St@');
    text = text.replace(/Ave\./g, 'Ave@');
    text = text.replace(/Rd\./g, 'Rd@');
    
    // Split by sentence ending punctuation, keeping the punctuation
    const rawSentences = text.split(/(?<=[.!?])\s+/);
    
    // Restore protected abbreviations
    const sentences = rawSentences.map(s => {
      s = s.replace(/Mr@/g, 'Mr.');
      s = s.replace(/Mrs@/g, 'Mrs.');
      s = s.replace(/Ms@/g, 'Ms.');
      s = s.replace(/Dr@/g, 'Dr.');
      s = s.replace(/Prof@/g, 'Prof.');
      s = s.replace(/Inc@/g, 'Inc.');
      s = s.replace(/Ltd@/g, 'Ltd.');
      s = s.replace(/St@/g, 'St.');
      s = s.replace(/Ave@/g, 'Ave.');
      s = s.replace(/Rd@/g, 'Rd.');
      return s;
    });
    
    // Further split long sentences at natural breakpoints
    const result: string[] = [];
    
    for (const sentence of sentences) {
      if (sentence.length > 150) {
        // Split at commas, semicolons, colons, or dashes
        const parts = sentence.split(/(?<=[:;,\-])\s+/);
        result.push(...parts);
      } else {
        result.push(sentence);
      }
    }
    
    return result;
  }
}

// Singleton instance
const speechService = new SpeechService();
export default speechService;
