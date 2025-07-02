import { WorkflowState, CognitiveLoadMetrics } from '../types';
import { logger } from '../../services/logger';

/**
 * Cognitive Load Index Node
 * Calculates the θ (theta) score representing cognitive complexity
 */
export async function cognitiveLoadNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const startTime = Date.now();
  logger.info('Cognitive load node started', { sessionId: state.sessionId });

  try {
    const { finalDocument, analysis, transcript } = state;
    
    if (!finalDocument && !transcript) {
      throw new Error('No content available for cognitive load calculation');
    }

    const content = finalDocument || transcript;
    
    // Calculate cognitive metrics
    const metrics = calculateCognitiveMetrics(content);
    
    // Calculate the theta score (0-100)
    const thetaScore = calculateThetaScore(metrics, analysis);
    
    const processingTime = Date.now() - startTime;
    logger.info('Cognitive load node completed', { 
      sessionId: state.sessionId,
      thetaScore,
      duration: processingTime 
    });

    return {
      cognitiveLoadIndex: thetaScore,
      cognitiveMetrics: metrics,
      processingTime: state.processingTime ? state.processingTime + processingTime : processingTime
    };
  } catch (error) {
    logger.error('Cognitive load node failed', { 
      sessionId: state.sessionId,
      error: (error as Error).message 
    });
    
    return {
      cognitiveLoadIndex: 50, // Default middle value
      warnings: [...state.warnings, `Cognitive load calculation failed: ${(error as Error).message}`]
    };
  }
}

/**
 * Calculate cognitive metrics from content
 */
function calculateCognitiveMetrics(content: string): CognitiveLoadMetrics {
  // Basic text analysis
  const words = content.split(/\s+/).filter(w => w.length > 0);
  const sentences = content.match(/[.!?]+/g) || [];
  const wordCount = words.length;
  const sentenceCount = sentences.length || 1;
  
  // Calculate average words per sentence
  const averageWordsPerSentence = wordCount / sentenceCount;
  
  // Count technical terms (simplified)
  const technicalTerms = countTechnicalTerms(words);
  
  // Calculate conceptual density
  const conceptualDensity = calculateConceptualDensity(content);
  
  // Estimate reading time (average reading speed: 200-250 words per minute)
  const estimatedReadingTime = wordCount / 225;

  return {
    wordCount,
    sentenceCount,
    averageWordsPerSentence,
    technicalTermCount: technicalTerms,
    conceptualDensity,
    estimatedReadingTime
  };
}

/**
 * Calculate the theta score (0-100)
 * Higher score = higher cognitive load
 */
function calculateThetaScore(
  metrics: CognitiveLoadMetrics, 
  analysis?: typeof WorkflowState.prototype.analysis
): number {
  let score = 0;
  
  // Factor 1: Sentence complexity (0-25 points)
  // Optimal is 15-20 words per sentence
  if (metrics.averageWordsPerSentence < 10) {
    score += 10; // Too choppy
  } else if (metrics.averageWordsPerSentence > 25) {
    score += Math.min(25, (metrics.averageWordsPerSentence - 25) * 2);
  } else if (metrics.averageWordsPerSentence > 20) {
    score += (metrics.averageWordsPerSentence - 20) * 2;
  } else {
    score += 5; // Optimal range
  }

  // Factor 2: Technical term density (0-25 points)
  const techTermDensity = (metrics.technicalTermCount / metrics.wordCount) * 100;
  score += Math.min(25, techTermDensity * 2.5);

  // Factor 3: Conceptual density (0-25 points)
  score += Math.min(25, metrics.conceptualDensity * 25);

  // Factor 4: Content complexity from analysis (0-25 points)
  if (analysis) {
    switch (analysis.complexity) {
      case 'low':
        score += 5;
        break;
      case 'medium':
        score += 15;
        break;
      case 'high':
        score += 25;
        break;
    }
  } else {
    score += 15; // Default medium
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Count technical terms in the content
 */
function countTechnicalTerms(words: string[]): number {
  // Common technical indicators
  const technicalPatterns = [
    /^[A-Z]{2,}$/, // Acronyms
    /\d+/, // Contains numbers
    /^[a-z]+[A-Z]/, // camelCase
    /_/, // snake_case
    /\(\)/, // function calls
    /^(algo|api|async|auth|cache|cli|cpu|crud|css|db|debug|dev|dns|dom|dto|env|gui|html|http|ide|ipc|json|jwt|lib|log|npm|orm|os|ram|regex|req|res|sdk|sql|ssh|ssl|tcp|tls|ui|url|uuid|vm|xml)$/i
  ];

  const technicalSuffixes = ['tion', 'ment', 'ity', 'ness', 'ism', 'ize', 'ify', 'ate'];
  
  return words.filter(word => {
    const lower = word.toLowerCase();
    
    // Check patterns
    if (technicalPatterns.some(pattern => pattern.test(word))) {
      return true;
    }
    
    // Check for technical suffixes in longer words
    if (word.length > 8) {
      return technicalSuffixes.some(suffix => lower.endsWith(suffix));
    }
    
    // Check word length (very long words tend to be technical)
    return word.length > 12;
  }).length;
}

/**
 * Calculate conceptual density (0-1)
 * Based on unique concepts vs total content
 */
function calculateConceptualDensity(content: string): number {
  // Extract potential concepts (nouns and noun phrases)
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
  const concepts = new Set<string>();
  
  sentences.forEach(sentence => {
    // Simple heuristic: capitalized words that aren't sentence starts
    const words = sentence.trim().split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      if (/^[A-Z][a-z]+/.test(words[i]) && words[i].length > 3) {
        concepts.add(words[i].toLowerCase());
      }
    }
    
    // Multi-word patterns that might be concepts
    const conceptPatterns = [
      /\b(\w+\s+\w+)\s+(system|method|approach|technique|process|model)/gi,
      /\b(data\s+\w+|machine\s+\w+|artificial\s+\w+)/gi,
    ];
    
    conceptPatterns.forEach(pattern => {
      const matches = sentence.match(pattern);
      if (matches) {
        matches.forEach(match => concepts.add(match.toLowerCase()));
      }
    });
  });

  // Calculate density: unique concepts per 100 words
  const wordCount = content.split(/\s+/).length;
  const conceptsPerHundredWords = (concepts.size / wordCount) * 100;
  
  // Normalize to 0-1 scale (assume 10 concepts per 100 words is very dense)
  return Math.min(1, conceptsPerHundredWords / 10);
}