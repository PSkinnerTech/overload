import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ApiKeySetup } from './components/ApiKeySetup';

type AppState = 'loading' | 'welcome' | 'setup' | 'dashboard';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    // Check authentication status on mount
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await window.overloadApi.auth.getAuthStatus();
      if (status.isAuthenticated) {
        setAppState('dashboard');
      } else {
        setAppState('welcome');
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
      setAppState('welcome');
    }
  };

  const handleGetStarted = () => {
    setAppState('setup');
  };

  const handleConnectMotion = async (apiKey: string) => {
    const result = await window.overloadApi.auth.connectMotion(apiKey);
    if (result.success) {
      setAppState('dashboard');
    } else {
      throw new Error(result.error || 'Failed to connect to Motion');
    }
  };

  const handleDisconnect = async () => {
    try {
      await window.overloadApi.auth.disconnect();
      setAppState('welcome');
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  // Show loading state while checking auth
  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show welcome screen
  if (appState === 'welcome') {
    return <WelcomeScreen onGetStarted={handleGetStarted} />;
  }

  // Show API key setup
  if (appState === 'setup') {
    return <ApiKeySetup 
      onConnect={handleConnectMotion} 
      onBack={() => setAppState('welcome')}
    />;
  }

  // Show dashboard
  return <Dashboard onDisconnect={handleDisconnect} />;
}

export default App;