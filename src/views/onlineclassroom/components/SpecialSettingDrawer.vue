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
      <div class="switch-line">
        <el-switch v-model="localValue" />
        <span>允许音频、视频课程后台播放</span>
      </div>
    </div>

    <template #footer>
      <el-button class="btn ghost" @click="emit('close')">取消</el-button>
      <el-button class="btn primary" :disabled="saving" @click="emit('save', localValue)">
        {{ saving ? '保存中...' : '确定' }}
      </el-button>
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
  border: 1px solid color-mix(in oklab, var(--color-accent) 35%, var(--color-paper));
  border-radius: 6px;
  background: var(--color-accent-wash);
  color: var(--color-accent-deep);
  font-size: 12px;
  line-height: 1.6;
}

.special-section {
  margin-top: 22px;

  h4 {
    margin: 0 0 14px;
    color: var(--color-ink);
    font-size: 14px;
  }
}

.switch-line {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-ink-2);
  font-size: 13px;
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
    border: 1px solid var(--color-rule-2);
    background: var(--color-paper);
    color: var(--color-ink-2);
  }

  &.primary {
    border: none;
    background: var(--color-accent);
    color: var(--color-accent-ink);
  }
}
</style>
