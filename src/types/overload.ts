// Overload Index (θ) Types and Interfaces

export interface OverloadMetrics {
  // Core metrics from scope.md
  taskCount: number;           // Number of tasks for the period
  meetingHours: number;        // Total hours in meetings
  contextSwitches: number;     // Number of times switching between different projects
  recurringIntensity: number;  // Intensity of recurring tasks
  taskComplexity: number;      // Average complexity based on effort tags
  timeFragmentation: number;   // How fragmented the available time is
}

export interface OverloadFactors {
  // Breakdown of what's contributing to the index
  taskLoad: number;           // 0-100 contribution from task count
  meetingDensity: number;     // 0-100 contribution from meetings
  contextSwitching: number;   // 0-100 contribution from switching
  timePresure: number;        // 0-100 contribution from deadlines
  complexity: number;         // 0-100 contribution from task complexity
}

export interface OverloadIndex {
  // The calculated index
  value: number;              // The θ value (0-200+, 100 = threshold)
  timestamp: Date;            // When this was calculated
  metrics: OverloadMetrics;   // Raw metrics used
  factors: OverloadFactors;   // Breakdown of contributions
  confidence: number;         // 0-1 confidence in the calculation
  recommendation?: string;    // AI-generated recommendation
}

export interface OverloadThreshold {
  // User's personalized threshold
  baseValue: number;          // Default 100
  adjustments: {
    dayOfWeek: Record<string, number>;  // Mon: 0.9, Fri: 1.1, etc.
    timeOfDay: Record<string, number>;  // morning: 0.8, evening: 1.2
    learned: number;                    // ML adjustment from feedback
  };
}

export interface UserFeedback {
  timestamp: Date;
  actualFeeling: number;      // 0-10 how overloaded they felt
  predictedIndex: number;     // What we predicted
  metrics: OverloadMetrics;   // Metrics at that time
}

export interface TaskMetadata {
  // Extracted from task descriptions
  effort?: 'low' | 'medium' | 'high';
  tags: string[];
  estimatedHours?: number;
  isUrgent: boolean;
  projectId?: string;
  category?: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  type: 'work' | 'meeting' | 'focus' | 'break';
  taskIds: string[];
}

export interface DailyOverloadSummary {
  date: Date;
  averageIndex: number;
  peakIndex: number;
  peakTime: Date;
  totalTasks: number;
  completedTasks: number;
  meetingHours: number;
  focusTime: number;
  recommendations: string[];
}