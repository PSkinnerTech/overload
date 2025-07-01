import { motionApi } from './motion-api';
import { cache } from './cache';
import { secureStore } from './store';
import { MOTION_CONFIG } from '../config/motion';
import { EventEmitter } from 'events';
import { runOverloadAnalysis } from '../workflows/overload-workflow';
import { notificationService } from './notifications';
import { injectMockData } from '../utils/mockDataGenerator';

interface SyncStatus {
  isSyncing: boolean;
  lastSync: number | null;
  error: string | null;
  progress: number;
}

interface MotionData {
  tasks: any[];
  projects: any[];
  workspaces: any[];
  schedules: any[];
  statuses: any[];
  recurringTasks: any[];
}

export class MotionSyncService extends EventEmitter {
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSync: null,
    error: null,
    progress: 0,
  };
  
  private syncIntervals: Map<keyof MotionData, NodeJS.Timeout> = new Map();
  private workspaces: any[] = [];

  async performInitialSync(): Promise<void> {
    if (!await this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
    
    // Double-check we have an API key
    const { motionAuth } = await import('./motion-auth-simple');
    const hasApiKey = await motionAuth.getApiKey();
    if (!hasApiKey) {
      throw new Error('No API key found. Please authenticate first.');
    }

    this.setSyncStatus({ isSyncing: true, error: null, progress: 0 });
    
    try {
      // Get workspaces first
      await this.syncWorkspaces();
      
      // Then sync everything else
      await this.syncAll();
      
      this.setSyncStatus({ 
        isSyncing: false, 
        lastSync: Date.now(),
        progress: 100 
      });
      
      this.emit('sync:completed', this.syncStatus);
      
      // Automatically run overload analysis after successful sync
      console.log('Running overload analysis after sync...');
      runOverloadAnalysis().catch(error => {
        console.error('Failed to run overload analysis:', error);
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.setSyncStatus({ 
        isSyncing: false, 
        error: errorMessage,
        progress: 0 
      });
      
      this.emit('sync:error', errorMessage);
      throw error;
    }
  }

  async syncAll(): Promise<void> {
    // Sync sequentially to ensure workspaces are available for other syncs
    const syncOperations = [
      { name: 'projects', fn: () => this.syncProjects() },
      { name: 'statuses', fn: () => this.syncStatuses() },
      { name: 'tasks', fn: () => this.syncTasks() },
      { name: 'schedules', fn: () => this.syncSchedules() },
      { name: 'recurring tasks', fn: () => this.syncRecurringTasks() },
    ];

    for (const { name, fn } of syncOperations) {
      try {
        await fn();
      } catch (error) {
        console.error(`Failed to sync ${name}:`, error);
        // Continue with other sync operations
      }
    }
  }

  async syncWorkspaces(): Promise<any[]> {
    this.updateProgress(0, 'Syncing workspaces...');
    
    const cacheKey = 'motion:workspaces';
    const cached = cache.get<any[]>(cacheKey);
    
    if (cached) {
      this.workspaces = cached;
      console.log('Using cached workspaces:', cached.length);
      return cached;
    }
    
    try {
      const workspaces = await motionApi.getWorkspaces();
      console.log('Fetched workspaces:', workspaces);
      
      // Only cache if we got valid data
      if (workspaces && workspaces.length > 0) {
        cache.set(cacheKey, workspaces, MOTION_CONFIG.CACHE_TTL.WORKSPACES / 60000);
      }
      
      this.workspaces = workspaces || [];
      return this.workspaces;
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      this.workspaces = [];
      // Don't throw - allow sync to continue without workspaces
      return [];
    }
  }

  async syncTasks(): Promise<any[]> {
    this.updateProgress(20, 'Syncing tasks from all workspaces...');
    
    const cacheKey = 'motion:tasks:all';
    const cached = cache.get<any[]>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // If we don't have workspaces yet, we can't sync tasks
    if (this.workspaces.length === 0) {
      console.log('No workspaces available for task sync');
      return [];
    }
    
    // Get tasks for the next 7 days from all workspaces
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get all tasks - Motion API will return tasks from all workspaces
    // Note: Motion's task endpoint doesn't support dueDate or limit parameters
    const tasks = await motionApi.getTasks();
    
    cache.set(cacheKey, tasks, MOTION_CONFIG.CACHE_TTL.TASKS / 60000);
    return tasks;
  }

  async syncProjects(): Promise<any[]> {
    this.updateProgress(40, 'Syncing projects from all workspaces...');
    
    const cacheKey = 'motion:projects:all';
    const cached = cache.get<any[]>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Always try without workspace ID first as Motion might handle this differently
    try {
      const projects = await motionApi.getProjects();
      cache.set(cacheKey, projects, MOTION_CONFIG.CACHE_TTL.PROJECTS / 60000);
      return projects;
    } catch (error) {
      console.error('Failed to get projects:', error);
      
      // If that fails and we have workspaces, try getting projects per workspace
      if (this.workspaces.length > 0) {
        const allProjects: any[] = [];
        
        for (const workspace of this.workspaces) {
          try {
            const projects = await motionApi.getProjects(workspace.id);
            allProjects.push(...projects);
          } catch (error) {
            console.error(`Failed to get projects for workspace ${workspace.id}:`, error);
          }
        }
        
        if (allProjects.length > 0) {
          cache.set(cacheKey, allProjects, MOTION_CONFIG.CACHE_TTL.PROJECTS / 60000);
        }
        return allProjects;
      }
      
      return [];
    }
  }

  async syncSchedules(): Promise<any[]> {
    this.updateProgress(60, 'Syncing schedules from all workspaces...');
    
    const cacheKey = 'motion:schedules:all';
    const cached = cache.get<any[]>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const schedules = await motionApi.getSchedules();
    
    cache.set(cacheKey, schedules, MOTION_CONFIG.CACHE_TTL.SCHEDULES / 60000);
    return schedules;
  }

  async syncStatuses(): Promise<any[]> {
    this.updateProgress(80, 'Syncing statuses from all workspaces...');
    
    const cacheKey = 'motion:statuses:all';
    const cached = cache.get<any[]>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Always try without workspace ID first
    try {
      const statuses = await motionApi.getStatuses();
      cache.set(cacheKey, statuses, MOTION_CONFIG.CACHE_TTL.STATUSES / 60000);
      return statuses;
    } catch (error) {
      console.error('Failed to get statuses:', error);
      
      // If that fails and we have workspaces, try per workspace
      if (this.workspaces.length > 0) {
        const allStatuses: any[] = [];
        
        for (const workspace of this.workspaces) {
          try {
            const statuses = await motionApi.getStatuses(workspace.id);
            allStatuses.push(...statuses);
          } catch (error) {
            console.error(`Failed to get statuses for workspace ${workspace.id}:`, error);
          }
        }
        
        if (allStatuses.length > 0) {
          cache.set(cacheKey, allStatuses, MOTION_CONFIG.CACHE_TTL.STATUSES / 60000);
        }
        return allStatuses;
      }
      
      return [];
    }
  }

  async syncRecurringTasks(): Promise<any[]> {
    this.updateProgress(90, 'Syncing recurring tasks from all workspaces...');
    
    const cacheKey = 'motion:recurring-tasks:all';
    const cached = cache.get<any[]>(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Always try without workspace ID first
    try {
      const recurringTasks = await motionApi.getRecurringTasks();
      cache.set(cacheKey, recurringTasks, MOTION_CONFIG.CACHE_TTL.TASKS / 60000);
      return recurringTasks;
    } catch (error) {
      console.error('Failed to get recurring tasks:', error);
      
      // If that fails and we have workspaces, try per workspace
      if (this.workspaces.length > 0) {
        const allRecurringTasks: any[] = [];
        
        for (const workspace of this.workspaces) {
          try {
            const recurringTasks = await motionApi.getRecurringTasks(workspace.id);
            allRecurringTasks.push(...recurringTasks);
          } catch (error) {
            console.error(`Failed to get recurring tasks for workspace ${workspace.id}:`, error);
          }
        }
        
        if (allRecurringTasks.length > 0) {
          cache.set(cacheKey, allRecurringTasks, MOTION_CONFIG.CACHE_TTL.TASKS / 60000);
        }
        return allRecurringTasks;
      }
      
      return [];
    }
  }

  startBackgroundSync(): void {
    // Clear any existing intervals
    this.stopBackgroundSync();
    
    // Set up sync intervals for each data type
    this.syncIntervals.set('tasks', setInterval(() => {
      this.syncTasks().catch(console.error);
    }, MOTION_CONFIG.SYNC_INTERVALS.TASKS));
    
    this.syncIntervals.set('schedules', setInterval(() => {
      this.syncSchedules().catch(console.error);
    }, MOTION_CONFIG.SYNC_INTERVALS.SCHEDULES));
    
    this.syncIntervals.set('projects', setInterval(() => {
      this.syncProjects().catch(console.error);
    }, MOTION_CONFIG.SYNC_INTERVALS.PROJECTS));
  }

  stopBackgroundSync(): void {
    for (const interval of this.syncIntervals.values()) {
      clearInterval(interval);
    }
    this.syncIntervals.clear();
  }

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  async getCachedData(): Promise<Partial<MotionData>> {
    const data: Partial<MotionData> = {};
    
    const workspaces = cache.get<any[]>('motion:workspaces');
    if (workspaces) data.workspaces = workspaces;
    
    const tasks = cache.get<any[]>('motion:tasks:all');
    if (tasks) data.tasks = tasks;
    
    const projects = cache.get<any[]>('motion:projects:all');
    if (projects) data.projects = projects;
    
    const schedules = cache.get<any[]>('motion:schedules:all');
    if (schedules) data.schedules = schedules;
    
    const statuses = cache.get<any[]>('motion:statuses:all');
    if (statuses) data.statuses = statuses;
    
    const recurringTasks = cache.get<any[]>('motion:recurring-tasks:all');
    if (recurringTasks) data.recurringTasks = recurringTasks;
    
    return data;
  }

  clearCache(): void {
    cache.clear();
  }

  async useMockData(): Promise<void> {
    this.setSyncStatus({ isSyncing: true, error: null, progress: 0 });
    
    try {
      // Inject mock data
      injectMockData();
      
      this.setSyncStatus({ 
        isSyncing: false, 
        lastSync: Date.now(),
        progress: 100 
      });
      
      this.emit('sync:completed', this.syncStatus);
      
      // Automatically run overload analysis after mock data injection
      console.log('Running overload analysis with mock data...');
      runOverloadAnalysis().catch(error => {
        console.error('Failed to run overload analysis:', error);
      });
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.setSyncStatus({ 
        isSyncing: false, 
        error: errorMessage,
        progress: 0 
      });
      
      this.emit('sync:error', errorMessage);
      throw error;
    }
  }

  private async isAuthenticated(): Promise<boolean> {
    const auth = secureStore.getAuthStatus();
    return auth.isAuthenticated;
  }

  private setSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.emit('sync:progress', this.syncStatus);
  }

  private updateProgress(progress: number, message?: string): void {
    this.setSyncStatus({ progress });
    if (message) {
      console.log(`[Sync] ${message}`);
    }
  }
}

export const motionSync = new MotionSyncService();