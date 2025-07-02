import React, { useState } from 'react';

type ViewType = 'dashboard' | 'record' | 'documents' | 'analytics' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [error, setError] = useState<string | null>(null);
  
  console.log('App component loaded, currentView:', currentView);
  
  // Lazy load components to catch any import errors
  const Layout = React.lazy(() => import('./components/Layout').then(m => ({ default: m.Layout })));
  const MainDashboard = React.lazy(() => import('./components/MainDashboard').then(m => ({ default: m.MainDashboard })));
  const RecordingSession = React.lazy(() => import('./components/RecordingSession').then(m => ({ default: m.RecordingSession })));
  const DocumentsDashboard = React.lazy(() => import('./components/DocumentsDashboard').then(m => ({ default: m.DocumentsDashboard })));

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <MainDashboard onNavigate={setCurrentView as any} />;
      case 'record':
        return <RecordingSession />;
      case 'documents':
        return <DocumentsDashboard />;
      case 'analytics':
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Analytics view coming soon...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Settings view coming soon...</p>
          </div>
        );
      default:
        return <MainDashboard />;
    }
  };

  // Error boundary fallback
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Application</h1>
          <pre className="text-sm text-left bg-gray-100 p-4 rounded">{error}</pre>
        </div>
      </div>
    );
  }

  try {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading Aurix...</p>
          </div>
        </div>
      }>
        <Layout 
          currentView={currentView} 
          onViewChange={setCurrentView}
        >
          {renderView()}
        </Layout>
      </React.Suspense>
    );
  } catch (err) {
    console.error('Error rendering app:', err);
    setError(err?.toString() || 'Unknown error');
    return null;
  }
}

export default App;