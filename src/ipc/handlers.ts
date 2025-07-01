import { ipcMain, BrowserWindow } from 'electron';
import { secureStore } from '../services/store';
import { motionAuth } from '../services/motion-auth-simple';
import { motionSync } from '../services/motion-sync';
import { runOverloadAnalysis } from '../workflows/overload-workflow';

export function setupIpcHandlers() {
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
    try {
      const success = await motionAuth.authenticate(apiKey);
      if (success) {
        // Start initial sync after authentication
        motionSync.performInitialSync().catch(console.error);
      }
      return { success };
    } catch (error) {
      console.error('Motion authentication failed:', error);
      return { success: false, error: (error as Error).message };
    }
  });
  
  ipcMain.handle('auth:disconnect', async () => {
    await motionAuth.disconnect();
    return { success: true };
  });
  
  ipcMain.handle('auth:get-status', async () => {
    return secureStore.getAuthStatus();
  });
  
  // Sync handlers
  ipcMain.handle('sync:trigger', async () => {
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
}