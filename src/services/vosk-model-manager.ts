import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { logger } from './logger';

export interface VoskModel {
  name: string;
  url: string;
  size: number;
  language: string;
}

const VOSK_MODELS: VoskModel[] = [
  {
    name: 'vosk-model-small-en-us-0.15',
    url: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip',
    size: 40 * 1024 * 1024, // 40MB
    language: 'en-US'
  }
];

class VoskModelManager extends EventEmitter {
  private modelsDir: string;
  private currentModel: string | null = null;

  constructor() {
    super();
    this.modelsDir = path.join(app.getPath('userData'), 'vosk-models');
    
    // Ensure models directory exists
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
    
    logger.info('Vosk model manager initialized', { modelsDir: this.modelsDir });
  }

  /**
   * Check if a model is installed
   */
  isModelInstalled(modelName: string): boolean {
    const modelPath = path.join(this.modelsDir, modelName);
    return fs.existsSync(modelPath);
  }

  /**
   * Get the path to an installed model
   */
  getModelPath(modelName: string): string {
    return path.join(this.modelsDir, modelName);
  }

  /**
   * Ensure a model is available, downloading if necessary
   */
  async ensureModel(modelName: string): Promise<string> {
    const modelPath = this.getModelPath(modelName);
    
    if (this.isModelInstalled(modelName)) {
      logger.info('Vosk model already installed', { modelName, modelPath });
      return modelPath;
    }

    // In a real implementation, this would download the model
    logger.warn('Vosk model download not implemented', { modelName });
    
    // For now, throw an error to indicate the model is not available
    throw new Error(`Vosk model ${modelName} not available. Native module integration pending.`);
  }

  /**
   * Download a model (stub implementation)
   */
  async downloadModel(modelName: string): Promise<void> {
    const model = VOSK_MODELS.find(m => m.name === modelName);
    if (!model) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    logger.info('Vosk model download requested', { model });
    
    // Emit progress events
    this.emit('download-start', { model });
    
    // In a real implementation, this would:
    // 1. Download the model from the URL
    // 2. Extract the ZIP file
    // 3. Verify the model files
    // 4. Emit progress events
    
    logger.warn('Vosk model download not implemented due to native module issues');
    this.emit('download-error', { 
      model, 
      error: 'Vosk native module integration pending' 
    });
  }

  /**
   * List available models
   */
  getAvailableModels(): VoskModel[] {
    return [...VOSK_MODELS];
  }

  /**
   * List installed models
   */
  getInstalledModels(): string[] {
    try {
      return fs.readdirSync(this.modelsDir)
        .filter(file => fs.statSync(path.join(this.modelsDir, file)).isDirectory());
    } catch (error) {
      logger.error('Failed to list installed models', { error });
      return [];
    }
  }

  /**
   * Set the current active model
   */
  setCurrentModel(modelName: string): void {
    if (!this.isModelInstalled(modelName)) {
      throw new Error(`Model ${modelName} is not installed`);
    }
    this.currentModel = modelName;
    logger.info('Vosk model selected', { modelName });
  }

  /**
   * Get the current active model
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }
}

// Create singleton instance
export const voskModelManager = new VoskModelManager();