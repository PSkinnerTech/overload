---
title: "shadcn/ui Best Practices"
description: "Guidelines for installing, using, and customizing shadcn/ui components in the Overload project."
sidebar_position: 3
---

# shadcn/ui Best Practices

This document outlines the best practices for using `shadcn/ui` within the Overload project. Unlike traditional component libraries, `shadcn/ui` is a collection of re-usable components that we copy directly into our source code, giving us full ownership and control. This guide is based on the official [shadcn/ui documentation](https://ui.shadcn.com/docs).

## 1. Core Philosophy: Own Your Components

The most important concept to understand is that **`shadcn/ui` is not a dependency**. It's a tool that adds component source code to our project.

- **DO** think of these components as your own. You are encouraged to modify them to fit the specific needs of our application.
- **DON'T** install it from `npm` like a typical library. The `shadcn-ui` package is a CLI tool, not a set of components.
- **WHY**: This approach avoids complex style overrides and wrapper components. We have direct control over every aspect of a component, from its logic to its styling, making customization simple and transparent.

## 2. Initial Setup and Configuration (Vite)

To integrate `shadcn/ui` with our Vite-based project, we must configure our environment to support its CLI and conventions.

### Step 1: Initialize `shadcn/ui`
The first step is to run the `init` command within the project root. This command generates the crucial `components.json` file and sets up the foundational structure.

```bash
npx shadcn-ui@latest init
```

### Step 2: Configure `tsconfig.json`
The `shadcn/ui` CLI relies on path aliases for placing components correctly. We must define these in our `tsconfig.json`.

```json
// tsconfig.json
{
  "compilerOptions": {
    // ...
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  // ...
}
```

### Step 3: Configure `vite.renderer.config.mts`
Vite needs to know how to resolve these path aliases during the build process.

```typescript
// vite.renderer.config.mts
import path from "path"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // This must match the paths in tsconfig.json
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  }
});
```

### Step 4: Configure `components.json`
The `init` command creates `components.json`, which is the blueprint for the CLI tool. We must ensure it's configured correctly for our project.

```json
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```
*   **`config`**: Since we're on Tailwind CSS v4, this property can be left as is, but it's good practice to ensure it points to the right file.
*   **`css`**: Must point to the CSS file where `@import "tailwindcss";` is located.
*   **`aliases`**: These paths are critical. They tell the CLI where to create new component files and utility functions. They **must** align with the `paths` in `tsconfig.json`.

## 3. Workflow: Adding and Using Components

### Adding Components
Always use the CLI to add new components. This ensures all dependencies and files are correctly placed according to `components.json`.

```bash
# This will add the source code for Button to src/components/ui/button.tsx
npx shadcn-ui@latest add button
```

### Importing Components
Thanks to our path alias setup, importing components is clean and consistent, regardless of file location.

```jsx
// Good: Use the path alias for a clean import
import { Button } from '@/components/ui/button';

// Avoid: Relative paths are brittle and harder to read
import { Button } from '../../../components/ui/button'; 
```

## 4. Customization and Theming

### Direct Modification
The primary way to customize a component is to **edit its source file directly**. If you need a `Button` with a different variant or behavior, open `src/components/ui/button.tsx` and make the changes.

### Theming
`shadcn/ui` is built on top of Tailwind CSS and uses CSS variables for theming. This makes it easy to change the color palette and other design tokens.

- **Customize Colors**: Modify the color variables in `src/index.css`.
- **Customize Styles**: Override `tailwind.config.ts` to adjust fonts, border radiuses, and more.

Dark mode is also supported out-of-the-box and works by detecting the `dark` class on a parent element (usually `<html>`), which aligns perfectly with Tailwind's dark mode strategy.

By following these guidelines, we can leverage the full power of `shadcn/ui`'s flexible, open-code approach while maintaining a consistent and maintainable codebase.

## 5. Available Components

As of the latest documentation, the following components are available to be added via the CLI. For the most up-to-date list, always refer to the [official `shadcn/ui` website](https://ui.shadcn.com/docs/components).

- Accordion
- Alert
- Alert Dialog
- Aspect Ratio
- Avatar
- Badge
- Breadcrumb
- Button
- Calendar
- Card
- Carousel
- Chart
- Checkbox
- Collapsible
- Combobox
- Command
- Context Menu
- Data Table
- Date Picker
- Dialog
- Drawer
- Dropdown Menu
- React Hook Form
- Hover Card
- Input
- Input OTP
- Label
- Menubar
- Navigation Menu
- Pagination
- Popover
- Progress
- Radio Group
- Resizable
- Scroll-area
- Select
- Separator
- Sheet
- Sidebar
- Skeleton
- Slider
- Sonner
- Switch
- Table
- Tabs
- Textarea
- Toast
- Toggle
- Toggle Group
- Tooltip
- Typography
