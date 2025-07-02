import { ipcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import { secureStore } from '../services/store';
import { motionAuth } from '../services/motion-auth-simple';
import { motionSync } from '../services/motion-sync';
import { runOverloadAnalysis } from '../workflows/overload-workflow';
import { logger } from '../services/logger';
import { audioRecorder } from '../services/audio-recorder';
import { hybridTranscription } from '../services/hybrid-transcription';
import { documentProcessor } from '../services/document-processor';

export function setupIpcHandlers() {
  logger.info('Setting up IPC handlers');
  
  // Set up sync event forwarding
  motionSync.on('sync:progress', (status) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('sync:progress', status);
    });
  });
  
  motionSync.on('sync:completed', (status) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('sync:completed', status);
    });
  });
  // Auth handlers
  ipcMain.handle('auth:connect-motion', async (event, apiKey?: string) => {
    logger.info('Attempting Motion authentication', { hasApiKey: !!apiKey });
    try {
      const success = await motionAuth.authenticate(apiKey);
      if (success) {
        logger.info('Motion authentication successful');
        // Start initial sync after authentication
        motionSync.performInitialSync().catch(error => {
          logger.error('Initial sync failed', { error: error.message });
        });
      } else {
        logger.warn('Motion authentication failed');
      }
      return { success };
    } catch (error) {
      logger.error('Motion authentication error', { error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  });
  
  ipcMain.handle('auth:disconnect', async () => {
    logger.info('Disconnecting from Motion');
    await motionAuth.disconnect();
    return { success: true };
  });
  
  ipcMain.handle('auth:get-status', async () => {
    return secureStore.getAuthStatus();
  });
  
  // Sync handlers
  ipcMain.handle('sync:trigger', async () => {
    logger.info('Manual sync triggered');
    try {
      await motionSync.performInitialSync();
      return { success: true };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
  
  // Mock data handler
  ipcMain.handle('sync:use-mock-data', async () => {
    try {
      await motionSync.useMockData();
      return { success: true };
    } catch (error) {
      console.error('Mock data injection failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
  
  ipcMain.handle('sync:get-status', async () => {
    return motionSync.getSyncStatus();
  });
  
  ipcMain.handle('sync:get-cached-data', async () => {
    return motionSync.getCachedData();
  });
  
  // Overload Index handlers
  ipcMain.handle('overload:get-current', async () => {
    try {
      // Get the most recent calculation from history
      const history = secureStore.getOverloadHistory(1);
      if (history.length > 0) {
        return history[0];
      }
      
      // If no history, trigger a new calculation
      const result = await runOverloadAnalysis();
      if (result.overloadIndex) {
        return {
          index: result.overloadIndex.value,
          timestamp: result.overloadIndex.timestamp.getTime(),
          breakdown: result.overloadIndex.factors
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get current overload index:', error);
      return null;
    }
  });
  
  ipcMain.handle('overload:get-history', async (event, days: number) => {
    return secureStore.getOverloadHistory(days);
  });
  
  ipcMain.handle('overload:get-breakdown', async () => {
    try {
      const history = secureStore.getOverloadHistory(1);
      if (history.length > 0) {
        return history[0].breakdown;
      }
      return null;
    } catch (error) {
      console.error('Failed to get breakdown:', error);
      return null;
    }
  });
  
  // New handler for manual calculation
  ipcMain.handle('overload:calculate', async () => {
    try {
      const result = await runOverloadAnalysis();
      return { 
        success: true, 
        data: result.overloadIndex 
      };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  });
  
  // Settings handlers
  ipcMain.handle('settings:get', async (event, key: string) => {
    const settings = secureStore.getSettings();
    return settings[key as keyof typeof settings];
  });
  
  ipcMain.handle('settings:set', async (event, key: string, value: number | boolean) => {
    secureStore.setSetting(key as keyof ReturnType<typeof secureStore.getSettings>, value);
    return { success: true };
  });
  
  ipcMain.handle('settings:get-all', async () => {
    return secureStore.getSettings();
  });
  
  // Feedback handlers
  ipcMain.handle('feedback:submit', async (event, rating: number) => {
    // Get current index from the most recent history
    const history = secureStore.getOverloadHistory(1);
    const currentIndex = history.length > 0 ? history[0].index : 0;
    
    secureStore.addFeedback(rating, currentIndex);
    
    // TODO: Implement reinforcement learning to adjust thresholds based on feedback
    
    return { success: true };
  });

  // Audio recording handlers
  ipcMain.handle('audio:start-recording', async () => {
    try {
      const sessionId = audioRecorder.startRecording();
      logger.info('Started recording from IPC', { sessionId });
      return { success: true, sessionId };
    } catch (error) {
      logger.error('Failed to start recording', { error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('audio:stop-recording', async () => {
    try {
      const filePath = await audioRecorder.stopRecording();
      logger.info('Stopped recording from IPC', { filePath });
      return { success: true, filePath };
    } catch (error) {
      logger.error('Failed to stop recording', { error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('audio:pause-recording', async () => {
    try {
      audioRecorder.pauseRecording();
      return { success: true };
    } catch (error) {
      logger.error('Failed to pause recording', { error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('audio:resume-recording', async () => {
    try {
      audioRecorder.resumeRecording();
      return { success: true };
    } catch (error) {
      logger.error('Failed to resume recording', { error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('audio:get-state', async () => {
    return audioRecorder.getState();
  });

  ipcMain.handle('audio:send-chunk', async (event, chunk: Float32Array) => {
    audioRecorder.addAudioChunk(chunk);
    hybridTranscription.processAudioChunk(chunk);
  });

  // Forward audio events to renderer
  audioRecorder.on('recording-started', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('audio:recording-started', data);
    });
  });

  audioRecorder.on('recording-stopped', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('audio:recording-stopped', data);
    });
  });

  audioRecorder.on('audio-level', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('audio:level-update', data);
    });
  });

  // Transcription handlers
  ipcMain.handle('transcription:start', async (event, sessionId: string) => {
    try {
      await hybridTranscription.startTranscription(sessionId);
      return { success: true };
    } catch (error) {
      logger.error('Failed to start transcription', { error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('transcription:stop', async () => {
    try {
      await hybridTranscription.stopTranscription();
      return { success: true };
    } catch (error) {
      logger.error('Failed to stop transcription', { error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('transcription:set-privacy-mode', async (event, enabled: boolean) => {
    try {
      await hybridTranscription.setPrivacyMode(enabled);
      return { success: true };
    } catch (error) {
      logger.error('Failed to set privacy mode', { error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('transcription:get-status', async () => {
    return hybridTranscription.getStatus();
  });

  // Handle Web Speech API results from renderer
  ipcMain.handle('transcription:web-speech-result', async (event, result) => {
    hybridTranscription.handleTranscriptionResult(result);
    return { success: true };
  });

  // Forward transcription events to renderer
  hybridTranscription.on('transcription-started', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('transcription:started', data);
    });
  });

  hybridTranscription.on('transcription-stopped', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('transcription:stopped', data);
    });
  });

  hybridTranscription.on('transcription-result', (result) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('transcription:result', result);
    });
  });

  hybridTranscription.on('start-web-speech', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('transcription:start-web-speech', data);
    });
  });

  hybridTranscription.on('stop-web-speech', () => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('transcription:stop-web-speech');
    });
  });

  hybridTranscription.on('mode-switched', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('transcription:mode-switched', data);
    });
  });

  // Link audio recording to transcription
  audioRecorder.on('recording-started', (data) => {
    // Also process audio chunks for transcription
    hybridTranscription.startTranscription(data.sessionId).catch(error => {
      logger.error('Failed to start transcription with recording', { error });
    });
  });

  audioRecorder.on('recording-stopped', () => {
    hybridTranscription.stopTranscription().catch(error => {
      logger.error('Failed to stop transcription with recording', { error });
    });
  });

  // Document processing handlers
  ipcMain.handle('document:process', async (event, sessionId: string, transcript: string, options?: any) => {
    try {
      const result = await documentProcessor.processTranscript(sessionId, transcript, options);
      return result;
    } catch (error) {
      logger.error('Failed to process document', { error: (error as Error).message });
      return { success: false, errors: [(error as Error).message] };
    }
  });

  ipcMain.handle('document:list', async () => {
    try {
      const documents = await documentProcessor.listDocuments();
      return { success: true, documents };
    } catch (error) {
      logger.error('Failed to list documents', { error: (error as Error).message });
      return { success: false, documents: [] };
    }
  });

  ipcMain.handle('document:open', async (event, filename: string) => {
    try {
      const filepath = documentProcessor.getDocumentPath(filename);
      const content = await fs.promises.readFile(filepath, 'utf8');
      return { success: true, content, filepath };
    } catch (error) {
      logger.error('Failed to open document', { error: (error as Error).message });
      return { success: false, error: (error as Error).message };
    }
  });

  // Forward document processing events
  documentProcessor.on('processing-started', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('document:processing-started', data);
    });
  });

  documentProcessor.on('processing-completed', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('document:processing-completed', data);
    });
  });

  documentProcessor.on('processing-warning', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('document:processing-warning', data);
    });
  });

  documentProcessor.on('processing-failed', (data) => {
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('document:processing-failed', data);
    });
  });
}