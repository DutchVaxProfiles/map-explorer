<template>
  <div class="relative w-full h-full">
    <svg class="w-full h-full" ref="svgRef"></svg>
    <svg class="absolute top-0 left-0 w-full h-full pointer-events-none" ref="tooltipSvgRef" style="overflow: visible;"></svg>
    <Button
      v-show="isZoomedRef"
      class="fixed bottom-4 right-4"
      @click="resetZoom"
    >
      <ResetIcon />
    </Button>
  </div>
</template>

<script setup lang="ts">
import Button from "./button.vue"
import ResetIcon from "./icons/ResetIcon.vue"

import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { createPopper } from '@popperjs/core'
import {
  MapColor,
  createMapColor,
} from "../map_color"
import type { GeoJSON } from "geojson"
import rewind from '@mapbox/geojson-rewind';
import type {
  MapColorConfig,
  AppConfig
} from "../types"
import type { RegionData } from "../processors/types"

interface Props {
  geojson: GeoJSON
  regionData: RegionData[] | undefined
  config: AppConfig
  selectedLegendColor: string
}

const props = withDefaults(defineProps<Props>(), {
  geojson: undefined,
  regionData: () => undefined,
  selectedLegendColor: "",
})

const svgRef = ref<SVGSVGElement | null>(null)
const tooltipSvgRef = ref<SVGSVGElement | null>(null)
const tooltipRef = ref<d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null>(null)
const popperInstanceRef = ref(null)
const isZoomedRef = ref(false)
let zoomBehavior = null
let svg = null
let g = null
let currentTransform = d3.zoomIdentity
let paths = null
let tooltipLayer = null
let centerDot = null
let connectorLine = null

const FIXED_LINE_LENGTH = 50 // Fixed line length in pixels

const virtualElement = ref({
  getBoundingClientRect: () => ({
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    x: 0,
    y: 0,
  }),
})

function resetZoom() {
  if (svg && zoomBehavior) {
    currentTransform = d3.zoomIdentity
    svg.transition()
      .duration(750)
      .call(zoomBehavior.transform, d3.zoomIdentity)
  }
}

function createRegionDataMap(regionData) {
  const regionDataMap = new Map<string, any>()
  if (regionData) {
    regionData.forEach(region => {
      regionDataMap.set(region.regionId, region)
    })
  }
  return regionDataMap
}

function updateOpacity() {
  if (!paths) return

  const selectedLegendColor = props.selectedLegendColor

  function getOpacity(color) {
    if (!selectedLegendColor) return 1
    return selectedLegendColor === color ? 1 : 0.2
  }

  paths.each(function(d) {
    const color = d3.select(this).attr('fill')
    const opacityValue = getOpacity(color)
    d3.select(this).attr('fill-opacity', opacityValue)
  })
}

function renderMap() {
  const geojsonData = props.geojson
  const regionData = props.regionData
  const idColumnGeojson = props.config.idColumnGeojson
  const config = props.config
  const selectedLegendColor = props.selectedLegendColor

  if (!svgRef.value || !geojsonData ) {
    return
  }

  const regionDataMap = createRegionDataMap(regionData)

  svg = d3.select(svgRef.value)
  const width = svgRef.value.getBoundingClientRect().width
  const height = svgRef.value.getBoundingClientRect().height

  // Clear existing content
  svg.selectAll("*").remove()
  g = svg.append('g')

  // Restore previous zoom state
  if (currentTransform && (currentTransform.k !== 1 || currentTransform.x !== 0 || currentTransform.y !== 0)) {
    svg.call(zoomBehavior.transform, currentTransform)
  }

  if (!tooltipRef.value) {
    tooltipRef.value = d3.select("body").append("div")
      .attr("class", "absolute bg-white p-2 pointer-events-none text-sm card-box z-50")
      .style("visibility", "hidden")
  }

  // Create tooltip layer in separate SVG
  const tooltipSvg = d3.select(tooltipSvgRef.value)
  tooltipSvg.selectAll("*").remove()

  tooltipLayer = tooltipSvg.append('g')
    .style('pointer-events', 'none')
    .style('visibility', 'hidden')

  // Create connector line
  connectorLine = tooltipLayer.append('line')
    .attr('stroke', '#343434')
    .attr('stroke-width', 4)

  // Create center dot
  centerDot = tooltipLayer.append('circle')
    .attr('r', 6)
    .attr('stroke', '#343434')
    .attr('stroke-width', 4)

  const projection = d3.geoMercator().fitSize([width, height], geojsonData)
  const pathGenerator = d3.geoPath().projection(projection)

  const mapColor = createMapColor(config, regionData)

  function getColor(d) {
    const region = regionDataMap.get(d.properties[idColumnGeojson])
    return mapColor.getBinColor(region?.value)
  }

  function getOpacity(color) {
    const selected = selectedLegendColor
    if (!selected) return 1
    return selected === color ? 1 : 0.2
  }

  const correctedGeojson = rewind(geojsonData, true)
  paths = g.selectAll<SVGPathElement, Feature>('path')
    .data(correctedGeojson.features)
    .join('path')
    .attr('d', pathGenerator)
    .attr('stroke', mapColor.getBorderColor())
    .attr('stroke-width', 0.5)
    .attr('fill', 'transparent');

  // Setup zoom behavior
  zoomBehavior = d3.zoom()
    .scaleExtent([0.8, 5])
    .on('start', () => {
      tooltipRef.value.style("visibility", "hidden")
      tooltipLayer.style('visibility', 'hidden')
      paths.style('pointer-events', 'none')
    })
    .on('zoom', (event) => {
      const { transform } = event
      currentTransform = transform

      g.style('transform', `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`)
      g.style('transform-origin', '0 0')

      isZoomedRef.value = transform.k !== 1 || transform.x !== 0 || transform.y !== 0
    })
    .on('end', () => {
      paths.style('pointer-events', 'auto')
      paths.attr('stroke-width', 0.5)
    })

   svg.call(zoomBehavior)

  paths.each(function(d) {
    const color = getColor(d)
    const opacityValue = getOpacity(color)

    d3.select(this)
      .attr('fill', color)
      .attr('fill-opacity', opacityValue)
  })

  paths.on('mouseover', function(event, d) {
      const bbox = this.getBBox()
      const centerX = bbox.x + bbox.width / 2
      const centerY = bbox.y + bbox.height / 2

      d3.select(this)
        .transition()
        .duration(100)
        .attr("stroke-width", 1.5);

      // Get region data for tooltip
      const regionId = d.properties[idColumnGeojson]
      const value = regionDataMap.get(regionId)?.value ?? "No data"
      const formattedValue = typeof value === 'number' ? value.toLocaleString() : value

      // Transform center coordinates to screen space
      const svgPoint = svgRef.value.createSVGPoint()
      svgPoint.x = centerX
      svgPoint.y = centerY
      const screenPoint = svgPoint.matrixTransform(g.node().getCTM())

      // Determine tooltip placement (left or right of center)
      const svgRect = svgRef.value.getBoundingClientRect()
      const preferRight = screenPoint.x < svgRect.width / 2

      // Calculate line endpoint in screen coordinates (relative to SVG)
      const lineEndX = preferRight ? screenPoint.x + FIXED_LINE_LENGTH : screenPoint.x - FIXED_LINE_LENGTH
      const lineEndY = screenPoint.y

      const boxClasses = preferRight
        ? "border border-[#343434] rounded-[8px] rounded-tl-none shadow-[1.5px_1.5px_0px_0.5px_#343434]"
        : "border border-[#343434] rounded-[8px] rounded-tr-none shadow-[-1.5px_1.5px_0px_0.5px_#343434]";

      // Set tooltip content
      tooltipRef.value
        .style("visibility", "visible")
        .attr(
          "class",
          `absolute border-t-[4px] bg-white p-2 pointer-events-none text-sm z-50 ${boxClasses}`
        )
        .html(`
          <div class="font-bold text-gray-800">Region: ${regionId}</div>
          <div class="text-gray-600 mt-1">${d.properties.name || 'Unknown'}</div>
          <div class="text-gray-600 mt-1">Value: ${formattedValue}</div>
        `)

      // Update center dot position (in screen coordinates)
      centerDot
        .attr('cx', screenPoint.x)
        .attr('cy', screenPoint.y)
        .attr('fill', getColor(d))

      // Update connector line (in screen coordinates)
      connectorLine
        .attr('x1', screenPoint.x)
        .attr('y1', screenPoint.y)
        .attr('x2', lineEndX)
        .attr('y2', lineEndY)

      // Show tooltip layer
      tooltipLayer.style('visibility', 'visible')

      // Update virtual element position for tooltip - positioned at the END of the line
      virtualElement.value.getBoundingClientRect = () => ({
        width: 0,
        height: 0,
        top: lineEndY + svgRect.top,
        right: lineEndX + svgRect.left,
        bottom: lineEndY + svgRect.top,
        left: lineEndX + svgRect.left,
        x: lineEndX + svgRect.left,
        y: lineEndY + svgRect.top,
      })

      if (popperInstanceRef.value) {
        popperInstanceRef.value.destroy()
        popperInstanceRef.value = null
      }

      if (tooltipRef.value.node()) {
        popperInstanceRef.value = createPopper(virtualElement.value, tooltipRef.value.node(), {
          placement: preferRight ? 'right-start' : 'left-start',
          modifiers: [
            {
              name: 'preventOverflow',
              enabled: false,
            },
            {
              name: 'flip',
              enabled: false,
            },
            {
              name: 'offset',
              options: {
                offset: [-2, 0], // shift UP by 2px
              },
            },
          ],
        })
      }
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .transition()
        .duration(100)
        .attr("stroke-width", 0.5)
        .attr('fill', (d) => {
          return getColor(d)
        })
      tooltipRef.value.style("visibility", "hidden")
      tooltipLayer.style('visibility', 'hidden')
    })
}

const resizeObserver = new ResizeObserver(entries => {
  for (let entry of entries) {
    renderMap()
    tooltipRef.value.style("visibility", "hidden")
  }
});

onMounted(() => {
  resizeObserver.observe(svgRef.value);
})

// Watch for full re-render triggers
watch(
  [
    () => props.config,
    () => props.regionData,
    () => props.geojson,
  ],
  () => {
    renderMap()
  },
  { deep: true }
)

// Watch selectedLegendColor separately for opacity-only updates
watch(
  () => props.selectedLegendColor,
  () => {
    updateOpacity()
  }
)

onUnmounted(() => {
  if (tooltipRef.value) {
    tooltipRef.value.remove()
    tooltipRef.value = null
  }
  if (popperInstanceRef.value) {
    popperInstanceRef.value.destroy()
    popperInstanceRef.value = null
  }
  resizeObserver.disconnect()
})
</script>
