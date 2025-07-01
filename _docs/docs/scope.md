# Overload: Project Scope Document

## Core Purpose

Overload is a local-first desktop app that helps users understand when they’re taking on too much by calculating and visualizing a personalized Overload Index (θ). It integrates with Motion to ingest task and schedule data, then uses intelligent workflows to recommend prioritization, deferral, or rest.

## Core Features

### 1. Motion API Sync

- OAuth2 Authentication
- Pull data from:
  - Tasks (/tasks/list)
  - Projects (/projects/list)
  - Recurring tasks
  - Schedule blocks
  - Comments (optional)
- Cache and refresh periodically
- Handle rate limits and backoff

### 2. Overload Index (θ) Engine

- Calculate a personalized workload score using:
  - Number of tasks
  - Meeting hours
  - Task switching
  - Recurring intensity
  - Task metadata (descriptions, effort tags)
  - Time of day/day of week patterns
  - Historical feedback
- Adaptive over time with reinforcement loop

### 3. LangGraph-Based Intelligence

- Workflow node to calculate/update θ
- Node to evaluate new tasks/meetings ("Will this push me over?")
- Optional: natural language summary of task load
- Optional: auto-tag or annotate high-load tasks

### 4. Daily Summary and Nudges

- Desktop notification in the morning:
  - "Today’s load is 87% of your threshold. Consider deferring X."
- Notification when θ goes above 100:
  - "You’ve added 3 more meetings than usual."

### 5. UI Dashboard

- θ Meter (color-coded gauge)
- Timeline trend graph (θ over time)
- Breakdown cards: Tasks, Meetings, Switching Frequency, etc.
- Task insight panel (top contributors to load)
- User feedback slider ("How overloaded do you feel today?")
- Manual task override/adjustment system

### 6. Settings

- Adjust sync interval (5–60 minutes)
- Toggle specific Motion sources
- Manual control over Overload Index sensitivity
- Optional offline mode

### 7. Onboarding and Permissions

- OAuth login with Motion
- Consent for what data is analyzed
- Explain how Overload Index works

## Stretch Goals

- Integrate with Google Calendar directly
- Add local LLM or Ollama-powered feedback loop
- Support Apple Calendar or iCal
- Build a “What if I add this?” simulator
- Export load history to CSV or Markdown
- Integrate biofeedback (Apple Health, sleep data)

## Technical Stack

| Layer          | Tool                                  |
|----------------|---------------------------------------|
| UI             | React (via Vite) + Tailwind + shadcn/ui |
| App Shell      | Electron Forge                        |
| Language       | TypeScript                            |
| AI Workflow    | LangGraph                             |
| Data Sync      | Motion API (OAuth2)                   |
| Storage        | Local SQLite or JSON DB               |
| Auth           | OAuth2 + local token vault            |
| Optional       | N8N, OpenAI, Ollama                   |

## MVP Definition

Required:
- Motion OAuth login
- Pull tasks and projects
- Simple θ index calculator
- Desktop dashboard (gauge, breakdown, graph)
- One notification when threshold is exceeded
- User feedback slider
- LangGraph workflow that computes θ

Optional but Ideal:
- Task detail breakdown panel
- Cache and refresh logic
- Daily “morning summary” notification

## Out of Scope

- Editing tasks or pushing changes to Motion
- Multi-account support
- Mobile or web version
- AI assistant/chatbot
- Scheduling automation
- LLM hallucination-heavy features

## Next Steps

1. Finalize this scope
2. Break into phases (e.g., Phase 0: Auth, Phase 1: Motion Sync)
3. Write best-practices docs per subsystem
4. Build MVP core in Electron and LangGraph
5. Add AI enhancements after baseline stability
