import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface FeedbackSliderProps {
  currentIndex: number;
  onSubmit: (rating: number) => void;
}

export function FeedbackSlider({ currentIndex, onSubmit }: FeedbackSliderProps) {
  const [rating, setRating] = useState<number>(50);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = () => {
    onSubmit(rating);
    setHasSubmitted(true);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setHasSubmitted(false);
      setRating(50);
    }, 3000);
  };

  const getRatingLabel = (value: number) => {
    if (value < 20) return { text: 'Very Light', color: 'text-green-600' };
    if (value < 40) return { text: 'Manageable', color: 'text-blue-600' };
    if (value < 60) return { text: 'Moderate', color: 'text-yellow-600' };
    if (value < 80) return { text: 'Heavy', color: 'text-orange-600' };
    return { text: 'Overwhelming', color: 'text-red-600' };
  };

  const ratingLabel = getRatingLabel(rating);

  return (
    <Card>
      <CardHeader>
        <CardTitle>How do you feel?</CardTitle>
        <CardDescription>
          Help us calibrate your workload analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Current Index: {Math.round(currentIndex)}%</span>
            <span className={`text-sm font-medium ${ratingLabel.color}`}>
              {ratingLabel.text}
            </span>
          </div>
          
          <Slider
            value={[rating]}
            onValueChange={(value) => setRating(value[0])}
            max={100}
            step={5}
            className="w-full"
            disabled={hasSubmitted}
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Light</span>
            <span>Moderate</span>
            <span>Heavy</span>
          </div>
        </div>

        {hasSubmitted ? (
          <div className="text-center py-3">
            <p className="text-sm text-green-600">✓ Thank you for your feedback!</p>
          </div>
        ) : (
          <Button 
            onClick={handleSubmit}
            className="w-full"
            variant="secondary"
          >
            Submit Feedback
          </Button>
        )}
        
        <p className="text-xs text-muted-foreground text-center">
          Your feedback helps personalize your workload thresholds
        </p>
      </CardContent>
    </Card>
  );
}