# Map Data Preprocessing

Use `preprocess_map_data.py` to convert one wide CBS/export CSV into the
long CSV and filtered GeoJSON expected by Map Explorer.

## Input

The conference MVP supports buurt-level output. The raw CSV must contain:

- `buurt_code`, for example `BU01935100`
- `n_sample`
- `profile_1`, `profile_2`, `profile_3`, `profile_4`, `profile_5`

Optional column:

- `gender`

Profile values may be proportions (`0` to `1`) or percentages (`0` to `100`).
The script writes percentages.

## Command

```bash
uv run python scripts/preprocess_map_data.py \
  --input data/raw/profile_export.csv \
  --geo-level buurt \
  --geo-year 2026 \
  --geojson data/geo/buurt_2026.geojson \
  --output-public public
```

If `--geojson` is omitted, the script looks for
`data/geo/buurt_<geo-year>.geojson`.

## Output

- `public/buurt_5_processed.csv`
- `public/buurt_2026.geojson`
- `public/preprocess_report.json`

The processed CSV schema is:

- `profile`
- `buurt_code`
- `buren` (compatibility alias used by the earlier vaxprofiles fork)
- `value`
- `n_sample`
- optional filter columns such as `gender`

The map config joins GeoJSON `properties.statcode` to CSV `buurt_code`.

## Checks

The script fails when required columns are missing, profile values do not sum
to about 100, duplicates exist for a region/filter combination, values fall
outside the expected range, or more than 5% of input buurt codes do not join to
the GeoJSON.
