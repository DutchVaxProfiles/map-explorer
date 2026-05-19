# ADR 0005 — D3.js for SVG map rendering

**Status:** Accepted. Source: architecture analysis.

## Decision

GeoJSON maps are rendered as SVG using D3.js (`d3-geo`, `d3-zoom`,
`d3-selection`). D3 handles projection (`geoMercator`), path
generation, zoom/pan interaction, and tooltip positioning.
No tile-based mapping library (Mapbox GL, Leaflet) is used.

## Context

Tile-based libraries require external map tile APIs or self-hosted
tiles, introduce API keys, and add network dependencies. D3's
`geoPath` renders GeoJSON directly to SVG with no external data
dependencies, keeping the app fully offline-capable and API-key-free.

## Implication

- Map rendering lives entirely in `src/components/map.vue` using
  D3 selections and joins. Do not introduce a mapping library.
- Zoom and pan use `d3.zoom()` applied to the root SVG — not CSS
  transforms on the Vue component.
- Region coloring is a pure data join: `regionData` → colour via
  `MapColor` (ADR 0007) → `fill` attribute on each `<path>`.
