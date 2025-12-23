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
  validFilters: Array<Record<string, string>>
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
      validFilters: validFilters
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
