<template>
  <div class="fixed inset-0 bg-black/40 z-10" />
  <div class="z-10 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 card-box bg-white p-10
    w-100
    h-80
    max-[485px]:w-[80vw]
    "
  >

  <!-- Close map-selector -->
  <button
    type="button"
    class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer"
    @click="emit('close-map-selector')"
  >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Skeleton while loading OR while configs are not there yet -->
    <template v-if="loading || !configs || !configs.length">
      <div class="h-10 bg-gray-200 rounded animate-pulse mb-4"></div>
      <div class="h-px bg-gray-300 mb-4"></div>
      <div class="space-y-2">
        <div class="h-10 bg-gray-200 rounded-full animate-pulse"></div>
        <div class="h-10 bg-gray-200 rounded-full animate-pulse"></div>
        <div class="h-10 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    </template>

    <template v-else>
      <div class="text-2xl mb-2 font-bold">
        Change map
      </div>
      <hr class="border-t border-gray-300 mb-4" />
      <ul class="space-y-2">
        <li
          v-for="(cfg, index) in configs"
          :key="cfg.mapDescription?.title ?? index"
        >
          <button
            type="button"
            :class="[
              'block w-full text-left text-sm px-4 py-2 rounded-full border',
              isActive(cfg)
                ? 'bg-gray-100 border-black-500 font-semibold'
                : 'border-gray-300 hover:bg-gray-200 cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-gray-400'
            ]"
            @click="handleClick(cfg)"
          >
            {{ cfg.mapDescription?.title ?? `Map ${index + 1}` }}
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { MapConfig } from '../config/types'

interface Props {
  configs?: MapConfig[]
  config?: MapConfig
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const isActive = (cfg: MapConfig) => {
  if (!props.config) return false
  return cfg.mapDescription?.title === props.config.mapDescription?.title
}

const emit = defineEmits<{
  (e: 'select-map', title: string): void
  (e: 'close-map-selector'): void
}>()

function handleClick(cfg: MapConfig) {
  const title = cfg.mapDescription?.title
  if (title && !isActive(cfg)) {
    emit('select-map', title)
  }
}
</script>
