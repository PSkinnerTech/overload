import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  audioLevel: number;
  duration: number;
  error: string | null;
}

export interface UseAudioRecorderReturn {
  state: AudioRecorderState;
  startRecording: (sessionId: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  permissionGranted: boolean;
}

const CHUNK_SIZE = 4096; // Number of samples per chunk
const SAMPLE_RATE = 16000; // 16kHz for Whisper

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    audioLevel: 0,
    duration: 0,
    error: null,
  });
  
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  // Request microphone permission on mount
  useEffect(() => {
    console.log('Requesting microphone permission...');
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        console.log('Microphone permission granted');
        setPermissionGranted(true);
        // Stop the stream immediately as we only needed permission
        stream.getTracks().forEach(track => track.stop());
      })
      .catch((error) => {
        console.error('Microphone permission error:', error.name, error.message);
        if (error.name === 'NotAllowedError') {
          setState(prev => ({ ...prev, error: 'Microphone permission denied. Please allow microphone access in your browser settings.' }));
        } else if (error.name === 'NotFoundError') {
          setState(prev => ({ ...prev, error: 'No microphone found. Please connect a microphone and reload.' }));
        } else {
          setState(prev => ({ ...prev, error: `Microphone error: ${error.message}` }));
        }
      });
  }, []);

  // Set up audio level listener
  useEffect(() => {
    const handleAudioLevel = (data: any) => {
      setState(prev => ({ ...prev, audioLevel: data.level }));
    };

    window.overloadApi.on('audio:level-update', handleAudioLevel);

    return () => {
      window.overloadApi.removeAllListeners('audio:level-update');
    };
  }, []);

  // Update duration while recording
  useEffect(() => {
    if (state.isRecording && !state.isPaused) {
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: Date.now() - startTimeRef.current
        }));
      }, 100);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [state.isRecording, state.isPaused]);

  const checkPermissions = async () => {
    console.log('Requesting microphone permission via main process...');
    const status = await window.overloadApi.getMicrophoneAccess();
    console.log('Microphone access status:', { status });

    if (status !== 'granted') {
      const message = 'Microphone permission was not granted. Please grant it in System Settings.';
      console.warn(message);
      setPermissionError(message);
      return false;
    }
    
    setPermissionError(null);
    return true;
  };

  const startRecording = useCallback(async (sessionId: string) => {
    if (state.isRecording) return;

    const hasPermission = await checkPermissions();
    if (!hasPermission) {
      return;
    }

    console.log('Starting recording process...', { sessionId });
    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context
      const audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      });
      audioContextRef.current = audioContext;

      // Create audio source
      const source = audioContext.createMediaStreamSource(stream);

      // Create script processor for capturing audio chunks
      const processor = audioContext.createScriptProcessor(CHUNK_SIZE, 1, 1);
      processorNodeRef.current = processor;

      // Set recording ref to true
      isRecordingRef.current = true;
      
      let chunkCount = 0;
      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (isRecordingRef.current && !state.isPaused) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Send a copy to avoid transfer issues
          window.overloadApi.audio.sendChunk(Array.from(inputData));
          
          // Log every 10th chunk to avoid spam
          chunkCount++;
          if (chunkCount % 10 === 0) {
            console.log(`Sent audio chunk #${chunkCount}, size: ${inputData.length}`);
          }
        }
      };

      // Connect nodes
      source.connect(processor);
      processor.connect(audioContext.destination);

      // Start recording in main process
      const result = await window.overloadApi.audio.startRecording();
      if (result.success) {
        startTimeRef.current = Date.now();
        setState({
          isRecording: true,
          isPaused: false,
          audioLevel: 0,
          duration: 0,
          error: null,
        });
        console.log('Recording started successfully');
      } else {
        throw new Error(result.error || 'Failed to start recording');
      }
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start recording'
      }));
      
      // Clean up on error
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [state.isRecording, state.isPaused]);

  const stopRecording = useCallback(async () => {
    try {
      // Stop recording flag first to prevent more chunks
      isRecordingRef.current = false;
      
      // Stop recording in main process
      const result = await window.overloadApi.audio.stopRecording();
      
      // Clean up audio resources
      if (processorNodeRef.current) {
        processorNodeRef.current.disconnect();
        processorNodeRef.current = null;
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      setState({
        isRecording: false,
        isPaused: false,
        audioLevel: 0,
        duration: 0,
        error: result.success ? null : result.error || 'Failed to stop recording',
      });

      return result;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop recording'
      }));
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    try {
      const result = await window.overloadApi.audio.pauseRecording();
      if (result.success) {
        setState(prev => ({ ...prev, isPaused: true }));
      } else {
        throw new Error(result.error || 'Failed to pause recording');
      }
    } catch (error) {
      console.error('Failed to pause recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to pause recording'
      }));
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    try {
      const result = await window.overloadApi.audio.resumeRecording();
      if (result.success) {
        setState(prev => ({ ...prev, isPaused: false }));
      } else {
        throw new Error(result.error || 'Failed to resume recording');
      }
    } catch (error) {
      console.error('Failed to resume recording:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resume recording'
      }));
    }
  }, []);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    permissionGranted,
  };
}