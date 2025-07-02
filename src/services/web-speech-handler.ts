export interface WebSpeechHandlerOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

class WebSpeechHandler {
  private recognition: SpeechRecognition | null = null;
  private isActive = false;
  private sessionId: string | null = null;

  constructor() {
    // Check if Web Speech API is available
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Web Speech API not available in this browser');
      return;
    }

    // Set up event listeners for IPC commands from main process
    window.overloadApi.on('transcription:start-web-speech', (data: { sessionId: string }) => {
      this.start(data.sessionId);
    });

    window.overloadApi.on('transcription:stop-web-speech', () => {
      this.stop();
    });
  }

  private start(sessionId: string, options: WebSpeechHandlerOptions = {}) {
    if (this.isActive) {
      console.warn('Web Speech recognition already active');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Web Speech API not available');
      return;
    }

    this.sessionId = sessionId;
    this.recognition = new SpeechRecognition();
    
    // Configure recognition
    this.recognition.continuous = options.continuous ?? true;
    this.recognition.interimResults = options.interimResults ?? true;
    this.recognition.lang = options.language ?? 'en-US';
    this.recognition.maxAlternatives = 1;

    // Set up event handlers
    this.recognition.onstart = () => {
      console.log('Web Speech recognition started');
      this.isActive = true;
    };

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0.9; // Default confidence if not provided

        // Send result to main process
        window.overloadApi.transcription.webSpeechResult({
          text: transcript,
          isFinal: result.isFinal,
          confidence: confidence,
          timestamp: Date.now()
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Web Speech recognition error:', event.error);
      
      // Common errors:
      // - network: No internet connection
      // - not-allowed: Microphone permission denied
      // - no-speech: No speech detected
      
      if (event.error === 'network') {
        // Network error will trigger fallback to Vosk in main process
        console.log('Network error detected, will switch to offline mode');
      }
      
      this.isActive = false;
    };

    this.recognition.onend = () => {
      console.log('Web Speech recognition ended');
      this.isActive = false;
      
      // Restart if it ended unexpectedly
      if (this.sessionId) {
        console.log('Restarting Web Speech recognition');
        setTimeout(() => {
          if (this.sessionId && !this.isActive) {
            this.recognition?.start();
          }
        }, 500);
      }
    };

    // Start recognition
    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start Web Speech recognition:', error);
      this.isActive = false;
    }
  }

  private stop() {
    if (!this.isActive || !this.recognition) {
      return;
    }

    console.log('Stopping Web Speech recognition');
    
    this.sessionId = null;
    this.isActive = false;
    
    try {
      this.recognition.stop();
      this.recognition = null;
    } catch (error) {
      console.error('Error stopping Web Speech recognition:', error);
    }
  }

  isAvailable(): boolean {
    return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
  }
}

// Create and export singleton instance
export const webSpeechHandler = new WebSpeechHandler();