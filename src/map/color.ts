import * as d3 from 'd3'
import type { RegionData } from '../data-processing/types'
import type {
  MapColorConfig,
  ColorScheme,
  MapConfig,
} from '../map-config/types'

export class MapColor {
  private readonly thresholds: number[]
  private readonly colors: string[]
  private readonly borderColor: string
  private readonly colorScheme: ColorScheme

  constructor({ minValue, maxValue, numBins = 7, colorScheme = "coolwarm" }: MapColorConfig) {
    const bins = Math.max(1, Math.floor(numBins))
    const lo = Math.min(minValue, maxValue)
    const hi = Math.max(minValue, maxValue)
    const range = hi - lo || Number.EPSILON
    const binSize = range / bins

    this.thresholds = Array.from({ length: bins + 1 }, (_, i) => lo + i * binSize)
    this.colorScheme = colorScheme
    this.borderColor = this.getOptimalBorderColor()

    const colorInterpolator = this.getColorInterpolator()
    this.colors = Array.from({ length: bins }, (_, i) => colorInterpolator((i + 0.5) / bins))
  }

  private getOptimalBorderColor(): string {
    return '#FFFFFF'
  }

  private getColorInterpolator(): (t: number) => string {
    switch (this.colorScheme) {
      case 'magma':       return (t: number) => d3.interpolateMagma(1 - t)
      case 'coolwarm':    return (t: number) => d3.interpolateRdBu(1 - t)
      default:            return (t: number) => d3.interpolateMagma(1 - t)
    }
  }

  getBinColor(value: number | undefined): string {
    if (value === undefined || !Number.isFinite(value)) return '#D3D3D3'
    if (value <= this.thresholds[0]) return this.colors[0]
    if (value >= this.thresholds[this.thresholds.length - 1]) {
      return this.colors[this.colors.length - 1]
    }

    const i = this.thresholds.findIndex((t, j) =>
      value >= t && value < this.thresholds[j + 1]
    )
    return this.colors[i]
  }

  getThresholds() { return this.thresholds }
  getColors() { return this.colors }
  getBorderColor() { return this.borderColor }
}

export function createMapColor(
  config: MapConfig,
  regionData: RegionData[] | undefined
): MapColor {
  switch (config.kind) {
    case "geojson-datafile": {
      let minValue = config.mapColorConfig.minValue
      let maxValue = config.mapColorConfig.maxValue

      if (config.mapColorConfig.dynamic && regionData?.length) {
        const numericValues = regionData
          .map(r => Number.parseFloat(String(r.value)))
          .filter(v => Number.isFinite(v))
        if (numericValues.length) {
          minValue = Math.min(...numericValues)
          maxValue = Math.max(...numericValues)
        }
      }

      return new MapColor({
        minValue: minValue,
        maxValue: maxValue,
        colorScheme: config.mapColorConfig.colorScheme,
        numBins: config.mapColorConfig.numBins,
      })
    }
    default:
      throw new Error(`Unknown config.kind: ${String((config as any)?.kind)}`)
  }
}
