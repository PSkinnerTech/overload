import { secureStore } from './store';

export class MotionAuthService {
  async authenticate(apiKey?: string): Promise<boolean> {
    // If an API key is provided, save it
    if (apiKey) {
      await secureStore.saveApiKey(apiKey);
    }
    
    // Check if we have a stored API key
    const storedKey = await secureStore.getApiKey();
    if (!storedKey) {
      throw new Error('No Motion API key found. Please provide your API key.');
    }
    
    // Validate the API key by making a test request to Motion API
    try {
      // Import motionApi dynamically to avoid circular dependency
      const { motionApi } = await import('./motion-api');
      
      // Try to fetch workspaces as a simple validation
      await motionApi.getWorkspaces();
    } catch (error) {
      // Clear the invalid API key
      await secureStore.clearApiKey();
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('Invalid API key')) {
          throw new Error('Invalid API key. Please check your Motion API key and try again.');
        }
        if (error.message.includes('Network error')) {
          throw new Error('Unable to connect to Motion. Please check your internet connection.');
        }
      }
      throw new Error('Failed to validate API key: ' + (error as Error).message);
    }
    
    // Store the authentication status
    secureStore.setAuthStatus(true);
    
    return true;
  }

  async disconnect() {
    secureStore.setAuthStatus(false);
    await secureStore.clearApiKey();
  }

  async isAuthenticated(): Promise<boolean> {
    const auth = secureStore.getAuthStatus();
    const apiKey = await secureStore.getApiKey();
    return auth.isAuthenticated && !!apiKey;
  }
  
  async getApiKey(): Promise<string | null> {
    return secureStore.getApiKey();
  }
}

export const motionAuth = new MotionAuthService();