# Interim Wijk Data

The current public map files are temporary Study 2 files used to test layout,
labels, map interaction, and storytelling before the final CBS-linked model
output is added.

- `wijk_2024.geojson` is copied from the earlier `vaxprofiles/map-explorer`
  fork.
- `wijk_5_processed.csv` is copied from the earlier `vaxprofiles/map-explorer`
  fork and keeps the five-profile-group format used by that app.
- `preprocess_report.json` records the interim status and row counts.

Replace these files by running `scripts/preprocess_map_data.py` once the final
CBS/export CSV and current wijk GeoJSON are available.
