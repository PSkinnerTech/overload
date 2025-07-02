import { EventEmitter } from 'events';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { runDocumentWorkflow, createSimpleDocumentWorkflow } from '../workflows/document-workflow';
import { WorkflowState } from '../workflows/types';
import { ollamaService } from './ollama-service';

export interface ProcessingOptions {
  generateDiagrams?: boolean;
  targetAudience?: 'beginner' | 'intermediate' | 'expert';
  documentStyle?: 'technical' | 'tutorial' | 'reference';
  useSimpleMode?: boolean; // Skip LLM features
}

export interface ProcessingResult {
  success: boolean;
  documentPath?: string;
  cognitiveLoadIndex?: number;
  processingTime?: number;
  errors?: string[];
  warnings?: string[];
}

class DocumentProcessor extends EventEmitter {
  private documentsDir: string;
  private isProcessing = false;

  constructor() {
    super();
    
    // Create documents directory
    this.documentsDir = path.join(app.getPath('userData'), 'documents');
    if (!fs.existsSync(this.documentsDir)) {
      fs.mkdirSync(this.documentsDir, { recursive: true });
    }
    
    logger.info('Document processor initialized', { documentsDir: this.documentsDir });
  }

  /**
   * Process a transcript into a structured document
   */
  async processTranscript(
    sessionId: string,
    transcript: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    if (this.isProcessing) {
      return {
        success: false,
        errors: ['Document processing already in progress']
      };
    }

    this.isProcessing = true;
    this.emit('processing-started', { sessionId });

    try {
      // Check if Ollama is available (unless in simple mode)
      if (!options.useSimpleMode) {
        const ollamaAvailable = await ollamaService.isAvailable();
        if (!ollamaAvailable) {
          logger.warn('Ollama not available, falling back to simple mode');
          options.useSimpleMode = true;
          this.emit('processing-warning', {
            warning: 'Ollama not available. Using simple document generation.'
          });
        }
      }

      // Run the appropriate workflow
      const workflowState = await this.runWorkflow(transcript, options);

      // Save the document
      const documentPath = await this.saveDocument(sessionId, workflowState);

      // Emit completion event
      this.emit('processing-completed', {
        sessionId,
        documentPath,
        cognitiveLoadIndex: workflowState.cognitiveLoadIndex
      });

      return {
        success: true,
        documentPath,
        cognitiveLoadIndex: workflowState.cognitiveLoadIndex,
        processingTime: workflowState.processingTime,
        warnings: workflowState.warnings
      };
    } catch (error) {
      logger.error('Document processing failed', {
        sessionId,
        error: (error as Error).message
      });

      this.emit('processing-failed', {
        sessionId,
        error: (error as Error).message
      });

      return {
        success: false,
        errors: [(error as Error).message]
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Run the document workflow
   */
  private async runWorkflow(
    transcript: string,
    options: ProcessingOptions
  ): Promise<WorkflowState> {
    const config: WorkflowState['config'] = {
      generateDiagrams: options.generateDiagrams ?? true,
      targetAudience: options.targetAudience ?? 'intermediate',
      documentStyle: options.documentStyle ?? 'technical',
      maxSectionLength: 500,
      llmProvider: 'ollama',
      llmModel: 'llama3'
    };

    if (options.useSimpleMode) {
      // Use simple workflow without LLM
      logger.info('Running simple document workflow');
      const app = createSimpleDocumentWorkflow();
      
      // Create minimal state for simple workflow
      const initialState: Partial<WorkflowState> = {
        sessionId: `doc_${Date.now()}`,
        transcript,
        segments: [],
        errors: [],
        warnings: ['Document generated without AI analysis'],
        config,
        // Provide basic document sections
        documentSections: [
          {
            title: 'Transcript',
            content: transcript,
            level: 1,
            order: 0
          }
        ]
      };

      return await app.invoke(initialState) as WorkflowState;
    } else {
      // Use full workflow with LLM
      logger.info('Running full document workflow');
      return await runDocumentWorkflow(transcript, config);
    }
  }

  /**
   * Save the generated document
   */
  private async saveDocument(
    sessionId: string,
    state: WorkflowState
  ): Promise<string> {
    if (!state.finalDocument) {
      throw new Error('No document generated');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${sessionId}_${timestamp}.md`;
    const filepath = path.join(this.documentsDir, filename);

    await fs.promises.writeFile(filepath, state.finalDocument, 'utf8');
    
    logger.info('Document saved', {
      sessionId,
      filepath,
      size: state.finalDocument.length
    });

    return filepath;
  }

  /**
   * Get the path to a saved document
   */
  getDocumentPath(filename: string): string {
    return path.join(this.documentsDir, filename);
  }

  /**
   * List saved documents
   */
  async listDocuments(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.documentsDir);
      return files.filter(f => f.endsWith('.md')).sort().reverse();
    } catch (error) {
      logger.error('Failed to list documents', { error });
      return [];
    }
  }

  /**
   * Delete old documents (keep last 30 days)
   */
  async cleanupOldDocuments(): Promise<void> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    try {
      const files = await fs.promises.readdir(this.documentsDir);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const filepath = path.join(this.documentsDir, file);
          const stats = await fs.promises.stat(filepath);
          
          if (stats.mtimeMs < thirtyDaysAgo) {
            await fs.promises.unlink(filepath);
            logger.info('Deleted old document', { file });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup old documents', { error });
    }
  }
}

// Create singleton instance
export const documentProcessor = new DocumentProcessor();

// Schedule daily cleanup
setInterval(() => {
  documentProcessor.cleanupOldDocuments().catch(error => {
    logger.error('Document cleanup failed', { error });
  });
}, 24 * 60 * 60 * 1000);