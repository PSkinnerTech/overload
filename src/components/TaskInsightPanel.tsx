import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Task {
  id: string;
  name: string;
  projectName?: string;
  duration: number; // in minutes
  impact: number; // contribution to overload
  isDeferred?: boolean;
}

export function TaskInsightPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  
  useEffect(() => {
    loadTaskInsights();
  }, []);
  
  const loadTaskInsights = async () => {
    try {
      setIsLoading(true);
      // Get today's tasks from Motion
      const motionData = await window.overloadApi.sync.getCachedData();
      
      if (!motionData.tasks) {
        setIsLoading(false);
        return;
      }
      
      // Process tasks to calculate their impact
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const todayTasks = motionData.tasks
        .filter((task: any) => {
          const taskDate = new Date(task.scheduledStart || task.dueDate);
          return taskDate.toISOString().split('T')[0] === todayStr;
        })
        .map((task: any) => {
          // Calculate duration
          let duration = 30; // default 30 minutes
          if (task.scheduledStart && task.scheduledEnd) {
            const start = new Date(task.scheduledStart);
            const end = new Date(task.scheduledEnd);
            duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
          } else if (task.duration) {
            duration = Math.round(task.duration);
          }
          
          // Calculate impact based on duration, priority, and complexity
          let impact = duration / 60; // Base impact from hours
          
          // Adjust for priority
          if (task.priority === 'HIGH' || task.priority === 'ASAP') {
            impact *= 1.5;
          }
          
          // Adjust for labels/tags
          if (task.labels?.some((label: string) => 
            label.toLowerCase().includes('complex') || 
            label.toLowerCase().includes('difficult')
          )) {
            impact *= 1.3;
          }
          
          return {
            id: task.id,
            name: task.name,
            projectName: task.project?.name,
            duration,
            impact: Math.round(impact * 10), // Scale to 0-100
            isDeferred: task.status === 'Deferred'
          };
        })
        .sort((a: Task, b: Task) => b.impact - a.impact)
        .slice(0, 10); // Top 10 tasks
      
      setTasks(todayTasks);
    } catch (error) {
      console.error('Failed to load task insights:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };
  
  const getImpactVariant = (impact: number): "default" | "secondary" | "destructive" | "outline" => {
    if (impact < 20) return 'secondary';
    if (impact < 40) return 'default';
    return 'destructive';
  };
  
  const displayedTasks = showAll ? tasks : tasks.slice(0, 5);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Task Insights</CardTitle>
            <CardDescription>Tasks contributing most to your workload</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTaskInsights}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No tasks scheduled for today</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayedTasks.map((task) => (
                <Card
                  key={task.id}
                  className={task.isDeferred ? 'opacity-50' : ''}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium line-clamp-2">
                          {task.name}
                          {task.isDeferred && (
                            <Badge variant="outline" className="ml-2">
                              Deferred
                            </Badge>
                          )}
                        </h4>
                      </div>
                      {task.projectName && (
                        <p className="text-sm text-muted-foreground">{task.projectName}</p>
                      )}
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <span>🕐</span>
                          {formatDuration(task.duration)}
                        </span>
                        <Badge variant={getImpactVariant(task.impact)}>
                          Impact: {task.impact}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {tasks.length > 5 && (
              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? 'Show Less' : `Show ${tasks.length - 5} More`}
                </Button>
              </div>
            )}
            
            {/* Recommendations */}
            <Card className="mt-6 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Consider deferring low-impact tasks to reduce overload</li>
                  <li>• Break down high-impact tasks into smaller chunks</li>
                  <li>• Schedule breaks between complex tasks</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
}