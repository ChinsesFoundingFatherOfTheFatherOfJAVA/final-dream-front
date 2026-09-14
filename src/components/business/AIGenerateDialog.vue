<template>
  <div class="dialog-overlay" @click.self="handleCancel">
    <div class="dialog">
      <div class="dialog-header">
        <span class="dialog-title">✨ AI生成话术</span>
        <span class="close-btn" @click="handleCancel">×</span>
      </div>
      <div class="dialog-body">
        <div class="form-item">
          <label class="form-label required">对话场景</label>
          <textarea
            class="form-textarea"
            v-model="scene"
            placeholder="请输入对话场景描述，例如：Ai10 缝纫机产品介绍电话销售"
            rows="4"
            :disabled="generating"
          ></textarea>
        </div>
        <div class="form-item">
          <label class="form-label required">对话轮次</label>
          <input
            type="number"
            class="form-input"
            v-model.number="rounds"
            min="1"
            max="20"
            :disabled="generating"
          />
        </div>
        <p class="dialog-tip">生成后将自动创建一条由「学员问陪练者说」节点组成的完整流程。</p>
      </div>
      <div class="dialog-footer">
        <button class="btn btn-default" :disabled="generating" @click="handleCancel">取消</button>
        <button class="btn btn-primary" :disabled="generating || !scene.trim()" @click="handleGenerate">
          {{ generating ? '生成中...' : '生成' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  generating: boolean
}>()

const emit = defineEmits<{
  close: []
  generate: [scene: string, rounds: number]
}>()

const scene = ref('')
const rounds = ref(5)

// 当外部生成结束（generating 变为 false）但用户未填场景，自动关闭
watch(
  () => props.generating,
  (cur, prev) => {
    if (prev && !cur) {
      // 生成完成后由父组件控制 close
    }
  }
)

const handleGenerate = () => {
  if (!scene.value.trim()) {
    alert('请输入对话场景')
    return
  }
  emit('generate', scene.value, rounds.value)
}

const handleCancel = () => {
  if (props.generating) {
    if (!confirm('生成正在进行中，确定要取消吗？')) return
  }
  emit('close')
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
  width: 480px;
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
  .close-btn { font-size: 22px; color: #999; cursor: pointer; line-height: 1; &:hover { color: #333; } }
}

.dialog-body {
  padding: 20px;

  .dialog-tip {
    font-size: 12px;
    color: #999;
    margin: 0;
    line-height: 1.6;
  }
}

.form-item {
  margin-bottom: 16px;

  .form-label {
    display: block;
    font-size: 13px;
    color: #333;
    margin-bottom: 8px;

    &.required::after {
      content: ' *';
      color: #f5222d;
    }
  }
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  font-family: inherit;

  &:focus { border-color: #1890ff; }
}

.form-textarea { resize: vertical; min-height: 90px; }

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid #e8e8e8;
}

.btn {
  padding: 7px 18px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid #d9d9d9;

  &.btn-primary { background: #1890ff; color: #fff; border-color: #1890ff; }
  &.btn-default { background: #fff; color: #333; }
  &:hover { opacity: 0.88; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}
</style>
