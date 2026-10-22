<template>
  <!-- 全局确认弹窗：confirmDialog() Promise 化调用，替代浏览器 window.confirm -->
  <el-dialog
    :model-value="visible"
    width="400px"
    append-to-body
    :show-close="false"
    :close-on-click-modal="false"
    @close="handleCancel"
  >
    <template #header>
      <span class="confirm-title">{{ title }}</span>
    </template>
    <div class="confirm-body">{{ message }}</div>
    <template #footer>
      <el-button @click="handleCancel">{{ cancelText }}</el-button>
      <el-button :type="danger ? 'danger' : 'primary'" @click="handleConfirm">
        {{ confirmText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElButton, ElDialog } from 'element-plus'

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
.confirm-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.confirm-body {
  font-size: 13px;
  color: #555;
  line-height: 1.7;
  white-space: pre-wrap;
}
</style>
