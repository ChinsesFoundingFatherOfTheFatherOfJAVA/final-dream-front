<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span class="dialog-title">连线设置</span>
        <span
          class="close-btn"
          role="button"
          tabindex="0"
          aria-label="关闭"
          @click="$emit('close')"
          @keydown.enter.prevent="$emit('close')"
        >×</span>
      </div>
      <div class="dialog-body">
        <p class="dialog-tip">
          从「{{ sourceLabel }}」流转到「{{ targetLabel }}」时，根据权重随机选择下游分支。权重越大，被选中的概率越高。
        </p>
        <div class="form-item">
          <label class="form-label" for="edge-weight-input">权重</label>
          <input
            id="edge-weight-input"
            type="number"
            class="form-input"
            v-model.number="weight"
            min="1"
            step="1"
            placeholder="请输入正整数"
          />
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn btn-danger" @click="$emit('delete')">删除连线</button>
        <div class="footer-right">
          <button class="btn btn-default" @click="$emit('close')">取消</button>
          <button class="btn btn-primary" @click="handleConfirm">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  edgeId: string
  currentWeight: number
  sourceLabel: string
  targetLabel: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [edgeId: string, weight: number]
  delete: []
}>()

const weight = ref(props.currentWeight || 1)

watch(
  () => props.currentWeight,
  (v) => (weight.value = v || 1)
)

const handleConfirm = () => {
  let w = Number(weight.value)
  if (!w || w < 1) w = 1
  w = Math.floor(w)
  emit('confirm', props.edgeId, w)
}
</script>

<style scoped lang="scss">
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.dialog {
  width: 440px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;

  .dialog-title { font-size: 16px; font-weight: 600; color: #333; }
  .close-btn {
    font-size: 22px; color: #999; cursor: pointer; line-height: 1;
    &:hover { color: #333; }
    // 图标关闭按钮：补键盘焦点环
    &:focus-visible { outline: 2px solid #1890ff; outline-offset: 2px; }
  }
}

.dialog-body {
  padding: 20px;

  .dialog-tip {
    font-size: 13px;
    color: #666;
    line-height: 1.6;
    margin: 0 0 18px 0;
    padding: 10px 12px;
    background: #f0f7ff;
    border-radius: 6px;
    border-left: 3px solid #1890ff;
  }
}

.form-item {
  .form-label {
    display: block;
    font-size: 13px;
    color: #333;
    margin-bottom: 8px;
  }
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  outline: none;

  &:focus { border-color: #1890ff; }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-top: 1px solid #e8e8e8;

  .footer-right {
    display: flex;
    gap: 12px;
  }
}

.btn {
  padding: 7px 18px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid #d9d9d9;

  &.btn-primary { background: #1890ff; color: #fff; border-color: #1890ff; }
  &.btn-default { background: #fff; color: #333; }
  &.btn-danger { background: #fff; color: #f5222d; border-color: #ffa39e; }
  &.btn-danger:hover { background: #fff1f0; }
  &:hover { opacity: 0.88; }
}
</style>
