# Architectural decisions

This directory holds the project's Architectural Decision
Records (ADRs). The framework and conventions are defined in
[`0001-adr-framework-and-conventions.md`](./0001-adr-framework-and-conventions.md);
read it first.

## Index

### Meta

- [0001 — ADR framework and conventions](./0001-adr-framework-and-conventions.md)

### Invariants

- [0002 — Fully browser-based, no backend](./0002-fully-browser-based-no-backend.md)

### Application shape

- [0003 — Vue 3 + Vite + TypeScript stack](./0003-vue3-vite-typescript-stack.md)
- [0010 — Project structure](./0010-project-structure.md)

### Data processing

- [0004 — DuckDB-WASM for client-side data processing](./0004-duckdb-wasm-client-side-data-processing.md)
- [0006 — Processor factory pattern for file format abstraction](./0006-processor-factory-for-file-format-abstraction.md)

### Map rendering

- [0005 — D3.js for SVG map rendering](./0005-d3-for-map-rendering.md)
- [0011 — D3 color interpolators for choropleth coloring](./0011-d3-color-interpolators-for-choropleth-coloring.md)

### Configuration

- [0007 — Zod schemas for configuration validation](./0007-zod-for-config-validation.md)

### State management

- [0008 — MapManager: state caching and ValidFilterLookup](./0008-map-manager-state-caching-and-valid-filter-lookup.md)
- [0009 — Unidirectional data flow: App.vue owns all state](./0009-unidirectional-data-flow-app-vue-as-state-owner.md)

### Code conventions

- [0012 — TypeScript and naming conventions](./0012-typescript-coding-conventions.md)

## How to use this directory

When working on code in this repo, load the ADR(s) whose
filenames match the area you are touching. The four-digit
prefix is for ordering and stable reference; the slug is for
topic-recognition. For example, before changing how data files
are queried, load `0004-duckdb-wasm-*.md` and
`0006-processor-factory-*.md` (note: DuckDB init lives in
`src/data-processing/duckdb.ts`).

When a decision surfaces in conversation that warrants an
ADR but does not yet have one, prompt the user to escalate.
Do not silently encode a decision into code without an ADR
to back it.
