<template>
  <!-- 快速设置抽题策略抽屉（截图16）：试题总数 + 三选一抽题方式 + 对应输入行 -->
  <div class="drawer-overlay">
    <div class="drawer">
      <div class="drawer-header">
        <span>设置策略</span>
        <span class="close-btn" @click="emit('close')">×</span>
      </div>

      <div class="drawer-body">
        <div class="block">
          <p class="block-label">试题总数</p>
          <p class="total-text">{{ totalQues }}题</p>
        </div>

        <div class="block">
          <p class="block-label required">抽题方式</p>
          <label v-for="opt in OPTIONS" :key="opt.mode" class="mode-radio">
            <input type="radio" :value="opt.mode" v-model.number="mode" />
            <span>{{ opt.label }}</span>
          </label>

          <!-- 按难度：三列 -->
          <div v-if="mode === 2" class="band">
            <div v-for="lv in LEVELS" :key="lv.value" class="band-cell">
              <p class="band-title">{{ lv.label }}</p>
              <div class="band-input">
                <input v-model.number="values[lv.value]" type="number" min="0" />
                <span class="max-hint">≤{{ maxOfLevel(lv.value) }}</span>
              </div>
            </div>
          </div>

          <!-- 按题型：五列 -->
          <div v-else-if="mode === 1" class="band">
            <div v-for="t in TYPE_KEYS" :key="t.key" class="band-cell">
              <p class="band-title">{{ t.label }}</p>
              <div class="band-input">
                <input v-model.number="typeValues[t.key]" type="number" min="0" />
                <span class="max-hint">≤{{ maxOfType(t.key) }}</span>
              </div>
            </div>
          </div>

          <!-- 按数量：单格 -->
          <div v-else class="band">
            <div class="band-cell wide">
              <p class="band-title">抽题数量</p>
              <div class="band-input">
                <input v-model.number="needValue" type="number" min="0" />
                <span class="max-hint">≤{{ maxOfNeed }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="btn" type="button" @click="emit('close')">取消</button>
        <button class="btn primary" type="button" :disabled="saving" @click="confirm">
          {{ saving ? '保存中…' : '确定' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { toast } from '@/utils/toast'
import {
  batchStrategyCell, updatePaperQuesMode, type StrategyItem
} from '@/api/paper'

/**
 * 快速设置抽题策略：按"难度/题型/数量"三个维度批量铺满整张卷的策略。
 *
 * <p>底层策略是按「题型×难度」存的，所以另外三个维度在写回时把值落到规范槽位、
 * 其余槽位清零（后端按 quesMode 用聚合上限校验，不会被单格库存误伤）。
 */
const props = defineProps<{
  paperId: string
  strategies: StrategyItem[]
  quesMode: number
  totalQues: number
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const OPTIONS = [
  { mode: 2, label: '按试题难度设置' },
  { mode: 1, label: '按试题题型设置' },
  { mode: 3, label: '按试题数量设置' }
]
const TYPE_KEYS = [
  { key: 'single', label: '单选' },
  { key: 'multi', label: '多选' },
  { key: 'judge', label: '判断' },
  { key: 'fill', label: '填空' },
  { key: 'qa', label: '问答' }
]
const LEVELS = [{ value: 0, label: '易' }, { value: 1, label: '中' }, { value: 2, label: '难' }]

type Cell = Record<string, number>
const cellOf = (item: StrategyItem, level: number): Cell | undefined =>
  (item.settingCount as unknown as Cell[])?.find(c => Number(c.levelType) === level)

/** 打开时按当前卷的即时值预填，避免"打开是空的、确定就清零"。 */
const mode = ref(props.quesMode === 0 ? 2 : props.quesMode)
const values = reactive<Record<number, number>>({
  0: props.strategies.reduce((s, i) => s + LEVELS.reduce((a, lv) =>
    a + TYPE_KEYS.reduce((x, t) => x + Number(cellOf(i, lv.value)?.[t.key + 'Qty'] ?? 0), 0), 0), 0),
  1: 0,
  2: 0
})
const typeValues = reactive<Record<string, number>>(
  Object.fromEntries(TYPE_KEYS.map(t => [
    t.key,
    props.strategies.reduce((s, i) =>
      s + LEVELS.reduce((a, lv) => a + Number(cellOf(i, lv.value)?.[t.key + 'Qty'] ?? 0), 0), 0)
  ]))
)
const needValue = ref(props.strategies.reduce((s, i) =>
  s + LEVELS.reduce((a, lv) => a + Number(cellOf(i, lv.value)?.needQty ?? 0), 0), 0))

const maxOfLevel = (level: number) => props.strategies.reduce((s, i) =>
  s + TYPE_KEYS.reduce((a, t) => a + Number(cellOf(i, level)?.[t.key + 'MaxQty'] ?? 0), 0), 0)
const maxOfType = (key: string) => props.strategies.reduce((s, i) =>
  s + LEVELS.reduce((a, lv) => a + Number(cellOf(i, lv.value)?.[key + 'MaxQty'] ?? 0), 0), 0)
const maxOfNeed = computed(() => props.strategies.reduce((s, i) =>
  s + LEVELS.reduce((a, lv) => a + Number(cellOf(i, lv.value)?.maxQty ?? 0), 0), 0))

const saving = ref(false)

const confirm = async () => {
  saving.value = true
  try {
    if (mode.value !== props.quesMode) {
      await updatePaperQuesMode(props.paperId, mode.value)
    }
    const cells: { libId: string; indicatorId?: string; levelType: number; field: string; value: number }[] = []
    for (const item of props.strategies) {
      const indicatorId = item.indicatorId ?? undefined
      if (mode.value === 2) {
        // 每个难度一行：值落到单选，其余题型清零
        for (const lv of LEVELS) {
          TYPE_KEYS.forEach((t, i) => cells.push({
            libId: item.libId, indicatorId, levelType: lv.value, field: t.key + 'Qty',
            value: i === 0 ? (values[lv.value] || 0) : 0
          }))
        }
      } else if (mode.value === 1) {
        // 每个题型一列：值落到易，中/难清零
        for (const lv of LEVELS) {
          for (const t of TYPE_KEYS) {
            cells.push({
              libId: item.libId, indicatorId, levelType: lv.value, field: t.key + 'Qty',
              value: lv.value === 0 ? (typeValues[t.key] || 0) : 0
            })
          }
        }
      } else {
        for (const lv of LEVELS) {
          cells.push({
            libId: item.libId, indicatorId, levelType: lv.value, field: 'needQty',
            value: lv.value === 0 ? (needValue.value || 0) : 0
          })
        }
      }
    }
    await batchStrategyCell(props.paperId, cells)
    toast.success('抽题策略已设置')
    emit('saved')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.drawer-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, .45);
  display: flex; justify-content: flex-end; z-index: 3200;
}

.drawer { width: 720px; height: 100%; background: #fff; display: flex; flex-direction: column; }

.drawer-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 500;

  .close-btn { font-size: 22px; color: #999; cursor: pointer; }
}

.drawer-body { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 24px; }

.block { margin-bottom: 26px; }
.block-label {
  margin: 0 0 10px; font-size: 13px; color: #4a5368;
  &.required::before { content: '＊'; color: #f5222d; margin-right: 2px; }
}
.total-text { margin: 0; font-size: 13px; color: #303133; }

.mode-radio {
  display: flex; align-items: center; gap: 6px; padding: 6px 0;
  font-size: 13px; color: #4a5368; cursor: pointer;
  input { margin: 0; accent-color: #1890ff; }
}

.band {
  display: flex; gap: 40px; margin-top: 12px; padding: 16px 20px;
  background: #f5f6f8; border-radius: 6px;

  .band-cell { min-width: 120px; &.wide { min-width: 200px; } }
  .band-title { margin: 0 0 10px; font-size: 13px; color: #4a5368; }
  .band-input {
    display: flex; align-items: center; gap: 8px;

    input {
      width: 96px; border: 1px solid #d9d9d9; border-radius: 4px;
      padding: 6px 8px; font-size: 13px; outline: none;
      &:focus { border-color: #1890ff; }
    }
  }
  .max-hint { font-size: 12px; color: #8a92a5; }
}

.drawer-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 24px; border-top: 1px solid #eee;
}

.btn {
  padding: 7px 22px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
