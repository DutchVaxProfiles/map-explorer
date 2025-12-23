import type { RegionData } from "./types.ts"

export abstract class Processor {
  protected file: File

  constructor(file: File) {
    this.file = file
  }

  abstract initialize(): Promise<void>

  abstract extractFilterCategories(categoryCols: string[]): Promise<{ [group: string]: string[] }>

  abstract extractValidFilters(categoryCols: string[]): Promise<Array<Record<string, string>>>

  abstract getRegionData(
    selectedCategoryValues: Record<string, string>,
    idColumn: string,
    valueColumn: string
  ): Promise<RegionData[]>

  abstract getColumnNames(): Promise<string[]>
}
