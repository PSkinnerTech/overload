import { StateGraph, Annotation } from '@langchain/langgraph';
import { WorkflowState } from './types';
import { transcriptionNode } from './nodes/transcription-node';
import { analysisNode } from './nodes/analysis-node';
import { documentGenerationNode } from './nodes/document-generation-node';
import { diagramGenerationNode } from './nodes/diagram-generation-node';
import { assemblyNode } from './nodes/assembly-node';
import { cognitiveLoadNode } from './nodes/cognitive-load-node';
import { logger } from '../services/logger';

// Define the state annotation for LangGraph
const WorkflowAnnotation = Annotation.Root({
  // Input data
  sessionId: Annotation<string>(),
  transcript: Annotation<string>(),
  segments: Annotation<WorkflowState['segments']>(),
  
  // Analysis results
  analysis: Annotation<WorkflowState['analysis']>(),
  
  // Generated content
  documentSections: Annotation<WorkflowState['documentSections']>(),
  diagrams: Annotation<WorkflowState['diagrams']>(),
  
  // Final outputs
  finalDocument: Annotation<WorkflowState['finalDocument']>(),
  cognitiveLoadIndex: Annotation<WorkflowState['cognitiveLoadIndex']>(),
  cognitiveMetrics: Annotation<WorkflowState['cognitiveMetrics']>(),
  
  // Metadata
  processingTime: Annotation<WorkflowState['processingTime']>(),
  errors: Annotation<string[]>({
    reducer: (a, b) => [...(a || []), ...(b || [])],
    default: () => []
  }),
  warnings: Annotation<string[]>({
    reducer: (a, b) => [...(a || []), ...(b || [])],
    default: () => []
  }),
  
  // Configuration
  config: Annotation<WorkflowState['config']>(),
});

/**
 * Create the document processing workflow
 */
export function createDocumentWorkflow() {
  // Create the graph
  const workflow = new StateGraph(WorkflowAnnotation)
    // Add nodes
    .addNode('transcription', transcriptionNode)
    .addNode('analysis', analysisNode)
    .addNode('documentGeneration', documentGenerationNode)
    .addNode('diagramGeneration', diagramGenerationNode)
    .addNode('assembly', assemblyNode)
    .addNode('cognitiveLoad', cognitiveLoadNode)
    
    // Add edges
    .addEdge('transcription', 'analysis')
    .addEdge('analysis', 'documentGeneration')
    .addEdge('analysis', 'diagramGeneration')
    .addConditionalEdges(
      'documentGeneration',
      // Wait for both document and diagram generation
      (state) => {
        // If diagrams are disabled, go straight to assembly
        if (!state.config.generateDiagrams) {
          return 'assembly';
        }
        // Otherwise, wait for diagram generation
        return 'waitForDiagrams';
      },
      {
        assembly: 'assembly',
        waitForDiagrams: 'assembly'
      }
    )
    .addEdge('diagramGeneration', 'assembly')
    .addEdge('assembly', 'cognitiveLoad')
    
    // Set entry point
    .setEntryPoint('transcription');

  // Compile the workflow
  return workflow.compile();
}

/**
 * Run the document workflow
 */
export async function runDocumentWorkflow(
  transcript: string,
  config: Partial<WorkflowState['config']> = {}
): Promise<WorkflowState> {
  const sessionId = `doc_${Date.now()}`;
  logger.info('Starting document workflow', { sessionId });

  // Default configuration
  const defaultConfig: WorkflowState['config'] = {
    generateDiagrams: true,
    targetAudience: 'intermediate',
    documentStyle: 'technical',
    maxSectionLength: 500,
    llmProvider: 'ollama',
    llmModel: 'llama3'
  };

  // Initial state
  const initialState: Partial<WorkflowState> = {
    sessionId,
    transcript,
    segments: [],
    errors: [],
    warnings: [],
    config: { ...defaultConfig, ...config }
  };

  try {
    // Create and run the workflow
    const app = createDocumentWorkflow();
    const finalState = await app.invoke(initialState);

    logger.info('Document workflow completed', {
      sessionId,
      hasDocument: !!finalState.finalDocument,
      cognitiveLoad: finalState.cognitiveLoadIndex,
      errors: finalState.errors.length,
      warnings: finalState.warnings.length
    });

    return finalState as WorkflowState;
  } catch (error) {
    logger.error('Document workflow failed', {
      sessionId,
      error: (error as Error).message
    });

    // Return error state
    return {
      ...initialState,
      errors: [`Workflow failed: ${(error as Error).message}`],
      warnings: []
    } as WorkflowState;
  }
}

/**
 * Create a simple workflow for testing without LLM
 */
export function createSimpleDocumentWorkflow() {
  // Create a simplified graph that skips LLM-dependent nodes
  const workflow = new StateGraph(WorkflowAnnotation)
    .addNode('transcription', transcriptionNode)
    .addNode('assembly', assemblyNode)
    .addNode('cognitiveLoad', cognitiveLoadNode)
    
    // Simple linear flow
    .addEdge('transcription', 'assembly')
    .addEdge('assembly', 'cognitiveLoad')
    
    .setEntryPoint('transcription');

  return workflow.compile();
}