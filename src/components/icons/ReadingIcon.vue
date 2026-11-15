<template>
  <!-- Moving icon（jis3r/icons book-check → Vue3，MIT）：hover 书本摇动+对勾描画 -->
  <div
    class="moving-icon"
    role="img"
    aria-label="在线课堂"
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
      class="reading-icon"
      :class="{ animate: animate }"
      aria-hidden="true"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
      <path d="m9 9.5 2 2 4-4" class="check-path" />
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
  }, 700)
}

onUnmounted(() => clearTimeout(resetTimer))
</script>

<style scoped lang="scss">
.moving-icon {
  display: inline-block;
}

.reading-icon {
  overflow: visible;
}

.check-path {
  stroke-dasharray: 9;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0.125s ease-out, opacity 0.125s ease-out;
}

.reading-icon.animate {
  animation: bookAnimation 0.6s ease forwards;
}

.reading-icon.animate .check-path {
  animation: checkAnimation 0.5s ease-out backwards;
}

@media (prefers-reduced-motion: reduce) {
  .reading-icon.animate,
  .reading-icon.animate .check-path {
    animation: none;
  }
}

@keyframes bookAnimation {
  0% { transform: scale(1) rotate(0deg) translateY(0); }
  20% { transform: scale(1.04) rotate(-8deg) translateY(-2px); }
  50% { transform: scale(1.04) rotate(8deg) translateY(-2px); }
  80% { transform: scale(1.04) rotate(-8deg) translateY(-2px); }
  100% { transform: scale(1) rotate(0deg) translateY(0); }
}
@keyframes checkAnimation {
  0% { stroke-dashoffset: 9; opacity: 0; }
  33% { stroke-dashoffset: 9; opacity: 0; }
  100% { stroke-dashoffset: 0; opacity: 1; }
}
</style>
