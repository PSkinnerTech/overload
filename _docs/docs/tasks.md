# Aurix Project: Task Checklist

This document outlines the tasks required to build the Aurix application, based on the voice-first architecture.

## Phase 0: Core Setup & Environment
- [x] Initialize Electron Forge project with Vite + TypeScript + React.
- [x] Establish secure IPC bridge between main and renderer processes using `contextBridge`.
- [x] Set up basic UI shell with Tailwind CSS and initialize `shadcn/ui`.
- [x] Integrate electron-store for local encrypted storage (instead of SQLite).
- [x] Set up a basic logging service for debugging.

## Phase 1: Hybrid Voice Capture & Transcription
- [x] Implement the core `HybridTranscriptionService` in the main process to manage transcription sources.
- [x] Implement connectivity monitoring to switch between online/offline modes automatically.
- [x] **Renderer Process**: Implement the `WebSpeechHandler` to manage the Web Speech API.
- [x] **Main Process**: Implement the Vosk model manager to download and load the local model (stubbed due to native module issues).
- [x] **Main Process**: Integrate the Vosk engine for offline transcription (stubbed due to native module issues).
- [x] Create the IPC channels for the renderer to start/stop transcription and for the main process to receive results from both sources.
- [x] Implement the UI for recording and displaying the live transcript from the hybrid service.
- [x] Add a "Privacy Mode" toggle in the UI that allows the user to force offline transcription.

## Phase 2: AI Workflow (LangGraph)
- [x] Define the `WorkflowState` object that will be passed through the graph.
- [x] Build the `transcription_node` to handle the incoming data from the `HybridTranscriptionService`.
- [x] Build the `analysis_node` using a local LLM (via Ollama) to classify content and calculate a complexity score.
- [x] Build the `document_generation_node` to generate structured Markdown from the transcript.
- [x] Build the `diagram_generation_node` to detect diagram descriptions and generate Mermaid syntax.
- [x] Build the `assembly_node` to combine all parts into a final document.
- [x] Build the `cognitive_load_index_node` to calculate the final θ score.
- [x] Wire all nodes together in a LangGraph workflow with appropriate conditional logic for error handling.

## Phase 3: Core UI Implementation
- [ ] Build the main application layout (e.g., sidebar for sessions, main view for content).
- [ ] Implement the real-time UI for an active recording session, showing the live transcript and the progressively generated document.
- [ ] Create the dashboard view for browsing and managing past sessions/documents.
- [ ] Implement the UI for displaying the Cognitive Load Index and its historical trends.
- [ ] Build the user feedback mechanism (e.g., a slider) to capture subjective workload.

## Phase 4: Finalization & Stretch Goals
- [ ] Implement the optional authentication flow using Auth0 for cloud features.
- [ ] Implement the data synchronization service using PouchDB/CouchDB for authenticated users.
- [ ] Add support for additional recording modes (PTT, VAD).
- [ ] Implement advanced voice commands.
- [ ] Build out the settings page (e.g., select microphone, choose AI models, configure hotkeys).
- [ ] Test and finalize the production build and auto-update process.
