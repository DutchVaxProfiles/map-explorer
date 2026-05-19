<template>
  <div
    class="absolute top-0 left-full ml-2 p-5 bg-white card-box
      w-[550px]
      max-[685px]:w-[80vw]
      max-[685px]:left-0
      max-[685px]:top-full
      max-[685px]:ml-0
      max-[685px]:mt-2"
  >
    <!-- Show skeleton while loading OR while config is not there yet -->
    <template v-if="loading || !config">
      <div class="h-8 bg-gray-200 rounded animate-pulse mb-4 w-3/4"></div>
      <div class="space-y-2 mb-4">
        <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div class="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
        <div class="h-4 bg-gray-200 rounded animate-pulse w-4/5"></div>
      </div>
      <div class="h-4 bg-gray-200 rounded animate-pulse w-1/3 ml-auto"></div>
    </template>

    <!-- Only runs when config is defined -->
    <template v-else>
      <div class="text-24 underline underline-offset-8 mb-2 font-bold">
        {{ config.mapDescription.title }}
      </div>
      <div class="text-[14px]" v-html="config.mapDescription.description"></div>
      <p class="float-right text-sm text-gray-600">
        made with ♡ by
        <a
          href="https://odissei-soda.nl/"
          class="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          @sodascience
        </a>
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { MapConfig } from '../map-config/types'

interface Props {
  config?: MapConfig
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false
})
</script>
