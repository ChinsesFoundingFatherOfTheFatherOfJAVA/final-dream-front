<template>
  <KngDrawer
    :visible="visible"
    title="特殊设置"
    :width="480"
    :z-index="3200"
    @close="emit('close')"
  >
    <div class="special-notice">
      特殊设置仅针对移动端学习生效，后台播放不会确认学员是否在线
    </div>

    <div class="special-section">
      <h4>App学习</h4>
      <label class="switch-line">
        <input v-model="localValue" type="checkbox" />
        <span class="switch-control"></span>
        <span>允许音频、视频课程后台播放</span>
      </label>
    </div>

    <template #footer>
      <button type="button" class="btn ghost" @click="emit('close')">取消</button>
      <button type="button" class="btn primary" :disabled="saving" @click="emit('save', localValue)">
        {{ saving ? '保存中...' : '确定' }}
      </button>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import KngDrawer from './KngDrawer.vue'

const props = withDefaults(defineProps<{
  visible: boolean
  audioBackgroundPlay: boolean
  saving?: boolean
}>(), {
  saving: false
})

const emit = defineEmits<{
  close: []
  save: [value: boolean]
}>()

const localValue = ref(false)

watch(
  () => [props.visible, props.audioBackgroundPlay] as const,
  ([visible, value]) => {
    if (visible) localValue.value = value
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.special-notice {
  padding: 10px 12px;
  border: 1px solid #cfe0ff;
  border-radius: 6px;
  background: #f2f7ff;
  color: #2e6dc4;
  font-size: 12px;
  line-height: 1.6;
}

.special-section {
  margin-top: 22px;

  h4 {
    margin: 0 0 14px;
    color: #253047;
    font-size: 14px;
  }
}

.switch-line {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4d5568;
  font-size: 13px;
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
}

.switch-control {
  position: relative;
  width: 38px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #c9d0dc;
  transition: background 0.2s;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
    transition: transform 0.2s;
  }

}

.switch-line input:checked + .switch-control {
  background: #2e7cf6;
}

.switch-line input:checked + .switch-control::after {
  transform: translateX(18px);
}

.btn {
  height: 36px;
  padding: 0 20px;
  border-radius: 6px;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.ghost {
    border: 1px solid #d9deea;
    background: #fff;
    color: #596274;
  }

  &.primary {
    border: none;
    background: #2e7cf6;
    color: #fff;
  }
}
</style>
