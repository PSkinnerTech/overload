import { app, BrowserWindow, systemPreferences, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { setupIpcHandlers } from './ipc/handlers';
import { logger } from './services/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize logger
logger.info('Aurix application starting', { version: app.getVersion() });

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  logger.info('Squirrel startup detected, quitting');
  app.quit();
}

// No need for custom protocol with API key authentication

// Import sync service
import { motionSync } from './services/motion-sync';
import { secureStore } from './services/store';
import { notificationService } from './services/notifications';

const requestMicrophoneAccess = async () => {
  const access = await systemPreferences.askForMediaAccess('microphone');
  logger.info('Microphone access requested', { granted: access });

  if (!access && process.platform === 'darwin') {
    // On macOS, if access is denied, we can guide the user to settings.
    const hasAccess = systemPreferences.getMediaAccessStatus('microphone');
    if (hasAccess === 'denied') {
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
    }
  }

  return access;
};

const createWindow = async () => {
  logger.info('Creating main window');
  
  // Check if authenticated and start background sync
  const authStatus = secureStore.getAuthStatus();
  if (authStatus.isAuthenticated) {
    logger.info('User authenticated, checking API key');
    // Check if we actually have an API key stored
    const { motionAuth } = await import('./services/motion-auth-simple');
    const hasApiKey = await motionAuth.getApiKey();
    
    if (hasApiKey) {
      try {
        await motionSync.performInitialSync();
        motionSync.startBackgroundSync();
      } catch (error) {
        console.error('Failed to start sync:', error);
      }
    } else {
      // Clear auth status if no API key is found
      secureStore.setAuthStatus(false);
    }
  }
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Overload',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools only in development
  // The Autofill errors are harmless - they occur because Chrome DevTools 
  // expects features that aren't available in Electron
  if (!app.isPackaged) {
    // Open DevTools in a detached window to minimize console noise
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Set up IPC handlers now that the app is ready
  setupIpcHandlers();

  logger.info('App ready, creating window');
  createWindow();
  requestMicrophoneAccess();
  
  // Schedule daily summary notification for 5 PM
  notificationService.scheduleDailySummary(17, 0);
  logger.info('Daily summary notification scheduled for 5 PM');
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  logger.info('All windows closed');
  if (process.platform !== 'darwin') {
    logger.info('Not on macOS, quitting application');
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    logger.info('App activated with no windows, creating new window');
    createWindow();
  }
});


// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  // Optionally restart the app or show an error dialog
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
});

app.on('before-quit', () => {
  logger.info('Application shutting down');
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
