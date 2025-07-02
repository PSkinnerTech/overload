import { EventEmitter } from 'events';
import { net } from 'electron';
import { logger } from './logger';
import { voskModelManager } from './vosk-model-manager';
import { 
  TranscriptionResult, 
  TranscriptionMode, 
  TranscriptionStatus 
} from '../types/transcription';

class HybridTranscriptionService extends EventEmitter {
  private status: TranscriptionStatus = {
    isActive: false,
    mode: TranscriptionMode.WEB_SPEECH,
    isOnline: true,
    privacyMode: false
  };
  
  private connectivityCheckInterval: NodeJS.Timeout | null = null;
  private currentSessionId: string | null = null;
  private audioBuffer: Float32Array[] = [];
  
  constructor() {
    super();
    this.startConnectivityMonitoring();
    logger.info('Hybrid transcription service initialized');
  }

  /**
   * Start connectivity monitoring
   */
  private startConnectivityMonitoring() {
    // Initial check
    this.checkConnectivity();
    
    // Check every 5 seconds
    this.connectivityCheckInterval = setInterval(() => {
      this.checkConnectivity();
    }, 5000);
  }

  /**
   * Check internet connectivity
   */
  private async checkConnectivity(): Promise<boolean> {
    try {
      // A more reliable way to check for internet is to make a real request.
      // net.isOnline() can return false positives.
      const request = net.request({
        method: 'HEAD',
        protocol: 'http:',
        hostname: 'www.google.com'
      });
      
      let isOnline = false;
      
      const onResponse = () => {
        isOnline = true;
      };

      const onError = () => {
        isOnline = false;
      };

      await new Promise<void>((resolve) => {
        request.on('response', (response) => {
          onResponse();
          response.on('data', () => {}); // Consume data
          response.on('end', () => resolve());
        });
        request.on('error', (err) => {
          onError();
          resolve();
        });
        request.end();
        setTimeout(() => {
          if (!isOnline) {
            request.abort(); // Abort if it takes too long
            onError();
          }
          resolve();
        }, 3000); // 3-second timeout
      });

      if (isOnline !== this.status.isOnline) {
        this.status.isOnline = isOnline;
        logger.info('Connectivity status changed', { isOnline });
        
        // Switch mode if needed
        if (this.status.isActive && !this.status.privacyMode) {
          await this.switchMode();
        }
        
        this.emit('connectivity-changed', isOnline);
      }
      
      return isOnline;
    } catch (error) {
      logger.error('Connectivity check failed', { error: (error as Error).message });
      if (this.status.isOnline) {
        this.status.isOnline = false;
        this.emit('connectivity-changed', false);
      }
      return false;
    }
  }

  /**
   * Set privacy mode (force offline transcription)
   */
  async setPrivacyMode(enabled: boolean) {
    if (this.status.privacyMode === enabled) return;
    
    this.status.privacyMode = enabled;
    logger.info('Privacy mode changed', { enabled });
    
    if (this.status.isActive) {
      await this.switchMode();
    }
    
    this.emit('privacy-mode-changed', enabled);
  }

  /**
   * Start transcription session
   */
  async startTranscription(sessionId: string): Promise<void> {
    if (this.status.isActive) {
      throw new Error('Transcription already active');
    }

    this.currentSessionId = sessionId;
    this.audioBuffer = [];
    this.status.isActive = true;

    // Determine which mode to use
    this.determineMode();
    
    logger.info('Starting transcription', { 
      sessionId, 
      mode: this.status.mode,
      isOnline: this.status.isOnline,
      privacyMode: this.status.privacyMode
    });

    // Start the appropriate engine
    if (this.status.mode === TranscriptionMode.WEB_SPEECH) {
      await this.startWebSpeech();
    } else {
      await this.startVosk();
    }

    this.emit('transcription-started', { sessionId, mode: this.status.mode });
  }

  /**
   * Stop transcription session
   */
  async stopTranscription(): Promise<void> {
    if (!this.status.isActive) {
      throw new Error('No active transcription');
    }

    logger.info('Stopping transcription', { sessionId: this.currentSessionId });

    // Stop the appropriate engine
    if (this.status.mode === TranscriptionMode.WEB_SPEECH) {
      await this.stopWebSpeech();
    } else {
      await this.stopVosk();
    }

    this.status.isActive = false;
    const sessionId = this.currentSessionId;
    this.currentSessionId = null;
    this.audioBuffer = [];

    this.emit('transcription-stopped', { sessionId });
  }

  /**
   * Process audio chunk
   */
  processAudioChunk(chunk: Float32Array): void {
    if (!this.status.isActive) return;

    // Buffer audio for Vosk mode
    if (this.status.mode === TranscriptionMode.VOSK_LOCAL) {
      this.audioBuffer.push(chunk);
      this.processVoskAudio(chunk);
    }
    // Web Speech API handles its own audio in the renderer
  }

  /**
   * Determine which transcription mode to use
   */
  private determineMode() {
    if (this.status.privacyMode || !this.status.isOnline) {
      this.status.mode = TranscriptionMode.VOSK_LOCAL;
    } else {
      this.status.mode = TranscriptionMode.WEB_SPEECH;
    }
  }

  /**
   * Switch between transcription modes
   */
  private async switchMode() {
    if (!this.status.isActive) return;

    const previousMode = this.status.mode;
    this.determineMode();

    if (previousMode === this.status.mode) return;

    logger.info('Switching transcription mode', { 
      from: previousMode, 
      to: this.status.mode 
    });

    // Stop current engine
    if (previousMode === TranscriptionMode.WEB_SPEECH) {
      await this.stopWebSpeech();
    } else {
      await this.stopVosk();
    }

    // Start new engine
    if (this.status.mode === TranscriptionMode.WEB_SPEECH) {
      await this.startWebSpeech();
    } else {
      await this.startVosk();
    }

    this.emit('mode-switched', { from: previousMode, to: this.status.mode });
  }

  /**
   * Start Web Speech API transcription
   */
  private async startWebSpeech(): Promise<void> {
    // This will send a message to the renderer to start Web Speech API
    this.emit('start-web-speech', { sessionId: this.currentSessionId });
  }

  /**
   * Stop Web Speech API transcription
   */
  private async stopWebSpeech(): Promise<void> {
    // This will send a message to the renderer to stop Web Speech API
    this.emit('stop-web-speech');
  }

  /**
   * Start Vosk transcription
   */
  private async startVosk(): Promise<void> {
    try {
      // Ensure model is available
      const modelName = 'vosk-model-small-en-us-0.15';
      const modelPath = await voskModelManager.ensureModel(modelName);
      
      logger.info('Starting Vosk transcription', { modelPath });
      
      // In a real implementation, this would:
      // 1. Initialize the Vosk model
      // 2. Create a recognizer with 16kHz sample rate
      // 3. Start processing audio chunks
      
      // For now, emit a warning that Vosk is not available
      logger.warn('Vosk transcription not available due to native module issues');
      this.emit('vosk-not-available');
      
      // Provide a fallback message
      setTimeout(() => {
        this.handleTranscriptionResult({
          text: '[Offline transcription not available. Please check your internet connection for online transcription.]',
          isFinal: true,
          timestamp: Date.now()
        });
      }, 1000);
    } catch (error) {
      logger.error('Failed to start Vosk', { error: (error as Error).message });
      this.emit('vosk-error', error);
    }
  }

  /**
   * Stop Vosk transcription
   */
  private async stopVosk(): Promise<void> {
    // TODO: Stop Vosk processing
    logger.warn('Vosk transcription not yet implemented');
  }

  /**
   * Process audio with Vosk
   */
  private processVoskAudio(chunk: Float32Array): void {
    // In a real implementation, this would:
    // 1. Convert Float32Array to the format Vosk expects
    // 2. Feed the audio to the Vosk recognizer
    // 3. Get partial or final results
    // 4. Emit transcription results
    
    // For now, just log that we received audio
    logger.debug('Processing audio with Vosk (stub)', { chunkSize: chunk.length });
  }

  /**
   * Handle transcription result from either engine
   */
  handleTranscriptionResult(result: TranscriptionResult): void {
    if (!this.status.isActive) return;

    logger.debug('Transcription result', { 
      text: result.text.substring(0, 50) + '...', 
      isFinal: result.isFinal 
    });

    this.emit('transcription-result', result);
  }

  /**
   * Get current status
   */
  getStatus(): TranscriptionStatus {
    return { ...this.status };
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.connectivityCheckInterval) {
      clearInterval(this.connectivityCheckInterval);
      this.connectivityCheckInterval = null;
    }

    if (this.status.isActive) {
      this.stopTranscription().catch(error => {
        logger.error('Error stopping transcription during cleanup', { error });
      });
    }
  }
}

// Create singleton instance
export const hybridTranscription = new HybridTranscriptionService();

// Cleanup on app quit
import { app } from 'electron';
app.on('before-quit', () => {
  hybridTranscription.destroy();
});