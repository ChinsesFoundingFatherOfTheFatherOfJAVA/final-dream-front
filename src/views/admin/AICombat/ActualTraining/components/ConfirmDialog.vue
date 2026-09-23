<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-overlay" @click.self="handleCancel">
      <div class="confirm-dialog">
        <div class="dialog-header">{{ title }}</div>
        <div class="dialog-body">{{ message }}</div>
        <div class="dialog-footer">
          <button class="btn-cancel" @click="handleCancel">取消</button>
          <button class="btn-confirm" :class="{ danger: danger }" :disabled="loading" @click="handleConfirm">
            {{ loading ? '处理中…' : confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    visible: boolean
    title: string
    message: string
    confirmText?: string
    danger?: boolean
    loading?: boolean
  }>(),
  { confirmText: '确定', danger: false, loading: false }
)

const emit = defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()

const handleConfirm = () => emit('confirm')
const handleCancel = () => emit('cancel')
</script>

<style scoped lang="scss">
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
}

.confirm-dialog {
  width: 400px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;

  .dialog-header {
    padding: 18px 24px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .dialog-body {
    padding: 12px 24px 20px;
    font-size: 15px;
    color: #666;
    line-height: 1.6;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 12px 24px 18px;
    border-top: 1px solid #f0f0f0;

    button {
      padding: 7px 20px;
      border-radius: 4px;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s;

      &.btn-cancel {
        background: #fff;
        color: #666;
        border: 1px solid #d9d9d9;

        &:hover { color: #1890ff; border-color: #1890ff; }
      }

      &.btn-confirm {
        background: #1890ff;
        color: #fff;
        border: 1px solid #1890ff;

        &:hover { opacity: 0.85; }
        &.danger { background: #e5484d; border-color: #e5484d; }
        &:disabled { opacity: 0.6; cursor: not-allowed; }
      }
    }
  }
}
</style>
