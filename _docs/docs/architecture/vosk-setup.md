---
title: "Vosk Setup & Integration"
description: "How Aurix integrates the Vosk speech recognition engine for private, offline transcription."
sidebar_position: 5
---

# Vosk Setup & Integration

## Why Vosk for Offline Transcription?

As detailed in our [Voice Implementation](./voice-implementation.md) architecture, Aurix [[memory:911348]] uses a hybrid model for speech recognition. For the private, offline component, **Vosk** was selected as the ideal engine.

-   **Official Node.js Bindings**: Vosk provides an official `npm` package, which dramatically simplifies integration compared to compiling C++ code from source. [[citation:https://alphacephei.com/vosk/install]]
-   **Streaming API**: The Vosk API is designed for real-time streaming, allowing us to process audio chunks as they arrive and provide live feedback to the user. [[citation:https://alphacephei.com/vosk/]]
-   **Lightweight Models**: Vosk offers small, portable language models (around 50MB) that are perfect for including in a desktop application without excessive bloat. [[citation:https://alphacephei.com/vosk/]]
-   **Mature & Supported**: The project is well-documented and supports over 20 languages, offering a robust foundation for our core offline functionality.

## Implementation Plan

### 1. Installation

Integration begins by adding the official Vosk package to our project's dependencies.

```bash
npm install vosk
```

This package handles the necessary native bindings for us, making the C++-based Kaldi speech recognition engine available directly within our Node.js environment in the Electron main process.

### 2. Model Management

Vosk requires separate language model files to function. To avoid bundling large model files with the application installer, we will implement a `VoskModelManager` service.

-   **On First Launch**: The manager will check for the presence of the required model in the user's application data directory (e.g., `app.getPath('userData')`).
-   **Automatic Download**: If the model is not found, the manager will download it from the official Alpha Cephei repository [[citation:https://alphacephei.com/vosk/models]] and unpack it. We will start with a small English model (e.g., `vosk-model-small-en-us-0.15`).
-   **UI Feedback**: The UI will show a progress bar and status message during this one-time download.

### 3. Integration with `HybridTranscriptionService`

The `HybridTranscriptionService` will be responsible for using the Vosk engine when in offline mode.

```typescript
// Conceptual code for services/HybridTranscriptionService.ts

import vosk from 'vosk';
import fs from 'fs';

// ...

export class HybridTranscriptionService extends EventEmitter {
  private voskModel: vosk.Model | null = null;

  private async initializeVosk() {
    const modelPath = await this.modelManager.ensureModel('vosk-model-small-en-us-0.15');
    this.voskModel = new vosk.Model(modelPath);
  }

  private startVoskTranscription(audioStream: NodeJS.ReadableStream) {
    if (!this.voskModel) {
      throw new Error('Vosk model not initialized');
    }

    const recognizer = new vosk.Recognizer({
      model: this.voskModel,
      sampleRate: 16000
    });

    audioStream.on('data', (chunk: Buffer) => {
      if (recognizer.acceptWaveform(chunk)) {
        const result = recognizer.result();
        this.emit('transcription', { text: result.text, isFinal: true, source: 'vosk' });
      } else {
        const partialResult = recognizer.partialResult();
        this.emit('transcription', { text: partialResult.partial, isFinal: false, source: 'vosk' });
      }
    });

    audioStream.on('end', () => {
      const finalResult = recognizer.finalResult();
      this.emit('transcription', { text: finalResult.text, isFinal: true, source: 'vosk' });
      recognizer.free();
    });
  }
}
```

### 4. Accuracy and User Expectations

As noted in the Vosk documentation [[citation:https://alphacephei.com/vosk/accuracy]], the accuracy of any speech recognition system can vary. Our hybrid approach addresses this directly:
-   We will use the high-accuracy Web Speech API when the user is online.
-   We will use Vosk as a reliable, private, and "good enough" engine for offline work.
-   The UI will always clearly indicate which engine is currently in use, setting the correct user expectation for transcription quality.

This integration plan provides a robust, private, and user-friendly solution for the core voice-to-text functionality of Aurix. 