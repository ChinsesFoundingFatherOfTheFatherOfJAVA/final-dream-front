<template>
  <!-- Moving icon（jis3r/icons award → Vue3，MIT）：hover 奖杯摇摆放大 -->
  <div
    class="moving-icon"
    role="img"
    aria-label="AI实战训练场"
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
      class="trophy-icon"
      :class="{ animate: animate }"
      aria-hidden="true"
    >
      <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
      <circle cx="12" cy="8" r="6" />
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

// reduced-motion：不注册动画触发
const reducedMotion = ref(false)
if (typeof window !== 'undefined') {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function handleMouseEnter() {
  if (animate.value || reducedMotion.value) return
  hoverAnimate.value = true
  resetTimer = setTimeout(() => {
    hoverAnimate.value = false
  }, 1000)
}

onUnmounted(() => clearTimeout(resetTimer))
</script>

<style scoped lang="scss">
.moving-icon {
  display: inline-block;
}

.trophy-icon {
  overflow: visible;
  transform-origin: center;
  // 原版 transition:all 违反全站铁律——收敛为具体属性
  transition: transform var(--dur-micro) var(--ease-out);
}

.trophy-icon.animate {
  animation: trophyEnlarge 1s ease;
}

@media (prefers-reduced-motion: reduce) {
  .trophy-icon.animate {
    animation: none;
  }
}

@keyframes trophyEnlarge {
  30% { transform: rotate(20deg) scale(1.2); }
  60% { transform: rotate(-20deg) scale(1.2); }
  100% { transform: rotate(0deg) scale(1); }
}
</style>
