<template>
  <!-- 截图15：移动任务到章节弹窗（章节单选列表） -->
  <el-dialog
    :model-value="visible"
    title="移动任务到章节"
    width="440px"
    append-to-body
    @update:model-value="handleVisibleChange"
  >
    <p class="tip">已选择 {{ count }} 个任务</p>
    <el-radio-group v-model="target" class="chapter-options">
      <el-radio
        v-for="(chapter, index) in chapters"
        :key="chapter.id || `target-${index}`"
        :value="index"
        class="option-row"
      >
        <span class="option-name" :title="chapter.name">{{ chapter.name }}</span>
        <span class="option-count">{{ chapter.tasks.length }} 个任务</span>
      </el-radio>
    </el-radio-group>
    <el-empty v-if="!chapters.length" description="暂无章节可选择" :image-size="64" />
    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button type="primary" :disabled="target === -1" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
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

function handleVisibleChange(visible: boolean) {
  if (!visible) emit('close')
}
</script>

<style scoped lang="scss">
.tip {
  margin: 0 0 14px;
  color: var(--color-muted);
  font-size: 12px;
}

.chapter-options {
  max-height: 260px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.option-row {
  width: 100%;
  height: auto;
  padding: 9px 12px;
  border: var(--rule-hair) solid var(--color-rule);
  border-radius: 7px;
  margin-right: 0;

  &:hover {
    border-color: color-mix(in oklab, var(--color-accent) 35%, var(--color-paper));
    background: var(--color-accent-wash);
  }

  :deep(.el-radio__label) {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }

  .option-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--color-ink);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option-count {
    color: var(--color-muted);
    font-size: 11px;
  }
}

</style>
