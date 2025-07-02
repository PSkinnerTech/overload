import { WorkflowState, DocumentSection } from '../types';
import { logger } from '../../services/logger';
import { ollamaService } from '../../services/ollama-service';

/**
 * Document Generation Node
 * Generates structured Markdown documentation from the analysis
 */
export async function documentGenerationNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const startTime = Date.now();
  logger.info('Document generation node started', { sessionId: state.sessionId });

  try {
    if (!state.analysis) {
      throw new Error('No analysis available for document generation');
    }

    const sections: DocumentSection[] = [];
    
    // Generate introduction section
    const intro = await generateIntroduction(state);
    sections.push(intro);

    // Generate main content sections based on analysis
    const mainSections = await generateMainSections(state);
    sections.push(...mainSections);

    // Generate conclusion
    const conclusion = await generateConclusion(state);
    sections.push(conclusion);

    const processingTime = Date.now() - startTime;
    logger.info('Document generation node completed', { 
      sessionId: state.sessionId,
      sectionCount: sections.length,
      duration: processingTime 
    });

    return {
      documentSections: sections,
      processingTime: state.processingTime ? state.processingTime + processingTime : processingTime
    };
  } catch (error) {
    logger.error('Document generation node failed', { 
      sessionId: state.sessionId,
      error: (error as Error).message 
    });
    
    // Provide fallback sections
    const fallbackSections = generateFallbackSections(state);
    
    return {
      documentSections: fallbackSections,
      warnings: [...state.warnings, `Document generation used fallback: ${(error as Error).message}`]
    };
  }
}

/**
 * Generate introduction section
 */
async function generateIntroduction(state: WorkflowState): Promise<DocumentSection> {
  const { analysis, config } = state;
  
  const prompt = `Generate an introduction for a ${config.documentStyle} document about the following topics: ${analysis!.topics.join(', ')}.

Target audience: ${config.targetAudience}
Content type: ${analysis!.contentType}

The introduction should:
1. Briefly introduce the main topics
2. Set expectations for what will be covered
3. Be engaging and appropriate for the target audience
4. Be concise (2-3 paragraphs maximum)

Write in Markdown format.`;

  try {
    const content = await ollamaService.generateStructured(prompt, config.llmModel);
    return {
      title: 'Introduction',
      content: cleanMarkdown(content),
      level: 1,
      order: 0
    };
  } catch (error) {
    logger.warn('Failed to generate introduction with LLM', { error });
    return {
      title: 'Introduction',
      content: `This document covers ${analysis!.topics.join(', ')}. The following sections will explore these topics in detail.`,
      level: 1,
      order: 0
    };
  }
}

/**
 * Generate main content sections
 */
async function generateMainSections(state: WorkflowState): Promise<DocumentSection[]> {
  const { analysis, transcript, config } = state;
  const sections: DocumentSection[] = [];
  
  // Use suggested sections from analysis or create default ones
  const sectionTitles = analysis!.suggestedSections.length > 0 
    ? analysis!.suggestedSections 
    : analysis!.topics.slice(0, 3).map(topic => `Understanding ${topic}`);

  for (let i = 0; i < sectionTitles.length; i++) {
    const sectionTitle = sectionTitles[i];
    const relevantContent = extractRelevantContent(transcript, sectionTitle, analysis!.keyPoints);
    
    const prompt = `Generate content for a section titled "${sectionTitle}" in a ${config.documentStyle} document.

Target audience: ${config.targetAudience}
Maximum length: ${config.maxSectionLength} words

Context from the transcript:
${relevantContent}

Key points to potentially cover:
${analysis!.keyPoints.filter((_, idx) => idx % sectionTitles.length === i).join('\n')}

Write clear, structured content in Markdown format. Include:
- Relevant explanations
- Examples if appropriate
- Bullet points or numbered lists where helpful
- Code blocks if technical content is discussed`;

    try {
      const content = await ollamaService.generateStructured(prompt, config.llmModel);
      sections.push({
        title: sectionTitle,
        content: cleanMarkdown(content),
        level: 2,
        order: i + 1
      });
    } catch (error) {
      logger.warn(`Failed to generate section: ${sectionTitle}`, { error });
      sections.push({
        title: sectionTitle,
        content: relevantContent || `Content for ${sectionTitle} is being processed.`,
        level: 2,
        order: i + 1
      });
    }
  }

  return sections;
}

/**
 * Generate conclusion section
 */
async function generateConclusion(state: WorkflowState): Promise<DocumentSection> {
  const { analysis, config } = state;
  
  const prompt = `Generate a conclusion for a ${config.documentStyle} document about ${analysis!.topics.join(', ')}.

Key points covered:
${analysis!.keyPoints.join('\n')}

The conclusion should:
1. Summarize the main takeaways
2. Provide actionable next steps if appropriate
3. Be concise (1-2 paragraphs)
4. Leave the reader with clear understanding

Target audience: ${config.targetAudience}

Write in Markdown format.`;

  try {
    const content = await ollamaService.generateStructured(prompt, config.llmModel);
    return {
      title: 'Conclusion',
      content: cleanMarkdown(content),
      level: 1,
      order: 999
    };
  } catch (error) {
    logger.warn('Failed to generate conclusion with LLM', { error });
    return {
      title: 'Conclusion',
      content: `In this document, we explored ${analysis!.topics.join(', ')}. The key takeaways include:\n\n${analysis!.keyPoints.map(p => `- ${p}`).join('\n')}`,
      level: 1,
      order: 999
    };
  }
}

/**
 * Extract relevant content from transcript for a section
 */
function extractRelevantContent(transcript: string, sectionTitle: string, keyPoints: string[]): string {
  const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [];
  const relevantSentences: string[] = [];
  
  // Extract sentences that might be relevant to the section
  const keywords = sectionTitle.toLowerCase().split(/\s+/);
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    const isRelevant = keywords.some(keyword => 
      keyword.length > 3 && lowerSentence.includes(keyword)
    ) || keyPoints.some(point => 
      sentence.includes(point.substring(0, 20))
    );
    
    if (isRelevant) {
      relevantSentences.push(sentence.trim());
    }
  });

  // Return up to 5 most relevant sentences
  return relevantSentences.slice(0, 5).join(' ');
}

/**
 * Clean markdown content
 */
function cleanMarkdown(content: string): string {
  return content
    .trim()
    .replace(/```\s*```/g, '') // Remove empty code blocks
    .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
    .replace(/^#+\s*$/gm, ''); // Remove empty headers
}

/**
 * Generate fallback sections when LLM is not available
 */
function generateFallbackSections(state: WorkflowState): DocumentSection[] {
  const { analysis, transcript } = state;
  const sections: DocumentSection[] = [];
  
  // Introduction
  sections.push({
    title: 'Overview',
    content: `This document presents the key points from the recorded session.\n\n**Topics covered:** ${analysis?.topics.join(', ') || 'Various topics'}`,
    level: 1,
    order: 0
  });

  // Main content
  if (analysis?.keyPoints && analysis.keyPoints.length > 0) {
    sections.push({
      title: 'Key Points',
      content: analysis.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n\n'),
      level: 2,
      order: 1
    });
  }

  // Transcript
  sections.push({
    title: 'Full Transcript',
    content: `The complete transcript of the session:\n\n${transcript}`,
    level: 2,
    order: 2
  });

  return sections;
}