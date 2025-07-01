// Motion API Configuration
export const MOTION_CONFIG = {
  // API configuration
  API_BASE_URL: 'https://api.usemotion.com/v1',
  
  // API Key authentication - These should be in environment variables in production
  API_KEY: process.env.MOTION_API_KEY || '',
  
  // Rate limiting configuration
  RATE_LIMIT: {
    MAX_REQUESTS_PER_HOUR: 1000,
    MAX_REQUESTS_PER_10_MIN: 100,
    DEFAULT_RETRY_AFTER: 60, // seconds
  },
  
  // Sync intervals (in milliseconds)
  SYNC_INTERVALS: {
    TASKS: 5 * 60 * 1000,        // 5 minutes
    PROJECTS: 60 * 60 * 1000,    // 1 hour
    WORKSPACES: 24 * 60 * 60 * 1000, // 24 hours
    SCHEDULES: 10 * 60 * 1000,   // 10 minutes
    STATUSES: 24 * 60 * 60 * 1000, // 24 hours (or on startup)
  },
  
  // Cache TTL (in milliseconds)
  CACHE_TTL: {
    TASKS: 5 * 60 * 1000,        // 5 minutes
    PROJECTS: 60 * 60 * 1000,    // 1 hour
    WORKSPACES: 24 * 60 * 60 * 1000, // 24 hours
    SCHEDULES: 10 * 60 * 1000,   // 10 minutes
    STATUSES: 24 * 60 * 60 * 1000, // 24 hours
  }
};