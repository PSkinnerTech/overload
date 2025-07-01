---
title: "Fixing ESM/CJS Compatibility Issues"
description: "How to resolve the 'This package is ESM only' error with Vite, Electron Forge, and Tailwind CSS."
sidebar_position: 1
---

# Troubleshooting: ESM/CJS Compatibility in Vite

## The Problem: "This package is ESM only"

When running `npm start`, you may encounter an error similar to this:

```bash
[ERROR] Failed to resolve "@tailwindcss/vite". This package is ESM only but it was tried to load by `require`.
```

This error, along with a warning about the "Vite CJS Node API" being deprecated, occurs because our build tools are trying to load an ES Module (ESM) package using the older CommonJS (`require()`) method.

- **Why it happens**: The JavaScript ecosystem is transitioning from CommonJS (CJS) to ES Modules (ESM). Modern tools like Vite and its plugins (e.g., `@tailwindcss/vite`) are increasingly published as ESM-only packages. However, the default configuration in our Electron Forge setup still treats `.ts` config files as CJS modules.

This creates a conflict: a CJS file cannot `require()` an ESM module directly. The official [Vite troubleshooting guide](https://v6.vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated) details this exact scenario.

## The Solution: Use ESM-Native File Extensions

The cleanest and most direct solution is to explicitly tell Node.js that our Vite configuration files are ES Modules. We can do this by changing their file extensions from `.ts` to `.mts` (Module TypeScript).

This approach is surgical and avoids making broad changes to our project's `package.json` (like adding `"type": "module"`), which could have unintended side effects.

### Step-by-Step Fix

1.  **Rename the Vite Configuration Files**:
    -   Rename `vite.main.config.ts` to `vite.main.config.mts`
    -   Rename `vite.preload.config.ts` to `vite.preload.config.mts`
    -   Rename `vite.renderer.config.ts` to `vite.renderer.config.mts`

2.  **Update the Forge Configuration**:
    -   Open `forge.config.ts`.
    -   Update the strings in the `VitePlugin` configuration to point to the newly renamed `.mts` files.

    ```typescript
    // In forge.config.ts

    // ...
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.mts', // Changed from .ts
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts', // Changed from .ts
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts', // Changed from .ts
        },
      ],
    }),
    // ...
    ```

After completing these steps, the error will be resolved, and you can proceed with adding the `@tailwindcss/vite` plugin to your `vite.renderer.config.mts` file to properly integrate Tailwind CSS. 