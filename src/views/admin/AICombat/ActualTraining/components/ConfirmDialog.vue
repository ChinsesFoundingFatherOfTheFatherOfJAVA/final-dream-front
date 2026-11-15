<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="400px"
    append-to-body
    @update:model-value="handleVisibleChange"
  >
    <p class="dialog-body">{{ message }}</p>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button :type="danger ? 'danger' : 'primary'" :disabled="loading" @click="handleConfirm">
        {{ loading ? '处理中…' : confirmText }}
      </el-button>
    </template>
  </el-dialog>
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
const handleVisibleChange = (visible: boolean) => {
  if (!visible) handleCancel()
}
</script>

<style scoped lang="scss">
.dialog-body {
  margin: 0;
  color: var(--color-muted);
  font-size: 15px;
  line-height: 1.6;
}
</style>
