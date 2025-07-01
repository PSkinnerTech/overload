import { contextBridge, ipcRenderer } from 'electron';

// Define the API that will be exposed to the renderer process
const overloadApi = {
  // OAuth-related methods
  auth: {
    connectMotion: (apiKey?: string) => ipcRenderer.invoke('auth:connect-motion', apiKey),
    disconnect: () => ipcRenderer.invoke('auth:disconnect'),
    getAuthStatus: () => ipcRenderer.invoke('auth:get-status'),
  },
  
  // Data sync methods
  sync: {
    triggerSync: () => ipcRenderer.invoke('sync:trigger'),
    getSyncStatus: () => ipcRenderer.invoke('sync:get-status'),
    getCachedData: () => ipcRenderer.invoke('sync:get-cached-data'),
    useMockData: () => ipcRenderer.invoke('sync:use-mock-data'),
  },
  
  // Overload Index methods
  overloadIndex: {
    getCurrent: () => ipcRenderer.invoke('overload:get-current'),
    getHistory: (days: number) => ipcRenderer.invoke('overload:get-history', days),
    getBreakdown: () => ipcRenderer.invoke('overload:get-breakdown'),
  },
  
  // Settings methods
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: number | boolean) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:get-all'),
  },
  
  // Feedback methods
  feedback: {
    submit: (rating: number) => ipcRenderer.invoke('feedback:submit', rating),
  },
  
  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'sync:progress',
      'sync:completed',
      'auth:status-changed',
      'overload:index-updated',
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('overloadApi', overloadApi);

// Type definitions for TypeScript
export type OverloadApi = typeof overloadApi;
