<template>
  <!-- Moving icon（jis3r/icons message-circle-more → Vue3 机械翻译，MIT）：hover 触发气泡抖动+省略号弹跳 -->
  <div
    class="moving-icon"
    role="img"
    aria-label="AI对练"
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
      class="chat-icon"
      :class="{ animate: animate }"
      aria-hidden="true"
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <line x1="16" :y1="line1Y1" x2="16" :y2="line1Y2" />
      <line x1="12" :y1="line2Y1" x2="12" :y2="line2Y2" />
      <line x1="8" :y1="line3Y1" x2="8" :y2="line3Y2" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

// 接口对齐 HallmarkIcon 位：size/color/animated（Svelte $props → defineProps）
const props = withDefaults(defineProps<{
  size?: number
  color?: string
  strokeWidth?: number
  /** true=常驻动画位；false=hover 触发 */
  animated?: boolean
}>(), {
  size: 24,
  color: 'currentColor', // 自动吃 Cobalt 主题色
  strokeWidth: 2,
  animated: false,
})

// Svelte $state → ref；$derived → computed
const hoverAnimate = ref(false)
const animate = computed(() => props.animated || hoverAnimate.value)

// rAF 动画函数：纯 JS 原样保留（jis3r 手写动画核心）
let line1Y1 = ref(12)
let line1Y2 = ref(12)
let line2Y1 = ref(12)
let line2Y2 = ref(12)
let line3Y1 = ref(12)
let line3Y2 = ref(12)

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function animateLine(
  startY1: number,
  startY2: number,
  midY1: number,
  midY2: number,
  endY1: number,
  endY2: number,
  duration: number,
  delay: number,
  callback: (y1: number, y2: number) => void,
): void {
  setTimeout(() => {
    const startTime = performance.now()
    function frame(currentTime: number): void {
      const elapsed = (currentTime - startTime) / 1000
      const progress = Math.min(elapsed / duration, 1)

      let y1: number
      let y2: number
      if (progress < 0.5) {
        const t = progress * 2
        const localEased = easeInOut(t)
        y1 = startY1 + (midY1 - startY1) * localEased
        y2 = startY2 + (midY2 - startY2) * localEased
      } else {
        const t = (progress - 0.5) * 2
        const localEased = easeInOut(t)
        y1 = midY1 + (endY1 - midY1) * localEased
        y2 = midY2 + (endY2 - midY2) * localEased
      }

      callback(y1, y2)

      if (progress < 1) {
        requestAnimationFrame(frame)
      } else {
        callback(endY1, endY2)
      }
    }
    requestAnimationFrame(frame)
  }, delay * 1000)
}

// reduced-motion：动画禁用时不注册 rAF（直接跳过 hover 播放，静态呈现）
const reducedMotion = ref(false)
if (typeof window !== 'undefined') {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function handleMouseEnter() {
  if (animate.value || reducedMotion.value) return
  hoverAnimate.value = true

  animateLine(12, 12, 10.5, 13.5, 12, 12, 0.6, 0.2, (y1, y2) => {
    line1Y1.value = y1
    line1Y2.value = y2
  })
  animateLine(12, 12, 10.5, 13.5, 12, 12, 0.6, 0.1, (y1, y2) => {
    line2Y1.value = y1
    line2Y2.value = y2
  })
  animateLine(12, 12, 10.5, 13.5, 12, 12, 0.6, 0, (y1, y2) => {
    line3Y1.value = y1
    line3Y2.value = y2
  })

  resetTimer = setTimeout(() => {
    hoverAnimate.value = false
  }, 800)
}

let resetTimer: ReturnType<typeof setTimeout> | undefined
// Svelte $effect cleanup → onUnmounted
onUnmounted(() => clearTimeout(resetTimer))
</script>

<style scoped lang="scss">
// Svelte <style> 原样迁移（scoped 等价）
.moving-icon {
  display: inline-block;
}

.chat-icon {
  overflow: visible;
  // transition 只列具体属性
  transition: transform var(--dur-micro) var(--ease-out);
}

.chat-icon.animate {
  animation: chatRotation 0.8s ease-in-out;
  transform-origin: bottom left;
}

@media (prefers-reduced-motion: reduce) {
  .chat-icon.animate {
    animation: none;
  }
}

@keyframes chatRotation {
  0% { transform: rotate(0deg); }
  40% { transform: rotate(8deg); }
  60% { transform: rotate(-8deg); }
  80% { transform: rotate(2deg); }
  100% { transform: rotate(0deg); }
}
</style>
