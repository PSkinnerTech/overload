import { useState, useEffect, useCallback, useRef } from 'react';
import { TranscriptionResult, TranscriptionMode, TranscriptionStatus } from '../services/hybrid-transcription';

export interface UseTranscriptionReturn {
  transcript: string;
  interimTranscript: string;
  isTranscribing: boolean;
  transcriptionMode: TranscriptionMode;
  isOnline: boolean;
  privacyMode: boolean;
  setPrivacyMode: (enabled: boolean) => Promise<void>;
  clearTranscript: () => void;
}

export function useTranscription(): UseTranscriptionReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [status, setStatus] = useState<TranscriptionStatus>({
    isActive: false,
    mode: TranscriptionMode.WEB_SPEECH,
    isOnline: true,
    privacyMode: false
  });
  
  const transcriptRef = useRef('');

  // Get initial status
  useEffect(() => {
    window.overloadApi.transcription.getStatus().then(setStatus);
  }, []);

  // Set up event listeners
  useEffect(() => {
    const handleTranscriptionStarted = (data: { sessionId: string; mode: TranscriptionMode }) => {
      console.log('Transcription started:', data);
      setStatus(prev => ({ ...prev, isActive: true, mode: data.mode }));
    };

    const handleTranscriptionStopped = () => {
      console.log('Transcription stopped');
      setStatus(prev => ({ ...prev, isActive: false }));
    };

    const handleTranscriptionResult = (result: TranscriptionResult) => {
      if (result.isFinal) {
        // Append to transcript
        const newText = transcriptRef.current + (transcriptRef.current ? ' ' : '') + result.text;
        transcriptRef.current = newText;
        setTranscript(newText);
        setInterimTranscript('');
      } else {
        // Update interim transcript
        setInterimTranscript(result.text);
      }
    };

    const handleModeSwitched = (data: { from: TranscriptionMode; to: TranscriptionMode }) => {
      console.log('Transcription mode switched:', data);
      setStatus(prev => ({ ...prev, mode: data.to }));
    };

    // Subscribe to events
    window.overloadApi.on('transcription:started', handleTranscriptionStarted);
    window.overloadApi.on('transcription:stopped', handleTranscriptionStopped);
    window.overloadApi.on('transcription:result', handleTranscriptionResult);
    window.overloadApi.on('transcription:mode-switched', handleModeSwitched);

    // Update status periodically
    const statusInterval = setInterval(() => {
      window.overloadApi.transcription.getStatus().then(setStatus);
    }, 5000);

    return () => {
      window.overloadApi.removeAllListeners('transcription:started');
      window.overloadApi.removeAllListeners('transcription:stopped');
      window.overloadApi.removeAllListeners('transcription:result');
      window.overloadApi.removeAllListeners('transcription:mode-switched');
      clearInterval(statusInterval);
    };
  }, []);

  const setPrivacyMode = useCallback(async (enabled: boolean) => {
    try {
      const result = await window.overloadApi.transcription.setPrivacyMode(enabled);
      if (result.success) {
        setStatus(prev => ({ ...prev, privacyMode: enabled }));
      }
    } catch (error) {
      console.error('Failed to set privacy mode:', error);
    }
  }, []);

  const clearTranscript = useCallback(() => {
    transcriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    transcript,
    interimTranscript,
    isTranscribing: status.isActive,
    transcriptionMode: status.mode,
    isOnline: status.isOnline,
    privacyMode: status.privacyMode,
    setPrivacyMode,
    clearTranscript,
  };
}