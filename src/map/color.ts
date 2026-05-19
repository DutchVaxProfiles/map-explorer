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
  private readonly colorSchemeInverted: boolean

  constructor({ minValue, maxValue, numBins = 7, colorScheme = "viridis", colorSchemeInverted = false }: MapColorConfig) {
    const bins = Math.max(1, Math.floor(numBins))
    const lo = Math.min(minValue, maxValue)
    const hi = Math.max(minValue, maxValue)
    const range = hi - lo || Number.EPSILON
    const binSize = range / bins

    this.thresholds = Array.from({ length: bins + 1 }, (_, i) => lo + i * binSize)
    this.colorScheme = colorScheme
    this.colorSchemeInverted = colorSchemeInverted
    this.borderColor = this.getOptimalBorderColor()

    if (colorScheme === "no colorscheme") {
      this.colors = Array.from({ length: bins }, () => this.colorSchemeInverted ? '#000000' : '#FFFFFF')
    } else {
      const colorInterpolator = this.getColorInterpolator()
      this.colors = Array.from({ length: bins }, (_, i) => colorInterpolator((i + 0.5) / bins))

      // check if colors need to be reversed
      if (this.colorSchemeInverted) {
        this.colors.reverse()
      }
    }
  }

  private getOptimalBorderColor(): string {
    const darkSchemes: ColorScheme[] = ['inferno', 'magma', 'plasma', 'viridis', 'turbo', 'cubehelix', 'cividis']
    const lightSchemes: ColorScheme[] = ['warm', 'cool']

    let borderColor = '#000000' // Default for 'no colorscheme' and unknown schemes

    if (this.colorScheme && darkSchemes.includes(this.colorScheme)) {
      borderColor = '#FFFFFF'
    } else if (this.colorScheme && lightSchemes.includes(this.colorScheme)) {
      borderColor = '#000000'
    }

    // Invert border color if color scheme is inverted
    if (this.colorSchemeInverted) {
      borderColor = borderColor === '#FFFFFF' ? '#000000' : '#FFFFFF'
    }

    return borderColor
  }

  private getColorInterpolator(): (t: number) => string {
    switch (this.colorScheme) {
      case 'viridis':     return d3.interpolateViridis
      case 'plasma':      return d3.interpolatePlasma
      case 'inferno':     return d3.interpolateInferno
      case 'magma':       return d3.interpolateMagma
      case 'cividis':     return d3.interpolateCividis
      case 'turbo':       return d3.interpolateTurbo
      case 'warm':        return d3.interpolateWarm
      case 'cool':        return d3.interpolateCool
      case 'coolwarm':    return d3.interpolateRdBu
      case 'cubehelix':   return d3.interpolateCubehelixDefault
      case 'no colorscheme': return () => '#FFFFFF'
      default:            return d3.interpolateViridis
    }
  }

  getBinColor(value: number | undefined): string {
    if (value === undefined) return '#D3D3D3'
    const i = this.thresholds.findIndex((t, j) =>
      value >= t && value < this.thresholds[j + 1]
    )
    return this.colors[i >= 0 ? i : this.colors.length - 1]
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
        colorSchemeInverted: config.mapColorConfig.colorSchemeInverted
      })
    }
    default:
      throw new Error(`Unknown config.kind: ${String((config as any)?.kind)}`)
  }
}
