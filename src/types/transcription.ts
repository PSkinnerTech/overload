export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
}

export interface TranscriptionOptions {
  language?: string;
  model?: string;
  onPartialResult?: (result: TranscriptionResult) => void;
  onFinalResult?: (result: TranscriptionResult) => void;
  onError?: (error: Error) => void;
}

export enum TranscriptionMode {
  WEB_SPEECH = 'web-speech',
  VOSK_LOCAL = 'vosk-local'
}

export interface TranscriptionStatus {
  isActive: boolean;
  mode: TranscriptionMode;
  isOnline: boolean;
  privacyMode: boolean;
}