import { Notification, nativeImage } from 'electron';
import { secureStore } from './store';
import { overloadEngine } from './overload-engine';
import path from 'path';

interface NotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
  urgency?: 'low' | 'normal' | 'critical';
  actions?: Array<{ type: string; text: string }>;
}

export class NotificationService {
  private lastNotificationTime: Map<string, number> = new Map();
  private notificationCooldown = 3600000; // 1 hour cooldown for same type

  async sendNotification(options: NotificationOptions): Promise<void> {
    // Check if notifications are enabled
    const settings = secureStore.getSettings();
    if (!settings.notificationsEnabled) {
      return;
    }

    // Check if we're in cooldown for this type
    const typeKey = options.title.toLowerCase().replace(/\s+/g, '-');
    const lastTime = this.lastNotificationTime.get(typeKey) || 0;
    const now = Date.now();
    
    if (now - lastTime < this.notificationCooldown) {
      console.log(`Notification cooldown active for: ${typeKey}`);
      return;
    }

    // Create and show notification
    const notification = new Notification({
      title: options.title,
      body: options.body,
      silent: options.silent || false,
      urgency: options.urgency || 'normal',
      timeoutType: 'default',
    });

    notification.on('click', () => {
      // Bring app to focus when notification is clicked
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });

    notification.show();
    this.lastNotificationTime.set(typeKey, now);
  }

  async sendDailySummary(summary: {
    averageIndex: number;
    peakIndex: number;
    totalTasks: number;
    completedTasks: number;
    recommendations: string[];
  }): Promise<void> {
    const emoji = summary.averageIndex > 100 ? '🔴' : 
                  summary.averageIndex > 80 ? '🟡' : '🟢';

    const body = [
      `${emoji} Average workload: ${Math.round(summary.averageIndex)}%`,
      `Peak: ${Math.round(summary.peakIndex)}%`,
      `Tasks: ${summary.completedTasks}/${summary.totalTasks} completed`,
      '',
      summary.recommendations[0] || 'Keep up the great work!'
    ].join('\n');

    await this.sendNotification({
      title: 'Daily Workload Summary',
      body,
      silent: true,
      urgency: 'low'
    });
  }

  async sendOverloadAlert(currentIndex: number): Promise<void> {
    const settings = secureStore.getSettings();
    const threshold = settings.overloadThreshold;

    if (currentIndex <= threshold) {
      return;
    }

    const severity = currentIndex > threshold * 1.5 ? 'critical' :
                    currentIndex > threshold * 1.2 ? 'high' : 'moderate';

    const recommendations = await this.getQuickRecommendations(currentIndex);

    await this.sendNotification({
      title: `Overload Alert: ${Math.round(currentIndex)}%`,
      body: `Your workload is ${severity}. ${recommendations[0]}`,
      silent: false,
      urgency: severity === 'critical' ? 'critical' : 'normal'
    });
  }

  private async getQuickRecommendations(index: number): Promise<string[]> {
    if (index > 150) {
      return [
        'Consider canceling non-essential meetings today.',
        'Defer low-priority tasks to tomorrow.',
        'Take a 15-minute break to reset.'
      ];
    } else if (index > 120) {
      return [
        'Focus on high-priority tasks only.',
        'Avoid starting new complex tasks.',
        'Schedule breaks between tasks.'
      ];
    } else {
      return [
        'Stay focused on current priorities.',
        'Take regular short breaks.',
        'Monitor your energy levels.'
      ];
    }
  }

  // Schedule daily summary notification
  scheduleDailySummary(hour: number = 17, minute: number = 0): void {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime.getTime() - now.getTime();

    setTimeout(async () => {
      // Get today's summary
      const history = secureStore.getOverloadHistory(1);
      if (history.length > 0) {
        const todayData = history.filter(h => {
          const date = new Date(h.timestamp);
          return date.toDateString() === new Date().toDateString();
        });

        if (todayData.length > 0) {
          const averageIndex = todayData.reduce((sum, d) => sum + d.index, 0) / todayData.length;
          const peakIndex = Math.max(...todayData.map(d => d.index));

          await this.sendDailySummary({
            averageIndex,
            peakIndex,
            totalTasks: 0, // TODO: Get from Motion data
            completedTasks: 0, // TODO: Get from Motion data
            recommendations: await this.getQuickRecommendations(averageIndex)
          });
        }
      }

      // Schedule next notification
      this.scheduleDailySummary(hour, minute);
    }, timeUntilNotification);
  }
}

export const notificationService = new NotificationService();