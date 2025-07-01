import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface TrendGraphProps {
  history: OverloadData[];
  current: OverloadData;
}

export function TrendGraph({ history, current }: TrendGraphProps) {
  const data = useMemo(() => {
    // Combine history with current and sort by timestamp
    const allData = [...history, current].sort((a, b) => a.timestamp - b.timestamp);
    
    // Get last 7 days of data
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    return allData.filter(d => d.timestamp >= sevenDaysAgo);
  }, [history, current]);
  
  // Calculate graph dimensions
  const width = 600;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 40, left: 50 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  
  // Calculate scales
  const xScale = useMemo(() => {
    if (data.length === 0) return () => 0;
    const minTime = Math.min(...data.map(d => d.timestamp));
    const maxTime = Math.max(...data.map(d => d.timestamp));
    const timeRange = maxTime - minTime;
    
    return (timestamp: number) => {
      // Handle case where all timestamps are the same
      if (timeRange === 0) {
        return graphWidth / 2; // Center the single point
      }
      return ((timestamp - minTime) / timeRange) * graphWidth;
    };
  }, [data, graphWidth]);
  
  const yScale = useMemo(() => {
    const maxValue = Math.max(200, ...data.map(d => d.index));
    return (value: number) => {
      return graphHeight - (value / maxValue) * graphHeight;
    };
  }, [data, graphHeight]);
  
  // Create path for line chart
  const linePath = useMemo(() => {
    if (data.length === 0) return '';
    
    const points = data.map((d, i) => {
      const x = xScale(d.timestamp);
      const y = yScale(d.index);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    
    return points.join(' ');
  }, [data, xScale, yScale]);
  
  // Create area path (filled area under the line)
  const areaPath = useMemo(() => {
    if (data.length === 0) return '';
    
    const topPath = linePath;
    const bottomPath = `L ${xScale(data[data.length - 1].timestamp)} ${graphHeight} L ${xScale(data[0].timestamp)} ${graphHeight} Z`;
    
    return topPath + ' ' + bottomPath;
  }, [data, linePath, xScale, graphHeight]);
  
  // Format date for x-axis labels
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Generate y-axis ticks
  const yTicks = [0, 50, 100, 150, 200];
  
  // Calculate average
  const average = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((sum, d) => sum + d.index, 0) / data.length;
  }, [data]);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>7-Day Trend</CardTitle>
            <CardDescription>Your overload index over time</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Average</p>
            <Badge variant="secondary" className="text-lg font-semibold">
              {Math.round(average)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No historical data available</p>
          </div>
        ) : (
          <>
            <svg width={width} height={height} className="w-full">
              <g transform={`translate(${padding.left}, ${padding.top})`}>
                {/* Grid lines */}
                {yTicks.map(tick => (
                  <g key={tick}>
                    <line
                      x1={0}
                      y1={yScale(tick)}
                      x2={graphWidth}
                      y2={yScale(tick)}
                      stroke="hsl(var(--border))"
                      strokeDasharray={tick === 100 ? "0" : "2,2"}
                    />
                    <text
                      x={-10}
                      y={yScale(tick)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="text-xs fill-muted-foreground"
                    >
                      {tick}%
                    </text>
                  </g>
                ))}
                
                {/* Threshold line at 100% */}
                <line
                  x1={0}
                  y1={yScale(100)}
                  x2={graphWidth}
                  y2={yScale(100)}
                  stroke="hsl(var(--destructive))"
                  strokeWidth="2"
                  opacity="0.3"
                />
                <text
                  x={graphWidth + 5}
                  y={yScale(100)}
                  dominantBaseline="middle"
                  className="text-xs fill-destructive"
                >
                  Threshold
                </text>
                
                {/* Area under the curve */}
                <path
                  d={areaPath}
                  fill="url(#gradient)"
                  opacity="0.3"
                />
                
                {/* Line */}
                <path
                  d={linePath}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                />
                
                {/* Data points */}
                {data.map((d, i) => (
                  <g key={`point-${i}-${d.timestamp}`}>
                    <circle
                      cx={xScale(d.timestamp)}
                      cy={yScale(d.index)}
                      r="4"
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth="2"
                    />
                    {/* Tooltip on hover */}
                    <title>
                      {formatDate(d.timestamp)}: {Math.round(d.index)}%
                    </title>
                  </g>
                ))}
                
                {/* X-axis labels */}
                {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((d, idx) => (
                  <text
                    key={`label-${idx}-${d.timestamp}`}
                    x={xScale(d.timestamp)}
                    y={graphHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {formatDate(d.timestamp)}
                  </text>
                ))}
                
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </g>
            </svg>
            
            {/* Pattern insights */}
            <Card className="mt-4 bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm">
                  {average > 100 
                    ? `You've been overloaded ${data.filter(d => d.index > 100).length} out of ${data.length} days.`
                    : `Your workload has been well-managed this week.`}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
}