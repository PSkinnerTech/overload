# Overload: Your AI-Powered Workload Awareness Assistant

**Overload** is a local-first, Electron-based desktop application designed to help you understand and manage your personal workload before you hit burnout. It analyzes your scheduled tasks, meetings, and behavior patterns to calculate a personalized **Overload Index (θ)**, giving you real-time insight into when you're taking on too much.

Unlike calendar tools that only optimize time, Overload measures your actual cognitive and task load, using AI to make your schedule *sustainable*—not just efficient.

---

## Core Features

-   **Motion API Sync**: Securely connects to your [Motion](https://usemotion.com) account to pull task, project, and schedule data.
-   **Overload Index (θ) Engine**: Calculates a personalized workload score using factors like task density, meeting hours, context switching, and deadline pressure.
-   **AI-Powered Workflows**: Uses **LangGraph** to orchestrate the complex, multi-step process of calculating the Overload Index locally and securely.
-   **UI Dashboard**: Visualizes your workload with a real-time gauge, historical trend graphs, and detailed breakdown cards.
-   **Adaptive Feedback Loop**: Learns from your subjective feedback to make the Overload Index more accurate and personalized over time.

## Technology Stack

-   **Framework**: [Electron Forge](https://www.electronforge.io/)
-   **Frontend**: [React](https://react.dev/) & [Vite](https://vitejs.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Component Library**: [shadcn/ui](https://ui.shadcn.com/)
-   **AI Workflow**: [LangGraph](https://langchain.com/docs/langgraph)
-   **Documentation**: [Docusaurus](https://docusaurus.io/)

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
