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
  
  // Audio recording methods
  audio: {
    startRecording: () => ipcRenderer.invoke('audio:start-recording'),
    stopRecording: () => ipcRenderer.invoke('audio:stop-recording'),
    pauseRecording: () => ipcRenderer.invoke('audio:pause-recording'),
    resumeRecording: () => ipcRenderer.invoke('audio:resume-recording'),
    getState: () => ipcRenderer.invoke('audio:get-state'),
    sendChunk: (chunk: Float32Array) => ipcRenderer.invoke('audio:send-chunk', chunk),
  },
  
  // Transcription methods
  transcription: {
    start: (sessionId: string) => ipcRenderer.invoke('transcription:start', sessionId),
    stop: () => ipcRenderer.invoke('transcription:stop'),
    setPrivacyMode: (enabled: boolean) => ipcRenderer.invoke('transcription:set-privacy-mode', enabled),
    getStatus: () => ipcRenderer.invoke('transcription:get-status'),
    webSpeechResult: (result: any) => ipcRenderer.invoke('transcription:web-speech-result', result),
  },
  
  // Document processing methods
  document: {
    process: (sessionId: string, transcript: string, options?: any) => 
      ipcRenderer.invoke('document:process', sessionId, transcript, options),
    list: () => ipcRenderer.invoke('document:list'),
    open: (filename: string) => ipcRenderer.invoke('document:open', filename),
  },
  
  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'sync:progress',
      'sync:completed',
      'auth:status-changed',
      'overload:index-updated',
      'audio:recording-started',
      'audio:recording-stopped',
      'audio:level-update',
      'transcription:started',
      'transcription:stopped',
      'transcription:result',
      'transcription:start-web-speech',
      'transcription:stop-web-speech',
      'transcription:mode-switched',
      'document:processing-started',
      'document:processing-completed',
      'document:processing-warning',
      'document:processing-failed',
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
