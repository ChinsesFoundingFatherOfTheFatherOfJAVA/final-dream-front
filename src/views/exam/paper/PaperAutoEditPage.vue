<template>
  <!-- FP-08/09 随机出卷编辑页（截图03~06）：独立全屏页 + 左侧竖排 tab
       + 抽题方式 +「抽题表」「设定分值表」两张表。
       来源为「按题库」时首列是题库；来源为「按考核点」时首列变考点名，且每个考点各有一套表单。 -->
  <div class="auto-edit">
    <header class="edit-header">
      <button class="back-btn" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>{{ paper?.name || '随机出卷' }}</h1>
      <span class="save-hint"><i class="hint-dot"></i>{{ saveHint }}</span>
      <div class="header-actions">
        <button class="btn" type="button" @click="notReady('预览')">预览</button>
        <button class="btn" type="button" @click="notReady('导出')">导出</button>
        <button v-if="!published" class="btn primary" type="button" @click="doRelease">发布</button>
        <span v-else class="sync-btn">同步试卷至考试</span>
      </div>
    </header>

    <div class="edit-body">
      <nav class="tab-rail">
        <button class="rail-tab" type="button" :class="{ active: tab === 'type' }" @click="tab = 'type'">
          <span class="rail-icon">▦</span>
          <span class="rail-text">题型</span>
        </button>
        <button class="rail-tab" type="button" :class="{ active: tab === 'overview' }" @click="tab = 'overview'">
          <span class="rail-icon">◔</span>
          <span class="rail-text">概览</span>
        </button>
      </nav>

      <section v-if="tab === 'type'" class="config">
        <div class="config-top">
          <div class="config-left">
            <p class="catalog-line">所属分类：{{ paper?.catalogName || '默认试卷分类' }}</p>

            <div class="mode-line">
              <span class="mode-label required">抽题方式</span>
              <label v-for="m in MODES" :key="m.value" class="mode-radio">
                <input type="radio" :value="m.value" :checked="quesMode === m.value"
                       :disabled="published" @change="changeMode(m.value)" />
                <span>{{ m.label }}</span>
              </label>
            </div>

            <div class="config-actions">
              <button class="btn primary" type="button" :disabled="published" @click="openSource">
                选择抽题来源 ▾
              </button>
              <button class="btn" type="button" :disabled="published || !strategies.length"
                      @click="showQuickStrategy = true">快速设置抽题策略</button>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-cell"><b>{{ summary?.quesQty ?? 0 }}</b><span>试题</span></div>
            <div class="stat-cell"><b>{{ Number(summary?.totalScore ?? 0).toFixed(2) }}</b><span>总分</span></div>
          </div>
        </div>

        <p v-if="!strategies.length" class="empty-tip">
          还没有抽题来源，先点「选择抽题来源」选题库或考核点
        </p>

        <!-- 抽题表 -->
        <div v-else class="table-card">
          <table class="matrix pick-table">
            <thead>
              <tr>
                <th class="col-lib">{{ isPointSource ? '考核点名称' : '题库名称' }} ▾</th>
                <template v-if="quesMode === 0">
                  <th class="col-level">难度</th>
                  <th v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">{{ t.label }}</th>
                </template>
                <template v-else-if="quesMode === 1">
                  <th v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">{{ t.label }}</th>
                </template>
                <template v-else-if="quesMode === 2">
                  <th v-for="lv in LEVELS" :key="lv.value" class="col-cell">{{ lv.label }}</th>
                </template>
                <template v-else>
                  <th class="col-cell">试题数量</th>
                </template>
                <th class="col-op">操作</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="item in strategies" :key="rowKey(item)">
                <!-- 题型+难度：一个来源占三行 -->
                <template v-if="quesMode === 0">
                  <tr v-for="(lv, li) in LEVELS" :key="rowKey(item) + '-' + lv.value">
                    <td v-if="li === 0" :rowspan="LEVELS.length" class="col-lib lib-cell">
                      <SourceMeta :item="item" :point-source="isPointSource" :total="rowScore(item)" />
                    </td>
                    <td class="col-level">{{ lv.label }}</td>
                    <td v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">
                      <QuantityCell :value="cellQty(item, lv.value, t.key)"
                                    :max="cellMax(item, lv.value, t.key)" :disabled="published"
                                    @change="setCellQty(item, lv.value, t.key, $event)" />
                    </td>
                    <td v-if="li === 0" :rowspan="LEVELS.length" class="col-op">
                      <span class="link" @click="removeSource(item)">移除</span>
                    </td>
                  </tr>
                </template>

                <!-- 其它三态：一个来源一行 -->
                <tr v-else>
                  <td class="col-lib lib-cell">
                    <SourceMeta :item="item" :point-source="isPointSource" :total="rowScore(item)" />
                  </td>
                  <template v-if="quesMode === 1">
                    <td v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">
                      <QuantityCell :value="typeQty(item, t.key)" :max="typeMax(item, t.key)"
                                    :disabled="published" @change="setTypeQty(item, t.key, $event)" />
                    </td>
                  </template>
                  <template v-else-if="quesMode === 2">
                    <td v-for="lv in LEVELS" :key="lv.value" class="col-cell">
                      <QuantityCell :value="levelQty(item, lv.value)" :max="levelMax(item, lv.value)"
                                    :disabled="published" @change="setLevelQty(item, lv.value, $event)" />
                    </td>
                  </template>
                  <template v-else>
                    <td class="col-cell">
                      <QuantityCell :value="needQty(item)" :max="needMax(item)" :disabled="published"
                                    @change="setNeedQty(item, $event)" />
                    </td>
                  </template>
                  <td class="col-op"><span class="link" @click="removeSource(item)">移除</span></td>
                </tr>
              </template>

              <tr class="sum-row">
                <td class="col-lib">合计（题数）</td>
                <template v-if="quesMode === 0">
                  <td class="col-level"></td>
                  <td v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">{{ summaryOfType(t.key) }}</td>
                </template>
                <template v-else-if="quesMode === 1">
                  <td v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">{{ summaryOfType(t.key) }}</td>
                </template>
                <template v-else-if="quesMode === 2">
                  <td v-for="lv in LEVELS" :key="lv.value" class="col-cell">{{ summaryOfLevel(lv.value) }}</td>
                </template>
                <template v-else>
                  <td class="col-cell">{{ summary?.quesQty ?? 0 }}</td>
                </template>
                <td class="col-op"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 设定分值表：整卷共用一套（原平台行为——不按题库/考点分行，避免考点多时逐个设分） -->
        <div v-if="strategies.length" class="table-card">
          <table class="matrix score-table">
            <thead>
              <tr>
                <th class="col-head">设定分值</th>
                <template v-if="quesMode === 0">
                  <th class="col-level">难度</th>
                  <th v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">{{ t.label }}</th>
                </template>
                <template v-else-if="quesMode === 1">
                  <th v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">{{ t.label }}</th>
                </template>
                <template v-else-if="quesMode === 2">
                  <th v-for="lv in LEVELS" :key="lv.value" class="col-cell">{{ lv.label }}</th>
                </template>
                <template v-else>
                  <th class="col-cell">分值</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <template v-if="quesMode === 0">
                <tr v-for="(lv, li) in LEVELS" :key="'s-' + lv.value">
                  <td v-if="li === 0" :rowspan="LEVELS.length" class="col-head">根据题型和难度设置分值</td>
                  <td class="col-level">{{ lv.label }}</td>
                  <td v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">
                    <ScoreCell :key-prefix="t.key" :label="t.key === 'multi' ? '满分' : ''"
                               :score="cellScore(lv.value, t.key)" :miss-score="cellMiss(lv.value)"
                               :miss-type="cellMissType(lv.value)" :disabled="published"
                               @score="setCellScore(lv.value, t.key, $event)"
                               @miss="setCellMiss(lv.value, $event)"
                               @miss-type="setCellMissType(lv.value, $event)" />
                  </td>
                </tr>
              </template>

              <tr v-else-if="quesMode === 1">
                <td class="col-head">根据题型设置分值</td>
                <td v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">
                  <ScoreCell :key-prefix="t.key" :label="t.key === 'multi' ? '满分' : ''"
                             :score="typeScore(t.key)" :miss-score="typeMiss(t.key)"
                             :miss-type="typeMissType(t.key)" :disabled="published"
                             @score="setTypeScore(t.key, $event)"
                             @miss="setTypeMiss(t.key, $event)"
                             @miss-type="setTypeMissType(t.key, $event)" />
                </td>
              </tr>

              <tr v-else-if="quesMode === 2">
                <td class="col-head">根据难度设置分值</td>
                <td v-for="lv in LEVELS" :key="lv.value" class="col-cell">
                  <ScoreCell key-prefix="" label="" :score="levelScore(lv.value)"
                             :miss-score="0" :miss-type="0" :disabled="published"
                             @score="setLevelScore(lv.value, $event)" />
                </td>
              </tr>

              <tr v-else>
                <td class="col-head">根据数量设置分值</td>
                <td class="col-cell">
                  <ScoreCell key-prefix="" label="" :score="singleScore()" :miss-score="0"
                             :miss-type="0" :disabled="published" @score="setSingleScore($event)" />
                </td>
              </tr>

              <tr class="sum-row">
                <td class="col-head">合计（总分）</td>
                <template v-if="quesMode === 0">
                  <td class="col-level"></td>
                  <td v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">{{ scoreSumOfType(t.key) }}</td>
                </template>
                <template v-else-if="quesMode === 1">
                  <td v-for="t in TYPE_KEYS" :key="t.key" class="col-cell">{{ scoreSumOfType(t.key) }}</td>
                </template>
                <template v-else-if="quesMode === 2">
                  <td v-for="lv in LEVELS" :key="lv.value" class="col-cell">{{ scoreSumOfLevel(lv.value) }}</td>
                </template>
                <template v-else>
                  <td class="col-cell">{{ Number(summary?.totalScore ?? 0).toFixed(2) }}</td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <PaperOverviewPanel v-else :paper-id="paperId" />
    </div>

    <StrategySourceDrawer
      v-if="showSource"
      :paper-id="paperId"
      :initial-lib-ids="initialLibIds"
      :initial-point-ids="initialPointIds"
      :initial-source-type="sourceTypeValue"
      @close="showSource = false"
      @saved="loadAll"
    />
    <StrategyQuickDrawer
      v-if="showQuickStrategy"
      :paper-id="paperId"
      :strategies="strategies"
      :ques-mode="quesMode"
      :total-ques="summary?.quesQty ?? 0"
      @close="showQuickStrategy = false"
      @saved="onQuickSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import { confirmDialog } from '@/utils/confirmDialog'
import {
  batchStrategyCell, getPaperDetail, getPaperStrategy, getStrategySummary, releasePaper,
  setPaperStrategySource, updatePaperQuesMode, updateStrategyCell,
  type PaperDetail, type StrategyItem, type StrategySummary
} from '@/api/paper'
import PaperOverviewPanel from './components/PaperOverviewPanel.vue'
import StrategySourceDrawer from './components/StrategySourceDrawer.vue'
import StrategyQuickDrawer from './components/StrategyQuickDrawer.vue'

const route = useRoute()
const router = useRouter()
const paperId = String(route.query.paperId ?? '')

const MODES = [
  { value: 0, label: '按试题题型+难度' },
  { value: 1, label: '按试题题型' },
  { value: 2, label: '按试题难度' },
  { value: 3, label: '按试题数量' }
]
const TYPE_KEYS = [
  { key: 'single', label: '单选题' },
  { key: 'multi', label: '多选题' },
  { key: 'judge', label: '判断题' },
  { key: 'fill', label: '填空题' },
  { key: 'qa', label: '问答题' }
]
const LEVELS = [{ value: 0, label: '易' }, { value: 1, label: '中' }, { value: 2, label: '难' }]

const paper = ref<PaperDetail | null>(null)
const strategies = ref<StrategyItem[]>([])
const summary = ref<StrategySummary | null>(null)
const quesMode = ref(0)
const saveHint = ref('试卷将自动保存')
const tab = ref<'type' | 'overview'>('type')
const showSource = ref(false)
const showQuickStrategy = ref(false)

const published = computed(() => paper.value?.status === 4)
/** 来源方式以第一条策略行为准（同一份策略里来源类型是一致的）。 */
const sourceTypeValue = computed(() => Number(strategies.value[0]?.selectedSourceTypeValue ?? 0))
const isPointSource = computed(() => sourceTypeValue.value === 1)
const initialLibIds = computed(() =>
  isPointSource.value ? [] : Array.from(new Set(strategies.value.map(s => s.libId))))
const initialPointIds = computed(() =>
  isPointSource.value ? strategies.value.map(s => s.indicatorId).filter(Boolean) as string[] : [])

/** 策略行唯一键：按考核点时同一库会有多条，必须带考点。 */
const rowKey = (item: StrategyItem) => `${item.libId}#${item.indicatorId ?? ''}`

// ---------------- 取值 ----------------
type Cell = Record<string, number>

const cellOf = (item: StrategyItem | undefined, levelType: number): Cell | undefined =>
  item ? ((item.settingCount as unknown as Cell[]) ?? []).find(c => Number(c.levelType) === levelType) : undefined

const cellQty = (item: StrategyItem, level: number, key: string) =>
  Number(cellOf(item, level)?.[key + 'Qty'] ?? 0)
const cellMax = (item: StrategyItem, level: number, key: string) =>
  Number(cellOf(item, level)?.[key + 'MaxQty'] ?? 0)

const typeQty = (item: StrategyItem, key: string) =>
  LEVELS.reduce((sum, lv) => sum + cellQty(item, lv.value, key), 0)
const typeMax = (item: StrategyItem, key: string) =>
  LEVELS.reduce((sum, lv) => sum + cellMax(item, lv.value, key), 0)

const levelQty = (item: StrategyItem, level: number) => {
  const c = cellOf(item, level)
  return TYPE_KEYS.reduce((sum, t) => sum + Number(c?.[t.key + 'Qty'] ?? 0), 0)
}
const levelMax = (item: StrategyItem, level: number) => {
  const c = cellOf(item, level)
  return TYPE_KEYS.reduce((sum, t) => sum + Number(c?.[t.key + 'MaxQty'] ?? 0), 0)
}

const needQty = (item: StrategyItem) =>
  LEVELS.reduce((sum, lv) => sum + Number(cellOf(item, lv.value)?.needQty ?? 0), 0)
const needMax = (item: StrategyItem) =>
  LEVELS.reduce((sum, lv) => sum + Number(cellOf(item, lv.value)?.maxQty ?? 0), 0)

/** 分值是整卷共用的一套：展示取第一条来源，写回覆盖所有来源行。 */
const cellScore = (level: number, key: string) =>
  Number(cellOf(strategies.value[0], level)?.[key + 'Score'] ?? 0)
const cellMiss = (level: number) =>
  Number(cellOf(strategies.value[0], level)?.multiMissScore ?? 0)
const cellMissType = (level: number) =>
  Number(cellOf(strategies.value[0], level)?.multiMissScoreType ?? 0)

const typeScore = (key: string) => cellScore(0, key)
const typeMiss = (_key: string) => cellMiss(0)
const typeMissType = (_key: string) => cellMissType(0)
const levelScore = (level: number) => cellScore(level, 'single')
const singleScore = () => cellScore(0, 'single')

// ---------------- 合计 ----------------
const summaryOfType = (key: string) =>
  strategies.value.reduce((sum, item) => sum + typeQty(item, key), 0)
const summaryOfLevel = (level: number) =>
  strategies.value.reduce((sum, item) => sum + levelQty(item, level), 0)

const rowScore = (item: StrategyItem) => {
  let total = 0
  for (const lv of LEVELS) {
    for (const t of TYPE_KEYS) {
      total += cellQty(item, lv.value, t.key) * cellScore(lv.value, t.key)
    }
  }
  return Number(total.toFixed(2))
}

const scoreSumOfType = (key: string) =>
  Number(strategies.value.reduce((sum, item) => sum + typeQty(item, key) * typeScore(key), 0).toFixed(2))
const scoreSumOfLevel = (level: number) =>
  Number(strategies.value.reduce((sum, item) => sum + levelQty(item, level) * levelScore(level), 0).toFixed(2))

// ---------------- 写回 ----------------
/** 所有写回都要带 indicatorId，否则按考核点模式会定位到别的行。 */
const idOf = (item: StrategyItem) => item.indicatorId ?? undefined

const setCellQty = async (item: StrategyItem, level: number, key: string, value: number) => {
  try {
    await updateStrategyCell(paperId, {
      libId: item.libId, indicatorId: idOf(item), levelType: level, field: key + 'Qty', value
    })
    await loadAll()
  } catch { await loadAll() }
}

const setTypeQty = async (item: StrategyItem, key: string, value: number) => {
  try {
    await batchStrategyCell(paperId, LEVELS.map(lv => ({
      libId: item.libId, indicatorId: idOf(item), levelType: lv.value,
      field: key + 'Qty', value: lv.value === 0 ? value : 0
    })))
    await loadAll()
  } catch { await loadAll() }
}

const setLevelQty = async (item: StrategyItem, level: number, value: number) => {
  try {
    await batchStrategyCell(paperId, TYPE_KEYS.map((t, i) => ({
      libId: item.libId, indicatorId: idOf(item), levelType: level,
      field: t.key + 'Qty', value: i === 0 ? value : 0
    })))
    await loadAll()
  } catch { await loadAll() }
}

const setNeedQty = async (item: StrategyItem, value: number) => {
  try {
    await batchStrategyCell(paperId, LEVELS.map(lv => ({
      libId: item.libId, indicatorId: idOf(item), levelType: lv.value,
      field: 'needQty', value: lv.value === 0 ? value : 0
    })))
    await loadAll()
  } catch { await loadAll() }
}

/**
 * 分值写回：分值整卷共用一套，所以同一处改动要覆盖所有来源行；
 * 写完走 loadAll() 而不是只刷汇总——来源格里的"总分"也要跟着变。
 */
const writeScores = async (cells: {
  libId: string; indicatorId?: string; levelType: number; field: string; value: number
}[]) => {
  try {
    await batchStrategyCell(paperId, cells)
  } finally {
    await loadAll()
  }
}

const eachRow = () => strategies.value.map(i => ({ libId: i.libId, indicatorId: idOf(i) }))

/** 题型+难度：改的是一格，覆盖所有来源的同格。 */
const setCellScore = (level: number, key: string, value: number) =>
  writeScores(eachRow().map(r => ({ ...r, levelType: level, field: key + 'Score', value })))

const setCellMiss = (level: number, value: number) =>
  writeScores(eachRow().map(r => ({ ...r, levelType: level, field: 'multiMissScore', value })))

const setCellMissType = (level: number, value: number) =>
  writeScores(eachRow().map(r => ({ ...r, levelType: level, field: 'multiMissScoreType', value })))

/** 按题型：该题型的分值在三种难度上统一。 */
const setTypeScore = (key: string, value: number) =>
  writeScores(eachRow().flatMap(r => LEVELS.map(lv => ({
    ...r, levelType: lv.value, field: key + 'Score', value
  }))))

const setTypeMiss = (_key: string, value: number) =>
  writeScores(eachRow().flatMap(r => LEVELS.map(lv => ({
    ...r, levelType: lv.value, field: 'multiMissScore', value
  }))))

const setTypeMissType = (_key: string, value: number) =>
  writeScores(eachRow().flatMap(r => LEVELS.map(lv => ({
    ...r, levelType: lv.value, field: 'multiMissScoreType', value
  }))))

/** 按难度：该难度的分值写进五种题型。 */
const setLevelScore = (level: number, value: number) =>
  writeScores(eachRow().flatMap(r => TYPE_KEYS.map(t => ({
    ...r, levelType: level, field: t.key + 'Score', value
  }))))

const setSingleScore = (value: number) =>
  writeScores(eachRow().flatMap(r => LEVELS.map(lv => ({
    ...r, levelType: lv.value, field: 'singleScore', value
  }))))

// ---------------- 其它 ----------------
const changeMode = async (mode: number) => {
  try {
    await updatePaperQuesMode(paperId, mode)
    toast.success('抽题方式已切换')
    loadAll()
  } catch { /* 拦截器已提示 */ }
}

const openSource = () => { showSource.value = true }

/** 移除一个来源（按考核点时 = 移除该考点）：把剩下的来源整体重提交。 */
const removeSource = async (item: StrategyItem) => {
  const label = isPointSource.value ? `考核点「${item.pointName || item.libName}」` : `题库「${item.libName}」`
  const ok = await confirmDialog({
    title: `确认移除${label}？`,
    message: '移除后该来源的题量与分值设置一并清除',
    danger: true
  })
  if (!ok) return
  const keep = strategies.value.filter(s => rowKey(s) !== rowKey(item))
  const grouped = new Map<string, string[]>()
  for (const row of keep) {
    if (!grouped.has(row.libId)) grouped.set(row.libId, [])
    if (row.indicatorId) grouped.get(row.libId)!.push(row.indicatorId)
  }
  try {
    await setPaperStrategySource(paperId, {
      sourceType: sourceTypeValue.value,
      libs: Array.from(grouped.entries()).map(([libId, pointIds]) => ({ libId, pointIds }))
    })
    toast.success('已移除')
    loadAll()
  } catch { /* 拦截器已提示 */ }
}

const onQuickSaved = () => {
  showQuickStrategy.value = false
  loadAll()
}

const notReady = (name: string) => toast.warn(`${name}待考试模块联动后开放`)

const doRelease = async () => {
  const ok = await confirmDialog({
    title: '确认发布该试卷？',
    message: '发布后抽题策略将锁定，仅可修改题干/选项/答案/解析',
    danger: false
  })
  if (!ok) return
  try {
    await releasePaper(paperId)
    toast.success('试卷已发布')
    loadAll()
  } catch { /* 拦截器已提示 */ }
}

const goBack = () => router.push(`/exam/paper/detail?paperId=${paperId}`)

const loadAll = async () => {
  try {
    paper.value = await getPaperDetail(paperId)
    quesMode.value = paper.value.quesMode ?? 0
    strategies.value = await getPaperStrategy(paperId)
    summary.value = await getStrategySummary(paperId)
  } catch { /* 拦截器已提示 */ }
}

onMounted(loadAll)

// ---------------- 轻量内联组件 ----------------
/** 来源单元格：按题库显示库名+分类+考核点；按考核点显示考点名+所属题库+分类。 */
const SourceMeta = defineComponent({
  props: {
    item: { type: Object as () => StrategyItem, required: true },
    pointSource: { type: Boolean, default: false },
    total: { type: Number, required: true }
  },
  setup: (p) => () => {
    const lines = p.pointSource
      ? [
        h('p', { class: 'lib-name' }, p.item.pointName || '未命名考点'),
        h('p', { class: 'meta-line' }, `题库：${p.item.libName}`),
        h('p', { class: 'meta-line' }, `所属题库分类：${p.item.catalogName || '默认题库分类'}`)
      ]
      : [
        h('p', { class: 'lib-name' }, p.item.libName),
        h('p', { class: 'meta-line' }, `所属题库分类：${p.item.catalogName || '默认题库分类'}`),
        h('p', { class: 'meta-line' }, `考核点：${p.item.selectedPointIds && p.item.selectedPointIds !== '1' ? '已指定' : '所有考核点'}`)
      ]
    lines.push(h('p', { class: 'meta-line total' }, ['总分：', h('span', { class: 'orange' }, String(p.total))]))
    return h('div', { class: 'lib-meta' }, lines)
  }
})

const QuantityCell = defineComponent({
  props: {
    value: { type: Number, required: true },
    max: { type: Number, required: true },
    disabled: { type: Boolean, default: false }
  },
  emits: ['change'],
  setup: (p, { emit }) => () => h('div', { class: 'qty-cell' }, [
    h('input', {
      type: 'number', min: 0, class: 'qty-input', value: p.value, disabled: p.disabled,
      onChange: (e: Event) => emit('change', Number((e.target as HTMLInputElement).value) || 0)
    }),
    h('span', { class: 'max-hint' }, `≤${p.max}`)
  ])
})

const ScoreCell = defineComponent({
  props: {
    keyPrefix: { type: String, default: '' },
    label: { type: String, default: '' },
    score: { type: Number, required: true },
    missScore: { type: Number, required: true },
    missType: { type: Number, required: true },
    disabled: { type: Boolean, default: false }
  },
  emits: ['score', 'miss', 'miss-type'],
  setup: (p, { emit }) => () => {
    const nodes: ReturnType<typeof h>[] = [
      h('div', { class: 'score-line' }, [
        p.label ? h('span', { class: 'score-label' }, p.label) : null,
        h('input', {
          type: 'number', min: 0, step: 0.5, class: 'score-input', value: p.score, disabled: p.disabled,
          onChange: (e: Event) => emit('score', Number((e.target as HTMLInputElement).value) || 0)
        }),
        h('span', { class: 'score-unit' }, '分')
      ])
    ]
    if (p.keyPrefix === 'multi') {
      nodes.push(h('div', { class: 'miss-block' }, [
        h('p', { class: 'miss-title' }, '漏选得分'),
        h('label', { class: 'miss-radio' }, [
          h('input', {
            type: 'radio', checked: p.missType === 0, disabled: p.disabled,
            onChange: () => emit('miss-type', 0)
          }),
          h('span', {}, '统一得'),
          h('input', {
            type: 'number', min: 0, step: 0.5, class: 'miss-input', value: p.missScore, disabled: p.disabled,
            onChange: (e: Event) => emit('miss', Number((e.target as HTMLInputElement).value) || 0)
          }),
          h('span', {}, '分')
        ]),
        h('label', { class: 'miss-radio' }, [
          h('input', {
            type: 'radio', checked: p.missType === 2, disabled: p.disabled,
            onChange: () => emit('miss-type', 2)
          }),
          h('span', {}, '按漏选数量均分')
        ])
      ]))
    }
    return nodes
  }
})
</script>

<style scoped lang="scss">
.auto-edit { height: 100vh; display: flex; flex-direction: column; background: #fff; }

.edit-header {
  flex-shrink: 0; display: flex; align-items: center; gap: 12px;
  height: 56px; padding: 0 20px; border-bottom: 1px solid #e8eaef;

  .back-btn { width: 26px; height: 26px; border: none; background: none; font-size: 20px; color: #4a5368; cursor: pointer; }
  h1 { margin: 0; font-size: 15px; font-weight: 500; color: #303133; }
  .save-hint {
    display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #8a92a5;
    .hint-dot { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid #c7d0de; display: inline-block; }
  }
  .header-actions { margin-left: auto; display: flex; gap: 10px; }
  .sync-btn { padding: 6px 14px; border: 1px solid #e5e8ef; border-radius: 4px; background: #f5f7fa; color: #b0b7c3; font-size: 13px; }
}

.edit-body { flex: 1; min-height: 0; display: flex; }

.tab-rail {
  flex: 0 0 58px; border-right: 1px solid #e8eaef;
  display: flex; flex-direction: column; padding-top: 14px; gap: 10px;

  .rail-tab {
    position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 10px 0; border: none; background: none; cursor: pointer; color: #8a92a5; font-size: 12px;

    .rail-icon { font-size: 18px; line-height: 1; }
    .rail-text { writing-mode: vertical-rl; letter-spacing: 2px; }
    &.active { color: #1890ff; }
    &.active::before {
      content: ''; position: absolute; left: 0; top: 8px; bottom: 8px;
      width: 3px; background: #1890ff; border-radius: 0 2px 2px 0;
    }
  }
}

.config { flex: 1; min-width: 0; overflow-y: auto; padding: 18px 22px 40px; }
.config-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.config-left { min-width: 0; }
.catalog-line { margin: 0 0 12px; font-size: 13px; color: #4a5368; }

.mode-line {
  display: flex; align-items: center; flex-wrap: wrap; gap: 22px; margin-bottom: 14px;

  .mode-label { font-size: 13px; color: #4a5368; }
  .mode-label.required::before { content: '＊'; color: #f5222d; margin-right: 2px; }
  .mode-radio {
    display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #4a5368; cursor: pointer;
    input { margin: 0; accent-color: #1890ff; }
  }
}

.config-actions { display: flex; gap: 12px; }

.stat-card {
  flex: 0 0 auto; display: flex; align-items: center; gap: 30px;
  padding: 12px 26px; background: #fafbfd; border-radius: 6px;

  .stat-cell {
    display: flex; flex-direction: column; align-items: center; gap: 2px;
    b { font-size: 20px; font-weight: 500; color: #303133; }
    span { font-size: 12px; color: #8a92a5; }
  }
}

.empty-tip {
  margin: 30px 0; padding: 50px 20px; border: 1px dashed #d9e1ec; border-radius: 8px;
  text-align: center; color: #8a92a5; font-size: 13px;
}

.table-card { margin-top: 18px; }

.matrix {
  width: 100%; border-collapse: collapse; font-size: 13px;

  th, td { border: 1px solid #eef1f6; padding: 10px 12px; text-align: center; vertical-align: middle; }
  th { background: #f7f8fa; color: #303133; font-weight: 500; }
  .col-lib { width: 300px; text-align: left; }
  .col-level { width: 80px; color: #4a5368; }
  .col-cell { min-width: 120px; }
  .col-op { width: 90px; }
  .col-head { width: 260px; text-align: left; color: #303133; }

  .sum-row td { background: #f7f8fa; color: #303133; }
}

.lib-cell { text-align: left !important; }
.head-note { margin: 8px 0 0; font-size: 12px; color: #8a92a5; }

:deep(.lib-meta) {
  .lib-name { margin: 0 0 6px; font-size: 13px; color: #303133; }
  .meta-line { margin: 0 0 4px; font-size: 12px; color: #8a92a5; }
  .orange { color: #fa8c16; }
}

:deep(.qty-cell) {
  display: flex; align-items: center; justify-content: center; gap: 6px;

  .qty-input {
    width: 66px; border: 1px solid #d9d9d9; border-radius: 4px;
    padding: 5px 6px; font-size: 13px; outline: none; text-align: center;
    &:focus { border-color: #1890ff; }
    &:disabled { background: #f5f7fa; }
  }
  .max-hint { font-size: 12px; color: #8a92a5; }
}

:deep(.score-line) {
  display: flex; align-items: center; justify-content: center; gap: 6px;

  .score-label { font-size: 12px; color: #4a5368; }
  .score-input, .miss-input {
    width: 66px; border: 1px solid #d9d9d9; border-radius: 4px;
    padding: 5px 6px; font-size: 13px; outline: none; text-align: center;
    &:focus { border-color: #1890ff; }
    &:disabled { background: #f5f7fa; }
  }
  .score-unit { font-size: 12px; color: #8a92a5; }
}

:deep(.miss-block) {
  margin-top: 10px; text-align: left;

  .miss-title { margin: 0 0 6px; font-size: 12px; color: #4a5368; }
  .miss-radio {
    display: flex; align-items: center; gap: 4px; margin-bottom: 6px;
    font-size: 12px; color: #4a5368; cursor: pointer;
    input[type="radio"] { margin: 0; accent-color: #1890ff; }
  }
}

.link { color: #1890ff; cursor: pointer; &:hover { text-decoration: underline; } }

.btn {
  padding: 6px 16px; border: 1px solid #d9d9d9; border-radius: 4px;
  background: #fff; font-size: 13px; color: #4a5368; cursor: pointer;

  &.primary { background: #1890ff; border-color: #1890ff; color: #fff; }
  &:disabled { opacity: .6; cursor: not-allowed; }
}
</style>
