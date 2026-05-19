# ADR 0008 — MapManager: state caching and ValidFilterLookup

**Status:** Accepted. Source: architecture analysis.

## Decision

`MapManager` (`src/map/manager.ts`) is the single place responsible
for loading and caching map states. Fetching GeoJSON, registering
data files in DuckDB, and building the initial query result are
expensive; `MapManager` caches the result by map title so switching
back to a previously loaded map is instant.

`MapManager` also constructs a `ValidFilterLookup` index on first
load. The index records, for each category column and each
combination of sibling-column values, the set of values that
actually appear in the data. This prevents users from selecting
filter combinations that would return zero rows.

## Implication

- All map loading goes through `MapManager.getMapState()`. Do not
  fetch GeoJSON or initialise processors in components or `App.vue`
  directly.
- `ValidFilterLookup` is queried in `App.vue` when building the
  available options for each filter dropdown; options that would
  produce an empty result are excluded.
- The cache is keyed by map title (string). If two configs share a
  title, they share a cached state — titles must be unique across
  config files.
