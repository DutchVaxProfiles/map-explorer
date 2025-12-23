<template>
  <div>
    <label v-if="label" class="block text-gray-700 text-sm font-bold mb-2">
      {{ label }}
    </label>

    <input
      type="number"
      :value="inputText"
      @input="onInput"
      :placeholder="placeholder"
      :step="step"
      :disabled="disabled"
      class="h-9 px-3 py-2 border border-gray-300 rounded bg-white text-sm text-gray-700 focus:outline-none focus:border-gray-400 w-full disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from "vue"

type Emits = {
  (e: "input-changed", value: number): void
}

const props = defineProps<{
  defaultValue?: number
  label?: string
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<Emits>()

function leastSignificantPlace(n: number): number {
  if (!Number.isFinite(n)) return 1
  if (n === 0) return 1

  const str = n.toString()
  const decimalIndex = str.indexOf(".")
  if (decimalIndex === -1) {
    const match = str.match(/0+$/)
    const zeros = match ? match[0].length : 0
    return 10 ** zeros
  }

  const trimmed = str.replace(/0+$/, "")
  const decimals = trimmed.length - 1 - decimalIndex
  return 10 ** -decimals
}

function isValidNumberString(s: string): boolean {
  const t = s.trim()
  if (t === "") return false
  const n = Number(t)
  return Number.isFinite(n)
}

const inputText = ref(props.defaultValue != null ? String(props.defaultValue) : "")
const inputValue = ref<number | undefined>(props.defaultValue)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 500

function clearDebounce() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  const raw = target.value

  inputText.value = raw

  clearDebounce()
  debounceTimer = setTimeout(() => {
    if (!isValidNumberString(raw)) {
      inputValue.value = undefined
      return
    }

    const parsed = Number(raw)
    inputValue.value = parsed
    emit("input-changed", parsed)
  }, DEBOUNCE_MS)
}

watch(
  () => props.defaultValue,
  (val) => {
    inputValue.value = val
    inputText.value = val != null ? String(val) : ""
  }
)

onBeforeUnmount(() => {
  clearDebounce()
})

const step = computed(() =>
  inputValue.value != null ? leastSignificantPlace(inputValue.value) : 1
)
</script>

