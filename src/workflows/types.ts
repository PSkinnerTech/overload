/**
 * Types for the Aurix AI workflow
 */

export interface TranscriptSegment {
  text: string;
  timestamp: number;
  confidence?: number;
}

export interface ContentAnalysis {
  topics: string[];
  complexity: 'low' | 'medium' | 'high';
  contentType: 'explanation' | 'tutorial' | 'discussion' | 'brainstorming' | 'other';
  keyPoints: string[];
  suggestedSections: string[];
}

export interface DiagramSpec {
  type: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'mindmap';
  title: string;
  description: string;
  mermaidCode: string;
}

export interface DocumentSection {
  title: string;
  content: string;
  level: number; // Heading level (1-6)
  order: number;
}

export interface CognitiveLoadMetrics {
  wordCount: number;
  sentenceCount: number;
  averageWordsPerSentence: number;
  technicalTermCount: number;
  conceptualDensity: number;
  estimatedReadingTime: number; // in minutes
}

export interface WorkflowState {
  // Input data
  sessionId: string;
  transcript: string;
  segments: TranscriptSegment[];
  
  // Analysis results
  analysis?: ContentAnalysis;
  
  // Generated content
  documentSections?: DocumentSection[];
  diagrams?: DiagramSpec[];
  
  // Final outputs
  finalDocument?: string;
  cognitiveLoadIndex?: number; // θ score (0-100)
  cognitiveMetrics?: CognitiveLoadMetrics;
  
  // Metadata
  processingTime?: number;
  errors: string[];
  warnings: string[];
  
  // Configuration
  config: {
    generateDiagrams: boolean;
    targetAudience: 'beginner' | 'intermediate' | 'expert';
    documentStyle: 'technical' | 'tutorial' | 'reference';
    maxSectionLength: number;
    llmProvider: 'ollama' | 'openai' | 'anthropic';
    llmModel?: string;
  };
}

export interface NodeResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
}

// Node function type
export type WorkflowNode = (state: WorkflowState) => Promise<Partial<WorkflowState>>;