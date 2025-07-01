import { 
  OverloadIndex, 
  OverloadMetrics, 
  OverloadFactors, 
  OverloadThreshold,
  TaskMetadata,
  TimeSlot
} from '../types/overload';
import { motionSync } from './motion-sync';
import { secureStore } from './store';

export class OverloadEngine {
  private threshold: OverloadThreshold = {
    baseValue: 100,
    adjustments: {
      dayOfWeek: {
        monday: 0.9,    // Slightly lower on Monday (ramping up)
        tuesday: 1.0,
        wednesday: 1.0,
        thursday: 1.0,
        friday: 1.1,    // Slightly higher on Friday (fatigue)
        saturday: 1.2,  // Higher on weekends (should be resting)
        sunday: 1.2
      },
      timeOfDay: {
        morning: 0.9,   // 6am-12pm
        afternoon: 1.0, // 12pm-6pm
        evening: 1.1,   // 6pm-10pm
        night: 1.3      // 10pm+ (working late)
      },
      learned: 1.0      // Will be adjusted by ML
    }
  };

  async calculateOverloadIndex(date: Date = new Date()): Promise<OverloadIndex> {
    // Get cached Motion data
    const data = await motionSync.getCachedData();
    
    if (!data.tasks || !data.schedules) {
      throw new Error('No Motion data available. Please sync first.');
    }

    // Calculate metrics
    const metrics = await this.calculateMetrics(data, date);
    
    // Calculate factors (0-100 each)
    const factors = this.calculateFactors(metrics);
    
    // Calculate raw index
    const rawIndex = this.calculateRawIndex(factors);
    
    // Apply threshold adjustments
    const adjustedThreshold = this.getAdjustedThreshold(date);
    const finalIndex = (rawIndex / adjustedThreshold) * 100;
    
    // Generate recommendation if overloaded
    const recommendation = finalIndex > 100 
      ? this.generateRecommendation(metrics, factors)
      : undefined;

    return {
      value: Math.round(finalIndex),
      timestamp: new Date(),
      metrics,
      factors,
      confidence: this.calculateConfidence(data),
      recommendation
    };
  }

  private async calculateMetrics(data: any, date: Date): Promise<OverloadMetrics> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('Calculating metrics for date range:', startOfDay, 'to', endOfDay);
    console.log('Total tasks available:', data.tasks?.length || 0);

    // Filter tasks for the specific day
    const todaysTasks = data.tasks?.filter((task: any) => {
      // Check scheduledStart first (when the task is actually scheduled to be worked on)
      if (task.scheduledStart) {
        const scheduledDate = new Date(task.scheduledStart);
        const isToday = scheduledDate >= startOfDay && scheduledDate <= endOfDay;
        if (isToday) {
          console.log('Task scheduled for today:', task.name, 'at', scheduledDate);
        }
        return isToday;
      }
      // Fall back to dueDate if no scheduledStart
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        return dueDate >= startOfDay && dueDate <= endOfDay;
      }
      return false;
    }) || [];
    
    console.log('Tasks filtered for today:', todaysTasks.length);
    if (todaysTasks.length > 0) {
      console.log('Sample task:', todaysTasks[0]);
    }

    // Calculate meeting hours from tasks with "meeting" in the name
    const meetings = todaysTasks.filter((task: any) => 
      task.name?.toLowerCase().includes('meeting') ||
      task.description?.toLowerCase().includes('meeting')
    );
    
    const meetingHours = meetings.reduce((total: number, meeting: any) => {
      // Use duration field if available, otherwise calculate from scheduled times
      if (meeting.duration) {
        return total + (meeting.duration / 60); // Convert minutes to hours
      } else if (meeting.scheduledStart && meeting.scheduledEnd) {
        const duration = (new Date(meeting.scheduledEnd).getTime() - 
                         new Date(meeting.scheduledStart).getTime()) / (1000 * 60 * 60);
        return total + duration;
      }
      return total;
    }, 0);

    // Calculate context switches (project changes)
    const projectChanges = this.countProjectChanges(todaysTasks);

    // Calculate task complexity
    const complexity = this.calculateAverageComplexity(todaysTasks);

    // Calculate time fragmentation from tasks
    const fragmentation = this.calculateTimeFragmentation(todaysTasks);

    // Count recurring tasks
    const recurringCount = data.recurringTasks?.length || 0;

    return {
      taskCount: todaysTasks.length,
      meetingHours: Math.round(meetingHours * 10) / 10,
      contextSwitches: projectChanges,
      recurringIntensity: Math.min(recurringCount * 10, 100), // Cap at 100
      taskComplexity: complexity,
      timeFragmentation: fragmentation
    };
  }

  private calculateFactors(metrics: OverloadMetrics): OverloadFactors {
    // Task load: 0-100 based on task count
    // Assumes 10 tasks = 50%, 20 tasks = 100%
    const taskLoad = Math.min((metrics.taskCount / 20) * 100, 100);
    
    // Meeting density: 0-100 based on meeting hours
    // Assumes 4 hours = 50%, 8 hours = 100%
    const meetingDensity = Math.min((metrics.meetingHours / 8) * 100, 100);
    
    // Context switching: 0-100 based on switches
    // Assumes 5 switches = 50%, 10 switches = 100%
    const contextSwitching = Math.min((metrics.contextSwitches / 10) * 100, 100);
    
    // Time pressure: combination of task count and fragmentation
    const timePressure = Math.min(
      (metrics.taskCount * 3 + metrics.timeFragmentation) / 4,
      100
    );
    
    // Complexity: direct from metrics
    const complexity = metrics.taskComplexity;

    return {
      taskLoad,
      meetingDensity,
      contextSwitching,
      timePresure: timePressure,
      complexity
    };
  }

  private calculateRawIndex(factors: OverloadFactors): number {
    // Weighted average of factors
    const weights = {
      taskLoad: 0.25,
      meetingDensity: 0.20,
      contextSwitching: 0.20,
      timePresure: 0.25,
      complexity: 0.10
    };

    return (
      factors.taskLoad * weights.taskLoad +
      factors.meetingDensity * weights.meetingDensity +
      factors.contextSwitching * weights.contextSwitching +
      factors.timePresure * weights.timePresure +
      factors.complexity * weights.complexity
    );
  }

  private getAdjustedThreshold(date: Date): number {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hour = date.getHours();
    
    let timeOfDay: string;
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 18) timeOfDay = 'afternoon';
    else if (hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const dayAdjustment = this.threshold.adjustments.dayOfWeek[dayOfWeek] || 1.0;
    const timeAdjustment = this.threshold.adjustments.timeOfDay[timeOfDay] || 1.0;
    const learnedAdjustment = this.threshold.adjustments.learned;

    return this.threshold.baseValue * dayAdjustment * timeAdjustment * learnedAdjustment;
  }

  private countProjectChanges(tasks: any[]): number {
    if (tasks.length <= 1) return 0;
    
    let changes = 0;
    let lastProject = tasks[0].project?.id || 'none';
    
    for (let i = 1; i < tasks.length; i++) {
      const currentProject = tasks[i].project?.id || 'none';
      if (currentProject !== lastProject) {
        changes++;
        lastProject = currentProject;
      }
    }
    
    return changes;
  }

  private calculateAverageComplexity(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    
    const complexityScores = tasks.map((task: any) => {
      // Extract effort from description
      const description = task.description || '';
      let effort = 50; // default medium
      
      if (description.match(/effort:high/i) || description.match(/complex/i)) {
        effort = 80;
      } else if (description.match(/effort:low/i) || description.match(/simple/i)) {
        effort = 20;
      }
      
      // Boost if urgent
      if (description.match(/urgent/i) || description.match(/asap/i)) {
        effort += 20;
      }
      
      // Consider duration
      if (task.duration > 120) { // More than 2 hours
        effort += 10;
      }
      
      return Math.min(effort, 100);
    });
    
    return complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length;
  }

  private calculateTimeFragmentation(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    
    // Only consider tasks with scheduled times
    const scheduledTasks = tasks.filter(t => t.scheduledStart && t.scheduledEnd);
    if (scheduledTasks.length === 0) return 0;
    
    // Sort tasks by start time
    const sorted = [...scheduledTasks].sort((a, b) => 
      new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
    );
    
    let gaps = 0;
    let totalGapTime = 0;
    
    for (let i = 1; i < sorted.length; i++) {
      const gapMinutes = (new Date(sorted[i].scheduledStart).getTime() - 
                         new Date(sorted[i-1].scheduledEnd).getTime()) / (1000 * 60);
      
      // Count gaps between 15-60 minutes as fragmentation
      if (gapMinutes >= 15 && gapMinutes <= 60) {
        gaps++;
        totalGapTime += gapMinutes;
      }
    }
    
    // More gaps = more fragmentation
    return Math.min((gaps * 20), 100);
  }

  private calculateConfidence(data: any): number {
    let confidence = 1.0;
    
    // Reduce confidence if data is incomplete
    if (!data.tasks || data.tasks.length === 0) confidence *= 0.7;
    if (!data.schedules || data.schedules.length === 0) confidence *= 0.8;
    if (!data.projects) confidence *= 0.9;
    
    // Reduce confidence if data is stale
    const lastSync = secureStore.getOverloadHistory(1)[0]?.timestamp;
    if (lastSync) {
      const hoursSinceSync = (Date.now() - lastSync) / (1000 * 60 * 60);
      if (hoursSinceSync > 1) confidence *= 0.9;
      if (hoursSinceSync > 4) confidence *= 0.8;
    }
    
    return Math.max(confidence, 0.5);
  }

  private generateRecommendation(metrics: OverloadMetrics, factors: OverloadFactors): string {
    const recommendations: string[] = [];
    
    // Find the biggest contributor
    const sortedFactors = Object.entries(factors)
      .sort(([, a], [, b]) => b - a);
    
    const [topFactor, topValue] = sortedFactors[0];
    
    switch (topFactor) {
      case 'taskLoad':
        recommendations.push(`You have ${metrics.taskCount} tasks today. Consider deferring non-urgent ones.`);
        break;
      case 'meetingDensity':
        recommendations.push(`You have ${metrics.meetingHours} hours of meetings. Try to protect some focus time.`);
        break;
      case 'contextSwitching':
        recommendations.push(`You're switching between projects ${metrics.contextSwitches} times. Try batching similar tasks.`);
        break;
      case 'timePresure':
        recommendations.push(`Your schedule is highly fragmented. Block out larger chunks for deep work.`);
        break;
      case 'complexity':
        recommendations.push(`You have several complex tasks. Consider breaking them into smaller pieces.`);
        break;
    }
    
    // Add a general recommendation
    if (topValue > 80) {
      recommendations.push(`Your workload is significantly above normal. Consider postponing or delegating tasks.`);
    }
    
    return recommendations.join(' ');
  }

  // Update threshold based on user feedback
  async updateFromFeedback(actualFeeling: number, predictedIndex: number): Promise<void> {
    // Simple adjustment: if user felt more overloaded than predicted, lower threshold
    // if user felt less overloaded, raise threshold
    const ratio = actualFeeling / (predictedIndex / 10);
    const currentLearned = this.threshold.adjustments.learned;
    
    // Gradual adjustment (10% max per feedback)
    const adjustment = Math.max(0.9, Math.min(1.1, ratio));
    this.threshold.adjustments.learned = currentLearned * adjustment;
    
    // Store the updated threshold
    secureStore.setSetting('overloadThreshold', this.threshold.baseValue * this.threshold.adjustments.learned);
  }

  // Extract metadata from task descriptions
  extractTaskMetadata(description: string): TaskMetadata {
    const tags = (description.match(/#\w+/g) || []).map(tag => tag.slice(1));
    const effortMatch = description.match(/effort:(low|medium|high)/i);
    const hoursMatch = description.match(/(\d+)h/);
    
    return {
      effort: effortMatch ? effortMatch[1].toLowerCase() as any : undefined,
      tags,
      estimatedHours: hoursMatch ? parseInt(hoursMatch[1]) : undefined,
      isUrgent: /urgent|asap|critical/i.test(description),
    };
  }
}

export const overloadEngine = new OverloadEngine();