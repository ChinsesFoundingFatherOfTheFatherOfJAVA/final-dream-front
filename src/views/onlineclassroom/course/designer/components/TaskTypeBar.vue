<template>
  <!-- 截图09：任务类型图标行（圆角方块彩色图标+下方文字）；置灰占位悬浮"功能建设中" -->
  <div class="task-type-bar">
    <button
      v-for="item in items"
      :key="item.label"
      type="button"
      class="type-item"
      :class="{ disabled: !item.enabled }"
      :title="item.enabled ? '' : '功能建设中'"
      @click="item.enabled && emit('pick', item.type)"
    >
      <span class="type-icon" :style="{ background: item.color }">{{ item.glyph }}</span>
      <span class="type-label">{{ item.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { TASK_TYPE_ITEMS } from '../model'

/**
 * 任务类型图标行（CS-07a/截图09）。
 * 做=文档1/视频2/音频3/压缩4/SCORM6/HTML7/外链8 + 本地上传（type=0）；
 * 占位置灰=微课5/练习/考试；不显示=讨论/问卷/签署/作业/实战演练（数据源里就不含）。
 * 点击可点项向上抛 pick(type)；type=0 由主页走本地上传（新窗口打开课件发布页）。
 */
const emit = defineEmits<{
  pick: [type: number]
}>()

const items = TASK_TYPE_ITEMS
</script>

<style scoped lang="scss">
.task-type-bar {
  display: flex;
  align-items: flex-start;
  gap: 26px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
}

.type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 58px;
  border: none;
  background: transparent;
  cursor: pointer;

  .type-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 9px;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
  }

  .type-label {
    color: #4d5568;
    font-size: 12px;
  }

  &:hover:not(.disabled) .type-label {
    color: #2e7cf6;
  }

  /* 占位类型：置灰 + 悬浮"功能建设中"（title 属性） */
  &.disabled {
    cursor: not-allowed;

    .type-label {
      color: #b3bac7;
    }
  }
}
</style>
