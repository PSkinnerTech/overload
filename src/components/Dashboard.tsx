import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverloadMeter } from './OverloadMeter';
import { TrendGraph } from './TrendGraph';
import { BreakdownCards } from './BreakdownCards';
import { TaskInsightPanel } from './TaskInsightPanel';
import { FeedbackSlider } from './FeedbackSlider';
import { VoiceCapture } from './VoiceCapture';
import { BarChart, Mic } from 'lucide-react';

interface DashboardProps {
  onDisconnect: () => void;
}

interface OverloadData {
  index: number;
  timestamp: number;
  breakdown: {
    taskLoad: number;
    meetingDensity: number;
    contextSwitching: number;
    timePressure?: number;
    complexity: number;
  };
}

interface SyncStatus {
  isSyncing: boolean;
  lastSync: number | null;
  error: string | null;
  progress: number;
}

export function Dashboard({ onDisconnect }: DashboardProps) {
  const [overloadData, setOverloadData] = useState<OverloadData | null>(null);
  const [history, setHistory] = useState<OverloadData[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    error: null,
    progress: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial load
    loadOverloadData();
    loadHistory();
    
    // Set up event listeners
    window.overloadApi.on('overload:index-updated', handleOverloadUpdate);
    window.overloadApi.on('sync:progress', handleSyncProgress);
    window.overloadApi.on('sync:completed', handleSyncCompleted);
    
    return () => {
      window.overloadApi.removeAllListeners('overload:index-updated');
      window.overloadApi.removeAllListeners('sync:progress');
      window.overloadApi.removeAllListeners('sync:completed');
    };
  }, []);

  const loadOverloadData = async () => {
    try {
      const current = await window.overloadApi.overloadIndex.getCurrent();
      if (current) {
        setOverloadData(current);
      }
    } catch (err) {
      console.error('Failed to load overload data:', err);
      setError('Failed to load overload data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const historyData = await window.overloadApi.overloadIndex.getHistory(7);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleOverloadUpdate = (data: OverloadData) => {
    setOverloadData(data);
    loadHistory(); // Refresh history
  };

  const handleSyncProgress = (status: SyncStatus) => {
    setSyncStatus(status);
  };

  const handleSyncCompleted = () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: false, lastSync: Date.now() }));
    loadOverloadData();
    loadHistory();
  };

  const triggerSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));
      const result = await window.overloadApi.sync.triggerSync();
      if (!result.success) {
        setError(result.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Failed to trigger sync:', err);
      setError('Failed to sync data');
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };
  
  const useMockData = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));
      const result = await window.overloadApi.sync.useMockData();
      if (!result.success) {
        setError(result.error || 'Failed to load demo data');
      }
    } catch (err) {
      console.error('Failed to use mock data:', err);
      setError('Failed to load demo data');
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const handleFeedbackSubmit = async (rating: number) => {
    try {
      await window.overloadApi.feedback.submit(rating);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your workload data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Aurix</h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI-powered thought-to-documentation assistant
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={useMockData}
                disabled={syncStatus.isSyncing}
                variant="outline"
              >
                {syncStatus.isSyncing ? 'Loading...' : 'Demo Mode'}
              </Button>
              <Button
                onClick={triggerSync}
                disabled={syncStatus.isSyncing}
                variant="secondary"
              >
                {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
              <Button onClick={onDisconnect} variant="ghost">
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="voice" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Voice Capture
            </TabsTrigger>
            <TabsTrigger value="overload" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Workload Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="voice" className="space-y-6">
            <VoiceCapture />
          </TabsContent>

          <TabsContent value="overload" className="space-y-6">
            {error && (
              <Card className="mb-6 bg-destructive/10 border-destructive/20">
                <CardContent className="pt-6">
                  <p className="text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {!overloadData ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No overload data available yet. Try syncing your Motion data or use demo mode.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button onClick={useMockData} variant="outline">
                      Use Demo Data
                    </Button>
                    <Button onClick={triggerSync}>
                      Sync Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Top Row: Meter and Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <OverloadMeter 
                      value={overloadData.index} 
                      timestamp={overloadData.timestamp}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <TrendGraph history={history} current={overloadData} />
                  </div>
                </div>

                {/* Breakdown Cards */}
                <BreakdownCards breakdown={overloadData.breakdown} />

                {/* Bottom Row: Task Insights and Feedback */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <TaskInsightPanel />
                  </div>
                  <div className="lg:col-span-1">
                    <FeedbackSlider 
                  currentIndex={overloadData.index} 
                  onSubmit={handleFeedbackSubmit}
                />
              </div>
            </div>
          </div>
        )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}