# PIVOT FROM OVERLOAD TO AURIX

This project began as "Overload", a tool designed to analyze tasks from the Motion API to calculate a user's workload. During initial development, we discovered that limitations within the Motion API made the core concept unfeasible and unreliable.

This challenge prompted a pivot to "Aurix", a more powerful, voice-first documentation assistant. The new direction focuses on leveraging local AI for its core functionality, removing the dependency on external APIs and providing greater control, privacy, and a more innovative solution to a different productivity bottleneck.

# Aurix: Your AI-Powered Thought-to-Documentation Assistant

**Aurix** is a local-first, Electron-based desktop application that transforms your spoken ideas into structured, professional documentation. It's designed to eliminate the friction between your thoughts and the written word, providing a seamless way to capture and organize your best ideas before they're lost.

As a unique secondary feature, Aurix analyzes the complexity of your captured thoughts to provide a real-time **Cognitive Load Index (θ)**, a metric that helps you understand your own cognitive load during creative sessions.

---

## Core Features

-   **Voice-to-Document**: Speak your thoughts, and Aurix uses a local AI workflow to generate structured Markdown documents in real-time.
-   **Automatic Diagramming**: Describe a system or process, and Aurix will automatically generate the corresponding Mermaid.js diagram.
-   **Local-First & Private**: All voice processing, transcription, and AI analysis happen entirely on your machine. Your data is yours.
-   **Cognitive Load Index (θ)**: Get feedback on the complexity of your ideas, helping you identify your most demanding and creative periods.
-   **Optional Cloud Sync**: Opt-in to end-to-end encrypted cloud backup and multi-device synchronization.

## Technology Stack

-   **Framework**: [Electron Forge](https://www.electronforge.io/)
-   **Frontend**: [React](https://react.dev/) & [Vite](https://vitejs.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **AI Workflow**: [LangGraph](https://langchain.com/docs/langgraph)
-   **Local Transcription**: [whisper.cpp](https://github.com/ggerganov/whisper.cpp)
-   **Local LLMs**: [Ollama](https://ollama.com/)
-   **UI**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)

## Getting Started (Development)

### Prerequisites

-   [Node.js](https://nodejs.org/en/download/) v18+
-   `npm`

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/PSkinnerTech/overload.git
cd overload
npm install
```

### Running the App

Start the development environment:

```bash
npm run start
```

### Building for Production

To package the application for your native platform:

```bash
npm run make
```

---

## Project Documentation

This repository contains extensive internal documentation located in the `_docs/` directory. You can run the documentation site locally to explore detailed architectural guides, best practices, and the project's development narrative.

```bash
npm run docs:start
```
