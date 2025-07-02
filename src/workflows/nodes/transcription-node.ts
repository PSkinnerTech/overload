import { WorkflowState, TranscriptSegment } from '../types';
import { logger } from '../../services/logger';

/**
 * Transcription Node
 * Processes raw transcript data and prepares it for analysis
 */
export async function transcriptionNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const startTime = Date.now();
  logger.info('Transcription node started', { sessionId: state.sessionId });

  try {
    // Clean and normalize the transcript
    const cleanedTranscript = cleanTranscript(state.transcript);
    
    // Split into sentences for better processing
    const sentences = splitIntoSentences(cleanedTranscript);
    
    // Create segments with estimated timestamps
    const segments: TranscriptSegment[] = sentences.map((sentence, index) => ({
      text: sentence,
      timestamp: Date.now() + (index * 1000), // Placeholder timestamps
      confidence: 0.95 // Default confidence since we don't have real values from the stub
    }));

    const processingTime = Date.now() - startTime;
    logger.info('Transcription node completed', { 
      sessionId: state.sessionId,
      sentenceCount: sentences.length,
      duration: processingTime 
    });

    return {
      transcript: cleanedTranscript,
      segments,
      processingTime: state.processingTime ? state.processingTime + processingTime : processingTime
    };
  } catch (error) {
    logger.error('Transcription node failed', { 
      sessionId: state.sessionId,
      error: (error as Error).message 
    });
    
    return {
      errors: [...state.errors, `Transcription processing failed: ${(error as Error).message}`]
    };
  }
}

/**
 * Clean and normalize transcript text
 */
function cleanTranscript(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/(\w)([.!?])\s*(\w)/g, '$1$2 $3') // Ensure space after punctuation
    .replace(/\s+([.!?,])/g, '$1'); // Remove space before punctuation
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Basic sentence splitting - could be improved with NLP library
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 0);
}