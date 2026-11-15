<template>
  <!--
    HallmarkIcon — A 级位动效图标（Lordicon 免费档，本地 JSON 托管）
    - 依赖就位：渲染 <lord-icon>，hover 触发（state:hover）或 CTA 播一次（state:morph）
    - 依赖缺失/JSON 未就位：降级为静态 EP 图标（同义 nearest），页面不空白
    - reduced-motion：静态首帧，不注册动画
  -->
  <span class="hallmark-icon" :style="{ width: size + 'px', height: size + 'px' }">
    <lord-icon
      v-if="ready"
      ref="lordRef"
      :src="''"
      :trigger="triggerAttr"
      :colors="colorsAttr"
      :state="stateAttr"
      :style="{ width: size + 'px', height: size + 'px' }"
      aria-hidden="true"
    />
    <el-icon v-else :size="size" class="fallback-glyph" aria-hidden="true">
      <component :is="fallbackIcon" />
    </el-icon>
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, type Component } from 'vue'
import {
  ChatDotRound, Trophy, EditPen, Reading, Menu, Collection,
} from '@element-plus/icons-vue'
import {
  loadIconJson, resolveTokenColor, prefersReducedMotion, isLordiconAvailable,
  type HallmarkIconName, type HallmarkIconColors,
} from '@/utils/hallmark-icon'

const props = withDefaults(defineProps<{
  icon: HallmarkIconName
  /** hover=悬停触发播放；morph=挂载后播一次再 hover 循环（关键 CTA 口径） */
  state?: 'hover' | 'morph'
  size?: number
  colors?: HallmarkIconColors
}>(), {
  state: 'hover',
  size: 24,
  colors: () => ({}),
})

/** JSON 未就位/依赖缺失时的静态降级映射（EP 图标同义 nearest） */
const FALLBACK: Record<HallmarkIconName, Component> = {
  chat: ChatDotRound,
  trophy: Trophy,
  edit: EditPen,
  reading: Reading,
  workbench: Menu,
  course: Collection,
}
const fallbackIcon = computed(() => FALLBACK[props.icon])

const ready = ref(false)
const lordRef = shallowRef<{ instance?: { destroy?: () => void } } | null>(null)
let destroyFn: (() => void) | null = null

const triggerAttr = computed(() => (props.state === 'morph' ? 'in' : 'hover'))
const stateAttr = computed(() => (props.state === 'morph' ? 'morph-static-in' : undefined))
const colorsAttr = computed(() => {
  const primary = props.colors.primary ?? resolveTokenColor('--color-accent', 'oklch(52% 0.185 258)')
  const secondary = props.colors.secondary ?? resolveTokenColor('--color-accent-2', 'oklch(76% 0.13 254)')
  return `primary:${primary},secondary:${secondary}`
})

onMounted(async () => {
  // reduced-motion：不点亮动效，静态降级（EP 图标），符合全站基线
  if (prefersReducedMotion()) return
  const json = await loadIconJson(props.icon)
  if (!json) return // 素材未就位：降级
  // 依赖已就位（t26 收尾）：静态 import 同时完成 lord-icon web component 注册
  await import('@lordicon/element')
  ready.value = true
})

onUnmounted(() => {
  destroyFn?.()
  destroyFn = null
})

defineExpose({ fallbackIcon })
</script>

<style scoped lang="scss">
.hallmark-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.fallback-glyph {
  color: var(--color-accent-ink);
}
</style>
