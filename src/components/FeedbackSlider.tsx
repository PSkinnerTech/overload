import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { 
  Smile, 
  Meh, 
  Frown, 
  Brain,
  MessageSquare,
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FeedbackSliderProps {
  sessionId: string;
  cognitiveLoadIndex?: number;
  onSubmit?: (rating: number, comment?: string) => void;
  onSkip?: () => void;
  className?: string;
}

export function FeedbackSlider({
  sessionId,
  cognitiveLoadIndex,
  onSubmit,
  onSkip,
  className
}: FeedbackSliderProps) {
  const [rating, setRating] = useState([50]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showCommentField, setShowCommentField] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Submit feedback via API
      await window.overloadApi.feedback.submit({
        sessionId,
        subjective_rating: rating[0],
        comment: comment || undefined
      });

      setIsSubmitted(true);
      onSubmit?.(rating[0], comment || undefined);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingEmoji = (value: number) => {
    if (value <= 33) return { icon: Smile, color: 'text-green-600' };
    if (value <= 66) return { icon: Meh, color: 'text-yellow-600' };
    return { icon: Frown, color: 'text-red-600' };
  };

  const getRatingLabel = (value: number) => {
    if (value <= 20) return 'Very Easy';
    if (value <= 40) return 'Easy';
    if (value <= 60) return 'Moderate';
    if (value <= 80) return 'Difficult';
    return 'Very Difficult';
  };

  const { icon: RatingIcon, color } = getRatingEmoji(rating[0]);

  if (isSubmitted) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-lg font-medium mb-2">Thank you for your feedback!</h3>
          <p className="text-sm text-muted-foreground text-center">
            Your input helps us improve cognitive load calculations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          How difficult was this session?
        </CardTitle>
        <CardDescription>
          Your subjective rating helps calibrate our AI's cognitive load analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <RatingIcon className={cn("h-16 w-16", color)} />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Mental Effort Required</Label>
              <span className={cn("font-medium", color)}>
                {getRatingLabel(rating[0])}
              </span>
            </div>
            <Slider
              value={rating}
              onValueChange={setRating}
              min={0}
              max={100}
              step={1}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Very Easy</span>
              <span>Moderate</span>
              <span>Very Difficult</span>
            </div>
          </div>
        </div>

        {/* Cognitive Load Comparison */}
        {cognitiveLoadIndex !== undefined && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI Assessment:</span>
              <span className="font-medium">θ = {cognitiveLoadIndex}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your Rating:</span>
              <span className="font-medium">{rating[0]}/100</span>
            </div>
            {Math.abs(cognitiveLoadIndex - rating[0]) > 30 && (
              <p className="text-xs text-muted-foreground pt-2">
                Your perception differs from the AI assessment. Adding a comment would help us understand why.
              </p>
            )}
          </div>
        )}

        {/* Optional Comment */}
        {!showCommentField ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCommentField(true)}
            className="w-full"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Add a comment (optional)
          </Button>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="comment">Additional Comments</Label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What made this session easy or difficult?"
              className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isSubmitting}
            className="flex-1"
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Submitting...
              </>
            ) : (
              <>
                Submit Feedback
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini feedback prompt for use in document views
export function FeedbackPrompt({ 
  sessionId, 
  cognitiveLoadIndex,
  className 
}: {
  sessionId: string;
  cognitiveLoadIndex?: number;
  className?: string;
}) {
  const [showFeedback, setShowFeedback] = useState(false);

  if (showFeedback) {
    return (
      <FeedbackSlider
        sessionId={sessionId}
        cognitiveLoadIndex={cognitiveLoadIndex}
        onSubmit={() => setShowFeedback(false)}
        onSkip={() => setShowFeedback(false)}
        className={className}
      />
    );
  }

  return (
    <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", className)}>
      <CardContent 
        className="flex items-center justify-between p-4"
        onClick={() => setShowFeedback(true)}
      >
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium text-sm">How was this session?</p>
            <p className="text-xs text-muted-foreground">Share your feedback</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}