<template>
  <div class="simple-node" :class="[data.nodeType, { 'is-selected': selected }]">
    <Handle v-if="data.nodeType !== 'start'" type="target" :position="Position.Top" class="flow-handle" />
    <div class="node-icon">{{ data.nodeType === 'start' ? '▶' : '■' }}</div>
    <div class="node-label">{{ data.label }}</div>
    <span
      v-if="data.deletable !== false"
      class="node-delete-btn nodrag nopan"
      data-deletable="true"
      title="删除该节点"
    >×</span>
    <Handle v-if="data.nodeType !== 'end'" type="source" :position="Position.Bottom" class="flow-handle" />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  id: string
  data: any
  selected?: boolean
}>()
</script>

<style scoped lang="scss">
.simple-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  border: 2px solid transparent;
  position: relative;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);

  &.start {
    background: #f6ffed;
    border-color: #b7eb8f;
    color: #52c41a;
  }

  &.end {
    background: #fff1f0;
    border-color: #ffa39e;
    color: #f5222d;
  }

  &.is-selected {
    box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.2);
  }

  .node-icon { font-size: 12px; }

  .node-delete-btn {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 16px;
    height: 16px;
    line-height: 14px;
    text-align: center;
    border-radius: 50%;
    font-size: 13px;
    color: #999;
    background: #fff;
    border: 1px solid #e8e8e8;
    cursor: pointer;
    opacity: 0;
    transition: all 0.15s;

    &:hover { color: #fff; background: #f5222d; border-color: #f5222d; }
  }

  &:hover .node-delete-btn { opacity: 1; }
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
</style>
