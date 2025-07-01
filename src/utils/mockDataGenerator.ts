import { cache } from '../services/cache';

interface MockTask {
  id: string;
  name: string;
  description?: string;
  scheduledStart: string;
  scheduledEnd: string;
  dueDate: string;
  project?: { id: string; name: string };
  status: string;
  duration: number; // in minutes
}

export function generateMockTasksForToday(): MockTask[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tasks: MockTask[] = [];
  const projects = [
    { id: 'proj1', name: 'Product Development' },
    { id: 'proj2', name: 'Marketing Campaign' },
    { id: 'proj3', name: 'Customer Support' },
    { id: 'proj4', name: 'Strategic Planning' }
  ];
  
  // Morning tasks (9 AM - 12 PM)
  tasks.push({
    id: 'task1',
    name: 'Team Standup Meeting',
    description: 'Daily team sync meeting',
    scheduledStart: new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(today.getTime() + 9.5 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(today.getTime() + 9.5 * 60 * 60 * 1000).toISOString(),
    project: projects[0],
    status: 'scheduled',
    duration: 30
  });
  
  tasks.push({
    id: 'task2',
    name: 'Code Review - Feature X',
    description: 'Review pull requests for Feature X effort:high',
    scheduledStart: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(today.getTime() + 11 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(today.getTime() + 11 * 60 * 60 * 1000).toISOString(),
    project: projects[0],
    status: 'scheduled',
    duration: 60
  });
  
  tasks.push({
    id: 'task3',
    name: 'Marketing Strategy Meeting',
    description: 'Q3 marketing strategy discussion meeting',
    scheduledStart: new Date(today.getTime() + 11 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(),
    project: projects[1],
    status: 'scheduled',
    duration: 60
  });
  
  // Afternoon tasks (1 PM - 5 PM)
  tasks.push({
    id: 'task4',
    name: 'Customer Support Tickets',
    description: 'Handle priority customer support tickets effort:medium',
    scheduledStart: new Date(today.getTime() + 13 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(today.getTime() + 14.5 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(today.getTime() + 14.5 * 60 * 60 * 1000).toISOString(),
    project: projects[2],
    status: 'scheduled',
    duration: 90
  });
  
  tasks.push({
    id: 'task5',
    name: 'Feature Development - API Integration',
    description: 'Implement API integration for Feature Y effort:high complex',
    scheduledStart: new Date(today.getTime() + 14.5 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(today.getTime() + 16.5 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(today.getTime() + 16.5 * 60 * 60 * 1000).toISOString(),
    project: projects[0],
    status: 'scheduled',
    duration: 120
  });
  
  tasks.push({
    id: 'task6',
    name: 'Budget Review Meeting',
    description: 'Monthly budget review meeting urgent',
    scheduledStart: new Date(today.getTime() + 15 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(today.getTime() + 16 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(today.getTime() + 16 * 60 * 60 * 1000).toISOString(),
    project: projects[3],
    status: 'scheduled',
    duration: 60
  });
  
  // Evening tasks (5 PM - 7 PM)
  tasks.push({
    id: 'task7',
    name: 'Email Follow-ups',
    description: 'Respond to important emails effort:low',
    scheduledStart: new Date(today.getTime() + 17 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(today.getTime() + 17.5 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(today.getTime() + 17.5 * 60 * 60 * 1000).toISOString(),
    project: projects[1],
    status: 'scheduled',
    duration: 30
  });
  
  tasks.push({
    id: 'task8',
    name: 'Documentation Update',
    description: 'Update technical documentation effort:medium',
    scheduledStart: new Date(today.getTime() + 17.5 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(today.getTime() + 19 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(today.getTime() + 19 * 60 * 60 * 1000).toISOString(),
    project: projects[0],
    status: 'scheduled',
    duration: 90
  });
  
  // Add some completed tasks to show progress
  tasks.push({
    id: 'task9',
    name: 'Morning Email Check',
    description: 'Check and respond to urgent emails',
    scheduledStart: new Date(today.getTime() + 8.5 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString(),
    project: projects[2],
    status: 'completed',
    duration: 30
  });
  
  return tasks;
}

export function injectMockData(): void {
  console.log('Injecting mock data for demonstration...');
  
  const mockTasks = generateMockTasksForToday();
  const mockProjects = [
    { id: 'proj1', name: 'Product Development' },
    { id: 'proj2', name: 'Marketing Campaign' },
    { id: 'proj3', name: 'Customer Support' },
    { id: 'proj4', name: 'Strategic Planning' }
  ];
  
  const mockSchedules = [{
    id: 'schedule1',
    name: 'Work Hours',
    monday: { start: '09:00', end: '18:00' },
    tuesday: { start: '09:00', end: '18:00' },
    wednesday: { start: '09:00', end: '18:00' },
    thursday: { start: '09:00', end: '18:00' },
    friday: { start: '09:00', end: '17:00' }
  }];
  
  const mockWorkspaces = [{
    id: 'workspace1',
    name: 'My Workspace'
  }];
  
  // Cache the mock data
  cache.set('motion:tasks:all', mockTasks, 60); // Cache for 60 minutes
  cache.set('motion:projects:all', mockProjects, 60);
  cache.set('motion:schedules:all', mockSchedules, 60);
  cache.set('motion:workspaces', mockWorkspaces, 60);
  cache.set('motion:statuses:all', [], 60);
  cache.set('motion:recurring-tasks:all', [], 60);
  
  console.log(`Injected ${mockTasks.length} mock tasks for today`);
}

export function clearMockData(): void {
  console.log('Clearing mock data...');
  cache.delete('motion:tasks:all');
  cache.delete('motion:projects:all');
  cache.delete('motion:schedules:all');
  cache.delete('motion:workspaces');
  cache.delete('motion:statuses:all');
  cache.delete('motion:recurring-tasks:all');
}