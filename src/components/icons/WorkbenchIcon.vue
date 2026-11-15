<template>
  <!-- Moving icon（jis3r/icons grid-2x2-check → Vue3，MIT）：hover 网格+对勾描画 -->
  <div
    class="moving-icon"
    role="img"
    aria-label="工作台"
    @mouseenter="handleMouseEnter"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="workbench-icon"
      :class="{ animate: animate }"
      aria-hidden="true"
    >
      <path d="M12 3v17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H3" />
      <path d="m16 19 2 2 4-4" class="check-path" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  size?: number
  color?: string
  strokeWidth?: number
  animated?: boolean
}>(), {
  size: 24,
  color: 'currentColor',
  strokeWidth: 2,
  animated: false,
})

const hoverAnimate = ref(false)
const animate = computed(() => props.animated || hoverAnimate.value)
let resetTimer: ReturnType<typeof setTimeout> | undefined

const reducedMotion = ref(false)
if (typeof window !== 'undefined') {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function handleMouseEnter() {
  if (animate.value || reducedMotion.value) return
  hoverAnimate.value = true
  resetTimer = setTimeout(() => {
    hoverAnimate.value = false
  }, 500)
}

onUnmounted(() => clearTimeout(resetTimer))
</script>

<style scoped lang="scss">
.moving-icon {
  display: inline-block;
}

.workbench-icon {
  overflow: visible;
}

.check-path {
  stroke-dasharray: 9;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0.125s ease-out, opacity 0.125s ease-out;
}

.workbench-icon.animate .check-path {
  animation: checkAnimation 0.5s ease-out backwards;
}

@media (prefers-reduced-motion: reduce) {
  .workbench-icon.animate .check-path {
    animation: none;
  }
}

@keyframes checkAnimation {
  0% { stroke-dashoffset: 9; opacity: 0; }
  33% { stroke-dashoffset: 9; opacity: 0; }
  100% { stroke-dashoffset: 0; opacity: 1; }
}
</style>
