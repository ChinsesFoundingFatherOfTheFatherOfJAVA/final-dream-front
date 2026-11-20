<template>
  <Transition
    name="x-expand"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @before-leave="onBeforeLeave"
    @leave="onLeave"
    @after-leave="onAfterLeave"
  >
    <slot />
  </Transition>
</template>

<script setup lang="ts">
/**
 * 展开/收起过渡（高度 0 ↔ auto + 淡入淡出）。
 *
 * 为什么必须用 JS 钩子：CSS 无法对 height: auto 做过渡，只能在进入/离开前量出 scrollHeight，
 * 再写成具体像素值交给浏览器过渡，结束后清除内联样式，避免污染后续布局（内容变化时高度要能自适应）。
 *
 * 用法：<ExpandTransition><div v-if="open">…</div></ExpandTransition>
 * 注意：slot 内必须是「单个」根节点，且用 v-if（不是 v-show）。
 */
const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 收起动画期间给 overflow 裁剪，否则子元素会溢出可见 */
const onBeforeEnter = (el: Element) => {
  const node = el as HTMLElement
  node.style.height = '0px'
  node.style.opacity = '0'
  node.style.overflow = 'hidden'
}

const onEnter = (el: Element) => {
  const node = el as HTMLElement
  if (reduceMotion()) {
    node.style.height = ''
    node.style.opacity = ''
    return
  }
  const target = node.scrollHeight
  node.style.transition =
    'height var(--dur-short) var(--ease-out), opacity var(--dur-short) var(--ease-out)'
  // 下一帧再改目标值，否则起始高度 0 与目标值同帧写入会被合并、看不到过渡
  requestAnimationFrame(() => {
    node.style.height = `${target}px`
    node.style.opacity = '1'
  })
}

const clearInline = (el: Element) => {
  const node = el as HTMLElement
  node.style.transition = ''
  node.style.height = ''
  node.style.overflow = ''
  node.style.opacity = ''
}

const onAfterEnter = clearInline

const onBeforeLeave = (el: Element) => {
  const node = el as HTMLElement
  node.style.height = `${node.scrollHeight}px`
  node.style.overflow = 'hidden'
}

const onLeave = (el: Element) => {
  const node = el as HTMLElement
  if (reduceMotion()) {
    node.style.height = '0px'
    node.style.opacity = '0'
    return
  }
  node.style.transition =
    'height var(--dur-short) var(--ease-out), opacity var(--dur-short) var(--ease-out)'
  // 读数强制一次回流，确保浏览器以「内容高度」为起点开始过渡
  void node.offsetHeight
  requestAnimationFrame(() => {
    node.style.height = '0px'
    node.style.opacity = '0'
  })
}

const onAfterLeave = clearInline
</script>
