# Map Data Preprocessing

Use `preprocess_map_data.py` to convert one wide CBS/export CSV into the
long CSV and filtered GeoJSON expected by Map Explorer.

## Input

The current map uses wijk-level output. The raw CSV must contain:

- `wijk_code`, for example `WK034400`
- `n_sample`
- `profile_1`, `profile_2`, `profile_3`, `profile_4`, `profile_5`

The same command also supports buurt-level output by using `--geo-level buurt`
and a `buurt_code` column.

Optional column:

- `gender`

Profile values may be proportions (`0` to `1`) or percentages (`0` to `100`).
The script writes percentages.

## Command

```bash
uv run python scripts/preprocess_map_data.py \
  --input data/raw/profile_export.csv \
  --geo-level wijk \
  --geo-year 2026 \
  --geojson data/geo/wijk_2026.geojson \
  --output-public public
```

If `--geojson` is omitted, the script looks for
`data/geo/<geo-level>_<geo-year>.geojson`.

## Output

For `--geo-level wijk`, the script writes:

- `public/wijk_5_processed.csv`
- `public/wijk_2026.geojson`
- `public/preprocess_report.json`

The processed wijk CSV schema is:

- `profile`
- `wijk_code`
- `wijk` (compatibility alias used by the earlier vaxprofiles fork)
- `value`
- `n_sample`
- optional filter columns such as `gender`

For `--geo-level buurt`, the equivalent files are
`public/buurt_5_processed.csv` and `public/buurt_2026.geojson`, with `buren`
as the compatibility alias.

## Checks

The script fails when required columns are missing, profile values do not sum
to about 100, duplicates exist for a region/filter combination, values fall
outside the expected range, or more than 5% of input region codes do not join
to the GeoJSON.
