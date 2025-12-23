<template>
  <div>
    <label v-if="label" class="block text-gray-700 text-sm font-bold mb-2">
      {{ label }}
    </label>

    <label class="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        class="h-4 w-4 border border-gray-300 rounded bg-white"
        :checked="isChecked"
        @change="onChange"
      />
      <span class="text-sm text-gray-700">
        <slot />
      </span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"

const props = defineProps<{
  defaultValue?: boolean
  label?: string
}>()

const emit = defineEmits<{
  (e: "checkbox-changed", value: boolean): void
}>()

const label = computed(() => props.label ?? "")

const isChecked = ref<boolean>(props.defaultValue ?? false)

function onChange(e: Event) {
  const target = e.target as HTMLInputElement | null
  const checked = target?.checked ?? false
  isChecked.value = checked
  emit("checkbox-changed", isChecked.value)
}

watch(
  () => props.defaultValue,
  (val) => {
    isChecked.value = val ?? false
  }
)
</script>
