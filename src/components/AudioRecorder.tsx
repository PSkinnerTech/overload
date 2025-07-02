import React from 'react';
import { Mic, MicOff, Pause, Play, Square } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { AudioWaveform } from './AudioWaveform';
import { cn } from '../lib/utils';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface AudioRecorderProps {
  className?: string;
}

export function AudioRecorder({ className }: AudioRecorderProps) {
  const { state, startRecording, stopRecording, pauseRecording, resumeRecording, permissionGranted } = useAudioRecorder();
  const [sessionId] = React.useState(() => `rec_${Date.now()}`);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleToggleRecording = async () => {
    if (state.isRecording) {
      await stopRecording();
    } else {
      await startRecording(sessionId);
    }
  };

  const handleTogglePause = async () => {
    if (state.isPaused) {
      await resumeRecording();
    } else {
      await pauseRecording();
    }
  };

  // Calculate audio level percentage (0-100)
  const audioLevelPercent = Math.min(100, state.audioLevel * 200);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Error message */}
      {state.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {state.error}
        </div>
      )}

      {/* Permission warning */}
      {!permissionGranted && !state.error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p className="mb-2">Microphone permission is required to record audio.</p>
          <p className="text-sm">On macOS: Go to System Settings → Privacy & Security → Microphone and enable access for this app.</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Refresh after granting permission
          </Button>
        </div>
      )}

      {/* Recording controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Main record button */}
        <Button
          onClick={handleToggleRecording}
          size="lg"
          variant={state.isRecording ? "destructive" : "default"}
          className={cn(
            "rounded-full w-20 h-20 transition-all",
            state.isRecording && "animate-pulse"
          )}
          disabled={!permissionGranted}
        >
          {state.isRecording ? (
            <Square className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </Button>

        {/* Pause/Resume button (only shown when recording) */}
        {state.isRecording && (
          <Button
            onClick={handleTogglePause}
            size="lg"
            variant="outline"
            className="rounded-full w-16 h-16"
          >
            {state.isPaused ? (
              <Play className="h-6 w-6" />
            ) : (
              <Pause className="h-6 w-6" />
            )}
          </Button>
        )}
      </div>

      {/* Recording status */}
      <div className="text-center space-y-2">
        {state.isRecording && (
          <>
            <div className="flex items-center justify-center gap-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                state.isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
              )} />
              <span className="text-sm font-medium">
                {state.isPaused ? "Paused" : "Recording"}
              </span>
            </div>
            <div className="text-2xl font-mono">
              {formatDuration(state.duration)}
            </div>
          </>
        )}
      </div>

      {/* Audio level indicator */}
      {state.isRecording && !state.isPaused && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Audio Level</span>
            <MicOff className="h-4 w-4" />
          </div>
          <Progress value={audioLevelPercent} className="h-2" />
        </div>
      )}

      {/* Waveform visualizer */}
      <AudioWaveform 
        audioLevel={state.audioLevel} 
        isActive={state.isRecording && !state.isPaused}
        className="mt-4"
      />

      {/* Instructions */}
      {!state.isRecording && permissionGranted && (
        <p className="text-center text-sm text-gray-600">
          Click the microphone to start recording
        </p>
      )}
    </div>
  );
}