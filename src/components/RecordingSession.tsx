import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { AudioRecorder } from './AudioRecorder';
import { TranscriptDisplay } from './TranscriptDisplay';
import { DocumentPreview } from './DocumentPreview';
import { CognitiveLoadDisplay } from './CognitiveLoadDisplay';
import { FeedbackPrompt } from './FeedbackSlider';
import { useTranscription } from '../hooks/useTranscription';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { 
  FileText, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Wifi,
  WifiOff,
  Shield
} from 'lucide-react';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { TranscriptionMode } from '../services/hybrid-transcription';

interface ProcessingState {
  isProcessing: boolean;
  sessionId?: string;
  progress?: number;
  documentPath?: string;
  cognitiveLoadIndex?: number;
  error?: string;
  warning?: string;
}

export function RecordingSession() {
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

  const audioRecorder = useAudioRecorder();
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false
  });
  const [generatedDocument, setGeneratedDocument] = useState<string>('');

  // Listen for document processing events
  useEffect(() => {
    const handleProcessingStarted = (data: { sessionId: string }) => {
      setProcessingState({
        isProcessing: true,
        sessionId: data.sessionId,
        progress: 10
      });
    };

    const handleProcessingCompleted = async (data: { 
      sessionId: string; 
      documentPath: string; 
      cognitiveLoadIndex: number;
    }) => {
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        documentPath: data.documentPath,
        cognitiveLoadIndex: data.cognitiveLoadIndex,
        progress: 100
      }));

      // Load the generated document
      if (data.documentPath) {
        const result = await window.overloadApi.document.open(
          data.documentPath.split('/').pop()!
        );
        if (result.success) {
          setGeneratedDocument(result.content);
        }
      }
    };

    const handleProcessingWarning = (data: { warning: string }) => {
      setProcessingState(prev => ({
        ...prev,
        warning: data.warning
      }));
    };

    const handleProcessingFailed = (data: { sessionId: string; error: string }) => {
      setProcessingState({
        isProcessing: false,
        error: data.error
      });
    };

    window.overloadApi.on('document:processing-started', handleProcessingStarted);
    window.overloadApi.on('document:processing-completed', handleProcessingCompleted);
    window.overloadApi.on('document:processing-warning', handleProcessingWarning);
    window.overloadApi.on('document:processing-failed', handleProcessingFailed);

    return () => {
      window.overloadApi.removeAllListeners('document:processing-started');
      window.overloadApi.removeAllListeners('document:processing-completed');
      window.overloadApi.removeAllListeners('document:processing-warning');
      window.overloadApi.removeAllListeners('document:processing-failed');
    };
  }, []);

  // Automatically process document when recording stops
  useEffect(() => {
    const handleRecordingStopped = async (data: { sessionId: string }) => {
      if (transcript.trim().length > 0) {
        // Process the transcript into a document
        const result = await window.overloadApi.document.process(
          data.sessionId,
          transcript,
          {
            generateDiagrams: true,
            targetAudience: 'intermediate',
            documentStyle: 'technical'
          }
        );

        if (!result.success) {
          setProcessingState({
            isProcessing: false,
            error: result.errors?.join(', ') || 'Document processing failed'
          });
        }
      }
    };

    window.overloadApi.on('audio:recording-stopped', handleRecordingStopped);

    return () => {
      window.overloadApi.removeAllListeners('audio:recording-stopped');
    };
  }, [transcript]);

  const handleClearSession = () => {
    clearTranscript();
    setGeneratedDocument('');
    setProcessingState({ isProcessing: false });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recording Session</h1>
            <p className="text-muted-foreground mt-1">
              Transform your voice into structured documentation
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-green-700">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-700">Offline</span>
                </>
              )}
            </div>

            {/* Privacy Mode */}
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
        </div>

        {/* Alerts */}
        {processingState.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{processingState.error}</AlertDescription>
          </Alert>
        )}

        {processingState.warning && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{processingState.warning}</AlertDescription>
          </Alert>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Recording & Transcript */}
          <div className="space-y-6">
            {/* Audio Recorder */}
            <Card>
              <CardHeader>
                <CardTitle>Voice Recording</CardTitle>
                <CardDescription>
                  {transcriptionMode === TranscriptionMode.WEB_SPEECH 
                    ? 'Using online transcription for best accuracy'
                    : 'Using offline transcription for privacy'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AudioRecorder />
              </CardContent>
            </Card>

            {/* Live Transcript */}
            <Card>
              <CardHeader>
                <CardTitle>Live Transcript</CardTitle>
                <CardDescription>
                  Real-time transcription of your voice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TranscriptDisplay
                  transcript={transcript}
                  interimTranscript={interimTranscript}
                  isTranscribing={isTranscribing}
                  onClear={handleClearSession}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Document & Analysis */}
          <div className="space-y-6">
            {/* Document Generation Status */}
            {processingState.isProcessing && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={processingState.progress || 0} className="mb-2" />
                  <p className="text-sm text-muted-foreground">
                    AI is analyzing and structuring your content...
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Generated Document */}
            {generatedDocument && !processingState.isProcessing && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Generated Document
                      <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentPreview 
                      content={generatedDocument}
                      className="max-h-[400px]"
                    />
                  </CardContent>
                </Card>

                {/* Cognitive Load Analysis */}
                {processingState.cognitiveLoadIndex !== undefined && (
                  <>
                    <CognitiveLoadDisplay
                      currentIndex={processingState.cognitiveLoadIndex}
                      sessionId={processingState.sessionId}
                    />
                    
                    {/* Feedback Prompt */}
                    <FeedbackPrompt
                      sessionId={processingState.sessionId!}
                      cognitiveLoadIndex={processingState.cognitiveLoadIndex}
                    />
                  </>
                )}
              </>
            )}

            {/* Empty State */}
            {!generatedDocument && !processingState.isProcessing && transcript.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Document Yet</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Start recording to generate AI-powered documentation
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}