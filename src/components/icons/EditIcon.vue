<template>
  <!-- Moving icon（jis3r/icons pencil-line → Vue3，MIT）：hover 笔尖摆动写线 -->
  <div
    class="moving-icon"
    role="img"
    aria-label="测练中心"
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
      class="edit-icon"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path
        d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"
        class="pen"
        :class="{ animate: animate }"
      />
      <path d="m15 5 3 3" class="pen" :class="{ animate: animate }" />
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
  }, 1000)
}

onUnmounted(() => clearTimeout(resetTimer))
</script>

<style scoped lang="scss">
.moving-icon {
  display: inline-block;
}

.edit-icon {
  overflow: visible;
}

.pen {
  transform-origin: 16.376px 3.622px;
  transition: transform var(--dur-micro) var(--ease-out);
}

.pen.animate {
  animation: penWiggle 0.5s ease-in-out 2;
}

@media (prefers-reduced-motion: reduce) {
  .pen.animate {
    animation: none;
  }
}

@keyframes penWiggle {
  0%, 100% { transform: rotate(0deg) translate(0px, 0px); }
  25% { transform: rotate(-0.5deg) translate(-1px, 1.5px); }
  75% { transform: rotate(0.5deg) translate(1.5px, -1px); }
}
</style>
