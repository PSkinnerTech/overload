---
title: "Tailwind CSS Best Practices"
description: "Guidelines for using Tailwind CSS v4.1 effectively in the Overload project."
sidebar_position: 2
---

# Tailwind CSS v4.1 Best Practices

This document outlines the best practices for using Tailwind CSS v4.1 within the Overload project. Adhering to these guidelines will help us build a consistent, maintainable, and scalable user interface. This guide is based on the official [Tailwind CSS v4.1 documentation](https://tailwindcss.com/docs/installation/using-vite).

## 1. Core Philosophy: Utility-First

The fundamental principle of Tailwind is **utility-first**. Instead of writing custom CSS classes, you build designs by applying pre-existing, single-purpose utility classes directly in your markup.

- **DO** combine many utility classes to build complex components.
- **DON'T** write custom CSS classes for things that can be built with utilities. For example, instead of `.card`, build it with utilities directly on the component's element.
- **WHY**: This approach keeps styling co-located with the markup, making components more self-contained and easier to reason about without switching between multiple files.

```jsx
// Good: A self-contained component using utilities
export function UserProfile({ user }) {
  return (
    <div className="mx-auto flex max-w-sm items-center gap-x-4 rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
      <img className="size-12 shrink-0" src={user.avatarUrl} alt={user.name} />
      <div>
        <div className="text-xl font-medium text-black dark:text-white">{user.name}</div>
        <p className="text-gray-500 dark:text-gray-400">{user.title}</p>
      </div>
    </div>
  );
}
```

## 2. Installation and Setup (Vite)

We use Vite, so our setup leverages the `@tailwindcss/vite` plugin for the most seamless integration.

The setup process, as documented in the [Tailwind docs](https://tailwindcss.com/docs/installation/using-vite), involves:
1.  Installing dependencies: `npm install tailwindcss @tailwindcss/vite`
2.  Adding the plugin to `vite.config.ts`.
3.  Importing Tailwind into our main CSS file using `@import "tailwindcss";`.

This setup ensures that Tailwind scans our source files (e.g., `.tsx`, `.html`) and generates only the CSS that we actually use.

## 3. Styling Techniques

### State Variants
To style elements in different states (hover, focus, etc.) or contexts (dark mode, responsive breakpoints), use state variants. These are prefixes separated by a colon.

- **Common Variants**: `hover:`, `focus:`, `active:`, `disabled:`.
- **Responsive**: `sm:`, `md:`, `lg:`, `xl:` (mobile-first).
- **Dark Mode**: `dark:`.

```html
<button class="
  bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg
  hover:bg-blue-600
  focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75
  dark:bg-sky-500 dark:hover:bg-sky-600
">
  Save Changes
</button>
```

### Responsive Design: Mobile-First
Tailwind uses a **mobile-first** breakpoint system. Utilities without a breakpoint prefix apply to all screen sizes. To adapt for larger screens, add a prefixed utility.

```html
<!-- Width is 100% on mobile, 50% on medium screens and up, and 33.3% on large screens and up -->
<div class="w-full md:w-1/2 lg:w-1/3">
  <!-- ... -->
</div>
```

### Dark Mode
Dark mode is treated as a standard variant. The `dark:` prefix applies styles when the dark mode is active, typically controlled by a parent class (`<html class="dark">`). Our UI framework should handle this toggle.

## 4. Theming and Customization

Tailwind v4 is built on a foundation of **CSS variables**. This makes theming incredibly powerful and flexible.

### Using Theme Variables
Instead of hard-coding values, you can leverage Tailwind's theme variables directly in your custom CSS when needed.

```css
.custom-component {
  /* Accessing a theme color variable */
  background-color: var(--color-blue-500);
  
  /* Accessing a spacing variable */
  padding: var(--spacing-4);
}
```

### Extending the Theme
All theme customization happens in `tailwind.config.ts`.

- **DO** extend the theme for project-specific design system values (e.g., brand colors).
- **DON'T** override the default theme unless absolutely necessary. Extending it preserves the robust default design system.

```ts
// tailwind.config.ts (Example)
import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': 'var(--color-cyan-500)',
        'brand-secondary': 'var(--color-fuchsia-600)',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

## 5. Managing Complexity

### Component Abstraction
When you find yourself repeating the same set of utilities across multiple places, it's time to create a component, not a custom CSS class.

- **DO** create a React component that encapsulates the repeated markup and styling.
- **DON'T** create a `@layer` component class like `.btn-primary` for multi-part components. This is an anti-pattern that couples styles away from the markup. Reserve `@layer` for simple, single-element classes where a component is overkill.

```jsx
// Good: Encapsulate logic and style in a component
function PrimaryButton({ children, ...props }) {
  return (
    <button 
      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
      {...props}
    >
      {children}
    </button>
  );
}
```

### Adding Custom Styles
When a specific style cannot be achieved with utilities (e.g., a complex gradient or a very specific layout), you can add custom CSS.

- Use the `@layer` directive to add custom styles to the appropriate Tailwind layer (`base`, `components`, or `utilities`). This ensures they are processed correctly with variants and other Tailwind features.

```css
/* In your main CSS file */
@import "tailwindcss";

@layer components {
  .custom-card-header {
    background-image: linear-gradient(to right, var(--color-cyan-500), var(--color-blue-500));
    color: white;
    padding: var(--spacing-4) var(--spacing-6);
  }
}
```

Following these practices will ensure our UI is built on a solid, scalable foundation that leverages the full power of Tailwind CSS v4.
