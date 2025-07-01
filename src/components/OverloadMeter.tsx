import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OverloadMeterProps {
  value: number;
  timestamp: number;
}

export function OverloadMeter({ value, timestamp }: OverloadMeterProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  // Animate the meter value
  useEffect(() => {
    const startValue = animatedValue;
    const endValue = value;
    const duration = 1000; // 1 second animation
    const startTime = Date.now();
    
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setAnimatedValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  // Calculate rotation angle (-90 to 90 degrees)
  // 0% = -90deg, 100% = 0deg, 200% = 90deg
  const rotation = Math.min(Math.max(animatedValue, 0), 200) * 0.9 - 90;
  
  // Determine color based on value
  const getColor = (val: number) => {
    if (val <= 60) return '#10b981'; // green
    if (val <= 80) return '#3b82f6'; // blue
    if (val <= 100) return '#f59e0b'; // amber
    if (val <= 120) return '#ef4444'; // red
    return '#991b1b'; // dark red
  };
  
  const color = getColor(animatedValue);
  
  // Format the timestamp
  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Overload</CardTitle>
        <CardDescription>Last updated: {formatTime(timestamp)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full max-w-xs mx-auto">
          {/* Meter Background */}
          <svg className="w-full" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
            {/* Background arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="20"
              strokeLinecap="round"
            />
            
            {/* Color segments */}
            <path
              d="M 20 100 A 80 80 0 0 1 68 40"
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              opacity="0.3"
            />
            <path
              d="M 68 40 A 80 80 0 0 1 100 30"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              opacity="0.3"
            />
            <path
              d="M 100 30 A 80 80 0 0 1 132 40"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              opacity="0.3"
            />
            <path
              d="M 132 40 A 80 80 0 0 1 160 60"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              opacity="0.3"
            />
            <path
              d="M 160 60 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#991b1b"
              strokeWidth="2"
              opacity="0.3"
            />
            
            {/* Tick marks */}
            {[0, 50, 100, 150, 200].map((val, i) => {
              const angle = (val / 200) * 180 - 90;
              const rad = (angle * Math.PI) / 180;
              const x1 = 100 + 65 * Math.cos(rad);
              const y1 = 100 - 65 * Math.sin(rad);
              const x2 = 100 + 75 * Math.cos(rad);
              const y2 = 100 - 75 * Math.sin(rad);
              
              return (
                <g key={val}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="2"
                  />
                  <text
                    x={100 + 55 * Math.cos(rad)}
                    y={100 - 55 * Math.sin(rad)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-muted-foreground"
                  >
                    {val}%
                  </text>
                </g>
              );
            })}
            
            {/* Needle */}
            <g transform={`rotate(${rotation} 100 100)`}>
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="30"
                stroke={color}
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="100" cy="100" r="6" fill={color} />
            </g>
          </svg>
          
          {/* Value display */}
          <div className="absolute inset-x-0 bottom-0 text-center">
            <div className="text-3xl font-bold" style={{ color }}>
              {Math.round(animatedValue)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {animatedValue > 100 ? 'Overloaded' : 'Normal'}
            </div>
          </div>
        </div>
        
        {/* Status message */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {animatedValue <= 60 && "You're in great shape! Plenty of capacity."}
            {animatedValue > 60 && animatedValue <= 80 && "Workload is comfortable and sustainable."}
            {animatedValue > 80 && animatedValue <= 100 && "Approaching capacity. Stay focused."}
            {animatedValue > 100 && animatedValue <= 120 && "You're overloaded. Consider deferring tasks."}
            {animatedValue > 120 && "Critical overload! Immediate action needed."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}