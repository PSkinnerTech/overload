---
title: "Voice Implementation"
description: "The technical architecture for Aurix's voice capture, processing, and transcription pipeline."
sidebar_position: 4
---

# Voice Implementation Architecture

## Overview

Aurix's voice recording system is designed for a seamless, low-latency experience, allowing users to capture their thoughts effortlessly. The implementation supports multiple recording modes, provides real-time feedback, and performs all processing locally to ensure user privacy.

## Recording Architecture

The journey from spoken word to structured data follows a clear pipeline, all managed within the Electron application.

```mermaid
graph TD
    subgraph "User Interface"
        A[Recording Controls] --> B[Global Hotkey Listener]
        B --> C[Recording State Manager]
        D[Visual Feedback] --> C
    end
    
    subgraph "Local Audio Pipeline"
        C --> E[Audio Capture (Web Audio API)]
        E --> F[Real-time Enhancement (VAD, Noise Gate)]
        F --> G[Audio Buffer Management]
        G --> H[WAV Encoding & Storage]
    end
    
    subgraph "Local AI Processing"
        G --> I[Whisper.cpp Engine]
        I --> J[Transcription Stream]
        J --> K[LangGraph Workflow]
    end
    
    K --> D
```

## Recording Modes

To provide a flexible user experience, Aurix will support several recording modes:

1.  **Push-to-Talk (PTT)**: The user holds a global hotkey to record and releases it to stop. This is ideal for short, focused thoughts.
2.  **Click-to-Toggle**: A single click on the record button starts the recording, and another click stops it. This is suited for longer, continuous sessions.
3.  **Voice Activity Detection (VAD)**: The system automatically starts recording when the user begins speaking and stops after a period of silence. This offers a hands-free experience.

## Technical Implementation Details

### Audio Capture & Processing
-   **Web Audio API**: We will use the browser-standard Web Audio API, accessed within the Electron environment, to capture microphone input. We will request a 16kHz mono audio stream, which is optimal for the Whisper transcription model.
-   **AudioWorklet**: For high-performance audio processing that doesn't block the main thread, an `AudioWorklet` will be used. This worklet will handle buffering and can apply real-time enhancements like noise reduction.
-   **Local Storage**: Raw audio is captured, encoded into a WAV file, and stored locally in the application's data directory. This ensures no data is lost and provides an artifact for future reprocessing if needed.

### Local Transcription with `whisper.cpp`
-   **Engine**: We will integrate `whisper.cpp`, a high-performance C++ port of OpenAI's Whisper model. This allows for fast, accurate, and completely private speech-to-text.
-   **Streaming Mode**: The integration will use `whisper.cpp`'s streaming capabilities to provide a near real-time transcript to the user as they speak.
-   **Model Management**: The application will include a system to download and manage different Whisper model sizes (e.g., tiny, base, small), allowing the user to balance speed and accuracy based on their hardware. The app will intelligently select an optimal default model on first launch.

This architecture ensures that the core experience of capturing voice is robust, private, and performant, laying a solid foundation for the subsequent AI processing by LangGraph. 