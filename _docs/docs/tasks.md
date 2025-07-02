# Aurix Project: Task Checklist

This document outlines the tasks required to build the Aurix application, based on the voice-first architecture.

## Phase 0: Core Setup & Environment
- [ ] Initialize Electron Forge project with Vite + TypeScript + React.
- [ ] Establish secure IPC bridge between main and renderer processes using `contextBridge`.
- [ ] Set up basic UI shell with Tailwind CSS and initialize `shadcn/ui`.
- [ ] Integrate SQLite for local database storage.
- [ ] Set up a basic logging service for debugging.

## Phase 1: Voice Capture & Transcription
- [ ] Implement the core audio recording service in the main process.
- [ ] Use the Web Audio API in the renderer to capture microphone input.
- [ ] Implement at least one recording mode (e.g., Click-to-Toggle).
- [ ] Create the UI for recording (e.g., record button, status indicator, waveform visualizer).
- [ ] Integrate `whisper.cpp` via a Node.js addon.
- [ ] Implement the model management service to download and select Whisper models.
- [ ] Create the pipeline to pass audio from the renderer to the main process and get a streaming transcript back.

## Phase 2: AI Workflow (LangGraph)
- [ ] Define the `WorkflowState` object that will be passed through the graph.
- [ ] Build the `transcription_node` to handle the whisper.cpp integration.
- [ ] Build the `analysis_node` using a local LLM (via Ollama) to classify content and calculate a complexity score.
- [ ] Build the `document_generation_node` to generate structured Markdown from the transcript.
- [ ] Build the `diagram_generation_node` to detect diagram descriptions and generate Mermaid syntax.
- [ ] Build the `assembly_node` to combine all parts into a final document.
- [ ] Build the `cognitive_load_index_node` to calculate the final θ score.
- [ ] Wire all nodes together in a LangGraph workflow with appropriate conditional logic for error handling.

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
