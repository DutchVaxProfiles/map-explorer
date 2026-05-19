<template>
  <div class="relative w-full h-full">
    <!-- No data overlay -->
    <div
      v-if="!props.regionData?.length"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div
        class="rounded-lg border border-[#343434] bg-white px-6 py-4
               text-lg font-semibold text-gray-800
               shadow-[2px_2px_0px_0.75px_#343434]"
      >
        No data available
      </div>
    </div>

    <svg class="w-full h-full" ref="svgRef"></svg>
    <svg
      class="absolute top-0 left-0 w-full h-full pointer-events-none"
      ref="tooltipSvgRef"
      style="overflow: visible;"
    ></svg>

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
// This component is not really written in Typescript, I use any a lot here
// I do not have a desire to fight with the typesystem for those packages
// When adding new code to this component add types for bespoke code

import Button from "./button.vue"
import ResetIcon from "./icons/reset-icon.vue"

import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as d3 from 'd3'
import { createPopper } from '@popperjs/core'
import {
  createMapColor,
} from "../map/color"
import type { GeoJSON } from "geojson"
// @ts-ignore: does not have declaration file, dont care, see comment above
import rewind from '@mapbox/geojson-rewind';
import type {
  MapConfig
} from "../map-config/types"
import type { RegionData } from "../data-processing/types"

interface Props {
  geojson: GeoJSON
  regionData: RegionData[] | undefined
  config: MapConfig | undefined
  selectedLegendColor: string
}

const props = withDefaults(defineProps<Props>(), {
  geojson: undefined,
  regionData: () => [],
  selectedLegendColor: "",
})

const svgRef = ref<any | null>(null)
const tooltipSvgRef = ref<any | null>(null)
const tooltipRef = ref<any | null>(null)
const popperInstanceRef = ref<any | null>(null)
const isZoomedRef = ref(false)
const isMobile = ref(false)
const activeRegion = ref<string | null>(null)

let zoomBehavior: any = null
let svg: any = null
let g: any = null
let currentTransform: any = d3.zoomIdentity
let paths: any = null
let tooltipLayer: any = null
let centerDot: any = null
let connectorLine: any = null

const FIXED_LINE_LENGTH = 50 // Fixed line length for tooltop (in pixels)

// Detect if device is mobile
function checkIsMobile() {
  isMobile.value = window.matchMedia("(hover: none) and (pointer: coarse)").matches
}

const virtualElement: any = ref({
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

function hideTooltip() {
  if (tooltipRef.value) {
    tooltipRef.value.style("visibility", "hidden")
  }
  if (tooltipLayer) {
    tooltipLayer.style('visibility', 'hidden')
  }
  activeRegion.value = null
}

function showTooltip(element: any, d: any, regionId: any) {
  if (!svgRef.value) return
  if (!tooltipRef.value) return
  if (!tooltipRef.value) return
  if (!props.config) return

  const bbox = element.getBBox()
  const centerX = bbox.x + bbox.width / 2
  const centerY = bbox.y + bbox.height / 2

  d3.select(element)
    .transition()
    .duration(100)
    .attr("stroke-width", 1.5);

  // Get region data for tooltip
  const regionDataMap = createRegionDataMap(props.regionData)
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

  const mapColor = createMapColor(props.config, props.regionData)
  const color = mapColor.getBinColor(regionDataMap.get(regionId)?.value)

  // Set tooltip content
  tooltipRef.value
    .style("visibility", "visible")
    .attr(
      "class",
      `absolute max-w-1/3 border-t-[4px] bg-white p-2 pointer-events-none text-sm z-50 ${boxClasses}`
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
    .attr('fill', color)

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
}

function createRegionDataMap(regionData: RegionData[]) {
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

  function getOpacity(color: string) {
    if (!selectedLegendColor) return 1
    return selectedLegendColor === color ? 1 : 0.2
  }

  paths.each(function(this: any, _d: any) {
    const color = d3.select(this).attr('fill')
    const opacityValue = getOpacity(color)
    d3.select(this).attr('fill-opacity', opacityValue)
  })
}

function renderMap() {
  if (!svgRef.value || !props.geojson || !props.config ) {
    return
  }

  const geojsonData = props.geojson
  const regionData = props.regionData
  const idColumnGeojson = props.config.idColumnGeojson
  const config = props.config
  const selectedLegendColor = props.selectedLegendColor

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

  function getColor(d: any) {
    const region = regionDataMap.get(d.properties[idColumnGeojson])
    return mapColor.getBinColor(region?.value)
  }

  function getOpacity(color: string) {
    const selected = selectedLegendColor
    if (!selected) return 1
    return selected === color ? 1 : 0.2
  }

  const correctedGeojson = rewind(geojsonData, true)
  paths = g.selectAll('path')
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
      // Hide tooltip when zooming
      if (activeRegion.value && isMobile.value) {
        paths.each(function(this: SVGPathElement, pathData: any) {
          if (pathData.properties[idColumnGeojson] === activeRegion.value) {
            d3.select(this)
              .transition()
              .duration(100)
              .attr("stroke-width", 0.5)
          }
        })
      }
      hideTooltip()
      paths.style('pointer-events', 'none')
    })
    .on('zoom', (event: any) => {
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
  paths.each(function(this: SVGPathElement, d: any) {
    const color = getColor(d)
    const opacityValue = getOpacity(color)
    d3.select(this)
      .attr('fill', color)
      .attr('fill-opacity', opacityValue)
  })
  paths.on('mouseover', function(this: SVGPathElement, _event: MouseEvent, d: any) {
      // Only handle mouseover on desktop
      if (isMobile.value) return
      const regionId = d.properties[idColumnGeojson]
      showTooltip(this, d, regionId)
    })
    .on('mouseout', function(this: SVGPathElement, _event: MouseEvent, _d: any) {
      // Only handle mouseout on desktop
      if (isMobile.value) return
      d3.select(this)
        .transition()
        .duration(100)
        .attr("stroke-width", 0.5)
      hideTooltip()
    })
    .on('click', function(this: SVGPathElement, event: MouseEvent, d: any) {
      // Only handle click on mobile
      if (!isMobile.value) return
      event.stopPropagation()
      const regionId = d.properties[idColumnGeojson]
      // If clicking the same region, hide tooltip
      if (activeRegion.value === regionId) {
        d3.select(this)
          .transition()
          .duration(100)
          .attr("stroke-width", 0.5)
        hideTooltip()
        return
      }
      // Reset previous active region
      if (activeRegion.value) {
        paths.each(function(this: SVGPathElement, pathData: any) {
          if (pathData.properties[idColumnGeojson] === activeRegion.value) {
            d3.select(this)
              .transition()
              .duration(100)
              .attr("stroke-width", 0.5)
          }
        })
      }
      // Show tooltip for new region
      activeRegion.value = regionId
      showTooltip(this, d, regionId)
    })
}
const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
  for (let _entry of entries) {
    renderMap()
    hideTooltip()
  }
});
onMounted(() => {
  checkIsMobile()
  if (isMobile.value) { console.log("[Map] App running on mobile") }
  resizeObserver.observe(svgRef.value);
  // Hide tooltip when clicking outside on mobile
  if (isMobile.value) {
    document.addEventListener('click', (e: MouseEvent) => {
      if (!svgRef.value?.contains(e.target as Node)) {
        if (activeRegion.value) {
          paths.each(function(this: SVGPathElement, pathData: any) {
            const idColumnGeojson = props.config?.idColumnGeojson ?? ""
            if (pathData.properties[idColumnGeojson] === activeRegion.value) {
              d3.select(this)
                .transition()
                .duration(100)
                .attr("stroke-width", 0.5)
            }
          })
        }
        hideTooltip()
      }
    })
  }
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
