<template>
  <!-- FP-16 设置默认分值抽屉：题型×难度分值矩阵（多选含漏选得分） -->
    <el-drawer
    :model-value="true"
    size="720px"
    :with-header="false"
    append-to-body
    destroy-on-close
    class="exam-drawer"
    @close="emit('close')"
  >
    <div class="drawer">
      <div class="drawer-header">
        <span>设置默认分值</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <p class="drawer-hint">
          这里的默认值会作为编辑页「设定分值」表的初始值；按题型×难度分别设置。
        </p>

        <el-table :data="TYPES" row-key="value" class="score-matrix" border>
          <el-table-column prop="label" label="题型" width="84" align="center" class-name="col-type" />
          <el-table-column
            v-for="lv in LEVELS"
            :key="lv.value"
            :label="lv.label"
            align="center"
            min-width="180"
          >
            <template #default="{ row: typeRow }">
                <div class="cell-score">
                  <el-input-number v-model="cellOf(typeRow.value, lv.value).score" :min="0" :step="0.5" class="num"
                         @input="clampCell(cellOf(typeRow.value, lv.value))" :controls="false" />
                  <span class="unit">分</span>
                </div>

                <!-- 多选：额外给漏选得分 -->
                <div v-if="typeRow.value === 1" class="miss-block">
                  <div class="miss-row">
                    <span class="miss-label">漏选</span>
                    <el-input-number v-model="cellOf(typeRow.value, lv.value).missScore" :min="0" :max="cellOf(typeRow.value, lv.value).score" :step="0.5" class="num small"
                           @input="clampCell(cellOf(typeRow.value, lv.value))" :controls="false" />
                    <span class="unit">分</span>
                  </div>
                  <label class="miss-radio">
                    <el-radio :name="`miss-${lv.value}`" :value="0"
                           v-model.number="cellOf(typeRow.value, lv.value).missScoreType" />
                    <span>统一</span>
                  </label>
                  <label class="miss-radio">
                    <el-radio :name="`miss-${lv.value}`" :value="2"
                           v-model.number="cellOf(typeRow.value, lv.value).missScoreType" />
                    <span>按漏选数量均分</span>
                  </label>
                </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="drawer-footer">
        <el-button class="btn" @click="emit('close')">取消</el-button>
        <el-button class="btn primary" :disabled="saving" @click="handleSave">
          {{ saving ? '保存中…' : '确定' }}
        </el-button>
      </div>
    </div>
    </el-drawer>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { toast } from '@/utils/toast'
import { getScoreConfig, saveScoreConfig, type ScoreConfigItem } from '@/api/paper'

/** FP-16 设置默认分值：题型×难度矩阵，保存到 exam_score_config。 */
const emit = defineEmits<{ close: []; saved: [] }>()

const TYPES = [
  { value: 0, label: '单选题' }, { value: 1, label: '多选题' }, { value: 2, label: '判断题' },
  { value: 3, label: '填空题' }, { value: 4, label: '问答题' }
]
const LEVELS = [
  { value: 0, label: '易' }, { value: 1, label: '中' }, { value: 2, label: '难' }
]

interface Cell { score: number; missScore: number; missScoreType: number }

const key = (type: number, level: number) => `${type}-${level}`

/** 预置全部 5×3 格，避免 v-model 打到 undefined。 */
const cells = reactive<Record<string, Cell>>({})
for (const t of TYPES) {
  for (const lv of LEVELS) {
    cells[key(t.value, lv.value)] = { score: 0, missScore: 0, missScoreType: 0 }
  }
}

const saving = ref(false)

/** 已预置全部格子，这里断言非空；避免模板里对 Record 索引做 undefined 判断。 */
const cellOf = (type: number, level: number): Cell => cells[key(type, level)] as Cell

onMounted(async () => {
  try {
    const items = await getScoreConfig()
    for (const item of items as ScoreConfigItem[]) {
      const k = key(item.type, item.levelType)
      if (cells[k]) {
        cells[k].score = Number(item.score ?? 0)
        cells[k].missScore = Number(item.missScore ?? 0)
        cells[k].missScoreType = Number(item.missScoreType ?? 0)
      }
    }
    // 历史配置可能 missScore > score，载入后先修正
    for (const t of TYPES) {
      for (const lv of LEVELS) clampCell(cellOf(t.value, lv.value))
    }
  } catch { /* 拦截器已提示 */ }
})

/** 漏选得分不能超过该格满分（同 BatchScoreDrawer 的口径）。 */
const clampCell = (c: Cell) => {
  if (!Number.isFinite(c.score) || c.score < 0) c.score = 0
  if (!Number.isFinite(c.missScore) || c.missScore < 0) c.missScore = 0
  if (c.missScore > c.score) c.missScore = c.score
}

const handleSave = async () => {
  for (const t of TYPES) {
    for (const lv of LEVELS) clampCell(cellOf(t.value, lv.value))
  }
  saving.value = true
  try {
    const items: ScoreConfigItem[] = []
    for (const t of TYPES) {
      for (const lv of LEVELS) {
        const c = cellOf(t.value, lv.value)
        items.push({
          type: t.value,
          levelType: lv.value,
          score: Number(c.score) || 0,
          missScore: Number(c.missScore) || 0,
          missScoreType: Number(c.missScoreType) || 0
        })
      }
    }
    await saveScoreConfig(items)
    toast.success('默认分值已保存')
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.drawer { width: 720px; height: 100%; background: #fff; display: flex; flex-direction: column; }

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600;

  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

.drawer-body { flex: 1; min-height: 0; overflow: auto; padding: 16px 20px; }

.drawer-hint { margin: 0 0 12px; font-size: 12px; color: #8a92a5; }

.score-matrix {
  width: 100%; font-size: 12px;

  :deep(.el-table__header th) {
    background: #fafbfd;
    color: #667;
    font-weight: 500;
  }

  :deep(.el-table__cell) {
    padding: 8px;
    vertical-align: top;
  }

  :deep(.col-type) {
    color: #4a5368;
    font-weight: 500;
    vertical-align: middle;
  }
}

.cell-score {
  display: inline-flex; align-items: center; gap: 4px;
}

.num {
  width: 66px; border: 1px solid #d9d9d9; border-radius: 4px;
  padding: 4px 6px; font-size: 12px; outline: none; text-align: center;
  &:focus { border-color: #1890ff; }
  &.small { width: 56px; }
}

.unit { color: #a0a7b8; }

.miss-block {
  margin-top: 8px; padding-top: 8px; border-top: 1px dashed #eef1f6;
}

.miss-row {
  display: inline-flex; align-items: center; gap: 4px;
  .miss-label { color: #8a92a5; }
}

.miss-radio {
  display: inline-flex; align-items: center; gap: 3px; margin: 6px 0 0 4px;
  color: #4a5368; cursor: pointer;
  input { margin: 0; }
}

.drawer-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 20px; border-top: 1px solid #eee;
}

.btn {
  padding: 7px 20px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; cursor: pointer;
  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
