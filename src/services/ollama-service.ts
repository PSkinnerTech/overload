import { logger } from './logger';
import fetch from 'electron-fetch';

export interface OllamaOptions {
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

class OllamaService {
  private baseUrl: string;
  private defaultModel: string;

  constructor(options: OllamaOptions = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.defaultModel = options.model || 'llama3';
    logger.info('Ollama service initialized', { baseUrl: this.baseUrl, model: this.defaultModel });
  }

  /**
   * Check if Ollama is running
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      logger.warn('Ollama not available', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      logger.error('Failed to list Ollama models', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * Generate a completion
   */
  async generate(prompt: string, model?: string, options: OllamaOptions = {}): Promise<string> {
    const selectedModel = model || this.defaultModel;
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 1000,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      logger.error('Ollama generation failed', { 
        error: (error as Error).message,
        model: selectedModel 
      });
      throw error;
    }
  }

  /**
   * Analyze content using Ollama
   */
  async analyze(prompt: string, model?: string): Promise<string> {
    // Check if Ollama is available
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      throw new Error('Ollama is not running. Please start Ollama to use local LLM features.');
    }

    return this.generate(prompt, model, {
      temperature: 0.3, // Lower temperature for more consistent analysis
      maxTokens: 1500
    });
  }

  /**
   * Generate structured content
   */
  async generateStructured(prompt: string, model?: string): Promise<string> {
    return this.generate(prompt, model, {
      temperature: 0.5,
      maxTokens: 2000
    });
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.includes(modelName);
  }

  /**
   * Pull a model if not available
   */
  async pullModel(modelName: string): Promise<void> {
    logger.info('Pulling Ollama model', { model: modelName });
    
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      logger.info('Ollama model pulled successfully', { model: modelName });
    } catch (error) {
      logger.error('Failed to pull Ollama model', { 
        error: (error as Error).message,
        model: modelName 
      });
      throw error;
    }
  }
}

// Create singleton instance
export const ollamaService = new OllamaService();