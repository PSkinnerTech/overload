import { WorkflowState, DiagramSpec } from '../types';
import { logger } from '../../services/logger';
import { ollamaService } from '../../services/ollama-service';

/**
 * Diagram Generation Node
 * Detects opportunities for diagrams and generates Mermaid code
 */
export async function diagramGenerationNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const startTime = Date.now();
  logger.info('Diagram generation node started', { sessionId: state.sessionId });

  try {
    if (!state.config.generateDiagrams) {
      logger.info('Diagram generation disabled', { sessionId: state.sessionId });
      return {};
    }

    const diagrams: DiagramSpec[] = [];
    
    // Detect diagram opportunities in the transcript
    const opportunities = detectDiagramOpportunities(state);
    
    // Generate diagrams for each opportunity
    for (const opportunity of opportunities) {
      try {
        const diagram = await generateDiagram(opportunity, state);
        if (diagram && isValidMermaid(diagram.mermaidCode)) {
          diagrams.push(diagram);
        }
      } catch (error) {
        logger.warn('Failed to generate diagram', { 
          type: opportunity.type,
          error: (error as Error).message 
        });
      }
    }

    const processingTime = Date.now() - startTime;
    logger.info('Diagram generation node completed', { 
      sessionId: state.sessionId,
      diagramCount: diagrams.length,
      duration: processingTime 
    });

    return {
      diagrams,
      processingTime: state.processingTime ? state.processingTime + processingTime : processingTime
    };
  } catch (error) {
    logger.error('Diagram generation node failed', { 
      sessionId: state.sessionId,
      error: (error as Error).message 
    });
    
    return {
      warnings: [...state.warnings, `Diagram generation failed: ${(error as Error).message}`]
    };
  }
}

interface DiagramOpportunity {
  type: DiagramSpec['type'];
  context: string;
  keywords: string[];
}

/**
 * Detect opportunities for diagrams in the content
 */
function detectDiagramOpportunities(state: WorkflowState): DiagramOpportunity[] {
  const { transcript, analysis } = state;
  const opportunities: DiagramOpportunity[] = [];
  
  // Check for flowchart indicators
  if (containsFlowIndicators(transcript)) {
    opportunities.push({
      type: 'flowchart',
      context: extractFlowContext(transcript),
      keywords: ['process', 'flow', 'steps', 'procedure', 'workflow']
    });
  }

  // Check for sequence diagram indicators
  if (containsSequenceIndicators(transcript)) {
    opportunities.push({
      type: 'sequence',
      context: extractSequenceContext(transcript),
      keywords: ['interaction', 'communication', 'sequence', 'order']
    });
  }

  // Check for state diagram indicators
  if (containsStateIndicators(transcript)) {
    opportunities.push({
      type: 'state',
      context: extractStateContext(transcript),
      keywords: ['state', 'transition', 'status', 'condition']
    });
  }

  // Check for mindmap indicators based on topics
  if (analysis && analysis.topics.length > 3) {
    opportunities.push({
      type: 'mindmap',
      context: `Topics: ${analysis.topics.join(', ')}`,
      keywords: analysis.topics
    });
  }

  return opportunities.slice(0, 3); // Limit to 3 diagrams max
}

/**
 * Generate a diagram based on the opportunity
 */
async function generateDiagram(
  opportunity: DiagramOpportunity,
  state: WorkflowState
): Promise<DiagramSpec | null> {
  const prompt = createDiagramPrompt(opportunity, state);
  
  try {
    const response = await ollamaService.generateStructured(prompt, state.config.llmModel);
    const mermaidCode = extractMermaidCode(response);
    
    if (!mermaidCode) {
      return null;
    }

    return {
      type: opportunity.type,
      title: generateDiagramTitle(opportunity),
      description: `${opportunity.type} diagram illustrating ${opportunity.keywords.join(', ')}`,
      mermaidCode
    };
  } catch (error) {
    logger.error('Failed to generate diagram with LLM', { error });
    return generateFallbackDiagram(opportunity);
  }
}

/**
 * Create prompt for diagram generation
 */
function createDiagramPrompt(opportunity: DiagramOpportunity, state: WorkflowState): string {
  const diagramExamples = {
    flowchart: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
    
    sequence: `sequenceDiagram
    participant A as User
    participant B as System
    A->>B: Request
    B-->>A: Response`,
    
    state: `stateDiagram-v2
    [*] --> State1
    State1 --> State2
    State2 --> [*]`,
    
    mindmap: `mindmap
  root((Main Topic))
    Topic1
      Subtopic1
      Subtopic2
    Topic2
      Subtopic3`,
    
    class: `classDiagram
    class Class1 {
      +attribute1
      +method1()
    }`,
    
    er: `erDiagram
    ENTITY1 ||--o{ ENTITY2 : relationship`
  };

  return `Generate a Mermaid ${opportunity.type} diagram based on the following context:

Context: ${opportunity.context}
Keywords: ${opportunity.keywords.join(', ')}

Example ${opportunity.type} diagram syntax:
\`\`\`mermaid
${diagramExamples[opportunity.type]}
\`\`\`

Generate a complete, valid Mermaid diagram that accurately represents the content. 
The diagram should be:
1. Syntactically correct Mermaid code
2. Meaningful and related to the context
3. Not overly complex (5-10 nodes/elements maximum)
4. Well-labeled with clear, concise text

Return ONLY the Mermaid code block, nothing else.`;
}

/**
 * Extract Mermaid code from LLM response
 */
function extractMermaidCode(response: string): string | null {
  // Try to extract code block
  const codeBlockMatch = response.match(/```(?:mermaid)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to extract raw mermaid code
  const mermaidPatterns = [
    /^(flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram|mindmap)/m,
  ];

  for (const pattern of mermaidPatterns) {
    if (pattern.test(response)) {
      // Extract from the pattern match to the end or next non-diagram line
      const lines = response.split('\n');
      const startIdx = lines.findIndex(line => pattern.test(line));
      if (startIdx !== -1) {
        const diagramLines = [];
        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line && !line.startsWith('##') && !line.includes('Generate')) {
            diagramLines.push(line);
          } else if (diagramLines.length > 0) {
            break;
          }
        }
        return diagramLines.join('\n');
      }
    }
  }

  return null;
}

/**
 * Validate Mermaid syntax (basic check)
 */
function isValidMermaid(code: string): boolean {
  const validStarts = [
    'flowchart', 'graph', 'sequenceDiagram', 
    'stateDiagram', 'classDiagram', 'erDiagram', 
    'mindmap', 'gitGraph'
  ];
  
  return validStarts.some(start => code.trim().startsWith(start));
}

/**
 * Generate fallback diagram
 */
function generateFallbackDiagram(opportunity: DiagramOpportunity): DiagramSpec | null {
  const fallbackDiagrams: Record<DiagramSpec['type'], string> = {
    flowchart: `flowchart TD
    A[Start] --> B[Process]
    B --> C{Complete?}
    C -->|Yes| D[End]
    C -->|No| B`,
    
    sequence: `sequenceDiagram
    participant User
    participant System
    User->>System: Action
    System-->>User: Response`,
    
    state: `stateDiagram-v2
    [*] --> Active
    Active --> Inactive
    Inactive --> Active
    Inactive --> [*]`,
    
    mindmap: `mindmap
  root((${opportunity.keywords[0] || 'Topic'}))
    ${opportunity.keywords.slice(1, 4).map(k => `    ${k}`).join('\n')}`,
    
    class: `classDiagram
    class MainClass {
      +attributes
      +methods()
    }`,
    
    er: `erDiagram
    ENTITY1 {
      string id
      string name
    }
    ENTITY1 ||--o{ ENTITY2 : has`
  };

  return {
    type: opportunity.type,
    title: generateDiagramTitle(opportunity),
    description: `Basic ${opportunity.type} diagram`,
    mermaidCode: fallbackDiagrams[opportunity.type]
  };
}

// Helper functions for detecting diagram opportunities
function containsFlowIndicators(text: string): boolean {
  const indicators = ['step', 'process', 'flow', 'then', 'after', 'before', 'workflow', 'procedure'];
  const lower = text.toLowerCase();
  return indicators.some(ind => lower.includes(ind));
}

function containsSequenceIndicators(text: string): boolean {
  const indicators = ['request', 'response', 'send', 'receive', 'interact', 'communication'];
  const lower = text.toLowerCase();
  return indicators.some(ind => lower.includes(ind));
}

function containsStateIndicators(text: string): boolean {
  const indicators = ['state', 'status', 'transition', 'change', 'mode', 'condition'];
  const lower = text.toLowerCase();
  return indicators.some(ind => lower.includes(ind));
}

function extractFlowContext(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences
    .filter(s => /step|process|flow|then/i.test(s))
    .slice(0, 3)
    .join(' ');
}

function extractSequenceContext(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences
    .filter(s => /request|response|send|receive/i.test(s))
    .slice(0, 3)
    .join(' ');
}

function extractStateContext(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  return sentences
    .filter(s => /state|status|transition/i.test(s))
    .slice(0, 3)
    .join(' ');
}

function generateDiagramTitle(opportunity: DiagramOpportunity): string {
  const titles: Record<DiagramSpec['type'], string> = {
    flowchart: 'Process Flow',
    sequence: 'Interaction Sequence',
    state: 'State Transitions',
    mindmap: 'Concept Map',
    class: 'Class Structure',
    er: 'Entity Relationships'
  };
  
  return titles[opportunity.type] || 'Diagram';
}