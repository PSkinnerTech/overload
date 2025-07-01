---
title: "Best Practices for Motion API Integration"
description: "Comprehensive guidelines for integrating the Motion API into Overload effectively and responsibly"
sidebar_position: 1
---

# Best Practices for Motion API Integration

The [Motion API](https://docs.usemotion.com/) is a powerful tool for productivity management. To integrate it effectively within **Overload**, follow these comprehensive best practices to ensure performance, scalability, and responsible usage.

## Authentication & Security

### OAuth2 Implementation
- **Always use OAuth2** for authentication - never store or hard-code API tokens
- Store tokens securely using your operating system's credential store (Keychain on macOS, Credential Store on Windows)
- Implement proper token refresh logic to handle expired tokens gracefully
- Use the minimum required scopes for your application's needs

### Security Best Practices
```typescript
// Example: Secure token storage in Electron
import { safeStorage } from 'electron';

// Store encrypted token
const encryptedToken = safeStorage.encryptString(accessToken);
await store.set('motion_token', encryptedToken);

// Retrieve and decrypt token
const encryptedToken = await store.get('motion_token');
const accessToken = safeStorage.decryptString(encryptedToken);
```

## Rate Limits & Request Management

Motion enforces strict rate limits to ensure service stability:

### Rate Limit Guidelines
- **Standard limit**: 1000 requests per hour per workspace
- **Burst limit**: 100 requests per 10 minutes
- Always check response headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Implement exponential backoff for 429 (Too Many Requests) responses

### Request Frequency Best Practices
- **Tasks**: Poll every 5-10 minutes maximum
- **Projects**: Cache and refresh hourly or on user action
- **Workspaces**: Fetch once on app startup
- **Comments**: Only fetch when specifically needed

### Error Handling Strategy
```typescript
async function makeMotionRequest(endpoint: string, retries = 3): Promise<any> {
  try {
    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 429) {
      if (retries > 0) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
        return makeMotionRequest(endpoint, retries - 1);
      }
      throw new Error('Rate limit exceeded');
    }
    
    return response.json();
  } catch (error) {
    console.error('Motion API request failed:', error);
    throw error;
  }
}
```

## Key API Endpoints for Overload

### Essential Endpoints

| Purpose | Endpoint | Usage Frequency |
|---------|----------|-----------------|
| Task data for load calculation | [`/tasks`](https://docs.usemotion.com/api-reference/tasks/list/) | Every 5-10 minutes |
| Project context | [`/projects`](https://docs.usemotion.com/api-reference/projects/list/) | Hourly or on-demand |
| Recurring task patterns | [`/recurring-tasks`](https://docs.usemotion.com/api-reference/recurring-tasks/get/) | Daily |
| Schedule blocks | [`/schedules`](https://docs.usemotion.com/api-reference/schedules/get/) | Every 10-15 minutes |
| Task status information | [`/statuses`](https://docs.usemotion.com/api-reference/statuses/get/) | On startup |
| Workspace configuration | [`/workspaces`](https://docs.usemotion.com/api-reference/workspaces/get/) | Once per session |
| Task insights | [`/comments`](https://docs.usemotion.com/api-reference/comments/get/) | On-demand only |

### Task List Optimization
```typescript
// Efficient task fetching with filters
const tasks = await fetch('/tasks', {
  params: {
    workspaceId: workspaceId,
    status: 'Auto Scheduled,Completed',
    dueDate: {
      from: startDate,
      to: endDate
    },
    limit: 100
  }
});
```

## Smart Caching Strategy

### Local Data Management
- Cache workspace and project data for offline functionality
- Use timestamps to determine when data needs refreshing
- Implement partial sync for changed tasks only
- Store user preferences locally to reduce API calls

### Cache Implementation Example
```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MotionCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttlMinutes = 10) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
}
```

## Task Descriptions & Metadata Extraction

Motion's task descriptions can contain valuable metadata for Overload Index calculation:

### Extract Meaningful Data
- Parse hashtags for categorization (`#urgent`, `#creative`, `#admin`)
- Identify effort indicators (`effort:high`, `complexity:3`)
- Extract time estimates from descriptions
- Look for stress indicators in task titles

### Parsing Strategy
```typescript
function parseTaskMetadata(description: string) {
  const hashtags = description.match(/#[\w-]+/g) || [];
  const effort = description.match(/effort:(\w+)/)?.[1];
  const timeEstimate = description.match(/(\d+)h/)?.[1];
  
  return {
    tags: hashtags.map(tag => tag.slice(1)),
    effort: effort || 'medium',
    estimatedHours: timeEstimate ? parseInt(timeEstimate) : null
  };
}
```

## Overload Index Calculation

### Recommended Metrics
- **Task density**: Number of tasks per day/hour
- **Time pressure**: Ratio of scheduled time to available time
- **Context switching**: Frequency of different project types
- **Deadline proximity**: Tasks due within 24-48 hours
- **Estimated vs actual duration**: Historical completion variance

### Sample Calculation
```typescript
function calculateOverloadIndex(tasks: Task[], timeframe: 'day' | 'week') {
  const scheduledHours = tasks.reduce((sum, task) => sum + task.duration, 0);
  const availableHours = timeframe === 'day' ? 8 : 40;
  const deadlineStress = tasks.filter(task => 
    new Date(task.dueDate) < new Date(Date.now() + 48 * 60 * 60 * 1000)
  ).length;
  
  const baseLoad = scheduledHours / availableHours;
  const stressFactor = 1 + (deadlineStress * 0.1);
  
  return Math.min(baseLoad * stressFactor, 2.0); // Cap at 2.0
}
```

## Sync Strategies

### Recommended Sync Patterns

1. **App Startup**
   - Full workspace and project sync
   - Current day's tasks
   - User preferences

2. **Background Sync** (every 10 minutes)
   - Task updates only
   - Check for new/modified tasks
   - Update completion status

3. **User-Triggered Sync**
   - Manual refresh button
   - Focus/resume events
   - Before calculating new Overload Index

4. **Smart Sync**
   - Increase frequency during work hours
   - Reduce frequency during off-hours
   - Pause sync when user is idle

## Performance Optimization

### Request Batching
- Group related API calls when possible
- Use task list filters to reduce payload size
- Implement request queuing to avoid hitting rate limits

### Data Minimization
- Only fetch fields you actually use
- Use date ranges to limit historical data
- Implement pagination for large datasets

### Background Processing
```typescript
// Process Motion data in background thread
const worker = new Worker('motion-processor.js');
worker.postMessage({ tasks, projects });
worker.onmessage = (event) => {
  const { overloadIndex, insights } = event.data;
  updateUI(overloadIndex, insights);
};
```

## Error Recovery

### Graceful Degradation
- Continue operating with cached data when API is unavailable
- Show appropriate user messages for different error states
- Implement retry logic with exponential backoff
- Log errors for debugging without exposing sensitive data

### User Communication
```typescript
const errorMessages = {
  RATE_LIMITED: "Taking a break to respect Motion's limits. Will retry in a moment.",
  UNAUTHORIZED: "Please re-authenticate with Motion to continue.",
  NETWORK_ERROR: "Connection issue detected. Using cached data.",
  API_ERROR: "Motion service temporarily unavailable. Retrying..."
};
```

## Testing Strategy

### Mock API Responses
- Create realistic test data that matches Motion's API structure
- Test rate limiting scenarios
- Verify error handling paths
- Test offline functionality

### Integration Testing
- Test full sync cycles
- Verify data consistency
- Test authentication flow
- Performance test with large datasets

## References

- [Motion API Getting Started](https://docs.usemotion.com/cookbooks/getting-started/)
- [Task Descriptions](https://docs.usemotion.com/cookbooks/description/)
- [Rate Limits](https://docs.usemotion.com/cookbooks/rate-limits/)
- [Request Frequency](https://docs.usemotion.com/cookbooks/frequency/)
- [API Reference](https://docs.usemotion.com/api-reference/)

Following these best practices will ensure Overload integrates seamlessly with Motion while providing a responsive, reliable, and respectful user experience.