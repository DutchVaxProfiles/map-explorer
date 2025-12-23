import { executeQuery } from "../duckdb"
import type { RegionData } from "./types"

const MISSING_LABEL = "Filter off"

export async function extractFilterCategories(
  categoryCols: string[],
  readFunction: string,
  datasetName: string
): Promise<{ [group: string]: string[] }> {
  const out: { [group: string]: string[] } = {}

  for (const category of categoryCols) {
    const query = `
      SELECT DISTINCT
        CAST(${category} AS VARCHAR) AS ${category}
      FROM
        ${readFunction}('${datasetName}')
    `
    const result = await executeQuery(query)
    out[category] = result.map(item =>
      item[category] == null ? MISSING_LABEL : item[category].toString()
    )
  }

  return out
}

export async function extractValidFilters(
  categoryCols: string[],
  readFunction: string,
  datasetName: string
): Promise<any[]> {
  const selectClauses = categoryCols
    .map(category => `CAST(${category} AS VARCHAR) AS ${category}`)
    .join(", ")

  const query = `
    SELECT DISTINCT
      ${selectClauses}
    FROM
      ${readFunction}('${datasetName}')
  `

  const out = await executeQuery(query)

  return out.map(row => {
    for (const col of categoryCols) {
      if (row[col] == null) row[col] = MISSING_LABEL
    }
    return row
  })
}

export async function getRegionData(
  selectedCategoryValues: Record<string, string>,
  idColumn: string,
  valueColumn: string,
  readFunction: string,
  datasetName: string
): Promise<RegionData[]> {

  const filter_clause = Object.entries(selectedCategoryValues)
    .map(([category_col, value]) =>
      value === MISSING_LABEL
        ? `${category_col} IS NULL`
        : `${category_col} = '${value}'`
    )
    .join(" AND ")

  const query = `
    SELECT
      ${idColumn} AS regionId,
      CAST(${valueColumn} AS DOUBLE) AS value
    FROM
      ${readFunction}('${datasetName}')
    WHERE
      ${filter_clause}
  `
  const out = await executeQuery(query) as RegionData[]
  return out
}

export async function getColumnNames(
  readFunction: string,
  datasetName: string
): Promise<string[]> {
  const query = `SELECT * FROM ${readFunction}('${datasetName}') LIMIT 1`
  const result = await executeQuery(query)
  return result.length > 0 ? Object.keys(result[0]) : []
}

