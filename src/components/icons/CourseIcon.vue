<template>
  <!-- Moving icon（jis3r/icons book-marked → Vue3，MIT）：hover 书签书摇摆（course 语义，jis3r 无 graduation-cap 的替代） -->
  <div
    class="moving-icon"
    role="img"
    aria-label="课程内容"
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
      class="course-icon"
      :class="{ animate: animate }"
      aria-hidden="true"
    >
      <path d="M10 2v8l3-3 3 3V2" />
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
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
  }, 600)
}

onUnmounted(() => clearTimeout(resetTimer))
</script>

<style scoped lang="scss">
.moving-icon {
  display: inline-block;
}

.course-icon {
  overflow: visible;
}

.course-icon.animate {
  animation: courseAnimation 0.6s ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .course-icon.animate {
    animation: none;
  }
}

@keyframes courseAnimation {
  0% { transform: scale(1) rotate(0deg) translateY(0); }
  20% { transform: scale(1.04) rotate(-8deg) translateY(-2px); }
  50% { transform: scale(1.04) rotate(8deg) translateY(-2px); }
  80% { transform: scale(1.04) rotate(-8deg) translateY(-2px); }
  100% { transform: scale(1) rotate(0deg) translateY(0); }
}
</style>
