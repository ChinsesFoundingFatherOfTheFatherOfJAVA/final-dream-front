<template>
  <span class="nav-flip">
    <span class="nav-flip__front">{{ text }}</span>
    <span class="nav-flip__back" aria-hidden="true">{{ text }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * 导航项文字的双面载体。
 *
 * 为什么抽成组件：3D 翻转需要「同一文案渲染两次」（正面/背面），抽出来后各导航只改一行模板；
 * 翻转样式统一维护在 assets/styles/nav-motion.scss，不在每个导航里各写一份。
 */
defineProps<{ text: string }>()
</script>
