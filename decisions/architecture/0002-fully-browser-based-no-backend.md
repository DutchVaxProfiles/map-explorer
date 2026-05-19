# ADR 0002 — Fully browser-based, no backend

**Status:** Accepted. Source: project README, architecture analysis.

## Decision

Map Explorer is a fully browser-based application. There is no
server-side backend, no API, and no database server. All data
loading, querying, and rendering happens in the user's browser.
GeoJSON and data files are served as static assets.

## Implication

- All computation — SQL queries, GeoJSON parsing, color mapping
  — runs client-side. DuckDB-WASM is the query engine (ADR 0004).
- The app can be deployed as a static site (e.g. GitHub Pages)
  with no server infrastructure beyond a file host.
- Data files must be shipped alongside the app in `public/` or
  fetched from a CORS-accessible URL — no server-side data
  access layer exists or should be added.
