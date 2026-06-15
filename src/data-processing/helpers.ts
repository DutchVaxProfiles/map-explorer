import { executeQuery } from "./duckdb"
import type { RegionData } from "./types"

const MISSING_LABEL = "Filter off"
const ALL_LABEL = "All"

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function readExpression(readFunction: string, datasetName: string): string {
  return `${readFunction}(${quoteLiteral(datasetName)})`
}

function sortFilterValues(values: string[]): string[] {
  const sortParts = (value: string): [number, number, string] => {
    if (value === ALL_LABEL) return [0, 0, value]

    const numberMatch = value.match(/\d+/)
    if (numberMatch) return [1, Number(numberMatch[0]), value]

    return [2, 0, value]
  }

  return [...values].sort((a, b) => {
    const [aGroup, aNumber, aText] = sortParts(a)
    const [bGroup, bNumber, bText] = sortParts(b)

    if (aGroup !== bGroup) return aGroup - bGroup
    if (aNumber !== bNumber) return aNumber - bNumber
    return aText.localeCompare(bText)
  })
}

export async function extractFilterCategories(
  categoryCols: string[],
  readFunction: string,
  datasetName: string
): Promise<{ [group: string]: string[] }> {
  const out: { [group: string]: string[] } = {}

  for (const category of categoryCols) {
    const categoryIdentifier = quoteIdentifier(category)
    const categoryExpression = `CAST(${categoryIdentifier} AS VARCHAR)`
    const query = `
      SELECT DISTINCT
        ${categoryExpression} AS ${categoryIdentifier}
      FROM
        ${readExpression(readFunction, datasetName)}
      ORDER BY
        CASE
          WHEN ${categoryIdentifier} = ${quoteLiteral(ALL_LABEL)} THEN 0
          WHEN ${categoryIdentifier} IS NULL THEN 1
          ELSE 2
        END,
        ${categoryIdentifier}
    `
    const result = await executeQuery(query)
    out[category] = sortFilterValues(result.map(item =>
      item[category] == null ? MISSING_LABEL : item[category].toString()
    ))
  }

  return out
}

export async function extractValidFilters(
  categoryCols: string[],
  readFunction: string,
  datasetName: string
): Promise<any[]> {
  const selectClauses = categoryCols
    .map(category => {
      const categoryIdentifier = quoteIdentifier(category)
      return `CAST(${categoryIdentifier} AS VARCHAR) AS ${categoryIdentifier}`
    })
    .join(", ")

  const query = `
    SELECT DISTINCT
      ${selectClauses}
    FROM
      ${readExpression(readFunction, datasetName)}
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

  const filterClause = Object.entries(selectedCategoryValues)
    .map(([categoryCol, value]) =>
      value === MISSING_LABEL
        ? `${quoteIdentifier(categoryCol)} IS NULL`
        : `${quoteIdentifier(categoryCol)} = ${quoteLiteral(value)}`
    )
    .join(" AND ")
  const whereClause = filterClause ? `WHERE ${filterClause}` : ""

  const query = `
    SELECT
      ${quoteIdentifier(idColumn)} AS regionId,
      CAST(${quoteIdentifier(valueColumn)} AS DOUBLE) AS value
    FROM
      ${readExpression(readFunction, datasetName)}
    ${whereClause}
  `
  const out = await executeQuery(query) as RegionData[]
  return out
}

export async function getColumnNames(
  readFunction: string,
  datasetName: string
): Promise<string[]> {
  const query = `SELECT * FROM ${readExpression(readFunction, datasetName)} LIMIT 1`
  const result = await executeQuery(query)
  return result.length > 0 ? Object.keys(result[0]) : []
}
