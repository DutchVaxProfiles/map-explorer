<template>
  <div class="relative">
    <!-- Skeleton while loading OR config not ready -->
    <div v-if="loading || !config" class="flex flex-col items-center p-4">
      <div class="h-6 bg-gray-200 rounded animate-pulse mb-6 w-48"></div>
      <div class="flex gap-1 mb-4">
        <div v-for="i in 7" :key="i" class="w-10 h-5 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div class="flex gap-8">
        <div v-for="i in 8" :key="i" class="h-3 w-8 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>

    <div
      class="histogram-legend-container"
      ref="containerRef"
      :class="{ hidden: loading || !config }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import {
  createMapColor
} from '../map/color'
import type { RegionData } from '../data-processing/types'
import type { MapConfig } from '../map-config/types'

interface Props {
  regionData: RegionData[] | undefined
  config?: MapConfig
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  regionData: () => [],
  loading: false
})

const emit = defineEmits<{
  'selected-legend-color': [string]
}>()

const containerRef = ref<HTMLElement | null>(null)
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null

function formatThreshold(x: number) {
  if (x === 0) return "0"
  const abs = Math.abs(x)
  const sign = x < 0 ? "-" : ""

  if (abs >= 1e3 || abs < 1e-3) {
    const s = d3.format(".2e")(abs)
    const [mant, expStr] = s.split("e")
    const exp = parseInt(expStr, 10)
    return `${sign}${mant}e${exp >= 0 ? "+" : ""}${exp}`
  }

  const fixed = d3.format(".3g")(x)
  return fixed.replace(/^(-?)0\./, "$1.")
}

function renderLegend() {
  // Guard for container, loading, missing config, or wrong kind
  if (!containerRef.value) return
  if (props.loading) return
  if (!props.config) return
  if (!props.regionData || !props.regionData.length) return

  // Lazily create the SVG when we first have enough info
  if (!svg) {
    svg = d3.select(containerRef.value)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '150px')
      .attr('viewBox', '0 0 300 150')
  }

  if (!svg) return

  svg.selectAll('*').remove()

  const mapColor = createMapColor(props.config, props.regionData)
  const width = 300
  //const height = 150
  const margin = { top: 40, right: 20, bottom: 40, left: 20 }
  const thresholds = mapColor.getThresholds()
  const colors = mapColor.getColors()
  const numBins = colors.length
  const binWidth = (width - margin.left - margin.right) / numBins
  const binHeight = 20
  const group = svg.append('g')

  // Title
  group.append('text')
    .attr('x', width / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', 'bold')
    .text(props.config?.legendTitle ?? "")

  // Color bins
  colors.forEach((color, i) => {
    group.append('rect')
      .attr('x', margin.left + i * binWidth)
      .attr('y', margin.top)
      .attr('width', binWidth)
      .attr('height', binHeight)
      .style('fill', color)
      .style('stroke', mapColor.getBorderColor())
      .style('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .style('touch-action', 'manipulation')
      .on('mouseenter', function () {
        d3.select(this).style('stroke-width', 2)
        emit('selected-legend-color', color)
      })
      .on('mouseout', function () {
        d3.select(this).style('stroke-width', 0.5)
        emit('selected-legend-color', "")
      })
  })

  // Threshold labels
  thresholds.forEach((threshold, i) => {
    const x = margin.left + i * binWidth

    group.append('line')
      .attr('x1', x)
      .attr('y1', margin.top + binHeight + 5)
      .attr('x2', x)
      .attr('y2', margin.top + binHeight + 10)
      .attr('stroke', '#888')

    group.append('text')
      .attr('x', x)
      .attr('y', margin.top + binHeight + 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text(formatThreshold(threshold))
  })
}

onMounted(() => {
  renderLegend()
})

watch(
  [() => props.config, () => props.regionData, () => props.loading],
  () => {
    renderLegend()
  },
  { deep: true }
)
</script>

