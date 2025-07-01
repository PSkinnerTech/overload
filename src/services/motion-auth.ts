import { BrowserWindow, app } from 'electron';
import { randomBytes } from 'crypto';
import { MOTION_CONFIG, buildAuthUrl } from '../config/motion';
import { secureStore } from './store';

export class MotionAuthService {
  private authWindow: BrowserWindow | null = null;
  private authResolve: ((value: boolean) => void) | null = null;
  private authReject: ((reason: Error) => void) | null = null;
  private state: string | null = null;

  constructor() {
    // Register custom protocol for OAuth callback
    if (!app.isDefaultProtocolClient('overload')) {
      app.setAsDefaultProtocolClient('overload');
    }
  }

  async authenticate(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.authResolve = resolve;
      this.authReject = reject;
      this.state = randomBytes(16).toString('hex');
      
      this.createAuthWindow();
      this.loadAuthUrl();
    });
  }

  private createAuthWindow() {
    this.authWindow = new BrowserWindow({
      width: 600,
      height: 800,
      title: 'Connect to Motion',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Handle window closed
    this.authWindow.on('closed', () => {
      this.authWindow = null;
      if (this.authReject) {
        this.authReject(new Error('Authentication cancelled by user'));
        this.cleanup();
      }
    });

    // Intercept navigation to catch OAuth callback
    this.authWindow.webContents.on('will-navigate', (event, url) => {
      this.handleCallback(url);
    });

    this.authWindow.webContents.on('will-redirect', (event, url) => {
      this.handleCallback(url);
    });
  }

  private loadAuthUrl() {
    if (!this.authWindow || !this.state) return;
    
    const authUrl = buildAuthUrl(this.state);
    this.authWindow.loadURL(authUrl);
  }

  private async handleCallback(url: string) {
    if (!url.startsWith('overload://oauth/callback')) return;

    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const state = urlObj.searchParams.get('state');
    const error = urlObj.searchParams.get('error');

    // Validate state to prevent CSRF
    if (state !== this.state) {
      this.authReject?.(new Error('Invalid state parameter'));
      this.cleanup();
      return;
    }

    if (error) {
      this.authReject?.(new Error(`OAuth error: ${error}`));
      this.cleanup();
      return;
    }

    if (!code) {
      this.authReject?.(new Error('No authorization code received'));
      this.cleanup();
      return;
    }

    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code);
      
      // Save tokens securely
      await secureStore.saveTokens(tokens.access_token, tokens.refresh_token);
      
      // Update auth status
      secureStore.setAuthStatus(true, tokens.user_id);
      
      // Close auth window
      if (this.authWindow && !this.authWindow.isDestroyed()) {
        this.authWindow.close();
      }
      
      this.authResolve?.(true);
    } catch (error) {
      this.authReject?.(error as Error);
    } finally {
      this.cleanup();
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    user_id: string;
    expires_in: number;
  }> {
    const response = await fetch(MOTION_CONFIG.OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: MOTION_CONFIG.CLIENT_ID,
        client_secret: MOTION_CONFIG.CLIENT_SECRET,
        redirect_uri: MOTION_CONFIG.REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json();
  }

  async refreshAccessToken(): Promise<string> {
    const tokens = await secureStore.getTokens();
    if (!tokens) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(MOTION_CONFIG.OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: MOTION_CONFIG.CLIENT_ID,
        client_secret: MOTION_CONFIG.CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json();
    
    // Save new tokens
    await secureStore.saveTokens(data.access_token, data.refresh_token || tokens.refreshToken);
    
    return data.access_token;
  }

  async disconnect() {
    await secureStore.clearTokens();
    secureStore.setAuthStatus(false);
  }

  private cleanup() {
    this.authWindow = null;
    this.authResolve = null;
    this.authReject = null;
    this.state = null;
  }
}

export const motionAuth = new MotionAuthService();