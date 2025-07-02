# Aurix: Project Scope Document

## Core Purpose

Aurix is a local-first desktop application that transforms spoken ideas into structured documentation. It helps users offload their thoughts frictionlessly, capturing valuable insights before they are lost. As a secondary function, it analyzes the complexity of the captured content to provide a unique **Cognitive Load Index (θ)**, a measure of cognitive load.

## Core Features

### 1. Voice Capture & Transcription
-   **Recording Modes**: Support for Push-to-Talk (PTT), Click-to-Toggle, and Voice Activity Detection (VAD).
-   **Local Transcription**: Integration with a local `whisper.cpp` engine for fast, private, and offline speech-to-text.
-   **Audio Management**: Secure local storage of audio recordings (WAV format) linked to their transcriptions.
-   **Real-time Feedback**: Display a live, streaming transcript in the UI as the user speaks.

### 2. AI-Powered Document Generation (LangGraph Workflow)
-   **Content Analysis**: An AI node to classify the document type (e.g., technical spec, meeting notes), extract topics, and identify key entities.
-   **Structured Document Generation**: An AI node that takes the raw transcript and generates a well-structured Markdown document with headings and logical sections.
-   **Mermaid Diagram Generation**: An AI node that detects when a user is describing a process or system and automatically generates the corresponding Mermaid.js diagram syntax.
-   **Document Assembly**: A final node to combine all generated text and diagrams into a single, coherent document.

### 3. Cognitive Load Index (θ)
-   **Complexity Analysis**: The AI workflow will calculate a `complexityScore` for the transcribed content based on jargon, concept density, and structure.
-   **Index Calculation**: The Cognitive Load Index will be derived from the `complexityScore`, the length of the transcript, and the number of diagrams generated.
-   **User Feedback Loop**: A UI slider will allow users to provide subjective feedback ("How mentally taxing was that session?"), which will be used to personalize the weighting of the index calculation over time.

### 4. Core UI Components
-   **Main Recording Interface**: A clean, simple UI with clear controls to start/stop recording and provide real-time visual feedback (e.g., a waveform).
-   **Live Transcript View**: A panel that displays the streaming transcript as it's generated.
-   **Document Preview Panel**: A side-by-side view showing the final Markdown document as it's being assembled by the AI workflow.
-   **Dashboard**: A view to browse, search, and manage previously generated documents and view historical Cognitive Load Index trends.

### 5. Local-First Infrastructure
-   **Local Storage**: All data (audio, transcripts, documents, settings) will be stored in a local SQLite database.
-   **Local AI**: All core transcription and LLM processing will happen locally via `whisper.cpp` and Ollama. Internet connectivity is not required for core functionality.
-   **Privacy by Default**: No user data leaves the machine unless the user explicitly opts into cloud features.

## Stretch Goals (Optional Features)

-   **Cloud Sync & Backup**: Optional, end-to-end encrypted synchronization of documents between multiple devices using PouchDB/CouchDB.
-   **Cloud Model Support**: Allow users to provide their own API keys for cloud-based LLMs (GPT-4, Claude) for potentially higher-quality document generation.
-   **Advanced Voice Commands**: Implement commands like "Create a sequence diagram for..." or "Summarize the last five minutes."
-   **Multiple Export Formats**: Add support for exporting documents to PDF, HTML, or DOCX.
-   **Team Collaboration**: Allow sharing and collaborative editing of documents for authenticated users.

## Out of Scope (for MVP)

-   Real-time collaborative editing.
-   Mobile or web versions.
-   Integration with third-party project management tools.
-   Any feature that *requires* a cloud connection to function.

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
- Daily "morning summary" notification

## Next Steps

1. Finalize this scope
2. Break into phases (e.g., Phase 0: Auth, Phase 1: Motion Sync)
3. Write best-practices docs per subsystem
4. Build MVP core in Electron and LangGraph
5. Add AI enhancements after baseline stability
