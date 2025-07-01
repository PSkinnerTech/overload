# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application using TypeScript and Vite as the build tool. The project uses Electron Forge for packaging and distribution across Windows, macOS, and Linux platforms.

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
- **Main Process** (`src/main.ts`): Controls application lifecycle, creates browser windows, handles system events
- **Preload Script** (`src/preload.ts`): Bridge between main and renderer processes for secure API exposure
- **Renderer Process** (`src/renderer.ts`): Frontend UI logic and user interactions

### Key Technical Details
- TypeScript compilation targets ESNext with CommonJS modules
- Vite handles bundling with separate configs for main, preload, and renderer processes
- Node.js integration is disabled in renderer for security (can be enabled if needed)
- Electron Fuses configured to disable risky features
- ASAR packaging enabled for source protection

### File Structure
```
src/
├── main.ts       # Main process entry point
├── preload.ts    # Preload script (currently empty)
├── renderer.ts   # Renderer process entry point
└── index.css     # Renderer styles
```

## Phase 0 Implementation Status

Phase 0 has been completed with the following implementations:

1. **React Integration**: Added React 19 with TypeScript support
2. **Secure IPC Bridge**: Implemented using contextBridge with promise-based communication
3. **UI Framework**: Integrated Tailwind CSS v4 with custom shadcn/ui components
4. **Local Storage**: Integrated electron-store with encryption support
5. **Secure Credentials**: Implemented using electron.safeStorage for OAuth tokens

### Key APIs Available

The `window.overloadApi` object provides:
- `auth`: OAuth connection and status methods
- `sync`: Data synchronization controls
- `overloadIndex`: Current index and history retrieval
- `settings`: Application settings management
- `feedback`: User feedback submission
- `on/removeAllListeners`: Event subscription management

## Important Considerations

1. **Security**: Node.js integration is disabled in the renderer process by default. To enable it, you must:
   - Set `nodeIntegration: true` in `webPreferences` (src/main.ts:23)
   - Add `sandbox: false` to `webPreferences`
   - Only do this if absolutely necessary and understand the security implications

2. **Cross-Process Communication**: Use the preload script to expose safe APIs from main to renderer process via `contextBridge`

3. **Platform Differences**: The main process handles platform-specific behaviors (Windows shortcut creation, macOS dock persistence)

4. **Development Mode**: The app automatically opens DevTools in development for debugging

5. **Build Output**: 
   - Development builds use Vite's dev server
   - Production builds are output to `out/` directory
   - Platform installers are created in `out/make/`