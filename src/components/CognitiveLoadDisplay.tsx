import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

interface CognitiveLoadDisplayProps {
  currentIndex: number;
  previousIndex?: number;
  sessionId?: string;
  showTrend?: boolean;
  className?: string;
}

export function CognitiveLoadDisplay({ 
  currentIndex, 
  previousIndex,
  sessionId,
  showTrend = true,
  className 
}: CognitiveLoadDisplayProps) {
  // Determine color based on index value
  const getColorClass = (index: number) => {
    if (index < 30) return 'text-green-600';
    if (index < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColorClass = (index: number) => {
    if (index < 30) return 'bg-green-600';
    if (index < 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getComplexityLabel = (index: number) => {
    if (index < 30) return 'Low Complexity';
    if (index < 60) return 'Moderate Complexity';
    return 'High Complexity';
  };

  const getTrend = () => {
    if (!previousIndex || previousIndex === currentIndex) {
      return { icon: Minus, label: 'No change', color: 'text-gray-500' };
    }
    if (currentIndex > previousIndex) {
      return { icon: TrendingUp, label: 'Increased', color: 'text-red-500' };
    }
    return { icon: TrendingDown, label: 'Decreased', color: 'text-green-500' };
  };

  const trend = showTrend && previousIndex !== undefined ? getTrend() : null;
  const TrendIcon = trend?.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Cognitive Load Index (θ)
        </CardTitle>
        <CardDescription>
          Measures the complexity and mental effort required to understand this content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Score */}
          <div className="text-center">
            <div className={cn("text-5xl font-bold", getColorClass(currentIndex))}>
              {currentIndex}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {getComplexityLabel(currentIndex)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={currentIndex} 
              className="h-3"
              indicatorClassName={getProgressColorClass(currentIndex)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>Simple</span>
              <span>Complex</span>
              <span>100</span>
            </div>
          </div>

          {/* Trend */}
          {trend && TrendIcon && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <TrendIcon className={cn("h-4 w-4", trend.color)} />
              <span className={cn("text-sm", trend.color)}>
                {trend.label} from {previousIndex}
              </span>
            </div>
          )}

          {/* Breakdown */}
          <div className="pt-4 space-y-2 border-t">
            <h4 className="text-sm font-medium">Factors Contributing to Score:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Sentence complexity</li>
              <li>• Technical terminology density</li>
              <li>• Conceptual density</li>
              <li>• Content structure</li>
            </ul>
          </div>

          {/* Recommendation */}
          <div className="pt-4 border-t">
            <p className="text-sm">
              {currentIndex < 30 && "This content is easy to understand and well-structured."}
              {currentIndex >= 30 && currentIndex < 60 && "This content has moderate complexity. Consider breaking down complex sections."}
              {currentIndex >= 60 && "This content is highly complex. Consider simplifying language and adding more structure."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini version for use in lists
export function CognitiveLoadBadge({ index }: { index: number }) {
  const getColorClass = (index: number) => {
    if (index < 30) return 'bg-green-100 text-green-700';
    if (index < 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
      getColorClass(index)
    )}>
      <Brain className="h-3 w-3" />
      θ={index}
    </span>
  );
}