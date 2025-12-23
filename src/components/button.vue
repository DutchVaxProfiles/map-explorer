<template>
  <div
    class="cursor-pointer"
    :class="{ 'hovered': isHovered, 'selected': isSelected }"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      flexShrink: 0
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="toggleSelected"
  >
    <!-- Background circle (shadow effect) -->
    <div
      class="absolute rounded-full transition-colors duration-100"
      :class="isSelected ? 'bg-[#232323]' : 'bg-[#343434]'"
      :style="{
        left: `${2.5 * scale}px`,
        top: `${3.5 * scale}px`,
        width: `${39 * scale}px`,
        height: `${39 * scale}px`
      }"
    />
    <!-- Main white circle with border -->
    <div
      class="absolute rounded-full transition-all duration-100"
      :class="isSelected ? 'bg-[#eeeeee]' : 'bg-white border-[#343434]'"
      :style="{
        left: isHovered || isSelected ? `${1.5 * scale}px` : 0,
        top: isHovered || isSelected ? `${2.5 * scale}px` : 0,
        width: `${39 * scale}px`,
        height: `${39 * scale}px`,
        borderWidth: `${2 * scale}px`
      }"
    />
    <!-- Icon slot with positioning -->
    <div
      class="absolute pointer-events-none transition-all duration-100 flex items-center justify-center"
      :style="{
        left: isHovered || isSelected ? `${1.5 * scale}px` : 0,
        top: isHovered || isSelected ? `${2.5 * scale}px` : 0,
        width: `${39 * scale}px`,
        height: `${39 * scale}px`
      }"
    >
      <div :style="{ width: `${iconSize * scale}px`, height: `${iconSize * scale}px` }">
        <slot :is-selected="isSelected" :is-hovered="isHovered" :scale="scale" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps({
  size: {
    type: Number,
    default: 42
  },
  modelValue: {
    type: Boolean,
    default: false
  },
  iconSize: {
    type: Number,
    default: 20
  }
})

const emit = defineEmits(['update:modelValue'])

const isHovered = ref(false)

const isSelected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const scale = computed(() => props.size / 42)

const toggleSelected = () => {
  isSelected.value = !isSelected.value
}
</script>
