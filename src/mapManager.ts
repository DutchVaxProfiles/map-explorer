import type { GeoJSON } from "geojson"
import type { RegionData } from "./processors/types"
import { ProcessorFactory } from "./processors/processor_factory"
import { Processor } from "./processors/processor"
import type { MapConfig } from "./config/types"
import { fetchPublicFile } from "./helpers"

export interface LoadedMapState {
  geojsonData: GeoJSON
  dataProcessor: Processor
  regionData: RegionData[]
  availableFilterOptions: { [key: string]: string[] }
  selectedFilters: { [key: string]: string }
  validFilterLookup: ValidFilterLookup
}

type MapKey = string

export class MapManager {
  private cache: Record<MapKey, LoadedMapState> = {}

  private getMapKey(config: MapConfig): MapKey {
    return config.mapDescription.title
  }

  private async extractFilterState(
    processor: Processor,
    config: MapConfig
  ): Promise<{
    availableFilterOptions: { [key: string]: string[] }
    selectedFilters: { [key: string]: string }
    validFilters: Record<string, string>[]
  }> {
    const availableFilterOptions = await processor.extractFilterCategories(
      config.categoryColumns
    )

    const validFilters = await processor.extractValidFilters(
      config.categoryColumns
    )

    const selectedFilters: { [key: string]: string } = {}
    for (const [categoryName, values] of Object.entries(availableFilterOptions)) {
      selectedFilters[categoryName] = (values as string[])[0]
    }

    return { availableFilterOptions, selectedFilters, validFilters }
  }

  private async loadMap(config: MapConfig): Promise<LoadedMapState> {
    console.log("[MapManager] Loading map:", config.mapDescription.title)

    // Load files in parallel
    const [geojsonFile, dataFile] = await Promise.all([
      fetchPublicFile(config.geojsonFileName),
      fetchPublicFile(config.dataFileName)
    ])

    const geojson = JSON.parse(await geojsonFile.text()) as GeoJSON
    const processor = await ProcessorFactory.create(dataFile)

    // Extract filter state
    const { availableFilterOptions, selectedFilters, validFilters } =
      await this.extractFilterState(processor, config)

    // Build valid filter lookup map
    const validFilterLookup = new ValidFilterLookup(validFilters, config.categoryColumns)

    // Determine which filters to use
    const filtersToUse = config.filter || selectedFilters

    // Get initial region data
    const regions = await processor.getRegionData(
      filtersToUse,
      config.idColumnDataFile,
      config.valueColumn
    )

    // Create state object
    const state: LoadedMapState = {
      geojsonData: geojson,
      dataProcessor: processor,
      regionData: regions,
      availableFilterOptions,
      selectedFilters: config.filter || selectedFilters,
      validFilterLookup: validFilterLookup
    }

    console.log("[MapManager] Map loaded:", config.mapDescription.title)
    return state
  }

  async getMapState(config: MapConfig): Promise<LoadedMapState> {
    const key = this.getMapKey(config)

    // Check cache first
    if (this.cache[key]) {
      console.log("[MapManager] Using cached map:", config.mapDescription.title)
      return this.cache[key]
    }

    // Load and cache
    const state = await this.loadMap(config)
    this.cache[key] = state

    return state
  }

  updateCachedState(config: MapConfig, updates: Partial<LoadedMapState>): void {
    const key = this.getMapKey(config)

    if (this.cache[key]) {
      this.cache[key] = {
        ...this.cache[key],
        ...updates
      }
    }
  }
}


/**
 * ValidFilterLookup - Fast lookups for finding possible unique combinations of categories
 * that map to a value
 *
 * This code is here to suppor non full factorial designs, i.e.
 * users have datasets where not every combination of filters lead to a set of region ids and values
 * Because the combinations of filters can be very large, the users needs to know in the UI
 * which filters actually lead to region ids and values to inspect on the map
 *
 * So this code given that all other filters are set with values, looks up on the remaining filter
 * which values lead to actual sets to inspect.
 *
 * Example:
 * Given data:
 *   A  B  C
 *   1  2  3
 *   1  2  4
 *
 * Map indexed by variable C:
 *   given that 1 and 2 are selected returns [3, 4]
 *
 * Usage:
 *   const data = [
 *     { A: '1', B: '2', C: '3' },
 *     { A: '1', B: '2', C: '4' }
 *   ]
 *   const indexed = new ValidFilterLookup(data, ['A', 'B', 'C'])
 *   const results = indexed.lookup({ A: '1', B: '2' }, 'C')
 *   Returns: ['3', '4']
 *
 *   The UI can actually use this lookup, to mark all values that are not 3 and 4 as uninteresting
 */
export class ValidFilterLookup {
  private indices: Map<string, Map<string, Set<string>>>

  constructor(data: Record<string, string>[], allKeys: string[]) {
    this.indices = this.buildIndex(data, allKeys)
  }

  private buildIndex(
    data: Array<Record<string, string>>,
    allKeys: string[]
  ): Map<string, Map<string, Set<string>>> {
    const indices = new Map<string, Map<string, Set<string>>>()

    for (const targetKey of allKeys) {
      const index = new Map<string, Set<string>>()
      const otherKeys = allKeys.filter(k => k !== targetKey)

      for (const obj of data) {
        const compositeKey = otherKeys.map(key => obj[key]).join('|')

        if (!index.has(compositeKey)) {
          index.set(compositeKey, new Set())
        }

        index.get(compositeKey)!.add(obj[targetKey])
      }

      indices.set(targetKey, index)
    }

    return indices
  }

  lookup(knownValues: Record<string, string>, targetKey: string): string[] {
    const index = this.indices.get(targetKey)
    if (!index) return []

    const otherKeys = Object.keys(knownValues).filter(k => k !== targetKey)
    const compositeKey = otherKeys.map(key => knownValues[key]).join('|')
    return Array.from(index.get(compositeKey) || [])
  }
}

