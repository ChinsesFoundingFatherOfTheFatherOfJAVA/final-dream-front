<template>
  <!-- 全局确认弹窗：confirmDialog() Promise 化调用，替代浏览器 window.confirm -->
  <div v-if="visible" class="confirm-overlay" @click.self="handleCancel">
    <div class="confirm-box">
      <div class="confirm-title">{{ title }}</div>
      <div class="confirm-body">{{ message }}</div>
      <div class="confirm-footer">
        <button class="btn" @click="handleCancel">{{ cancelText }}</button>
        <button class="btn primary" :class="{ danger: danger }" @click="handleConfirm">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * 全局确认弹窗（window.confirm 的页面级替代）。
 * 经 utils/confirmDialog.ts 挂到 body 使用——组件自身不做状态管理，仅渲染回调。
 */
const visible = ref(false)
const title = ref('提示')
const message = ref('')
const confirmText = ref('确定')
const cancelText = ref('取消')
const danger = ref(false)

let resolver: ((value: boolean) => void) | null = null

function open(options: {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}): Promise<boolean> {
  title.value = options.title || '提示'
  message.value = options.message
  confirmText.value = options.confirmText || '确定'
  cancelText.value = options.cancelText || '取消'
  danger.value = !!options.danger
  visible.value = true
  return new Promise((resolve) => {
    resolver = resolve
  })
}

const handleConfirm = () => {
  visible.value = false
  resolver?.(true)
  resolver = null
}

const handleCancel = () => {
  visible.value = false
  resolver?.(false)
  resolver = null
}

defineExpose({ open })
</script>

<style scoped lang="scss">
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
}

.confirm-box {
  width: 400px;
  background: #fff;
  border-radius: 10px;
  padding: 22px 24px 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);

  .confirm-title {
    font-size: 15px;
    font-weight: 600;
    color: #333;
    margin-bottom: 10px;
  }

  .confirm-body {
    font-size: 13px;
    color: #555;
    line-height: 1.7;
    margin-bottom: 20px;
    white-space: pre-wrap;
  }

  .confirm-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}

.btn {
  padding: 7px 20px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  color: #333;
  font-size: 13px;
  cursor: pointer;

  &:hover { opacity: 0.85; }

  &.primary {
    background: #1890ff;
    border-color: #1890ff;
    color: #fff;
  }

  &.danger {
    background: #ff4d4f;
    border-color: #ff4d4f;
  }
}
</style>
