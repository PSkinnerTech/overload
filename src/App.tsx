import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { MainDashboard } from './components/MainDashboard';
import { RecordingSession } from './components/RecordingSession';
import { DocumentsDashboard } from './components/DocumentsDashboard';

type ViewType = 'dashboard' | 'record' | 'documents' | 'analytics' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

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

  return (
    <Layout 
      currentView={currentView} 
      onViewChange={setCurrentView}
    >
      {renderView()}
    </Layout>
  );
}

export default App;