import React, { useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

interface AudioWaveformProps {
  audioLevel: number;
  isActive: boolean;
  className?: string;
}

export function AudioWaveform({ audioLevel, isActive, className }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const historyRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const maxHistory = 100;
    
    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      if (!isActive) {
        // Draw flat line when not active
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      // Update history
      historyRef.current.push(audioLevel);
      if (historyRef.current.length > maxHistory) {
        historyRef.current.shift();
      }

      // Draw waveform
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const stepWidth = width / maxHistory;
      historyRef.current.forEach((level, i) => {
        const x = i * stepWidth;
        const amplitude = level * height * 0.4; // Scale to 40% of height
        const y = height / 2 + amplitude * Math.sin(i * 0.1) * (i % 2 === 0 ? 1 : -1);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw center line
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "w-full h-24 bg-gray-50 rounded-lg",
        className
      )}
    />
  );
}