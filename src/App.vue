<template>
  <div class="items-center justify-center h-screen w-full h-screen flex">
    <div class="w-full h-screen flex">
      <!-- Map container -->
      <div class="flex-1 flex flex-col p-2 bg-gray-50 border border-gray-300 rounded relative">

        <!-- Loading App -->
        <div v-if="isLoading"
          class="w-full h-full flex items-center justify-center
            animate-[pulse_2s_ease-in-out_infinite]
          "
        >
          <LoadingMap />
        </div>
        <!-- Map -->
        <div v-else class="w-full h-full flex flex-col">
          <div class="flex-1">
            <Map
              :geojson="geojsonData"
              :regionData="regionData"
              :config="config"
              :selectedLegendColor="selectedLegendColor"
            />
          </div>
        </div>

        <!-- Map information -->
        <div class="absolute top-4 left-4">
          <Button v-model="showInfo">
            <InformationIcon />
          </Button>
          <div v-show="showInfo" >
            <MapDescription
              :config="config"
              :loading="isLoading"
            />
          </div>
        </div>

        <!-- Legend -->
        <div class="fixed bottom-4 left-4">
          <Button v-model="showLegend">
            <BarchartIcon />
          </Button>
          <div
            class="absolute bottom-0 ml-2 left-full w-100 h-25 card-box bg-white
             w-100
             max-[485px]:w-[80vw]
             max-[485px]:bottom-full
             max-[485px]:left-0
             max-[485px]:mb-2
             overflow-hidden"
            v-show="showLegend"
          >
            <LegendHistogram
              :regionData="regionData"
              :config="config"
              :loading="isLoading"
              @selected-legend-color="handleSelectedLegendColorChanged"
            />
          </div>
        </div>

        <!-- Map Selector -->
        <div class="absolute top-4 right-18" v-if="configs.length > 1">
          <Button v-model="showMapSelector">
            <SwitchIcon />
          </Button>
        </div>

        <div v-show="showMapSelector">
            <MapSelector
              :configs="configs"
              :config="config"
              :loading="isLoading"
              @select-map="handleSwitchMap"
              @close-map-selector="handleCloseMapSelector"
          />
        </div>

        <!-- Control Panel -->
        <div class="absolute top-4 right-4">
          <Button v-model="showControls">
            <SettingsIcon />
          </Button>
          <div
            class="absolute top-full right-0 mt-2 overflow-y-auto card-box bg-white w-75 max-h-[80dvh]"
            v-show="showControls"
          >
            <ControlPanel
              :availableFilterOptions="availableFilterOptions"
              :config="config"
              :loading="isLoading"
              @filter-changed="handleFilterChanged"
              @map-config-changed="handleMapColorConfigChanged"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue"

// icons
import BarchartIcon from "./components/icons/BarchartIcon.vue"
import SettingsIcon from "./components/icons/SettingsIcon.vue"
import InformationIcon from "./components/icons/InformationIcon.vue"
import SwitchIcon from "./components/icons/SwitchIcon.vue"
import LoadingMap from "./components/icons/LoadingMap.vue"

// components
import Map from "./components/map.vue"
import LegendHistogram from "./components/legend-histogram.vue"
import ControlPanel from "./components/control-panel.vue"
import MapDescription from "./components/map-description.vue"
import MapSelector from "./components/map-selector.vue"
import Button from "./components/button.vue"

import type { RegionData } from "./processors/types"
import { Processor } from "./processors/processor"
import { mapConfigs } from "./config/loader"
import type { MapConfig } from "./config/types"
import { MapManager } from "./mapManager"
import type { GeoJSON } from "geojson"

// --- UI toggles ---
const showInfo = ref(false)
const showLegend = ref(true)
const showControls = ref(false)
const showMapSelector = ref(false)

// App state
const dataProcessor = ref<Processor | undefined>(undefined)
const geojsonData = ref<GeoJSON | undefined>(undefined)
const regionData = ref<RegionData[] | undefined>(undefined)
const selectedLegendColor = ref<string>("")
const config = ref<MapConfig | undefined>(undefined)
const configs = ref<MapConfig[]>([])

// Filter state
const availableFilterOptions = ref<{ [key: string]: string[] }>({})
const selectedFilters = ref<{ [key: string]: string }>({})

// UI state
const isLoading = ref(true)

// Map manager instance
const mapManager = new MapManager()


function updateCurrentConfigInConfigs() {
  if (!config.value) return

  const currentTitle = config.value.mapDescription.title
  const idx = configs.value.findIndex(
    c => c.mapDescription.title === currentTitle
  )

  if (idx !== -1) {
    // Replace the entry to keep reactivity and ensure MapManager sees updated config
    configs.value[idx] = { ...config.value }
  }
}

// Map control handlers
async function handleSwitchMap(mapTitle: string) {
  if (configs.value.length === 0) return

  isLoading.value = true
  showMapSelector.value = false

  // Store Cache
  handleMapConfigChanged("filter", selectedFilters.value)
  updateCurrentConfigInConfigs()
  mapManager.updateCachedState(config.value, {
    regionData: regionData.value ?? [],
    selectedFilters: { ...selectedFilters.value },
    availableFilterOptions: { ...availableFilterOptions.value }
  })

  const nextConfig = configs.value.find(
    c => c.mapDescription.title === mapTitle
  )

  if (nextConfig) {
    await applyMap(nextConfig)
  }
  isLoading.value = false
}

async function applyMap(mapConfig: MapConfig) {
  console.log("[App] Switching to map:", mapConfig.mapDescription.title)

  const state = await mapManager.getMapState(mapConfig)

  console.log("========================")
  console.log(state.validFilters)
  console.log("========================")
  // Update current config and reactive refs
  config.value = mapConfig
  geojsonData.value = state.geojsonData
  dataProcessor.value = state.dataProcessor
  regionData.value = state.regionData
  availableFilterOptions.value = { ...state.availableFilterOptions }
  selectedFilters.value = { ...state.selectedFilters }
}

function handleFilterChanged(categoryName: string, value: any) {
  selectedFilters.value[categoryName] = value
}

function handleSelectedLegendColorChanged(color: string) {
  if (color) console.log("[App] selected legend color changed to:", color)
  selectedLegendColor.value = color
}

function handleMapColorConfigChanged(value: any) {
  console.log("[App] map color config changed to:", value)
  if (!config.value) return
  config.value = {
    ...config.value,
    mapColorConfig: value
  }
  resetSelectedLegendColor()
}

function handleMapConfigChanged(key: string, value: any) {
  console.log(`[App] map config changed key: ${key} to value: `, value)
  if (!config.value) return
  config.value = {
    ...config.value,
    [key]: value
  }
}

function handleCloseMapSelector() {
  console.log("[App] Map selector closed")
  showMapSelector.value = false
}


// App initialization
async function initializeApp() {
  console.log("[App] App Initializing")
  configs.value = mapConfigs

  if (configs.value.length === 0) throw new Error("[App] No valid configs available")

  // Load first map
  await applyMap(configs.value[0])
  isLoading.value = false
  console.log("[App] App initialized")
}

// Watch filter: if filter changed, query new data
watch(
  selectedFilters,
  async () => {
    if (!isLoading || !dataProcessor.value || !config.value) {
      console.log("[App] Filter did not change")
      return
    }
    console.log("[App] Filter changed, querying new data")

    regionData.value = await dataProcessor.value.getRegionData(
      selectedFilters.value,
      config.value.idColumnDataFile,
      config.value.valueColumn
    )

  },
  { deep: true }
)

onMounted(async () => {
  await initializeApp()
})

// helpers
function resetSelectedLegendColor() {
  selectedLegendColor.value = ""
}
</script>

