<template>
  <!--
    AI 演员头像：后端按角色属性定图（actorAvatarUrl），前端只负责展示与降级。
    src 为空表示后端没定到图（老主题 / 降级链全不命中），直接走首字占位；
    图片 404 / URL 过期时也必须回退首字，不能留破图图标（设计 §9.1 U1/U2/U3）。
    尺寸与圆型裁切由调用方的 class 决定（父组件的 scoped 样式负责），本组件不掺布局。
  -->
  <img v-if="src && !failed" :src="src" :alt="altText" decoding="async" @error="onError" />
  <span v-else>{{ initial }}</span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 已补全的图片地址（调用方负责 resolveAssetUrl）；空串 = 无图 */
    src?: string | null
    /** 角色名，用于取首字占位与 alt */
    name?: string | null
  }>(),
  { src: '', name: '' },
)

/** 加载失败标记：同一实例失败一次后固定回退首字，不再反复重试坏 URL */
const failed = ref(false)

/** 地址变化时复位，避免「上一个 URL 失败」把新图也一并回退掉 */
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)

function onError() {
  failed.value = true
}

/** 与既有占位口径一致：无角色名时显示 AI（准备页/运行态此前都这么兜底） */
const initial = computed(() => (props.name ? props.name.slice(0, 1) : 'AI'))
const altText = computed(() => `${props.name || 'AI 演员'}的头像`)
</script>

<style scoped>
/*
 * 尺寸/底色/字号全部由调用方的类提供（准备页 40px、右侧角色卡 32px、运行时 168px），
 * 组件只管「图片怎么铺进圆框」：cover 保证方图裁圆不变形，display:block 去掉 img 行内基线间隙。
 */
img {
  display: block;
  object-fit: cover;
}
</style>
