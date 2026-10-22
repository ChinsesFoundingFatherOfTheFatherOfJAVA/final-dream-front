<template>
  <!-- FP-10 快速设置全部分数抽屉（截图19）：按题型勾选 + 每题分值 + 多选漏选得分 -->
  <div class="drawer-overlay">
    <div class="drawer">
      <div class="drawer-header">
        <span>快速设置全部分数</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <p class="hint">勾选要统一设置分值的题型，确认后覆盖该大题下所有试题的分值。</p>

        <div v-for="item in rows" :key="item.sectionIndex" class="score-row">
          <label class="check-item">
            <el-checkbox v-model="item.checked" />
            <span class="type-name">{{ item.label }}</span>
            <span class="count">（{{ item.count }} 题）</span>
          </label>

          <div class="score-fields">
            <label class="field">
              <span>每题分值</span>
              <el-input-number v-model="item.score" :min="0" :step="0.5"
                     :disabled="!item.checked" @input="clampMiss(item)" :controls="false" />
            </label>

            <template v-if="item.sectionIndex === 1">
              <label class="field">
                <span>漏选得分</span>
                <el-input-number v-model="item.missScore" :min="0" :max="item.score" :step="0.5"
                       :disabled="!item.checked" @input="clampMiss(item)" :controls="false" />
              </label>
              <div class="radio-row">
                <label><el-radio v-model.number="item.missScoreType" :value="0" :disabled="!item.checked" /> 不漏选得分</label>
                <label><el-radio v-model.number="item.missScoreType" :value="1" :disabled="!item.checked" /> 统一得</label>
                <label><el-radio v-model.number="item.missScoreType" :value="2" :disabled="!item.checked" /> 按漏选数量均分</label>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="!checkedRows.length || saving" @click="confirm">
          {{ saving ? '设置中…' : `确定（${checkedRows.length} 个大题）` }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { toast } from '@/utils/toast'
import { batchPaperScore, type PaperSection } from '@/api/paper'

const props = defineProps<{ paperId: string; sections: PaperSection[] }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const TYPE_LABELS: Record<number, string> = {
  0: '单选题', 1: '多选题', 2: '判断题', 3: '填空题', 4: '问答题', 5: '组合题'
}

const saving = ref(false)

const rows = reactive(props.sections.map(section => ({
  sectionIndex: section.sectionIndex,
  label: TYPE_LABELS[section.sectionIndex] ?? '未知题型',
  count: section.quesList.length,
  checked: false,
  score: section.quesList[0]?.score ?? 1,
  missScore: section.quesList[0]?.missScore ?? 0,
  missScoreType: section.quesList[0]?.missScoreType ?? 0
})))

const checkedRows = computed(() => rows.filter(row => row.checked))

/**
 * 漏选得分是"答对一部分"的补偿分，不能超过该题满分。
 *
 * <p>输入框加 max 只是浏览器提示（手输仍能越界），所以在 input 事件与提交前都做一次夹取，
 * 保证 UI 与落库都不会出现"漏选 5 分 / 满分 2 分"。
 */
const clampMiss = (row: { score: number; missScore: number }) => {
  if (!Number.isFinite(row.score) || row.score < 0) row.score = 0
  if (!Number.isFinite(row.missScore) || row.missScore < 0) row.missScore = 0
  if (row.missScore > row.score) row.missScore = row.score
}

// 历史数据可能已经存在 missScore > score，进抽屉时就先修正显示
rows.forEach(clampMiss)

const confirm = async () => {
  checkedRows.value.forEach(clampMiss)
  saving.value = true
  try {
    await batchPaperScore(props.paperId, checkedRows.value.map(row => ({
      sectionIndex: row.sectionIndex,
      score: row.score,
      missScore: row.missScore,
      missScoreType: row.missScoreType
    })))
    toast.success(`已设置 ${checkedRows.value.length} 个大题的分值`)
    emit('saved')
    emit('close')
  } catch { /* 拦截器已提示 */ } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.drawer-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .45); display: flex; justify-content: flex-end; z-index: 3250; }
.drawer { width: 560px; height: 100%; background: #fff; display: flex; flex-direction: column; }

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600;
  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 16px 20px; }

.hint { margin: 0 0 12px; font-size: 12px; color: #8a92a5; line-height: 1.7; }

.score-row {
  padding: 12px 14px; margin-bottom: 10px;
  border: 1px solid #e6eaf1; border-radius: 6px; background: #fcfdff;

  .check-item {
    display: flex; align-items: center; gap: 6px; font-size: 13px; color: #1f2937; cursor: pointer;
    .count { font-size: 12px; color: #a0a7b8; }
  }

  .score-fields { margin-top: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }

  .field {
    display: flex; align-items: center; gap: 6px; font-size: 12px; color: #4a5368;

    input {
      width: 80px; border: 1px solid #d9d9d9; border-radius: 4px; padding: 5px 8px; font-size: 12px; outline: none;
      &:disabled { background: #f5f7fa; }
    }
  }

  .radio-row { display: flex; gap: 12px; font-size: 12px; color: #4a5368; }
}

.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid #eee; }

.btn {
  padding: 7px 18px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;
  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>