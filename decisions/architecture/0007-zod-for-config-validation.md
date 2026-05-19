# ADR 0007 — Zod schemas for configuration validation

**Status:** Accepted. Source: architecture analysis.

## Decision

Map configuration files are JSON (user-supplied, not TypeScript).
They are validated at runtime against Zod schemas defined in
`src/map-config/types.ts`. TypeScript types are derived from those
schemas via `z.infer<typeof Schema>` — they are never written
manually in parallel.

## Implication

- Define or extend the schema in `src/map-config/types.ts` first;
  derive the TypeScript type from it. Do not write a separate
  `interface` or `type` that duplicates schema fields.
- Cross-field validation (e.g. `minValue <= maxValue`) is expressed
  with `.refine()` on the schema itself, not in component logic.
- `loader.ts` calls `MapConfigSchema.safeParse()` and surfaces
  validation errors to the user at startup; invalid configs are
  rejected before any rendering occurs.
- The discriminated union on `kind` is the extension point for
  future map types — add a new branch there, not a separate
  validation path.
