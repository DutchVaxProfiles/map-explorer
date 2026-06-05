# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server (Vite)
npm run build        # Type-check + build for production
npm run build-only   # Build without type checking
npm run type-check   # Type-check Vue + TS files (vue-tsc)
npm run lint         # Lint and auto-fix (ESLint)
npm run preview      # Preview production build
```

There are no automated tests; verification is manual.

## Architecture

Map Explorer is a **fully browser-based** geographic data visualization tool. It renders GeoJSON maps and colors regions by joining them with external CSV/Parquet data. All data querying happens client-side via **DuckDB-WASM** — there is no backend.

### Key layers

**Configuration system** (`src/map-config/`)
- Map configs are JSON files in `src/map-config/map-configs/`. Files prefixed with `_` are ignored.
- Loaded via `import.meta.glob` at build time and validated at runtime against a **Zod schema** (`map-config/types.ts`).
- Config shape: `kind`, `geojsonFileName`, `dataFileName`, `idColumnGeojson`, `idColumnDataFile`, `categoryColumns`, `valueColumn`, `mapColorConfig`, and optional `filter` defaults.

**Data processing** (`src/data-processing/`)
- `ProcessorFactory` creates a `CsvProcessor` or `ParquetProcessor` depending on file extension.
- Both extend the abstract `Processor` class. SQL query builders live in `processors/helpers.ts`.
- DuckDB initialization and file registration is in `src/data-processing/duckdb.ts`.

**State management** (`src/map-manager.ts`)
- `MapManager` caches loaded map states (GeoJSON + processor + region data) across map switches.
- `ValidFilterLookup` is an optimized index that prevents users from selecting invalid filter combinations.

**Presentation** (`src/components/`)
- `App.vue` is the central orchestrator: it owns all reactive state and handles events bubbled up from children.
- `map.vue` renders the SVG map using D3 (zoom/pan + region coloring).
- `control-panel.vue` drives the filter/color controls.
- Data flows unidirectionally: child components emit events → `App.vue` updates state → components re-render.

**Color mapping** (`src/map-color.ts`)
- `MapColor` wraps the two project colour modes: sequential (`magma`, reversed so darker colours indicate higher values) and divergent (`coolwarm`). The scale can use dynamic or fixed min/max values.

### Path alias

`@/*` resolves to `./src/*` (configured in `vite.config.ts` and `tsconfig.app.json`).

## Coding style

- **TypeScript**: Use `type` (not `interface`) for object shapes. Derive types from Zod schemas with `z.infer<typeof Schema>` rather than duplicating them manually. Prefer `import type` for type-only imports.
- **Naming**: PascalCase for classes and Zod schemas (e.g. `MapColorConfigSchema`), camelCase for functions and variables, kebab-case for Vue component filenames (e.g. `control-panel.vue`), UPPER_SNAKE_CASE for module-level constants.
- **Vue components**: Use `<script setup>` with the Composition API. Props are typed inline. Child components emit typed events; `App.vue` handles them — keep business logic out of leaf components.
- **Async**: Use `async/await` throughout. Fire independent async operations in parallel with `Promise.all`.
- **Comments**: Inline comments explain *why*, not *what*. Use block comments (with `/** */`) only for non-obvious classes or algorithms (see `ValidFilterLookup` in `map-manager.ts`).
- **Zod**: Define schemas first, derive TypeScript types from them. Apply `.refine()` for cross-field validation on the schema itself.
