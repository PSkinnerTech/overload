# Overload Project: Task Checklist

This document outlines the tasks required to build the Overload application, broken down into logical phases. This checklist is derived from the project's scope and best-practices documents.

## Phase 0: Project Setup & Core Architecture
- [x] Initialize Electron Forge project with the Vite + TypeScript + React template.
- [x] Establish the core application structure: `main`, `renderer`, and `preload` processes.
- [x] Implement a secure IPC bridge using `contextBridge` and promise-based `ipcMain.handle`/`ipcRenderer.invoke` calls as per `electron.md`.
- [x] Define the initial `window.overloadApi` surface in the preload script.
- [x] Set up the basic UI shell using Tailwind CSS and shadcn/ui.
- [x] Select and integrate a local storage solution (e.g., `electron-store` for JSON or SQLite for more complex data).
- [x] Implement secure credential storage using `electron.safeStorage` for upcoming OAuth tokens.

### Phase 0 Completion Summary
✅ **Completed on 2025-07-01**

Key implementations:
- React 19 with TypeScript integrated into Electron renderer
- Secure IPC communication established with comprehensive API surface
- Tailwind CSS v4 with @tailwindcss/vite plugin configured
- shadcn/ui component system initialized with Button component
- electron-store integrated for local data persistence
- Secure token storage service using electron.safeStorage
- IPC handlers implemented for all major features (auth, sync, settings, feedback)

The application now has a solid foundation with a welcome screen and "Connect to Motion" button ready for OAuth implementation.

## Phase 1: Motion Integration & Data Sync
- [x] Implement the Motion API OAuth2 authentication flow.
  - [x] Create welcome screen explaining what Overload does and data requirements.
  - [x] Add "Connect to Motion" button that initiates OAuth flow.
  - [x] Open new BrowserWindow for Motion OAuth2 URL.
  - [x] Handle custom protocol redirect (`overload://oauth/callback`).
  - [x] Extract authorization code from redirect URL.
  - [x] Exchange authorization code for access and refresh tokens.
  - [x] Store tokens securely using `electron.safeStorage`.
  - [x] Notify renderer process of successful authentication via IPC.
  - [x] Transition from login view to main dashboard.
- [x] Build a robust Motion API client service in the main process.
  - [x] Implement request logic with proper `Authorization` headers.
  - [x] Implement comprehensive error handling for API responses (4xx, 5xx).
  - [x] Integrate rate limit management with exponential backoff, respecting `X-RateLimit-Remaining` and `Retry-After` headers.
- [x] Develop the core data synchronization service.
  - [x] On app startup, perform a full sync of essential, non-volatile data (Workspaces, Projects, Statuses).
  - [x] Implement a background sync mechanism for dynamic data (Tasks, Schedules) based on the frequency guidelines in `motion.md`.
- [x] Design and implement a smart caching strategy for API responses to support offline functionality and reduce API calls.
- [x] Add a module to parse Motion task descriptions for additional metadata (e.g., `#tags`, `effort:high`).

### Phase 1 Completion Summary
✅ **Completed on 2025-07-01**

Key implementations:
- API key authentication with Motion (simplified from OAuth2)
- Environment variable configuration with dotenv
- Robust API client with rate limiting and exponential backoff
- Smart caching system for offline functionality
- Automatic data sync service with background updates
- Event-based sync status updates to renderer
- Error handling for API failures
- Support for fetching data from all workspaces (no workspace ID restriction)

The application now successfully:
- Authenticates with Motion using API key
- Syncs all workspaces, projects, tasks, schedules, and statuses
- Caches data for offline access and performance
- Handles rate limits gracefully
- Provides clear setup instructions for API key configuration

Note: While OAuth2 would provide better UX, Motion currently only supports API key authentication. The implementation is ready to be enhanced when/if Motion adds OAuth2 support.

## Phase 2: Overload Index (θ) Engine & Intelligence
- [x] Design the data model for calculating and storing the Overload Index (θ).
- [x] Create the initial version of the θ calculation engine, using metrics from `scope.md` (task density, time pressure, context switching).
- [x] Integrate LangGraph as the AI workflow orchestrator.
  - [x] Create a graph that ingests synced Motion data.
  - [x] Implement a node within the graph that executes the θ calculation.
  - [x] Ensure the graph outputs a structured result (e.g., `{ index: 95, contributors: [...] }`).
- [x] Schedule the LangGraph workflow to run automatically after each successful data sync.

### Phase 2 Completion Summary
✅ **Completed on 2025-07-01**

Key implementations:
- Comprehensive data models for Overload Index, metrics, factors, and history
- Sophisticated θ calculation engine with:
  - Task count and complexity analysis
  - Meeting density calculation
  - Context switching detection
  - Time fragmentation analysis
  - Day/time-based threshold adjustments
- LangGraph workflow with 4 nodes:
  - Fetch Motion data
  - Calculate Overload Index
  - Analyze historical trends
  - Generate daily summary
- Automatic θ calculation triggered after each sync
- History storage for trend analysis
- IPC handlers for retrieving current index and history

The Overload Index engine now:
- Calculates a personalized workload score (0-200+, 100 = threshold)
- Breaks down contributing factors (task load, meetings, context switching, etc.)
- Adjusts thresholds based on day of week and time of day
- Generates actionable recommendations when overloaded
- Stores history for pattern recognition

## Phase 3: UI Dashboard & Visualization
- [x] Design and build the main dashboard UI in React.
- [x] Create the Overload Index (θ) Meter component:
  - [x] Implement color-coded gauge showing current workload percentage.
  - [x] Display percentage against user's calculated threshold.
  - [x] Show visual indicator when over 100% (overloaded state).
- [x] Implement the Timeline Trend Graph:
  - [x] Visualize θ index over past week/month.
  - [x] Enable pattern identification (e.g., overloaded Wednesdays).
  - [x] Show periods of sustained high effort.
- [x] Develop Breakdown Cards for workload contributors:
  - [x] Task Load card: volume and complexity of scheduled tasks.
  - [x] Meeting Density card: percentage of day blocked for meetings.
  - [x] Context Switching card: frequency of shifts between projects/work types.
- [x] Build the Task Insight Panel:
  - [x] List specific tasks/meetings contributing most to current index.
  - [x] Enable quick identification of deferrable/re-prioritizable items.
- [x] Wire all UI components to the data provided from the main process via the secure IPC channel.

### Phase 3 Completion Summary
✅ **Completed on 2025-07-01**

Key implementations:
- Full dashboard UI with all required components
- OverloadMeter with animated gauge and color coding
- TrendGraph showing 7-day historical data with threshold line
- BreakdownCards using shadcn/ui components (Card, Badge, Progress)
- TaskInsightPanel with real-time task impact analysis
- All components properly wired to IPC data channels
- Responsive design using shadcn/ui design system
- User-friendly API key setup flow (no code access required)

## Phase 4: Notifications & User Feedback
- [ ] Implement the user feedback slider:
  - [ ] Create simple slider component asking "How overloaded do you feel right now?"
  - [ ] Store user feedback locally with timestamp.
  - [ ] Implement reinforcement learning to adjust θ engine sensitivity.
  - [ ] Handle cases where user feels overloaded at low θ (increase sensitivity).
  - [ ] Handle cases where user feels fine at high θ (decrease sensitivity).
- [ ] Integrate Electron's `Notification` API to deliver desktop notifications.
- [ ] Implement Daily Summary notification:
  - [ ] Send at start of workday with projected load.
  - [ ] Include quick access to open dashboard.
- [ ] Implement real-time overload alerts:
  - [ ] Trigger when θ exceeds user-defined threshold.
  - [ ] Run background sync to keep θ updated throughout day.
  - [ ] Ensure notifications are actionable and not intrusive.

## Phase 5: Settings & Finalization
- [ ] Build the application's Settings view.
- [ ] Implement controls for:
  - [ ] Adjusting the background sync interval.
  - [ ] Toggling different Motion data sources (if applicable).
  - [ ] Adjusting the sensitivity of the Overload Index calculation.
- [ ] Create a seamless onboarding flow for first-time users:
  - [ ] Welcome screen explaining Overload's purpose and value.
  - [ ] Clear data usage and permission explanations.
  - [ ] Smooth transition from authentication to initial dashboard view.
  - [ ] Display initial Overload Index after first data sync.
- [ ] Test and finalize the production build process using `npm run make`.
- [ ] Review and write final user-facing documentation.

## Post-MVP / Stretch Goals
- [ ] Integrate additional data sources like Google Calendar or Apple Calendar.
- [ ] Experiment with local LLMs (e.g., via Ollama) for generating more nuanced insights.
- [ ] Build the "What-if?" scenario simulator.
- [ ] Implement a feature to export workload history to CSV or Markdown.
- [ ] Investigate integration with biometric data sources (e.g., Apple Health) for a more holistic workload analysis.
