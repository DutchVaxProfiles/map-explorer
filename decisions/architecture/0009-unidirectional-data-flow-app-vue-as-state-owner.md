# ADR 0009 — Unidirectional data flow: App.vue owns all state

**Status:** Accepted. Source: architecture analysis.

## Decision

`App.vue` is the sole owner of all reactive application state:
selected map config, active filters, GeoJSON data, region data,
and color settings. Child components are stateless and
presentational. They receive data via props and communicate
upward exclusively by emitting typed events that `App.vue` handles.

No global state library (Vuex, Pinia) is used.

## Implication

- Business logic and async data fetching belong in `App.vue` (or
  in `MapManager` called from `App.vue`), not in leaf components.
- Child components emit events; they do not mutate shared state
  directly.
- Introduce a state library only if `App.vue` grows to the point
  where prop drilling or event chains become unmanageable — not
  preemptively.
