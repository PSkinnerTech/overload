# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application in transition from "Overload" (workload analysis tool) to "Aurix" (AI-powered voice-to-documentation assistant). The application uses TypeScript, React 19, and Vite as the build tool, with Electron Forge for packaging across Windows, macOS, and Linux platforms.

## Development Commands

### Essential Commands
- `npm start` - Start the Electron app with Vite dev server (hot reload enabled)
- `npm run lint` - Run ESLint to check code quality
- `npm run package` - Create packaged application without installers
- `npm run make` - Build platform-specific installers (Squirrel for Windows, ZIP for macOS, DEB/RPM for Linux)

### Documentation Commands
- `npm run docs:start` - Start Docusaurus documentation dev server
- `npm run docs:build` - Build documentation site
- `npm run docs:serve` - Serve built documentation

## Architecture

The application follows Electron's multi-process architecture:

### Process Structure
- **Main Process** (`src/main.ts`): Controls application lifecycle, creates browser windows, handles system events, manages IPC communication, and background sync
- **Preload Script** (`src/preload.ts`): Secure bridge between main and renderer processes, exposes `window.overloadApi`
- **Renderer Process** (`src/renderer.tsx`): React application with TypeScript

### Key Technical Details
- TypeScript compilation targets ESNext with CommonJS modules
- Vite handles bundling with separate configs for main, preload, and renderer processes
- Node.js integration is disabled in renderer for security (contextIsolation: true)
- Electron Fuses configured for security (ASAR packaging, cookie encryption)
- React 19 with TypeScript support
- Tailwind CSS v4 with shadcn/ui components
- electron-store for encrypted local storage
- electron.safeStorage for secure credential management

### File Structure
```
src/
├── main.ts         # Main process entry point
├── preload.ts      # Preload script with IPC bridge
├── renderer.tsx    # React app entry point
├── components/     # React components
├── lib/           # Utilities and helpers
└── styles/        # CSS and styling
```

## IPC API Reference

The `window.overloadApi` object provides:
- `auth.connect(method, token?)`: Initiate OAuth or API key authentication
- `auth.getStatus()`: Get current authentication status
- `sync.startSync()`: Start background data synchronization
- `sync.stopSync()`: Stop background sync
- `overloadIndex.getCurrent()`: Get current workload index
- `overloadIndex.getHistory()`: Get historical workload data
- `settings.get(key)`: Retrieve settings value
- `settings.set(key, value)`: Update settings
- `feedback.send(data)`: Submit user feedback
- `on(channel, callback)`: Subscribe to events
- `removeAllListeners(channel)`: Unsubscribe from events

## Project Transition Notes

The codebase is transitioning from "Overload" to "Aurix":
- **Legacy (Overload)**: Motion API integration for workload analysis
- **Future (Aurix)**: Local AI processing for voice-to-documentation
- Many references still use "Overload" naming and should be updated when refactoring

## Important Considerations

1. **Security**: Always use the preload script and contextBridge for IPC. Never enable nodeIntegration without careful consideration.

2. **Platform Differences**: Test on all target platforms, especially for:
   - Window creation and management
   - File system operations
   - Native dialog behaviors

3. **Development Mode**: DevTools automatically open in development for debugging

4. **Build Output**: 
   - Development: Uses Vite's dev server
   - Production: Outputs to `out/` directory
   - Installers: Created in `out/make/`

## Current Implementation Status

Phase 0 has been completed with:
1. React 19 and TypeScript integration
2. Secure IPC bridge implementation
3. Tailwind CSS v4 with shadcn/ui setup
4. Encrypted local storage
5. Secure credential management

The application is functional but requires updates to align with the Aurix vision.