<template>
  <!-- 截图10/11：解锁模式抽屉（自由学习[默认]/按顺序学习 + 解锁单元） -->
  <KngDrawer
    :visible="visible"
    title="解锁模式"
    :z-index="zIndex"
    @close="emit('close')"
  >
    <div class="unlock-form">
      <el-radio-group v-model="mode" class="section">
        <el-radio class="radio-row" :value="1">
          <span class="radio-body">
            <strong>自由学习模式</strong>
            <small>不设学习限制，学员可以在任何时间学习</small>
          </span>
        </el-radio>
        <el-radio class="radio-row" :value="2">
          <span class="radio-body">
            <strong>按顺序学习</strong>
            <small>学员需按配置的解锁顺序依次学习任务</small>
          </span>
        </el-radio>
      </el-radio-group>

      <div class="section" :class="{ disabled: mode !== 2 }">
        <span class="section-title">解锁单元</span>
        <el-radio-group v-model="unit">
          <el-radio class="radio-row inline" :value="1" :disabled="mode !== 2">
            按内容<em>（默认）</em>
          </el-radio>
          <el-radio class="radio-row inline" :value="2" :disabled="mode !== 2">
            按章节
          </el-radio>
        </el-radio-group>
        <small v-if="mode !== 2" class="hint">仅"按顺序学习"时可选择解锁单元</small>
      </div>
    </div>

    <template #footer>
      <el-button class="btn" @click="emit('close')">取消</el-button>
      <el-button class="btn primary" @click="confirm">确定</el-button>
    </template>
  </KngDrawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import KngDrawer from '../../../components/KngDrawer.vue'
import {
  UNLOCK_MODE_FREE,
  UNLOCK_UNIT_CONTENT
} from '../model'

/**
 * 解锁模式抽屉（CS-07a/截图10、11）。
 * "不参与闯关的任务类型"不做（附录A）；确定后仅更新主页本地状态，随整体保存落库。
 */
const props = defineProps<{
  visible: boolean
  unlockMode: number
  unlockUnit: number
  /** 抽屉层叠起点 z-index（嵌套抽屉阶梯由主页统一分配） */
  zIndex?: number
}>()

const emit = defineEmits<{
  close: []
  confirm: [unlockMode: number, unlockUnit: number]
}>()

const mode = ref<number>(UNLOCK_MODE_FREE)
const unit = ref<number>(UNLOCK_UNIT_CONTENT)

// 每次打开时按当前配置回显
watch(
  () => props.visible,
  visible => {
    if (!visible) return
    mode.value = props.unlockMode
    unit.value = props.unlockUnit
  },
  { immediate: true }
)

function confirm() {
  emit('confirm', mode.value, unit.value)
}
</script>

<style scoped lang="scss">
.unlock-form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.section {
  &.disabled {
    opacity: 0.62;
  }
}

.section-title {
  display: block;
  margin-bottom: 10px;
  color: var(--color-ink);
  font-size: 14px;
  font-weight: 600;
}

.radio-row {
  display: flex;
  align-items: flex-start;
  height: auto;
  margin: 0 0 14px;

  .radio-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    white-space: normal;

    strong {
      color: var(--color-ink);
      font-size: 13px;
      font-weight: 600;
    }

    small {
      color: var(--color-muted);
      font-size: 12px;
    }
  }

  &.inline {
    margin-bottom: 8px;
  }

  &.inline :deep(.el-radio__label) {
    color: var(--color-ink-2);
    font-size: 13px;

    em {
      color: var(--color-muted);
      font-style: normal;
    }
  }
}

.hint {
  color: var(--color-muted);
  font-size: 12px;
}

.btn {
  height: 34px;
  padding: 0 18px;
  border: 1px solid var(--color-rule-2);
  border-radius: 6px;
  background: var(--color-paper);
  color: var(--color-ink-2);
  cursor: pointer;

  &.primary {
    border-color: var(--color-accent);
    background: var(--color-accent);
    color: var(--color-accent-ink);
  }
}
</style>
