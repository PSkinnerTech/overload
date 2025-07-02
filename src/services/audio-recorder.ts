import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { logger } from './logger';

export interface AudioChunk {
  data: Float32Array;
  timestamp: number;
}

export interface RecordingOptions {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  PROCESSING = 'processing'
}

class AudioRecorderService extends EventEmitter {
  private state: RecordingState = RecordingState.IDLE;
  private audioChunks: AudioChunk[] = [];
  private recordingStartTime = 0;
  private recordingDuration = 0;
  private currentSessionId: string | null = null;
  private recordingsDir: string;
  private options: RecordingOptions = {
    sampleRate: 16000, // 16kHz is ideal for Whisper
    channels: 1,       // Mono audio
    bitsPerSample: 16
  };

  constructor() {
    super();
    
    // Create recordings directory
    this.recordingsDir = path.join(app.getPath('userData'), 'recordings');
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }
    
    logger.info('Audio recorder service initialized', { recordingsDir: this.recordingsDir });
  }

  /**
   * Start a new recording session
   */
  startRecording(): string {
    if (this.state !== RecordingState.IDLE) {
      throw new Error(`Cannot start recording in ${this.state} state`);
    }

    this.currentSessionId = `rec_${Date.now()}`;
    this.audioChunks = [];
    this.recordingStartTime = Date.now();
    this.state = RecordingState.RECORDING;

    logger.info('Recording started', { sessionId: this.currentSessionId });
    this.emit('recording-started', { sessionId: this.currentSessionId });

    return this.currentSessionId;
  }

  /**
   * Stop the current recording session
   */
  async stopRecording(): Promise<string | null> {
    if (this.state !== RecordingState.RECORDING && this.state !== RecordingState.PAUSED) {
      throw new Error(`Cannot stop recording in ${this.state} state`);
    }

    const sessionId = this.currentSessionId;
    this.recordingDuration = Date.now() - this.recordingStartTime;
    this.state = RecordingState.PROCESSING;

    logger.info('Recording stopped', { 
      sessionId, 
      duration: this.recordingDuration,
      chunks: this.audioChunks.length 
    });

    let filePath: string | null = null;
    
    try {
      // Save the recording if we have audio chunks
      if (this.audioChunks.length > 0) {
        filePath = await this.saveRecording();
      } else {
        logger.warn('No audio chunks recorded', { sessionId });
      }
    } catch (error) {
      logger.error('Failed to save recording', { error, sessionId });
    } finally {
      // Always reset state to prevent getting stuck
      this.state = RecordingState.IDLE;
      this.currentSessionId = null;
      this.audioChunks = []; // Clear chunks
    }
    
    this.emit('recording-stopped', { 
      sessionId, 
      filePath,
      duration: this.recordingDuration 
    });

    return filePath;
  }

  /**
   * Pause the current recording
   */
  pauseRecording(): void {
    if (this.state !== RecordingState.RECORDING) {
      throw new Error(`Cannot pause recording in ${this.state} state`);
    }

    this.state = RecordingState.PAUSED;
    logger.info('Recording paused', { sessionId: this.currentSessionId });
    this.emit('recording-paused', { sessionId: this.currentSessionId });
  }

  /**
   * Resume a paused recording
   */
  resumeRecording(): void {
    if (this.state !== RecordingState.PAUSED) {
      throw new Error(`Cannot resume recording in ${this.state} state`);
    }

    this.state = RecordingState.RECORDING;
    logger.info('Recording resumed', { sessionId: this.currentSessionId });
    this.emit('recording-resumed', { sessionId: this.currentSessionId });
  }

  /**
   * Add audio data chunk from the renderer process
   */
  addAudioChunk(chunk: Float32Array): void {
    if (this.state !== RecordingState.RECORDING) {
      return; // Silently ignore chunks when not recording
    }

    this.audioChunks.push({
      data: chunk,
      timestamp: Date.now()
    });

    // Calculate current recording level for visualization
    const level = this.calculateAudioLevel(chunk);
    this.emit('audio-level', { level, timestamp: Date.now() });
  }

  /**
   * Get the current recording state
   */
  getState(): RecordingState {
    return this.state;
  }

  /**
   * Get current recording duration in milliseconds
   */
  getCurrentDuration(): number {
    if (this.state === RecordingState.IDLE) {
      return 0;
    }
    return Date.now() - this.recordingStartTime;
  }

  /**
   * Save recording to disk as WAV file
   */
  private async saveRecording(): Promise<string> {
    if (!this.currentSessionId || this.audioChunks.length === 0) {
      throw new Error('No recording data to save');
    }

    const fileName = `${this.currentSessionId}.wav`;
    const filePath = path.join(this.recordingsDir, fileName);

    // Combine all audio chunks
    const totalSamples = this.audioChunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
    const combinedData = new Float32Array(totalSamples);
    
    let offset = 0;
    for (const chunk of this.audioChunks) {
      combinedData.set(chunk.data, offset);
      offset += chunk.data.length;
    }

    // Convert to WAV format
    const wavBuffer = this.createWavFile(combinedData);
    
    // Write to file
    await fs.promises.writeFile(filePath, wavBuffer);
    
    logger.info('Recording saved', { 
      filePath, 
      size: wavBuffer.byteLength,
      duration: this.recordingDuration 
    });

    return filePath;
  }

  /**
   * Create a WAV file buffer from Float32Array audio data
   */
  private createWavFile(audioData: Float32Array): Buffer {
    const length = audioData.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, this.options.channels, true);
    view.setUint32(24, this.options.sampleRate, true);
    view.setUint32(28, this.options.sampleRate * this.options.channels * 2, true); // byte rate
    view.setUint16(32, this.options.channels * 2, true); // block align
    view.setUint16(34, this.options.bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    return Buffer.from(arrayBuffer);
  }

  /**
   * Calculate RMS audio level for visualization
   */
  private calculateAudioLevel(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  /**
   * Clean up old recordings (keep last 7 days)
   */
  async cleanupOldRecordings(): Promise<void> {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    try {
      const files = await fs.promises.readdir(this.recordingsDir);
      
      for (const file of files) {
        if (file.endsWith('.wav')) {
          const filePath = path.join(this.recordingsDir, file);
          const stats = await fs.promises.stat(filePath);
          
          if (stats.mtimeMs < sevenDaysAgo) {
            await fs.promises.unlink(filePath);
            logger.info('Deleted old recording', { file });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old recordings', { error: (error as Error).message });
    }
  }
}

// Create singleton instance
export const audioRecorder = new AudioRecorderService();

// Schedule daily cleanup
setInterval(() => {
  audioRecorder.cleanupOldRecordings().catch(error => {
    logger.error('Recording cleanup failed', { error: error.message });
  });
}, 24 * 60 * 60 * 1000); // Run once per day