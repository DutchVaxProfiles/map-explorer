import {
  registerFile,
  initializeDuckDB,
} from "../duckdb"
import { Processor } from "./processor"
import type { RegionData } from "./types"
import {
  extractFilterCategories,
  getRegionData,
  getColumnNames,
  extractValidFilters
} from "./helpers"

const READ_FUNCTION = "read_parquet"

export class ParquetProcessor extends Processor {
  private readonly datasetName: string

  constructor(file: File) {
    super(file)
    this.datasetName = `dataset_${crypto.randomUUID()}.parquet`
  }

  async initialize(): Promise<void> {
    await initializeDuckDB()
    await registerFile(this.datasetName, this.file)
  }

  async extractFilterCategories(categoryCols: string[]): Promise<{ [group: string]: string[] }> {
    return extractFilterCategories(categoryCols, READ_FUNCTION, this.datasetName)
  }

  async extractValidFilters(categoryCols: string[]): Promise<Array<Record<string, string>>> {
    return extractValidFilters(categoryCols, READ_FUNCTION, this.datasetName)
}
  async getRegionData(
    selectedCategoryValues: Record<string, string>,
    idColumn: string,
    valueColumn: string
  ): Promise<RegionData[]> {
    return getRegionData(
      selectedCategoryValues,
      idColumn,
      valueColumn,
      READ_FUNCTION,
      this.datasetName
    )
  }

  async getColumnNames() {
    return getColumnNames(READ_FUNCTION, this.datasetName)
  }
}
