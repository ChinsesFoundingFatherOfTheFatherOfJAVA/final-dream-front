<template>
  <!-- 截图15：移动任务到章节弹窗（章节单选列表） -->
  <teleport to="body">
    <div v-if="visible" class="move-mask" @click.self="emit('close')">
      <section class="move-dialog">
        <h3>移动任务到章节</h3>
        <p class="tip">已选择 {{ count }} 个任务</p>
        <div class="chapter-options">
          <label
            v-for="(chapter, index) in chapters"
            :key="chapter.id || `target-${index}`"
            class="option-row"
          >
            <input v-model.number="target" type="radio" :value="index" />
            <span class="option-name" :title="chapter.name">{{ chapter.name }}</span>
            <span class="option-count">{{ chapter.tasks.length }} 个任务</span>
          </label>
          <div v-if="!chapters.length" class="empty">暂无章节可选择</div>
        </div>
        <footer>
          <button type="button" @click="emit('close')">取消</button>
          <button type="button" class="primary" :disabled="target === -1" @click="confirm">确定</button>
        </footer>
      </section>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { DesignerChapter } from '../model'

/**
 * 移动任务到章节弹窗（CS-07a/截图15）。
 * 仅在章节模式（structureType=1）下可用；确定后由主页把勾选任务移动到目标章节末尾。
 */
const props = defineProps<{
  visible: boolean
  chapters: DesignerChapter[]
  /** 本次批量移动的任务数（仅提示用） */
  count: number
}>()

const emit = defineEmits<{
  close: []
  confirm: [chapterIndex: number]
}>()

const target = ref(-1)

// 打开时重置选择；默认选中第一个章节（有章节时）
watch(
  () => props.visible,
  visible => {
    if (!visible) return
    target.value = props.chapters.length ? 0 : -1
  },
  { immediate: true }
)

function confirm() {
  if (target.value < 0) return
  emit('confirm', target.value)
}
</script>

<style scoped lang="scss">
.move-mask {
  position: fixed;
  inset: 0;
  z-index: 3600;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.4);
}

.move-dialog {
  width: 440px;
  max-width: calc(100vw - 32px);
  padding: 22px 26px 18px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.2);

  h3 {
    margin: 0;
    color: #253047;
    font-size: 16px;
  }

  .tip {
    margin: 6px 0 14px;
    color: #98a1b2;
    font-size: 12px;
  }
}

.chapter-options {
  max-height: 260px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border: 1px solid #e9edf4;
  border-radius: 7px;
  cursor: pointer;

  &:hover {
    border-color: #b9d4fb;
    background: #f7faff;
  }

  input {
    accent-color: #2e7cf6;
  }

  .option-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: #30384a;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option-count {
    color: #a2a9b7;
    font-size: 11px;
  }
}

.empty {
  padding: 18px 0;
  color: #a2a9b7;
  font-size: 12px;
  text-align: center;
}

footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;

  button {
    height: 34px;
    padding: 0 18px;
    border: 1px solid #d9deea;
    border-radius: 6px;
    background: #fff;
    color: #4d5568;
    cursor: pointer;

    &:disabled {
      color: #b3bac7;
      cursor: not-allowed;
    }

    &.primary {
      border-color: #2e7cf6;
      background: #2e7cf6;
      color: #fff;
    }
  }
}
</style>
