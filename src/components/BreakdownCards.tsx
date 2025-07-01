import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Breakdown {
  taskLoad: number;
  meetingDensity: number;
  contextSwitching: number;
  timePressure?: number;
  complexity: number;
}

interface BreakdownCardsProps {
  breakdown: Breakdown;
}

interface MetricCardProps {
  title: string;
  value: number;
  description: string;
  icon: string;
  color: string;
}

function MetricCard({ title, value, description, icon }: MetricCardProps) {
  // Determine intensity level
  const getIntensity = (val: number) => {
    if (val < 20) return { level: 'Low', variant: 'secondary' as const };
    if (val < 40) return { level: 'Moderate', variant: 'default' as const };
    if (val < 60) return { level: 'High', variant: 'destructive' as const };
    return { level: 'Critical', variant: 'destructive' as const };
  };
  
  const intensity = getIntensity(value);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge variant={intensity.variant}>
            {intensity.level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <div className="flex items-baseline">
            <span className="text-3xl font-bold">{Math.round(value)}</span>
            <span className="text-lg text-muted-foreground ml-1">/ 100</span>
          </div>
        </div>
        
        <Progress value={value} className="mb-3" />
        
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

export function BreakdownCards({ breakdown }: BreakdownCardsProps) {
  const cards = [
    {
      title: 'Task Load',
      value: breakdown.taskLoad,
      description: 'Volume and effort of scheduled tasks',
      icon: '📋',
      color: 'blue'
    },
    {
      title: 'Meeting Density',
      value: breakdown.meetingDensity,
      description: 'Percentage of day in meetings',
      icon: '👥',
      color: 'purple'
    },
    {
      title: 'Context Switching',
      value: breakdown.contextSwitching,
      description: 'Frequency of project/task switches',
      icon: '🔄',
      color: 'orange'
    },
    {
      title: 'Complexity',
      value: breakdown.complexity,
      description: 'Difficulty of current tasks',
      icon: '🧩',
      color: 'indigo'
    }
  ];
  
  // Add time pressure if available
  if (breakdown.timePressure !== undefined) {
    cards.push({
      title: 'Time Pressure',
      value: breakdown.timePressure,
      description: 'Urgency of deadlines',
      icon: '⏰',
      color: 'red'
    });
  }
  
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Workload Breakdown</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>
      
      {/* Summary insight */}
      <Card className="mt-4 bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <p className="text-sm">
            <strong>Top contributor:</strong> {
              Object.entries(breakdown)
                .filter(([key]) => key !== 'timePressure' || breakdown.timePressure !== undefined)
                .sort(([, a], [, b]) => b - a)[0][0]
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
            } is having the biggest impact on your workload today.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}