# ADR 0012 — TypeScript and naming conventions

**Status:** Accepted. Source: CLAUDE.md; enforced by ESLint.

## Decision

The codebase follows these conventions:

- **Types over interfaces.** Use `type` for all object shapes.
  `interface` is not used.
- **Zod-derived types.** Types for validated data are derived with
  `z.infer<typeof Schema>`; they are never written manually in
  parallel with a schema.
- **Naming.** PascalCase for classes and Zod schemas (e.g.
  `MapColorConfigSchema`); camelCase for functions and variables;
  kebab-case for Vue component filenames (e.g. `control-panel.vue`);
  UPPER_SNAKE_CASE for module-level constants.
- **Imports.** Use `import type` for type-only imports.
- **Async.** Use `async/await` throughout. Fire independent async
  operations in parallel with `Promise.all`.

## Implication

- ESLint enforces most of these rules; `npm run lint` must pass
  before code is considered done.
- Do not introduce `interface` declarations — convert to `type` if
  encountered.
- Do not duplicate a Zod schema as a hand-written TypeScript type;
  add a field to the schema and re-derive.
