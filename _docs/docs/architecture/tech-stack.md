---
title: "Technology Stack"
description: "The core frameworks, libraries, and architectural decisions for the Aurix project."
sidebar_position: 1
---

# Technology Stack

## Overview

This document outlines the complete technology stack for Aurix. Each choice is driven by our requirements for offline-first operation, user privacy, simple deployment, and powerful local AI capabilities.

## Core Framework

### Electron (v28+)
- **Why**: To build a cross-platform desktop application using familiar web technologies.
- **Benefits**: 
  - Native OS integration (global hotkeys, system tray, notifications).
  - Secure credential storage via `safeStorage` for optional cloud features.
  - Direct file system access for local audio and document storage.

### Electron Forge
- **Why**: Provides a modern, integrated tooling experience for Electron development.
- **Benefits**:
  - TypeScript and Vite support out of the box.
  - Hot module reloading for a fast development cycle.
  - Integrated packaging and distribution tools.

## Frontend Stack

- **React 18+**: For building a component-based, declarative user interface.
- **TypeScript**: For end-to-end type safety, improving code quality and maintainability.
- **Vite**: For a lightning-fast build tool with near-instant hot module replacement.
- **Tailwind CSS**: For a utility-first CSS framework to build a consistent design system rapidly.
- **shadcn/ui**: For a collection of re-usable, accessible components that we can own and customize directly.

## Voice & AI Processing

### Voice Processing
- **Engine**: **whisper.cpp** for high-performance, local speech-to-text.
- **Model Strategy**: Start with `whisper-tiny` (39MB) for broad compatibility, with the ability to use larger models like `whisper-base` (74MB) for better accuracy on more powerful machines.
- **Integration**: A Node.js addon for `whisper.cpp` will be used for direct, efficient integration with the Electron main process.

### AI Workflow Orchestration
- **Framework**: **LangGraph** (JavaScript/TypeScript version).
- **Why**: It is lightweight, runs entirely in-process, supports complex state management and cycles (for feedback loops), and is perfectly suited for AI-native workflows without requiring an external server.

### AI Model Integration
- **Local (Primary)**: **Ollama** for managing and running local LLMs (e.g., Llama 3, Phi-3). This ensures complete user privacy and no API costs for core functionality.
- **Cloud (Optional)**: Support for user-provided API keys for cloud models (e.g., GPT-4, Claude 3) for users who need enhanced power for specific tasks.

## Data Storage & Sync

- **Primary Storage**: **SQLite** (via `better-sqlite3`) for robust, zero-configuration local database storage. It provides ACID compliance and full SQL capabilities.
- **Optional Sync**: **PouchDB/CouchDB** for users who opt-in to cloud features. This provides a battle-tested, conflict-free architecture for multi-device synchronization.

## Packaging & Distribution

- **Tool**: **Electron Forge**'s built-in makers (or `electron-builder` if more advanced features like delta updates are needed).
- **Formats**:
  - **Windows**: NSIS installer.
  - **macOS**: DMG with notarization.
  - **Linux**: AppImage.

## Key Architectural Decisions

- **Process Model**: A strict separation between the **Main Process** (handles Node.js APIs, file system, AI work) and the **Renderer Process** (UI only). All communication occurs via secure, promise-based IPC through a `contextBridge`.
- **State Management**: **Zustand** for lightweight, simple state management in the React UI. The main process state will remain the ultimate source of truth for application data.
- **Privacy First**: All core functionality, including voice transcription and AI processing, must work entirely offline. Cloud features are strictly opt-in.
- **Error Handling**: The application is designed for graceful degradation. Features should fail independently without crashing the entire app. For example, if a diagram fails to generate, the text document should still be produced. 