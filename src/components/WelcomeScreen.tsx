import { Button } from '@/components/ui/button';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-lg">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold">Overload</h1>
          <p className="text-xl text-muted-foreground">
            AI-powered workload analysis for Motion
          </p>
        </div>
        
        <Button 
          size="lg" 
          onClick={onGetStarted}
          className="min-w-[200px]"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
}