import { WorkflowState, ContentAnalysis } from '../types';
import { logger } from '../../services/logger';
import { ollamaService } from '../../services/ollama-service';

/**
 * Analysis Node
 * Uses LLM to analyze the transcript and extract key information
 */
export async function analysisNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const startTime = Date.now();
  logger.info('Analysis node started', { sessionId: state.sessionId });

  try {
    // Check if we have a transcript to analyze
    if (!state.transcript || state.transcript.trim().length === 0) {
      throw new Error('No transcript available for analysis');
    }

    // Prepare the analysis prompt
    const prompt = createAnalysisPrompt(state.transcript, state.config.targetAudience);
    
    // Call Ollama for analysis
    const response = await ollamaService.analyze(prompt, state.config.llmModel);
    
    // Parse the LLM response into structured data
    const analysis = parseAnalysisResponse(response);
    
    const processingTime = Date.now() - startTime;
    logger.info('Analysis node completed', { 
      sessionId: state.sessionId,
      topics: analysis.topics.length,
      complexity: analysis.complexity,
      duration: processingTime 
    });

    return {
      analysis,
      processingTime: state.processingTime ? state.processingTime + processingTime : processingTime
    };
  } catch (error) {
    logger.error('Analysis node failed', { 
      sessionId: state.sessionId,
      error: (error as Error).message 
    });
    
    // Provide a fallback analysis
    const fallbackAnalysis: ContentAnalysis = {
      topics: extractBasicTopics(state.transcript),
      complexity: 'medium',
      contentType: 'other',
      keyPoints: extractKeyPoints(state.transcript),
      suggestedSections: ['Introduction', 'Main Content', 'Conclusion']
    };

    return {
      analysis: fallbackAnalysis,
      warnings: [...state.warnings, `Analysis used fallback mode: ${(error as Error).message}`]
    };
  }
}

/**
 * Create a prompt for content analysis
 */
function createAnalysisPrompt(transcript: string, audience: string): string {
  return `Analyze the following transcript and provide a structured analysis.

Target Audience: ${audience}

Transcript:
${transcript}

Please provide your analysis in the following JSON format:
{
  "topics": ["topic1", "topic2", ...],
  "complexity": "low" | "medium" | "high",
  "contentType": "explanation" | "tutorial" | "discussion" | "brainstorming" | "other",
  "keyPoints": ["point1", "point2", ...],
  "suggestedSections": ["section1", "section2", ...]
}

Focus on:
1. Identifying the main topics discussed
2. Assessing the complexity level for the target audience
3. Determining the type of content
4. Extracting 3-5 key points
5. Suggesting logical sections for a structured document`;
}

/**
 * Parse the LLM response into structured ContentAnalysis
 */
function parseAnalysisResponse(response: string): ContentAnalysis {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        topics: parsed.topics || [],
        complexity: parsed.complexity || 'medium',
        contentType: parsed.contentType || 'other',
        keyPoints: parsed.keyPoints || [],
        suggestedSections: parsed.suggestedSections || []
      };
    }
  } catch (error) {
    logger.warn('Failed to parse LLM response as JSON', { error });
  }

  // Fallback parsing if JSON extraction fails
  return {
    topics: extractFromBulletPoints(response, 'topics') || extractFromBulletPoints(response, 'Topics') || [],
    complexity: extractComplexity(response),
    contentType: extractContentType(response),
    keyPoints: extractFromBulletPoints(response, 'key points') || extractFromBulletPoints(response, 'Key Points') || [],
    suggestedSections: extractFromBulletPoints(response, 'sections') || extractFromBulletPoints(response, 'Sections') || []
  };
}

/**
 * Extract topics from transcript using basic NLP
 */
function extractBasicTopics(transcript: string): string[] {
  // This is a very basic implementation
  // In production, you'd use a proper NLP library
  const words = transcript.toLowerCase().split(/\s+/);
  const wordFreq = new Map<string, number>();
  
  // Count word frequency (excluding common words)
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'what', 'which', 'who', 'when', 'where', 'why', 'how']);
  
  words.forEach(word => {
    if (word.length > 3 && !commonWords.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  });

  // Get top 5 most frequent words as topics
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Extract key points from transcript
 */
function extractKeyPoints(transcript: string): string[] {
  const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [];
  
  // Take first sentence and every 3rd sentence as key points (up to 5)
  const keyPoints: string[] = [];
  for (let i = 0; i < sentences.length && keyPoints.length < 5; i += 3) {
    keyPoints.push(sentences[i].trim());
  }
  
  return keyPoints;
}

/**
 * Extract bullet points from text
 */
function extractFromBulletPoints(text: string, section: string): string[] | null {
  const regex = new RegExp(`${section}:?\\s*([\\s\\S]*?)(?=\\n\\n|\\n[A-Z]|$)`, 'i');
  const match = text.match(regex);
  
  if (match) {
    return match[1]
      .split(/\n/)
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 0);
  }
  
  return null;
}

/**
 * Extract complexity from response
 */
function extractComplexity(response: string): 'low' | 'medium' | 'high' {
  const lower = response.toLowerCase();
  if (lower.includes('low complexity') || lower.includes('simple') || lower.includes('basic')) {
    return 'low';
  }
  if (lower.includes('high complexity') || lower.includes('complex') || lower.includes('advanced')) {
    return 'high';
  }
  return 'medium';
}

/**
 * Extract content type from response
 */
function extractContentType(response: string): ContentAnalysis['contentType'] {
  const lower = response.toLowerCase();
  if (lower.includes('explanation')) return 'explanation';
  if (lower.includes('tutorial')) return 'tutorial';
  if (lower.includes('discussion')) return 'discussion';
  if (lower.includes('brainstorming')) return 'brainstorming';
  return 'other';
}