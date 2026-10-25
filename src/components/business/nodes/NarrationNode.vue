<template>
  <!-- v1.2 旁白节点：紫色主题、单文本区（无陪练者/学员双气泡）；渲染与连线能力同 BigNode -->
  <div class="narration-node" :class="{ 'is-selected': selected }">
    <Handle type="target" :position="Position.Top" class="flow-handle handle-top" />

    <div class="narration-title">
      <span class="title-dot" aria-hidden="true"></span>
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

    <div class="narration-body">
      <div class="narration-text">{{ data.narration || '点击节点编辑旁白内容' }}</div>
    </div>

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

const title = computed(() => props.data.nodeTypeTitle || '旁白')

// 键盘 Enter 激活：节点的点击交互由 FlowDesign 以原生 click 事件委托实现，这里合成 click 复用既有链路
const synthClick = (e: KeyboardEvent) => {
  ;(e.currentTarget as HTMLElement | null)?.click()
}
</script>

<style scoped lang="scss">
.narration-node {
  width: 260px;
  background: #fff;
  border: 2px solid #d3c8ff;
  border-radius: 10px;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(114, 46, 209, 0.1);
  position: relative;

  &:hover {
    box-shadow: 0 4px 16px rgba(114, 46, 209, 0.18);
  }

  &.is-selected {
    border-color: #722ed1;
    box-shadow: 0 0 0 3px rgba(114, 46, 209, 0.15);
  }
}

.narration-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f9f7ff;
  border-bottom: 1px solid #e8e2ff;
  border-radius: 8px 8px 0 0;

  .title-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #722ed1;
    flex-shrink: 0;
  }

  .title-text {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: #5c3d8f;
  }

  .node-delete-btn {
    cursor: pointer;
    color: #bbb;
    font-size: 15px;
    line-height: 1;

    &:hover { color: #ff4d4f; }

    // 节点删除按钮：补键盘焦点环
    &:focus-visible { outline: 2px solid #722ed1; outline-offset: 2px; }
  }
}

.narration-body {
  padding: 10px 12px;

  .narration-text {
    font-size: 12px;
    color: #666;
    line-height: 1.7;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 20px;

    &:empty::before { content: '点击节点编辑旁白内容'; color: #ccc; }
  }
}

.flow-handle {
  width: 10px;
  height: 10px;
  background: #722ed1;
  border: 2px solid #fff;
}
</style>
