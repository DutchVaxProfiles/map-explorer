#!/usr/bin/env python3
"""Prepare DutchVaxProfiles map data for Map Explorer.

The script converts one wide CBS/export CSV with profile_1..profile_5 columns
into the long CSV format expected by Map Explorer, then filters a CBS GeoJSON
to only the regions present in the data.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple


PROFILE_COLUMNS = [f"profile_{i}" for i in range(1, 6)]
OPTIONAL_FILTER_COLUMNS = ["gender"]
GEOGRAPHY = {
    "wijk": {
        "input_code_column": "wijk_code",
        "geojson_id_column": "statcode",
        "output_csv": "wijk_5_processed.csv",
        "output_geojson": "wijk_{year}.geojson",
        "output_alias_columns": {"wijk": "wijk_code"},
    },
    "buurt": {
        "input_code_column": "buurt_code",
        "geojson_id_column": "statcode",
        "output_csv": "buurt_5_processed.csv",
        "output_geojson": "buurt_{year}.geojson",
        "output_alias_columns": {"buren": "buurt_code"},
    }
}


class PreprocessError(ValueError):
    """Raised when input data cannot be safely transformed."""


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert DutchVaxProfiles raw profile exports for Map Explorer."
    )
    parser.add_argument("--input", required=True, type=Path, help="Raw wide CSV export.")
    parser.add_argument(
        "--geo-level",
        choices=sorted(GEOGRAPHY),
        default="wijk",
        help="Geographic level to publish.",
    )
    parser.add_argument("--geo-year", default="2026", help="CBS geometry year.")
    parser.add_argument(
        "--geojson",
        type=Path,
        help="Input GeoJSON. Defaults to data/geo/<level>_<year>.geojson.",
    )
    parser.add_argument(
        "--output-public",
        required=True,
        type=Path,
        help="Map Explorer public directory for processed files.",
    )
    parser.add_argument(
        "--sum-tolerance",
        default=1.0,
        type=float,
        help="Allowed absolute deviation from 100 percentage points per row.",
    )
    parser.add_argument(
        "--max-unmatched-share",
        default=0.05,
        type=float,
        help="Maximum share of input regions that may fail to join to GeoJSON.",
    )
    return parser.parse_args(argv)


def read_csv_rows(path: Path) -> List[Dict[str, str]]:
    if not path.exists():
        raise PreprocessError(f"Input CSV does not exist: {path}")

    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise PreprocessError("Input CSV has no header row.")
        rows = list(reader)

    if not rows:
        raise PreprocessError("Input CSV has no data rows.")
    return rows


def validate_columns(rows: List[Dict[str, str]], code_column: str) -> List[str]:
    fieldnames = set(rows[0].keys())
    required = {code_column, "n_sample", *PROFILE_COLUMNS}
    missing = sorted(required - fieldnames)
    if missing:
        raise PreprocessError(f"Input CSV is missing required columns: {', '.join(missing)}")

    return [column for column in OPTIONAL_FILTER_COLUMNS if column in fieldnames]


def parse_profile_values(row: Dict[str, str]) -> List[float]:
    values: List[float] = []
    for column in PROFILE_COLUMNS:
        raw = row.get(column, "").strip()
        if raw == "":
            raise PreprocessError(f"Missing value in {column}.")
        try:
            values.append(float(raw))
        except ValueError as exc:
            raise PreprocessError(f"Non-numeric value in {column}: {raw}") from exc
    return values


def detect_scale(rows: List[Dict[str, str]]) -> str:
    values = [value for row in rows for value in parse_profile_values(row)]
    max_value = max(values)
    if max_value <= 1.000001:
        return "proportion"
    if max_value <= 100.000001:
        return "percentage"
    raise PreprocessError(
        "Profile values must be proportions in [0, 1] or percentages in [0, 100]."
    )


def normalize_values(values: Iterable[float], scale: str) -> List[float]:
    multiplier = 100.0 if scale == "proportion" else 1.0
    normalized = [value * multiplier for value in values]
    for value in normalized:
        if value < -1e-9 or value > 100.000001:
            raise PreprocessError("Profile values must be between 0 and 100 after scaling.")
    return normalized


def row_key(row: Dict[str, str], code_column: str, filter_columns: Sequence[str]) -> Tuple[str, ...]:
    return tuple([row[code_column].strip(), *[row[column].strip() for column in filter_columns]])


def format_number(value: float) -> str:
    return f"{value:.2f}".rstrip("0").rstrip(".")


def reshape_profiles(
    rows: List[Dict[str, str]],
    code_column: str,
    filter_columns: Sequence[str],
    sum_tolerance: float,
    output_alias_columns: Dict[str, str],
) -> Tuple[List[Dict[str, str]], str, List[str]]:
    scale = detect_scale(rows)
    seen = set()
    warnings: List[str] = []
    output_rows: List[Dict[str, str]] = []

    for index, row in enumerate(rows, start=2):
        code = row[code_column].strip()
        if not code:
            raise PreprocessError(f"Missing {code_column} on CSV row {index}.")

        key = row_key(row, code_column, filter_columns)
        if key in seen:
            raise PreprocessError(
                f"Duplicate region/filter combination on CSV row {index}: {key}"
            )
        seen.add(key)

        values = normalize_values(parse_profile_values(row), scale)
        total = sum(values)
        if abs(total - 100.0) > sum_tolerance:
            raise PreprocessError(
                f"Profile values for {key} sum to {total:.2f}, expected about 100."
            )

        for profile_number, value in enumerate(values, start=1):
            output_row: Dict[str, str] = {
                "profile": str(profile_number),
                code_column: code,
                "value": format_number(value),
                "n_sample": row["n_sample"].strip(),
            }
            for alias, source_column in output_alias_columns.items():
                if source_column == code_column:
                    output_row[alias] = code
            for column in filter_columns:
                output_row[column] = row[column].strip() or "unknown"
            output_rows.append(output_row)

    if scale == "proportion":
        warnings.append("Converted profile values from proportions to percentages.")

    return output_rows, scale, warnings


def feature_code(feature: Dict[str, object], id_column: str) -> str:
    properties = feature.get("properties") or {}
    if isinstance(properties, dict) and properties.get(id_column) is not None:
        return str(properties[id_column]).strip()
    if feature.get("id") is not None:
        return str(feature["id"]).strip()
    return ""


def filter_geojson(
    geojson_path: Path,
    output_geojson_path: Path,
    codes: Iterable[str],
    id_column: str,
    max_unmatched_share: float,
) -> Dict[str, object]:
    if not geojson_path.exists():
        raise PreprocessError(
            f"GeoJSON does not exist: {geojson_path}. Provide --geojson or add the file."
        )

    with geojson_path.open(encoding="utf-8") as handle:
        geojson = json.load(handle)

    features = geojson.get("features")
    if not isinstance(features, list):
        raise PreprocessError("GeoJSON must be a FeatureCollection with a features array.")

    code_set = set(codes)
    filtered_features = []
    geo_codes = set()
    for feature in features:
        if not isinstance(feature, dict):
            continue
        code = feature_code(feature, id_column)
        if not code:
            continue
        geo_codes.add(code)
        if code in code_set:
            properties = feature.setdefault("properties", {})
            if isinstance(properties, dict):
                properties[id_column] = code
            filtered_features.append(feature)

    unmatched = sorted(code_set - geo_codes)
    unmatched_share = len(unmatched) / max(len(code_set), 1)
    if unmatched_share > max_unmatched_share:
        examples = ", ".join(unmatched[:10])
        raise PreprocessError(
            f"{len(unmatched)} of {len(code_set)} regions did not join to GeoJSON "
            f"({unmatched_share:.1%}). Examples: {examples}"
        )

    output_geojson = dict(geojson)
    output_geojson["features"] = filtered_features
    with output_geojson_path.open("w", encoding="utf-8") as handle:
        json.dump(output_geojson, handle, ensure_ascii=False, separators=(",", ":"))

    return {
        "input_geojson_features": len(features),
        "output_geojson_features": len(filtered_features),
        "unmatched_region_count": len(unmatched),
        "unmatched_region_examples": unmatched[:20],
        "geojson_regions_without_data": len(geo_codes - code_set),
    }


def write_processed_csv(
    output_path: Path,
    rows: List[Dict[str, str]],
    code_column: str,
    filter_columns: Sequence[str],
    alias_columns: Sequence[str],
) -> None:
    fieldnames = ["profile", code_column, *alias_columns, "value", "n_sample", *filter_columns]
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def preprocess(args: argparse.Namespace) -> Dict[str, object]:
    config = GEOGRAPHY[args.geo_level]
    code_column = config["input_code_column"]
    id_column = config["geojson_id_column"]
    output_alias_columns = dict(config.get("output_alias_columns", {}))
    alias_columns = list(output_alias_columns.keys())
    output_public = args.output_public
    output_public.mkdir(parents=True, exist_ok=True)

    raw_rows = read_csv_rows(args.input)
    filter_columns = validate_columns(raw_rows, code_column)
    processed_rows, scale, warnings = reshape_profiles(
        raw_rows, code_column, filter_columns, args.sum_tolerance, output_alias_columns
    )

    output_csv = output_public / config["output_csv"]
    output_geojson = output_public / config["output_geojson"].format(year=args.geo_year)
    geojson_input = args.geojson or Path("data") / "geo" / f"{args.geo_level}_{args.geo_year}.geojson"

    geo_report = filter_geojson(
        geojson_input,
        output_geojson,
        [row[code_column] for row in raw_rows],
        id_column,
        args.max_unmatched_share,
    )
    write_processed_csv(output_csv, processed_rows, code_column, filter_columns, alias_columns)

    report: Dict[str, object] = {
        "geo_level": args.geo_level,
        "geo_year": str(args.geo_year),
        "input_csv": str(args.input),
        "input_rows": len(raw_rows),
        "profile_scale": scale,
        "filter_columns": filter_columns,
        "compatibility_columns": alias_columns,
        "output_csv": str(output_csv),
        "output_geojson": str(output_geojson),
        "output_csv_rows": len(processed_rows),
        "warnings": warnings,
        **geo_report,
    }

    report_path = output_public / "preprocess_report.json"
    with report_path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    return report


def main(argv: Sequence[str]) -> int:
    args = parse_args(argv)
    try:
        report = preprocess(args)
    except PreprocessError as exc:
        print(f"preprocess_map_data: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
