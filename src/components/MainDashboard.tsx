import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { 
  Mic, 
  FileText, 
  Brain, 
  TrendingUp,
  Clock,
  Calendar,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CognitiveLoadBadge } from './CognitiveLoadDisplay';
import { cn } from '../lib/utils';

interface QuickStat {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
}

interface MainDashboardProps {
  onNavigate?: (view: string) => void;
}

export function MainDashboard({ onNavigate }: MainDashboardProps = {}) {
  const navigate = (view: string) => {
    onNavigate?.(view);
  };

  // Mock data - in a real app, this would come from the backend
  const quickStats: QuickStat[] = [
    {
      label: 'Total Sessions',
      value: 24,
      icon: <Mic className="h-4 w-4" />,
      trend: 12
    },
    {
      label: 'Documents Created',
      value: 18,
      icon: <FileText className="h-4 w-4" />,
      trend: 8
    },
    {
      label: 'Avg. Cognitive Load',
      value: 42,
      icon: <Brain className="h-4 w-4" />,
      trend: -5
    },
    {
      label: 'Time Saved',
      value: '6.5 hrs',
      icon: <Clock className="h-4 w-4" />
    }
  ];

  const recentSessions = [
    {
      id: '1',
      title: 'Project Architecture Discussion',
      date: new Date(Date.now() - 1000 * 60 * 60 * 2),
      duration: '15:34',
      cognitiveLoad: 68
    },
    {
      id: '2',
      title: 'API Documentation Review',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24),
      duration: '8:22',
      cognitiveLoad: 35
    },
    {
      id: '3',
      title: 'Team Standup Notes',
      date: new Date(Date.now() - 1000 * 60 * 60 * 48),
      duration: '12:15',
      cognitiveLoad: 22
    }
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Welcome to Aurix</h1>
          <p className="text-muted-foreground mt-1">
            Transform your thoughts into structured documentation with AI
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('record')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Start Recording</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Begin a new voice session
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('documents')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Browse Documents</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    View all generated docs
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('analytics')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">View Analytics</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track your productivity
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    {stat.trend !== undefined && (
                      <p className={cn(
                        "text-xs mt-1",
                        stat.trend > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {stat.trend > 0 ? '+' : ''}{stat.trend}% this week
                      </p>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {stat.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Sessions</CardTitle>
                <CardDescription>Your latest voice recordings and documents</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('documents')}>
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium">{session.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {session.date.toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {session.duration}
                      </span>
                    </div>
                  </div>
                  <CognitiveLoadBadge index={session.cognitiveLoad} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Tips */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/20 p-3 rounded-full">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">AI Tip of the Day</h3>
                <p className="text-sm text-muted-foreground">
                  For best transcription results, speak clearly and pause briefly between sentences. 
                  Aurix's AI will automatically detect paragraph breaks and structure your content.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

