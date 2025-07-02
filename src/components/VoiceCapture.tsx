import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { AudioRecorder } from './AudioRecorder';
import { TranscriptDisplay } from './TranscriptDisplay';
import { Mic, Shield, Wifi, WifiOff } from 'lucide-react';
import { useTranscription } from '../hooks/useTranscription';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { TranscriptionMode } from '../services/hybrid-transcription';

interface VoiceCaptureProps {
  className?: string;
}

export function VoiceCapture({ className }: VoiceCaptureProps) {
  const { 
    transcript, 
    interimTranscript, 
    isTranscribing, 
    transcriptionMode, 
    isOnline, 
    privacyMode, 
    setPrivacyMode,
    clearTranscript 
  } = useTranscription();

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <CardTitle>Voice Capture</CardTitle>
          </div>
          <CardDescription>
            Record your thoughts and let Aurix transform them into structured documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AudioRecorder />
        </CardContent>
      </Card>

      {/* Transcription Status */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Transcription
                {isTranscribing && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    Active
                  </span>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {transcriptionMode === TranscriptionMode.WEB_SPEECH ? (
                  <>
                    <Wifi className="h-4 w-4" />
                    Online Mode (Web Speech API)
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4" />
                    Offline Mode (Vosk)
                  </>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-gray-500" />
              <Label htmlFor="privacy-mode" className="text-sm">Privacy Mode</Label>
              <Switch
                id="privacy-mode"
                checked={privacyMode}
                onCheckedChange={setPrivacyMode}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TranscriptDisplay
            transcript={transcript}
            interimTranscript={interimTranscript}
            isTranscribing={isTranscribing}
            onClear={clearTranscript}
          />
        </CardContent>
      </Card>
    </div>
  );
}