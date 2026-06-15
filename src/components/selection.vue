<template>
  <div>
    <label v-if="label" class="block text-gray-700 text-sm font-bold mb-2">
      {{ label }}
    </label>
    <select
      class="w-full p-2 rounded border border-gray-300 bg-white"
      v-model="selectedValue"
      @change="emitSelection"
    >
      <option
        v-for="option in options"
        :key="option"
        :value="option"
      >
        {{ optionLabels[option] || option }}{{ warningOptions.includes(option) ? ' (no data)' : '' }}
      </option>
    </select>
  </div>
</template>
<script setup lang="ts">

import { ref, watch } from "vue"

const props = withDefaults(
  defineProps<{
    options: string[]
    label: string
    defaultValue?: string | null
    optionLabels?: Record<string, string>
    warningOptions?: string[]
  }>(),
  {
    optionLabels: () => ({}),
    warningOptions: () => []
  }
)

const emit = defineEmits<{
  (e: "selection-changed", value: string): void
}>()

function resolveSelectedValue(): string {
  if (
    props.defaultValue !== undefined &&
    props.defaultValue !== null &&
    props.options.includes(props.defaultValue)
  ) {
    return props.defaultValue
  }

  return props.options[0] ?? ""
}

const selectedValue = ref<string>(resolveSelectedValue())

watch(
  () => [props.defaultValue, props.options],
  () => {
    selectedValue.value = resolveSelectedValue()
  },
  { deep: true }
)

function emitSelection() {
  emit("selection-changed", selectedValue.value)
}
</script>
