<template>
    <section class="bg-white">
      <div class="p-4 space-y-6">
        <!-- Loading Skeleton -->
        <div v-if="loading || !config" class="space-y-6">
          <div>
            <div class="h-4 bg-gray-200 rounded animate-pulse mb-3 w-24"></div>
            <div class="space-y-4">
              <div v-for="i in 3" :key="i" class="space-y-2">
                <div class="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                <div class="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          <div>
            <div class="h-4 bg-gray-200 rounded animate-pulse mb-3 w-24"></div>
            <div class="space-y-4">
              <div class="space-y-2">
                <div class="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
                <div class="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div class="flex items-center gap-2">
                <div class="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                <div class="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actual Content -->
        <div v-else class="space-y-6">
          <!-- Region level (which map) -->
          <div v-if="mapTitles.length > 1">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-3">
              Region level
            </h3>
            <Selection
              :label="'Map'"
              :options="mapTitles"
              :defaultValue="currentMapTitle"
              @selection-changed="handleSelectMap"
            />
          </div>

          <!-- What the map shows: a profile group, optionally broken down by one variable -->
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-3">
              Choose what the map shows
            </h3>

            <div class="space-y-4">
              <Selection
                :label="getFilterLabel('profile')"
                :options="profileOptions"
                :defaultValue="selectedProfile"
                :optionLabels="getFilterOptionLabels('profile')"
                @selection-changed="handleProfileChanged"
              />

              <Selection
                v-if="demographicColumns.length"
                :label="'Break down by'"
                :options="breakdownOptions"
                :defaultValue="selectedBreakdown"
                :optionLabels="breakdownLabels"
                @selection-changed="handleBreakdownChanged"
              />

              <Selection
                v-if="selectedBreakdown !== NO_BREAKDOWN"
                :label="getFilterLabel(selectedBreakdown)"
                :options="valueOptions"
                :defaultValue="selectedValue"
                :optionLabels="valueLabels"
                @selection-changed="handleValueChanged"
              />
            </div>

            <p class="text-xs text-gray-500 italic mt-2">
              The data supports one breakdown at a time, so only a single variable can be
              selected.
            </p>
          </div>

          <!-- Colour and legend -->
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-3">
              Colour and legend
            </h3>

            <Selection
              :label="'Colour scale'"
              :options="schemeNames"
              :defaultValue="config.mapColorConfig?.colorScheme"
              :optionLabels="schemeLabels"
              @selection-changed="handleColorSchemeChanged"
            />

            <Checkbox
              class="mt-3"
              label="Fit legend to selected group"
              :defaultValue="config.mapColorConfig?.dynamic"
              @checkbox-changed="handleDynamicLegendChanged"
            >
              Calculate the minimum and maximum from the current selection
            </Checkbox>

            <InputField
              class="mt-3"
              label="Minimum share (%)"
              :defaultValue="config.mapColorConfig?.minValue"
              :disabled="config.mapColorConfig?.dynamic"
              placeholder="0.00"
              @input-changed="handleLegendMinimumChanged"
            />

            <InputField
              class="mt-3"
              label="Maximum share (%)"
              :defaultValue="config.mapColorConfig?.maxValue"
              :disabled="config.mapColorConfig?.dynamic"
              placeholder="1.00"
              @input-changed="handleLegendMaximumChanged"
            />
          </div>
        </div>
      </div>
    </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Selection from './selection.vue'
import Checkbox from './checkbox.vue'
import InputField from './input-field.vue'
import { colorSchemes, colorSchemeLabels } from '../map-config/types.ts'
import type { MapConfig } from '../map-config/types.ts'

const schemeNames: string[] = [...colorSchemes]
const schemeLabels: Record<string, string> = colorSchemeLabels

// Synthetic "no breakdown" option, and the pipeline's marker for an unfiltered category.
const NO_BREAKDOWN = '__none__'
const INACTIVE = 'All'

const props = defineProps<{
  availableFilterOptions?: Record<string, string[]>
  config?: MapConfig
  configs?: MapConfig[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'filters-changed', filters: Record<string, string>): void
  (e: 'map-config-changed', value: Record<string, unknown>): void
  (e: 'select-map', title: string): void
}>()

// --- Region level (which map) ---
const mapTitles = computed(() => (props.configs ?? []).map(c => c.mapDescription.title))
const currentMapTitle = computed(() => props.config?.mapDescription.title ?? '')

function handleSelectMap(title: string) {
  if (title && title !== currentMapTitle.value) emit('select-map', title)
}

// --- Filters ---
// `profile` is always present and never "All"; the remaining category columns are demographic
// breakdowns, of which the dataset only ever holds one at a time (single-variable marginals).
const demographicColumns = computed(() =>
  (props.config?.categoryColumns ?? []).filter(c => c !== 'profile')
)
const profileOptions = computed(() => props.availableFilterOptions?.profile ?? [])

const selectedProfile = ref<string>('')
const selectedBreakdown = ref<string>(NO_BREAKDOWN)
const selectedValue = ref<string>('')

const breakdownOptions = computed(() => [NO_BREAKDOWN, ...demographicColumns.value])
const breakdownLabels = computed(() => {
  const labels: Record<string, string> = { [NO_BREAKDOWN]: 'None (overall)' }
  for (const col of demographicColumns.value) labels[col] = getFilterLabel(col)
  return labels
})

// Concrete values for the chosen breakdown variable, minus the "All" marker.
const valueOptions = computed(() => {
  if (selectedBreakdown.value === NO_BREAKDOWN) return []
  return (props.availableFilterOptions?.[selectedBreakdown.value] ?? []).filter(
    v => v !== INACTIVE
  )
})
const valueLabels = computed(() => getFilterOptionLabels(selectedBreakdown.value))

function getFilterLabel(categoryName: string): string {
  return props.config?.categoryLabels?.[categoryName] || categoryName
}
function getFilterOptionLabels(categoryName: string): Record<string, string> {
  return props.config?.categoryOptionLabels?.[categoryName] || {}
}

// Re-sync only when the active map changes (its title) — deliberately NOT a deep watch on
// the whole config: that reran on every colour/legend tweak and wiped the chosen filters.
// Selections that are still valid are kept, so they also persist across map switches.
watch(
  () => props.config?.mapDescription.title,
  () => syncSelection(),
  { immediate: true }
)

function syncSelection() {
  if (!props.config) return
  const filter = props.config.filter ?? {}

  // Keep the current choice when it is still valid on this map; otherwise fall back to the
  // map's configured default.
  if (!profileOptions.value.includes(selectedProfile.value)) {
    selectedProfile.value = filter.profile ?? profileOptions.value[0] ?? ''
  }

  if (!breakdownOptions.value.includes(selectedBreakdown.value)) {
    // A demographic with a non-"All" default counts as the initially active breakdown.
    const active = demographicColumns.value.find(
      col => filter[col] !== undefined && filter[col] !== INACTIVE
    )
    selectedBreakdown.value = active ?? NO_BREAKDOWN
    selectedValue.value = active !== undefined ? filter[active] : ''
  } else if (
    selectedBreakdown.value !== NO_BREAKDOWN &&
    !valueOptions.value.includes(selectedValue.value)
  ) {
    selectedValue.value = valueOptions.value[0] ?? ''
  }

  emitFilters()
}

function buildFilters(): Record<string, string> {
  const filters: Record<string, string> = {}
  for (const col of demographicColumns.value) filters[col] = INACTIVE
  filters.profile = selectedProfile.value
  if (selectedBreakdown.value !== NO_BREAKDOWN && selectedValue.value) {
    filters[selectedBreakdown.value] = selectedValue.value
  }
  return filters
}

function emitFilters() {
  emit('filters-changed', buildFilters())
}

function handleProfileChanged(value: string) {
  selectedProfile.value = value
  emitFilters()
}

function handleBreakdownChanged(value: string) {
  selectedBreakdown.value = value
  // Default to the first concrete value of the newly chosen breakdown variable.
  selectedValue.value = value === NO_BREAKDOWN ? '' : valueOptions.value[0] ?? ''
  emitFilters()
}

function handleValueChanged(value: string) {
  selectedValue.value = value
  emitFilters()
}

// --- Colour and legend ---
function handleMapConfigChange(field: string, value: unknown) {
  if (!props.config) return
  emit('map-config-changed', { ...props.config.mapColorConfig, [field]: value })
}
function handleColorSchemeChanged(value: string) {
  handleMapConfigChange('colorScheme', value)
}
function handleDynamicLegendChanged(value: boolean) {
  handleMapConfigChange('dynamic', value)
}
function handleLegendMinimumChanged(value: number) {
  handleMapConfigChange('minValue', value)
}
function handleLegendMaximumChanged(value: number) {
  handleMapConfigChange('maxValue', value)
}
</script>
