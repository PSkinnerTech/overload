import { WorkflowState } from '../types';
import { logger } from '../../services/logger';

/**
 * Assembly Node
 * Combines all generated parts into a final Markdown document
 */
export async function assemblyNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const startTime = Date.now();
  logger.info('Assembly node started', { sessionId: state.sessionId });

  try {
    const { documentSections, diagrams, analysis, config } = state;
    
    if (!documentSections || documentSections.length === 0) {
      throw new Error('No document sections available for assembly');
    }

    // Sort sections by order
    const sortedSections = [...documentSections].sort((a, b) => a.order - b.order);
    
    // Build the final document
    const documentParts: string[] = [];
    
    // Add metadata header
    documentParts.push(generateMetadataHeader(state));
    
    // Add table of contents
    if (sortedSections.length > 3) {
      documentParts.push(generateTableOfContents(sortedSections));
    }

    // Add each section with diagrams inserted appropriately
    for (const section of sortedSections) {
      // Add section content
      documentParts.push(formatSection(section));
      
      // Insert relevant diagrams after appropriate sections
      if (diagrams && diagrams.length > 0) {
        const relevantDiagrams = findRelevantDiagrams(section, diagrams);
        for (const diagram of relevantDiagrams) {
          documentParts.push(formatDiagram(diagram));
        }
      }
    }

    // Add footer with generation info
    documentParts.push(generateFooter(state));

    const finalDocument = documentParts.join('\n\n');
    
    const processingTime = Date.now() - startTime;
    logger.info('Assembly node completed', { 
      sessionId: state.sessionId,
      documentLength: finalDocument.length,
      duration: processingTime 
    });

    return {
      finalDocument,
      processingTime: state.processingTime ? state.processingTime + processingTime : processingTime
    };
  } catch (error) {
    logger.error('Assembly node failed', { 
      sessionId: state.sessionId,
      error: (error as Error).message 
    });
    
    // Fallback: create a simple document with available content
    const fallbackDocument = createFallbackDocument(state);
    
    return {
      finalDocument: fallbackDocument,
      errors: [...state.errors, `Assembly failed: ${(error as Error).message}`]
    };
  }
}

/**
 * Generate metadata header for the document
 */
function generateMetadataHeader(state: WorkflowState): string {
  const { analysis, sessionId } = state;
  const date = new Date().toISOString().split('T')[0];
  
  const metadata = [
    '---',
    `title: "${analysis?.topics.join(', ') || 'Transcribed Document'}"`,
    `date: ${date}`,
    `sessionId: ${sessionId}`,
    `complexity: ${analysis?.complexity || 'unknown'}`,
    `contentType: ${analysis?.contentType || 'unknown'}`,
    '---'
  ];

  return metadata.join('\n');
}

/**
 * Generate table of contents
 */
function generateTableOfContents(sections: typeof WorkflowState.prototype.documentSections): string {
  const toc = ['## Table of Contents\n'];
  
  sections!.forEach(section => {
    const indent = '  '.repeat(Math.max(0, section.level - 1));
    const anchor = section.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    toc.push(`${indent}- [${section.title}](#${anchor})`);
  });

  return toc.join('\n');
}

/**
 * Format a section with proper markdown
 */
function formatSection(section: typeof WorkflowState.prototype.documentSections![0]): string {
  const heading = '#'.repeat(section.level) + ' ' + section.title;
  return `${heading}\n\n${section.content}`;
}

/**
 * Format a diagram with Mermaid syntax
 */
function formatDiagram(diagram: typeof WorkflowState.prototype.diagrams![0]): string {
  const parts = [
    `### ${diagram.title}`,
    '',
    diagram.description,
    '',
    '```mermaid',
    diagram.mermaidCode,
    '```'
  ];

  return parts.join('\n');
}

/**
 * Find diagrams relevant to a section
 */
function findRelevantDiagrams(
  section: typeof WorkflowState.prototype.documentSections![0],
  diagrams: typeof WorkflowState.prototype.diagrams
): typeof WorkflowState.prototype.diagrams {
  if (!diagrams) return [];
  
  // Simple relevance check based on title and content
  return diagrams.filter(diagram => {
    const sectionText = (section.title + ' ' + section.content).toLowerCase();
    
    // Check if diagram type matches section content
    if (diagram.type === 'flowchart' && sectionText.includes('process')) return true;
    if (diagram.type === 'sequence' && sectionText.includes('interaction')) return true;
    if (diagram.type === 'state' && sectionText.includes('state')) return true;
    
    // Check if it's a mindmap and this is the intro or overview
    if (diagram.type === 'mindmap' && section.order === 0) return true;
    
    return false;
  });
}

/**
 * Generate document footer
 */
function generateFooter(state: WorkflowState): string {
  const { processingTime, warnings } = state;
  const footer = ['---', ''];
  
  footer.push('*This document was automatically generated by Aurix.*');
  
  if (processingTime) {
    footer.push(`*Processing time: ${(processingTime / 1000).toFixed(2)} seconds*`);
  }

  if (warnings && warnings.length > 0) {
    footer.push('', '### Generation Notes');
    warnings.forEach(warning => {
      footer.push(`- ⚠️ ${warning}`);
    });
  }

  return footer.join('\n');
}

/**
 * Create fallback document when assembly fails
 */
function createFallbackDocument(state: WorkflowState): string {
  const parts = [
    '# Transcribed Document',
    '',
    `*Generated on ${new Date().toLocaleDateString()}*`,
    ''
  ];

  // Add analysis summary if available
  if (state.analysis) {
    parts.push('## Summary', '');
    parts.push(`**Topics:** ${state.analysis.topics.join(', ')}`);
    parts.push(`**Complexity:** ${state.analysis.complexity}`);
    parts.push(`**Type:** ${state.analysis.contentType}`);
    parts.push('');
    
    if (state.analysis.keyPoints.length > 0) {
      parts.push('### Key Points', '');
      state.analysis.keyPoints.forEach(point => {
        parts.push(`- ${point}`);
      });
      parts.push('');
    }
  }

  // Add sections if available
  if (state.documentSections && state.documentSections.length > 0) {
    state.documentSections.forEach(section => {
      parts.push(formatSection(section), '');
    });
  } else if (state.transcript) {
    // Fallback to raw transcript
    parts.push('## Transcript', '', state.transcript);
  }

  // Add any diagrams
  if (state.diagrams && state.diagrams.length > 0) {
    parts.push('', '## Diagrams', '');
    state.diagrams.forEach(diagram => {
      parts.push(formatDiagram(diagram), '');
    });
  }

  return parts.join('\n');
}