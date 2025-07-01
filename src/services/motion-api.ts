import { MOTION_CONFIG } from '../config/motion';
import { motionAuth } from './motion-auth-simple';

interface RateLimitInfo {
  remaining: number;
  reset: number;
  retryAfter?: number;
}

interface MotionApiOptions {
  method?: string;
  body?: any;
  params?: Record<string, any>;
}

export class MotionApiClient {
  private rateLimitInfo: RateLimitInfo = {
    remaining: MOTION_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_HOUR,
    reset: Date.now() + 3600000, // 1 hour from now
  };
  
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  async request<T>(endpoint: string, options: MotionApiOptions = {}): Promise<T> {
    // Add request to queue to handle rate limiting
    return new Promise((resolve, reject) => {
      const requestFn = async () => {
        try {
          const result = await this.makeRequest<T>(endpoint, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      this.requestQueue.push(requestFn);
      this.processQueue();
    });
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: MotionApiOptions = {}, 
    retries = 3
  ): Promise<T> {
    // Get API key from secure storage
    const apiKey = await motionAuth.getApiKey();
    if (!apiKey) {
      throw new Error('Motion API key not configured. Please authenticate first.');
    }

    // Build URL
    const url = new URL(`${MOTION_CONFIG.API_BASE_URL}${endpoint}`);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Make request
    try {
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Update rate limit info from headers
      this.updateRateLimitInfo(response.headers);

      // Handle rate limiting
      if (response.status === 429) {
        if (retries > 0) {
          const retryAfter = this.rateLimitInfo.retryAfter || 
            parseInt(response.headers.get('Retry-After') || '60');
          
          console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
          await this.delay(retryAfter * 1000);
          
          return this.makeRequest<T>(endpoint, options, retries - 1);
        }
        throw new Error('Rate limit exceeded');
      }

      // Handle authentication errors
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Motion API key in the .env file.');
      }

      // Handle other errors
      if (!response.ok) {
        const error = await response.text();
        console.error(`Motion API Error - Status: ${response.status}, URL: ${url.toString()}, Response: ${error}`);
        throw new Error(`Motion API error (${response.status}): ${error}`);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        console.log(`Motion API Success - URL: ${url.toString()}, Empty response`);
        return null;
      }
      
      try {
        const data = JSON.parse(text);
        console.log(`Motion API Success - URL: ${url.toString()}, Response:`, data);
        return data;
      } catch (e) {
        console.error(`Motion API Success but invalid JSON - URL: ${url.toString()}, Response:`, text);
        throw new Error(`Invalid JSON response from Motion API: ${text.substring(0, 100)}`);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Motion API');
      }
      throw error;
    }
  }

  private updateRateLimitInfo(headers: Headers) {
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');
    const retryAfter = headers.get('Retry-After');

    if (remaining !== null) {
      this.rateLimitInfo.remaining = parseInt(remaining);
    }
    
    if (reset !== null) {
      this.rateLimitInfo.reset = parseInt(reset) * 1000; // Convert to milliseconds
    }
    
    if (retryAfter !== null) {
      this.rateLimitInfo.retryAfter = parseInt(retryAfter);
    }
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Check if we need to wait for rate limit reset
      if (this.rateLimitInfo.remaining <= 0) {
        const waitTime = Math.max(0, this.rateLimitInfo.reset - Date.now());
        if (waitTime > 0) {
          console.log(`Rate limit reached. Waiting ${waitTime / 1000} seconds...`);
          await this.delay(waitTime);
        }
      }

      // Process next request
      const request = this.requestQueue.shift();
      if (request) {
        await request();
        
        // Add small delay between requests to avoid hitting burst limits
        if (this.requestQueue.length > 0) {
          await this.delay(100); // 100ms between requests
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods for common endpoints
  async getTasks() {
    // Motion's tasks endpoint doesn't support query parameters
    const response = await this.request<any>('/tasks');
    
    // Handle paginated response
    if (response && response.tasks) {
      return response.tasks;
    } else if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  async getProjects(workspaceId?: string) {
    const params = workspaceId ? { workspaceId } : undefined;
    const response = await this.request<any>('/projects', { params });
    
    // Handle paginated response
    if (response && response.projects) {
      return response.projects;
    } else if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  async getWorkspaces() {
    console.log('Motion API: Fetching workspaces...');
    try {
      const response = await this.request<any>('/workspaces');
      console.log('Motion API: Workspaces response:', response);
      
      if (!response) {
        console.log('Motion API: Empty workspaces response, returning empty array');
        return [];
      }
      
      // Motion API returns paginated results with a 'workspaces' array
      if (response.workspaces !== undefined) {
        console.log('Motion API: Workspaces fetched successfully:', response.workspaces);
        return Array.isArray(response.workspaces) ? response.workspaces : [];
      } else if (Array.isArray(response)) {
        // In case the API returns the array directly
        console.log('Motion API: Workspaces fetched successfully (array):', response);
        return response;
      } else {
        console.error('Motion API: Unexpected workspaces response structure:', response);
        return [];
      }
    } catch (error) {
      console.error('Motion API: Failed to fetch workspaces:', error);
      // Don't throw, return empty array to allow other syncs to continue
      return [];
    }
  }

  async getSchedules() {
    // Get all schedules
    const response = await this.request<any>('/schedules');
    
    // Handle paginated response
    if (response && response.schedules) {
      return response.schedules;
    } else if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  async getStatuses(workspaceId?: string) {
    const params = workspaceId ? { workspaceId } : undefined;
    const response = await this.request<any>('/statuses', { params });
    
    // Handle paginated response
    if (response && response.statuses) {
      return response.statuses;
    } else if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  async getRecurringTasks(workspaceId?: string) {
    const params = workspaceId ? { workspaceId } : undefined;
    const response = await this.request<any>('/recurring-tasks', { params });
    
    // Handle paginated response
    if (response && response.recurringTasks) {
      return response.recurringTasks;
    } else if (Array.isArray(response)) {
      return response;
    }
    return [];
  }
}

export const motionApi = new MotionApiClient();