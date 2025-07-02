import React, { useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Trash2, Copy, Download } from 'lucide-react';
import { cn } from '../lib/utils';

interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  isTranscribing: boolean;
  onClear: () => void;
  className?: string;
}

export function TranscriptDisplay({ 
  transcript, 
  interimTranscript, 
  isTranscribing, 
  onClear,
  className 
}: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new text is added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  const handleCopy = () => {
    const fullText = transcript + (interimTranscript ? ' ' + interimTranscript : '');
    navigator.clipboard.writeText(fullText);
  };

  const handleDownload = () => {
    const fullText = transcript + (interimTranscript ? ' ' + interimTranscript : '');
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasContent = transcript || interimTranscript;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Action buttons */}
      {hasContent && (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            disabled={!hasContent}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={!transcript}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onClear}
            disabled={!hasContent || isTranscribing}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Transcript display */}
      <div 
        ref={scrollRef}
        className={cn(
          "min-h-[200px] max-h-[400px] overflow-y-auto p-4 rounded-lg border",
          "bg-gray-50 dark:bg-gray-900",
          !hasContent && "flex items-center justify-center"
        )}
      >
        {!hasContent ? (
          <p className="text-gray-500 text-center">
            {isTranscribing 
              ? "Listening... Start speaking to see the transcript"
              : "Start recording to see the transcript"
            }
          </p>
        ) : (
          <div className="space-y-2">
            {/* Final transcript */}
            {transcript && (
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {transcript}
              </p>
            )}
            
            {/* Interim transcript */}
            {interimTranscript && (
              <p className="text-gray-500 dark:text-gray-400 italic whitespace-pre-wrap">
                {interimTranscript}
              </p>
            )}
            
            {/* Recording indicator */}
            {isTranscribing && (
              <span className="inline-flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-xs text-gray-500">Listening...</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Word count */}
      {hasContent && (
        <div className="text-xs text-gray-500 text-right">
          {transcript.split(/\s+/).filter(word => word.length > 0).length} words
        </div>
      )}
    </div>
  );
}