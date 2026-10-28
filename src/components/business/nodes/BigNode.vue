<template>
  <div class="big-node" :class="{ 'is-selected': selected }">
    <!-- 目标连接点（上） -->
    <Handle type="target" :position="Position.Top" class="flow-handle handle-top" />

    <div class="big-node-title">
      <span class="title-dot" :style="{ background: themeColor }" aria-hidden="true"></span>
      <span class="title-text">{{ title }}</span>
      <span
        class="node-delete-btn nodrag nopan"
        :data-deletable="data.deletable === false ? 'false' : 'true'"
        title="删除该节点"
        role="button"
        tabindex="0"
        aria-label="删除该节点"
        @keydown.enter.prevent="synthClick"
      >×</span>
    </div>

    <div class="big-node-body">
      <!-- type 3 学员问陪练者：学员说在上。type 2 仍是陪练者说在上。 -->
      <div
        v-if="studentFirst"
        class="sub-node student-sub"
        :class="{ active: activeSub === 'student' }"
        data-sub="student"
        role="button"
        tabindex="0"
        @keydown.enter.prevent="synthClick"
      >
        <div class="sub-label">
          <span class="label-bar" style="background: #1890ff" aria-hidden="true"></span>
          学员说
        </div>
        <div class="sub-content">{{ data.standardScript || '暂无内容' }}</div>
      </div>

      <!-- 陪练者子节点 -->
      <div
        class="sub-node trainer-sub"
        :class="{ active: activeSub === 'trainer' }"
        data-sub="trainer"
        role="button"
        tabindex="0"
        @keydown.enter.prevent="synthClick"
      >
        <div class="sub-label">
          <span class="label-bar" style="background: #fa8c16" aria-hidden="true"></span>
          陪练者说
        </div>
        <div class="sub-content">{{ data.trainerQuestion || '暂无内容' }}</div>
      </div>

      <div
        v-if="!studentFirst"
        class="sub-node student-sub"
        :class="{ active: activeSub === 'student' }"
        data-sub="student"
        role="button"
        tabindex="0"
        @keydown.enter.prevent="synthClick"
      >
        <div class="sub-label">
          <span class="label-bar" style="background: #1890ff" aria-hidden="true"></span>
          学员说
        </div>
        <div class="sub-content">{{ data.standardScript || '暂无内容' }}</div>
      </div>
    </div>

    <!-- 源连接点（下） -->
    <Handle type="source" :position="Position.Bottom" class="flow-handle handle-bottom" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{
  id: string
  data: any
  selected?: boolean
}>()

const title = computed(() => props.data.nodeTypeTitle || '陪练者问学员说')
const studentFirst = computed(() => props.data.nodeType === 'student_ask' || props.data.nodeType === 3)
const themeColor = computed(() => (studentFirst.value ? '#1890ff' : '#fa8c16'))
const activeSub = computed(() => (props.data.activeSubType as string) || null)

// 键盘 Enter 激活：节点的点击交互由 FlowDesign 以原生 click 事件委托实现，这里合成 click 复用既有链路
const synthClick = (e: KeyboardEvent) => {
  ;(e.currentTarget as HTMLElement | null)?.click()
}
</script>

<style scoped lang="scss">
.big-node {
  width: 260px;
  background: #fff;
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  &.is-selected {
    border-color: #1890ff;
    box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.15);
  }
}

.big-node-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  border-radius: 8px 8px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #333;

  .title-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .title-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.node-delete-btn {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  line-height: 16px;
  text-align: center;
  border-radius: 50%;
  font-size: 14px;
  color: #999;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s, background 0.15s;
  background: transparent;

  &:hover {
    color: #fff;
    background: #f5222d;
  }

  // 节点删除按钮：补键盘焦点环
  &:focus-visible {
    opacity: 1;
    outline: 2px solid #f5222d;
    outline-offset: 2px;
  }
}

.big-node:hover .node-delete-btn {
  opacity: 1;
}

.big-node-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 0 0 8px 8px;
}

.sub-node {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  background: #fff;

  &:hover {
    border-color: #91d5ff;
    background: #f0f9ff;
  }

  // 子节点点击走父级事件委托，此处补键盘焦点环
  &:focus-visible {
    outline: 2px solid #1890ff;
    outline-offset: 2px;
  }

  &.active {
    border-color: #1890ff;
    background: #e6f7ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
  }

  &.trainer-sub.active { border-color: #fa8c16; background: #fff7e6; }

  .sub-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: #333;
    margin-bottom: 6px;

    .label-bar {
      width: 3px;
      height: 12px;
      border-radius: 2px;
    }
  }

  .sub-content {
    font-size: 12px;
    color: #666;
    line-height: 1.5;
    max-height: 36px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

:deep(.flow-handle) {
  width: 12px;
  height: 12px;
  background: #1890ff;
  border: 2px solid #fff;
  border-radius: 50%;
  cursor: crosshair;
  transition: transform 0.15s, background 0.15s;
  z-index: 10;

  &:hover {
    transform: scale(1.35);
    background: #40a9ff;
  }
}

:deep(.handle-top) {
  top: -7px;
}

:deep(.handle-bottom) {
  bottom: -7px;
}
</style>
