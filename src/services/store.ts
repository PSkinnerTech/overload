import Store from 'electron-store';
import { safeStorage } from 'electron';

// Extend the store schema to include encrypted tokens
interface StoreSchema {
  encryptedTokens: {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
  };
  settings: {
    syncInterval: number;
    overloadThreshold: number;
    notificationsEnabled: boolean;
  };
  auth: {
    isAuthenticated: boolean;
    motionUserId?: string;
  };
  overloadHistory: Array<{
    timestamp: number;
    index: number;
    breakdown: Record<string, number>;
  }>;
  feedback: Array<{
    timestamp: number;
    rating: number;
    index: number;
  }>;
}

class SecureStore {
  private store: Store<StoreSchema>;
  
  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: {
        encryptedTokens: {},
        settings: {
          syncInterval: 300000, // 5 minutes
          overloadThreshold: 100,
          notificationsEnabled: true,
        },
        auth: {
          isAuthenticated: false,
        },
        overloadHistory: [],
        feedback: [],
      },
      name: 'overload-config', // Explicit name to ensure consistency
    });
  }
  
  // Settings methods
  getSettings() {
    return this.store.get('settings');
  }
  
  setSetting(key: keyof StoreSchema['settings'], value: number | boolean) {
    this.store.set(`settings.${key}`, value);
  }
  
  // Auth methods
  getAuthStatus() {
    return this.store.get('auth');
  }
  
  setAuthStatus(isAuthenticated: boolean, userId?: string) {
    this.store.set('auth', {
      isAuthenticated,
      motionUserId: userId,
    });
  }
  
  // Secure token storage
  async saveTokens(accessToken: string, refreshToken: string) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available');
    }
    
    const encryptedAccess = safeStorage.encryptString(accessToken);
    const encryptedRefresh = safeStorage.encryptString(refreshToken);
    
    this.store.set('encryptedTokens.accessToken', encryptedAccess.toString('base64'));
    this.store.set('encryptedTokens.refreshToken', encryptedRefresh.toString('base64'));
  }
  
  async getTokens() {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available');
    }
    
    const tokens = this.store.get('encryptedTokens');
    const encryptedAccess = tokens?.accessToken;
    const encryptedRefresh = tokens?.refreshToken;
    
    if (!encryptedAccess || !encryptedRefresh) {
      return null;
    }
    
    try {
      const accessToken = safeStorage.decryptString(Buffer.from(encryptedAccess, 'base64'));
      const refreshToken = safeStorage.decryptString(Buffer.from(encryptedRefresh, 'base64'));
      
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Failed to decrypt tokens:', error);
      return null;
    }
  }
  
  async clearTokens() {
    this.store.set('encryptedTokens.accessToken', undefined);
    this.store.set('encryptedTokens.refreshToken', undefined);
  }
  
  // API Key methods
  async saveApiKey(apiKey: string) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available');
    }
    
    const encrypted = safeStorage.encryptString(apiKey);
    this.store.set('encryptedTokens.apiKey', encrypted.toString('base64'));
  }
  
  async getApiKey(): Promise<string | null> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available');
    }
    
    const tokens = this.store.get('encryptedTokens');
    const encrypted = tokens?.apiKey;
    
    if (!encrypted) {
      return null;
    }
    
    try {
      const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return null;
    }
  }
  
  async clearApiKey() {
    this.store.set('encryptedTokens.apiKey', undefined);
  }
  
  // Overload history methods
  addOverloadEntry(entry: StoreSchema['overloadHistory'][0]) {
    const history = this.store.get('overloadHistory');
    history.push(entry);
    
    // Keep only last 30 days of history
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(h => h.timestamp > thirtyDaysAgo);
    
    this.store.set('overloadHistory', filteredHistory);
  }
  
  getOverloadHistory(days: number) {
    const history = this.store.get('overloadHistory');
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    return history.filter(h => h.timestamp > cutoffTime);
  }
  
  // Feedback methods
  addFeedback(rating: number, currentIndex: number) {
    const feedback = this.store.get('feedback');
    feedback.push({
      timestamp: Date.now(),
      rating,
      index: currentIndex,
    });
    
    this.store.set('feedback', feedback);
  }
  
  getFeedback() {
    return this.store.get('feedback');
  }
  
  // Clear all data
  clearAll() {
    this.store.clear();
  }
}

export const secureStore = new SecureStore();