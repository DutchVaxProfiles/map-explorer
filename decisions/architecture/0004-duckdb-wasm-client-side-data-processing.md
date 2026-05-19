# ADR 0004 — DuckDB-WASM for client-side data processing

**Status:** Accepted. Source: architecture analysis.

## Decision

Tabular data (CSV and Parquet files) is queried using DuckDB-WASM
running entirely in the browser. DuckDB is initialised once in
`src/data-processing/duckdb.ts` and files are registered as virtual in-memory
tables before any SQL is executed against them.

## Context

The app must support large tabular datasets and multiple file
formats without a backend. Pure JavaScript array processing would
require custom parsers, manual grouping, and slow iteration over
large datasets. DuckDB-WASM provides a full SQL OLAP engine —
including native Parquet support, DISTINCT, GROUP BY, and
parameterised queries — running in a Web Worker to avoid blocking
the UI thread.

## Implication

- All data reads go through `src/data-processing/duckdb.ts`; do not parse CSV or
  Parquet with ad-hoc JS libraries.
- SQL query construction lives in `src/data-processing/helpers.ts`.
  New query patterns belong there, not scattered in components.
- DuckDB initialisation loads two WASM bundles (`mvp` and `eh`);
  the async initialisation must complete before any processor
  can run queries — `src/data-processing/duckdb.ts` exports a promise-based API
  for this.
