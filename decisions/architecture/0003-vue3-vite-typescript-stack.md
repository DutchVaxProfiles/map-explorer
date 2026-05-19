# ADR 0003 — Vue 3 + Vite + TypeScript as the application stack

**Status:** Accepted. Source: project initialisation.

## Decision

The application is built with Vue 3 (Composition API, `<script setup>`),
Vite as the build tool, and TypeScript with strict type checking.
Tailwind CSS 4 is used for styling via the `@tailwindcss/vite` plugin.

## Implication

- All components use `<script setup>` with inline prop types — no Options
  API, no class components.
- Type checking runs via `vue-tsc`; `npm run build` is blocked by type
  errors.
- Vite's `import.meta.glob` and `?url` import suffix are available and
  used (config loading, WASM bundle imports).
- Tailwind utility classes are the styling primitive; no separate CSS
  framework or component library is introduced.
