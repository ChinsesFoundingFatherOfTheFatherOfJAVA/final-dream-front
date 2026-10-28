<template>
  <!-- 截图09：任务类型图标行（圆角方块彩色图标+下方文字）；置灰占位悬浮"功能建设中" -->
  <div class="task-type-bar">
    <el-button
      v-for="item in items"
      :key="item.label"
     
      class="type-item"
      :class="{ disabled: !item.enabled }"
      :title="item.enabled ? '' : '功能建设中'"
      @click="item.enabled && emit('pick', item.type)"
    >
      <span class="type-icon" :style="{ background: item.color }" aria-hidden="true">
        <el-icon><component :is="iconFor(item.type)" /></el-icon>
      </span>
      <span class="type-label">{{ item.label }}</span>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import {
  Box,
  Collection,
  Document,
  EditPen,
  Headset,
  Link,
  MagicStick,
  Monitor,
  Trophy,
  UploadFilled,
  VideoPlay
} from '@element-plus/icons-vue'
import type { Component } from 'vue'
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

const TYPE_ICONS: Record<number, Component> = {
  1: Document,
  2: VideoPlay,
  3: Headset,
  4: Box,
  6: Collection,
  7: Monitor,
  8: Link,
  0: UploadFilled,
  5: MagicStick,
  [-1]: EditPen,
  [-2]: Trophy
}

const iconFor = (type: number) => TYPE_ICONS[type] ?? Document
</script>

<style scoped lang="scss">
.task-type-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
  gap: 14px 12px;
  align-items: start;
  padding: 14px 16px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
}

.task-type-bar > .type-item {
  width: 100%;
  height: 70px;
  min-width: 0;
  margin: 0;
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  border: none;
  background: transparent;
  cursor: pointer;

  .type-icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 9px;
    color: #fff;
    font-size: 19px;
  }

  .type-label {
    color: #4d5568;
    font-size: 12px;
    white-space: nowrap;
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

/* EP 按钮会生成无 scoped 标记的插槽 span，需穿透后改成纵向图标+文字 */
.task-type-bar :deep(.type-item > span) {
  width: 100%;
  display: flex !important;
  flex-direction: column !important;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}
</style>
