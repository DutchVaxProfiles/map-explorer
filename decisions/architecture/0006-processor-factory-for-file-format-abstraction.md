# ADR 0006 — Processor factory pattern for file format abstraction

**Status:** Accepted. Source: architecture analysis.

## Decision

Data file access is abstracted behind an abstract `Processor` class
(`src/data-processing/processor.ts`). Concrete subclasses `CsvProcessor`
and `ParquetProcessor` implement format-specific DuckDB registration.
`ProcessorFactory` (`src/data-processing/processor-factory.ts`) selects
the correct subclass based on file extension.

## Implication

- Call sites use the `Processor` interface only; they are unaware of
  the underlying file format.
- Adding support for a new file format (e.g. JSON, Excel) requires:
  a new subclass under `src/data-processing/`, a new case in
  `ProcessorFactory`, and nothing else.
- SQL query builders shared across formats live in
  `src/data-processing/helpers.ts` and must remain format-agnostic.
