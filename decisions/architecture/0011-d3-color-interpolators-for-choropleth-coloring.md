# ADR 0011 — D3 color interpolators for choropleth coloring

**Status:** Accepted. Source: architecture analysis.

## Decision

Region coloring uses D3's built-in perceptually-uniform color
interpolators (viridis, plasma, inferno, magma, and others).
`MapColor` (`src/map/color.ts`) wraps the chosen interpolator,
discretises the continuous scale into N bins over [minValue,
maxValue], and exposes a `getColor(value)` method. Dynamic
scaling (auto min/max from filtered data) and inversion are
supported.

## Implication

- Color scheme configuration is part of the map config JSON
  (the `mapColorConfig` field, validated by Zod).
- `MapColor` is the only place that maps data values to CSS
  color strings. Components call `mapColor.getColor(value)` —
  they do not contain color logic.
- Adding a new color scheme requires adding the D3 interpolator
  to `map/color.ts`; no changes to components or config schema
  are needed beyond registering the new name.
