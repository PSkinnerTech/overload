---
title: "AI Workflow Architecture"
description: "The LangGraph-based workflow for transforming voice into structured documentation and calculating the Cognitive Load Index (θ)."
sidebar_position: 5
---

# AI Workflow Architecture

This document provides the detailed technical specification for the LangGraph-powered workflow at the heart of Aurix. This state machine transforms raw audio into structured documents and calculates the Cognitive Load Index (θ).

## 1. High-Level Workflow

The process is a multi-stage pipeline designed for robustness, real-time feedback, and error recovery.

```mermaid
graph TD
    A[Voice Input] --> B[Audio Processing & Transcription];
    B --> C{Content & Complexity Analysis};
    C --> D[Document Generation];
    D --> E{Diagram Detection & Generation};
    E --> F[Assemble Final Document];
    F --> G[Calculate Cognitive Load Index (θ)];
    G --> H[Update UI];
    C --> G;
```

## 2. State Definition

The workflow operates on a state object that is passed between nodes, each enriching it with new information.

```typescript
// A simplified version of the full state
interface WorkflowState {
  // Input
  audioBuffer: ArrayBuffer | null;
  
  // Transcription
  rawTranscript: string;
  
  // Analysis
  documentType: 'technical' | 'meeting' | 'general';
  topics: string[];
  entities: string[];
  complexityScore: number; // A score from 0-1 representing content complexity

  // Generation
  sections: Array<{ title: string; content: string }>;
  diagrams: Array<{ title: string; mermaidCode: string }>;
  
  // Output
  finalDocument: string;
  cognitiveLoadIndex: number;
  
  // Control
  errors: any[];
}
```

## 3. Node Specifications

### `transcription_node`
-   **Purpose**: To convert the user's voice into text.
-   **Process**:
    1.  Receives a raw audio buffer.
    2.  Uses a local `whisper.cpp` model to perform speech-to-text.
    3.  Provides a real-time stream of the transcript to the UI.
-   **Output**: Populates `state.rawTranscript`.

### `analysis_node`
-   **Purpose**: To understand the content and complexity of the user's speech.
-   **Process**:
    1.  Uses a local LLM (via Ollama) to analyze the `rawTranscript`.
    2.  **Classifies** the content (e.g., technical spec, meeting notes).
    3.  **Extracts** key topics and named entities.
    4.  **Calculates** a `complexityScore` based on factors like technical jargon, density of concepts, and sentence structure. This score is a primary input for the Cognitive Load Index.
-   **Output**: Populates `state.documentType`, `state.topics`, `state.entities`, and `state.complexityScore`.

### `document_generation_node`
-   **Purpose**: To structure the raw transcript into a coherent document.
-   **Process**:
    1.  Takes the transcript and analysis as input.
    2.  Prompts a local LLM to generate a logical outline (headings, subheadings).
    3.  Generates content for each section based on the outline.
-   **Output**: Populates `state.sections`.

### `diagram_generation_node`
-   **Purpose**: To create visual diagrams from the user's descriptions.
-   **Process**:
    1.  Scans the transcript for keywords indicating a diagram is being described (e.g., "flowchart," "sequence diagram," "shows how the user logs in").
    2.  If hints are found, it prompts an LLM with the relevant text, asking it to generate valid **Mermaid.js syntax**.
    3.  Includes a validation step to ensure the generated Mermaid code is renderable.
-   **Output**: Populates `state.diagrams`.

### `assembly_node`
-   **Purpose**: To combine all generated parts into a final document.
-   **Process**:
    1.  Creates a single Markdown string.
    2.  Iterates through the `sections` and `diagrams`, inserting them in the correct order.
-   **Output**: Populates `state.finalDocument`.

### `cognitive_load_index_node`
-   **Purpose**: To calculate the final Cognitive Load Index (θ).
-   **Process**:
    1.  This node acts as a final aggregator.
    2.  It combines the `complexityScore` from the `analysis_node` with other factors like the total length of the transcript and the number of diagrams generated.
    3.  It applies a weighting formula, which can be adjusted over time by user feedback, to produce the final score.
-   **Output**: Populates `state.cognitiveLoadIndex`.

## 4. Conditional Logic & Error Handling

The graph uses conditional edges to provide resilience:
-   If diagram generation fails, the workflow can bypass it and still produce a text-only document.
-   If transcription quality is low, it can prompt the user to re-record or use a more powerful (optional) cloud model.
-   A central `error_handler_node` catches failures from any step, logs them, and updates the UI with a helpful message, preventing the application from crashing.

This architecture creates a powerful and resilient system for turning spoken ideas into structured, useful documentation while providing novel insights into the user's own cognitive workload. 