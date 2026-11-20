<template>
  <div class="data-analysis" v-loading="loading">
    <div class="analysis-layout">
    <div class="unit-nav-holder">
      <aside class="unit-menu">
        <div class="menu-title">场景单元</div>
        <div class="unit-nav-list">
          <div
            v-for="unit in units"
            :key="unit.id"
            class="menu-item"
            :class="{ active: unit.id === selectedUnitId }"
            role="button"
            tabindex="0"
            @keydown.enter.prevent="selectUnit(unit.id)"
            @click="selectUnit(unit.id)"
          >
            <span class="unit-idx">{{ String(unit.sortOrder).padStart(2, '0') }}</span>
            <span class="unit-name">{{ unit.unitName }}</span>
          </div>
        </div>
      </aside>
    </div>

    <div class="analysis-content">
      <div class="modebar" role="tablist" aria-label="数据类型">
        <button
          type="button"
          role="tab"
          class="mode-tab"
          :class="{ 'is-active': studyMode === 'training' }"
          :aria-selected="studyMode === 'training'"
          @click="studyMode = 'training'"
        >训练数据</button>
        <button
          type="button"
          role="tab"
          class="mode-tab"
          :class="{ 'is-active': studyMode === 'exam' }"
          :aria-selected="studyMode === 'exam'"
          @click="studyMode = 'exam'"
        >考核数据</button>
      </div>

      <div class="section-title">总体概览</div>
      <div class="overview-cards">
        <div class="overview-card">
          <div class="ov-value">{{ overview.practiced }} / {{ overview.totalUser }}</div>
          <div class="ov-label">已练习学员</div>
        </div>
        <div class="overview-card">
          <div class="ov-value">{{ overview.totalCount }} <i>次</i></div>
          <div class="ov-label">练习总次数</div>
        </div>
        <div class="overview-card">
          <!-- 无报告时通过率没有分母，显示占位符而不是 0%（0% 会被读成"没人通过"）。
               单位 <i> 始终渲染（值为 — 时也保留），否则「数值+小号单位」的结构在有/无数据两种状态下
               会漂移成两种 DOM，视觉契约的 stat-val-unit 数量检查会随之假红。 -->
          <div class="ov-value">
            {{ overview.totalCount ? overview.passRate : '—' }}<i v-if="overview.totalCount">%</i>
          </div>
          <div class="ov-label">场景通过率</div>
        </div>
      </div>

      <div class="scope-row">
        <span class="scope-label">统计范围</span>
        <el-select v-model="scope" class="scope-select" aria-label="统计范围">
          <el-option v-for="opt in scopeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
      </div>

      <div class="panel">
        <div class="panel-title-row">
          <div class="panel-title">总分分布</div>
          <div class="avg-tag">均分 <b>{{ formatNumber(distribution.avg) }}</b> 分</div>
        </div>
        <div class="dist-rows">
          <div v-for="row in distRows" :key="row.range" class="dist-row">
            <span class="dist-range">{{ row.range }}</span>
            <div class="dist-bar-track">
              <div class="dist-bar" :style="{ width: barWidth(row.value) }"></div>
            </div>
            <span class="dist-value">{{ formatNumber(row.value) }} {{ unitLabel }}</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title-row">
          <div class="panel-title">维度掌握情况</div>
          <div class="panel-sub">
            共 {{ scope === 'all' ? `${overview.totalCount} 次记录` : `${overview.practiced} 人` }}
          </div>
        </div>
        <div v-for="dim in dimensions" :key="dim.id" class="mastery-row">
          <div class="mastery-head">
            <span class="mastery-name">{{ dim.dimensionName }}</span>
            <span class="mastery-avg">
              {{ masteryOf(dim.dimensionName)?.empty === false
                ? `均分 ${formatNumber(masteryOf(dim.dimensionName)!.avg)}`
                : '均分 —' }}
            </span>
          </div>
          <template v-if="masteryOf(dim.dimensionName) && !masteryOf(dim.dimensionName)!.empty">
            <div class="mastery-bar">
              <div v-if="masteryOf(dim.dimensionName)!.low > 0" class="seg seg-low is-weak" :style="{ width: pct(masteryOf(dim.dimensionName)!.low) }"></div>
              <div v-if="masteryOf(dim.dimensionName)!.mid > 0" class="seg seg-mid is-mid" :style="{ width: pct(masteryOf(dim.dimensionName)!.mid) }"></div>
              <div v-if="masteryOf(dim.dimensionName)!.high > 0" class="seg seg-high is-good" :style="{ width: pct(masteryOf(dim.dimensionName)!.high) }"></div>
            </div>
            <div class="mastery-foot">
              <span class="mastery-band">
                <i class="band-dot low"></i><span class="band-range">&lt;70</span>
                <b class="band-val">{{ masteryOf(dim.dimensionName)!.low }} {{ unitLabel }}</b>
              </span>
              <span class="mastery-band">
                <i class="band-dot mid"></i><span class="band-range">70-89</span>
                <b class="band-val">{{ masteryOf(dim.dimensionName)!.mid }} {{ unitLabel }}</b>
              </span>
              <span class="mastery-band">
                <i class="band-dot high"></i><span class="band-range">90-100</span>
                <b class="band-val">{{ masteryOf(dim.dimensionName)!.high }} {{ unitLabel }}</b>
              </span>
            </div>
          </template>
          <div v-else class="mastery-empty">该维度暂无练习数据</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title-row">
          <div class="panel-title">维度掌握变化</div>
          <div class="cv-endpoint">
            <span class="cv-endpoint__label">对比终点</span>
            <el-select v-model="compareEnd" class="cv-endpoint__select" aria-label="对比终点">
              <el-option label="最近一次" value="last" />
              <el-option label="最高" value="max" />
            </el-select>
          </div>
        </div>
        <div class="change-head">
          <span class="change-name">维度</span>
          <span class="change-nums">首次 → {{ compareEndLabel }}</span>
          <span class="change-track-head">变化幅度</span>
        </div>
        <div v-for="dim in dimensions" :key="dim.id" class="change-row">
          <span class="change-name">{{ dim.dimensionName }}</span>
          <span class="change-nums">
            <template v-if="changeOf(dim.dimensionName)?.firstScore != null">
              {{ formatNumber(changeOf(dim.dimensionName)!.firstScore) }} →
              {{ formatNumber(endScoreOf(dim.dimensionName)) }}
            </template>
            <span v-else>—</span>
          </span>
          <div class="change-track">
            <div
              v-if="changeOf(dim.dimensionName)?.firstScore != null && !changeOf(dim.dimensionName)!.notSecondTime"
              class="change-fill"
              :class="deltaOf(dim.dimensionName) >= 0 ? 'up' : 'down'"
              :style="{ width: Math.min(100, Math.abs(deltaOf(dim.dimensionName)) * 8) + '%' }"
            ></div>
          </div>
          <span class="change-delta" :class="deltaOf(dim.dimensionName) ? (deltaOf(dim.dimensionName) >= 0 ? 'up' : 'down') : ''">
            <template v-if="changeOf(dim.dimensionName)?.firstScore != null && !changeOf(dim.dimensionName)!.notSecondTime">
              {{ deltaOf(dim.dimensionName) > 0 ? '+' : '' }}{{ formatNumber(deltaOf(dim.dimensionName)) }}
            </template>
            <template v-else>—</template>
          </span>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// FP-20 数据分析（真实统计，接口 GET /act/admin/theme/{id}/analysis）。
// 一条主线：把「场景单元 × 统计范围 × 对比终点 × 训练/考核」四个维度交给服务端，
// 前端只负责渲染——四档 scope 的口径（每人最早/最新/最高、全部报告）与单位（人/百分比）
// 全部由后端决定，前端不再自己算，也不再按 scope 猜单位（台账：旧条目缺「个人最高」档）。
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getThemeAnalysis } from '@/api/actTheme'
import type {
  ActAnalysisChange,
  ActAnalysisMastery,
  ActAnalysisScope,
  ActCompareEnd,
  ActScenarioUnit,
  ActThemeAnalysis
} from '@/types/actTheme'

const props = defineProps<{ themeId: string; units: ActScenarioUnit[] }>()

/** 原平台「统计范围」四档：最近一次 / 首次 / 全部记录 / 个人最高 */
const scopeOptions: { value: ActAnalysisScope; label: string }[] = [
  { value: 'last', label: '最近一次' },
  { value: 'first', label: '首次' },
  { value: 'all', label: '全部记录' },
  { value: 'max', label: '个人最高' },
]

const loading = ref(false)
const analysis = ref<ActThemeAnalysis | null>(null)
const selectedUnitId = ref('')
const scope = ref<ActAnalysisScope>('last')
const compareEnd = ref<ActCompareEnd>('last')
/** 训练数据 / 考核数据：studyMode 由后端按报告 studyMode 过滤，切换必须重新请求 */
const studyMode = ref<'training' | 'exam'>('training')

const compareEndLabel = computed(() => (compareEnd.value === 'max' ? '最高' : '最近一次'))
const studyModeParam = computed(() => (studyMode.value === 'exam' ? 2 : 1))

// 默认选中第 1 个；单元列表变化（版本回滚/保存）时保持选中或回退
watch(
  () => props.units,
  (units) => {
    if (units.length === 0) { selectedUnitId.value = ''; return }
    if (!units.some(u => u.id === selectedUnitId.value)) {
      selectedUnitId.value = units[0]?.id ?? ''
    }
  },
  { immediate: true }
)

/**
 * 切单元 / 范围 / 终点 / 训练考核都要重新请求：
 * 服务端按 scope 选报告集合、按 compareEnd 出终点分，一次请求只返回当前口径的一套数据
 * （四档并非同批返回，界面切下拉必须带上参数再取）。
 */
async function loadAnalysis() {
  loading.value = true
  try {
    analysis.value = await getThemeAnalysis(props.themeId, {
      sceneUnitId: selectedUnitId.value || undefined,
      scope: scope.value,
      compareEnd: compareEnd.value,
      studyMode: studyModeParam.value
    })
  } catch (e) {
    // 失败不静默：清空数据并提示，避免旧数据留在界面上被误读成本次结果
    analysis.value = null
    if (e instanceof Error && e.message) ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}

watch([selectedUnitId, scope, compareEnd, studyMode], () => void loadAnalysis())
onMounted(() => void loadAnalysis())

// ---------- 派生展示 ----------
const overview = computed(
  () =>
    analysis.value?.overview ?? {
      practiced: 0,
      totalUser: 0,
      participantCount: 0,
      totalCount: 0,
      passCount: 0,
      passRate: 0
    }
)

const distribution = computed(
  () => analysis.value?.distribution ?? { unit: 'person' as const, avg: null, segments: [] }
)

/** 维度定义以服务端返回为准（无数据的维度也在列表里），不要用本地场景单元的维度 */
const dimensions = computed(() => analysis.value?.dimensions ?? [])

const distRows = computed(() =>
  distribution.value.segments.map((s) => ({ range: s.range, value: s.value, delta: s.delta }))
)

/** 单位由后端 distribution.unit 决定（person/percent），不按 scope 猜 */
const unitLabel = computed(() => (distribution.value.unit === 'percent' ? '%' : '人'))

const masteryByName = computed(() => {
  const map: Record<string, ActAnalysisMastery> = {}
  for (const m of analysis.value?.mastery ?? []) map[m.dimensionName] = m
  return map
})

const changeByName = computed(() => {
  const map: Record<string, ActAnalysisChange> = {}
  for (const c of analysis.value?.change ?? []) map[c.dimensionName] = c
  return map
})

const masteryOf = (name: string): ActAnalysisMastery | null => masteryByName.value[name] ?? null
const changeOf = (name: string): ActAnalysisChange | null => changeByName.value[name] ?? null

/** 终点分：对比终点为「最高」时取 maxScore（个人最高分），否则取最近一次 */
const endScoreOf = (name: string): number | null => {
  const c = changeOf(name)
  if (!c) return null
  return compareEnd.value === 'max' ? c.maxScore : c.lastScore
}

/** 变化幅度随对比终点实时变化（首次已固定，只换终点） */
const deltaOf = (name: string): number => {
  const c = changeOf(name)
  if (!c || c.firstScore === null) return 0
  const end = endScoreOf(name)
  if (end === null) return 0
  return Number(end) - Number(c.firstScore)
}

/** 数值展示：后端 BigDecimal 序列化成 number，null 显示占位符（不能显示成 0） */
const formatNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : String(Number(value))

/** 条形宽度：percent 直接用值，person 按本口径最大段归一（空态全 0 → 不画条） */
function barWidth(v: number): string {
  if (v <= 0) return '0%'
  if (distribution.value.unit === 'percent') return `${Math.min(100, v)}%`
  const max = Math.max(...distribution.value.segments.map((s) => s.value), 1)
  return `${Math.max(4, (v / max) * 100)}%`
}

/** 掌握三段宽度：percent 直接按占比，person 按该维度三段总数归一 */
function pct(v: number): string {
  if (v <= 0) return '0%'
  if (distribution.value.unit === 'percent') return `${Math.min(100, v)}%`
  const total = currentMaxDist()
  if (total <= 0) return '0%'
  return `${(v / total) * 100}%`
}

function currentMaxDist(): number {
  let max = 0
  for (const dim of dimensions.value) {
    const m = masteryByName.value[dim.dimensionName]
    if (m && !m.empty) max = Math.max(max, m.low + m.mid + m.high)
  }
  return max
}

const selectUnit = (id: string) => {
  selectedUnitId.value = id
}
</script>

<style scoped lang="scss">
.data-analysis {
  display: block;
}

.analysis-layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}

.unit-nav-holder {
  width: 240px;
  flex: 0 0 240px;
}

.unit-menu {
  box-sizing: border-box;
  display: block;
  width: 240px;
  padding: 14px 12px;
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
  border-radius: 12px;
  position: sticky;
  top: 0;

  .menu-title {
    box-sizing: border-box;
    width: 214px;
    height: 36px;
    padding: 8px;
    font-size: 14px;
    line-height: 20px;
    color: var(--color-muted);
  }

  .unit-nav-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .menu-item {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 36px;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    color: var(--color-muted);
    cursor: pointer;
    transition: background 0.2s, color 0.2s;

    .unit-idx {
      width: 13px;
      flex: 0 0 13px;
      font-size: 12px;
      font-weight: 600;
      line-height: 20px;
      color: var(--color-muted);
    }

    .unit-name {
      min-width: 0;
      height: 20px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    &:hover { background: var(--color-paper-2); }
    &.active {
      height: 36px;
      min-height: 36px;
      font-weight: 600;
      background: var(--color-accent-wash);
      color: var(--color-accent);
      .unit-idx { color: var(--color-accent); }
    }
    &:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
  }
}

.analysis-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--color-paper);
}

/* 批注（2026-11-20）：训练/考核数据切换改成与主题详情一致的「下划线 tab」风格，
 * 不再用胶囊按钮；底边 2px 只在选中时点亮，切换走 token 过渡。 */
.modebar {
  display: flex;
  gap: 32px;
  /* 用内阴影画一条发丝基线，tab 底边压在上面 */
  box-shadow: inset 0 -1px 0 var(--color-rule);
}

.mode-tab {
  height: 38px;
  padding: 0 0 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: var(--color-muted);
  cursor: pointer;
  white-space: nowrap;
  transition:
    color var(--dur-short) var(--ease-out),
    border-color var(--dur-short) var(--ease-out);

  &:hover { color: var(--color-accent); }

  &.is-active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }
}

.section-title {
  height: 24px;
  font-size: 15px;
  font-weight: 500;
  line-height: 24px;
  color: var(--color-ink);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  height: 82px;
}

.overview-card {
  box-sizing: border-box;
  height: 82px;
  padding: 16px;
  background: var(--color-paper-2);
  border-radius: 12px;

  .ov-value {
    height: 20px;
    font-size: 20px;
    font-weight: 700;
    line-height: 20px;
    color: var(--color-ink);

    i {
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      line-height: 14px;
      color: var(--color-muted);
    }
  }

  .ov-label {
    height: 22px;
    margin-top: 8px;
    font-size: 14px;
    line-height: 22px;
    color: var(--color-muted);
  }
}

.scope-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 32px;

  .scope-label {
    height: 22px;
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
    color: var(--color-ink);
  }

  .scope-select {
    width: 140px;
    height: 32px;
  }

  :deep(.scope-select .el-select__wrapper) {
    box-sizing: border-box;
    width: 140px;
    height: 32px;
    min-height: 32px;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 14px;
    line-height: 22px;
    color: var(--color-muted);
    background: var(--color-paper);
    box-shadow: 0 0 0 1px var(--color-rule-2) inset;
  }
}

.panel {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 16px;
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
  border-radius: 12px;
}

.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 24px;
  margin-top: 0;
}

.panel-title {
  height: 24px;
  font-size: 15px;
  font-weight: 500;
  line-height: 24px;
  color: var(--color-ink);
}

.avg-tag,
.panel-sub {
  height: 22px;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-muted);

  b {
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
    color: var(--color-ink);
  }
}

.panel-sub { color: var(--color-muted); }

.dist-rows { margin-top: 16px; }

.dist-row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  height: 22px;
  margin-top: 0;

  & + & { margin-top: 12px; }

  .dist-range {
    width: 48px;
    flex: 0 0 48px;
    height: 22px;
    /* 台账 #6：区间文案必须比「总分分布」标题（15px/500）小且细。显式写 400，
       避免以后换了外层容器被继承成加粗；字号/行高/颜色取自原平台实测。 */
    font-size: 14px;
    font-weight: 400;
    line-height: 22px;
    color: var(--color-muted);
  }

  .dist-bar-track {
    width: 787px;
    flex: 1 1 auto;
    min-width: 0;
    height: 12px;
    background: var(--color-paper-2);
    border-radius: 3px;
    overflow: hidden;

    .dist-bar {
      height: 12px;
      background: var(--color-accent);
      border-radius: 3px;
      transition: width 0.3s;
    }
  }

  .dist-value {
    width: 88px;
    flex: 0 0 88px;
    height: 22px;
    font-size: 14px;
    line-height: 22px;
    color: var(--color-muted);
  }
}

.mastery-row {
  display: block;
  width: 100%;
  margin-top: 16px;

  .mastery-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 22px;
    margin-top: 0;

    .mastery-name {
      font-size: 14px;
      font-weight: 600;
      line-height: 22px;
      color: var(--color-ink);
    }

    .mastery-avg {
      font-size: 14px;
      line-height: 22px;
      color: var(--color-muted);
    }
  }

  .mastery-bar {
    display: flex;
    width: 100%;
    height: 18px;
    margin-top: 8px;
    background: var(--color-paper-2);
    border-radius: 5px;
    overflow: hidden;

    .seg {
      height: 18px;
      font-size: 12px;
      font-weight: 700;
      line-height: 22px;
      color: var(--color-paper);
      transition: width 0.3s;
    }
    .seg-low { background: var(--color-error); }
    .seg-mid { background: var(--color-accent); }
    .seg-high { background: var(--color-success); }
  }

  .mastery-foot {
    display: flex;
    gap: 24px;
    width: 100%;
    height: 22px;
    margin-top: 8px;
  }

  .mastery-band {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 22px;
  }

  .band-dot {
    width: 9px;
    height: 9px;
    border-radius: 3px;

    &.low { background: var(--color-error); }
    &.mid { background: var(--color-accent); }
    &.high { background: var(--color-success); }
  }

  .band-range {
    font-size: 14px;
    line-height: 22px;
    color: var(--color-muted);
  }

  .band-val {
    font-size: 14px;
    font-weight: 700;
    line-height: 22px;
    color: var(--color-ink);
  }

  .mastery-empty {
    padding: 6px 0;
    text-align: center;
    font-size: 13px;
    color: var(--color-muted);
  }
}

.cv-endpoint {
  display: flex;
  align-items: center;
  /* gap 12 取自原平台实测 .fs-insight-cv-endpoint（与面板标题行的 12 一致） */
  gap: 12px;
  height: 32px;
  font-size: 14px;
  color: var(--color-muted);

  .cv-endpoint__label {
    height: 22px;
    /* 原平台实测：对比终点标签与「统计范围」标签同规格（14px/600/#262626），
       两个控件复用同一套 label 样式类，所以这里不能按普通说明文字写 400/var(--color-muted) */
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
    color: var(--color-ink);
  }

  .cv-endpoint__select {
    width: 110px;
    height: 32px;
  }

  :deep(.cv-endpoint__select .el-select__wrapper) {
    box-sizing: border-box;
    width: 110px;
    height: 32px;
    min-height: 32px;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 14px;
    line-height: 22px;
    color: var(--color-muted);
    background: var(--color-paper);
    box-shadow: 0 0 0 1px var(--color-rule-2) inset;
  }
}

.change-head,
.change-row {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
}

.change-head {
  width: calc(100% + 16px);
  height: 36px;
  padding: 7px 8px;
  margin: 8px 0 0 -8px;
  background: var(--color-paper-2);
  border-radius: 6px;
}

.change-row {
  width: 100%;
  padding: 9px;
}

.change-name {
  width: 140px;
  flex: 0 0 140px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: var(--color-ink);
}

.change-nums {
  width: 108px;
  flex: 0 0 108px;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-muted);
}

.change-head .change-name {
  color: var(--color-muted);
}

.change-head .change-nums {
  font-weight: 600;
  color: var(--color-muted);
}

.change-track-head {
  width: 683px;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: var(--color-muted);
}

.change-track {
  flex: 1;
  min-width: 0;
  height: 8px;
  background: var(--color-paper-2);
  border-radius: 4px;
  overflow: hidden;

  .change-fill {
    height: 100%;
    border-radius: 4px;
    &.up { background: var(--color-success); }
    &.down { background: var(--color-error); }
  }
}

.change-delta {
  /* 原平台实测 64 宽（视觉契约 measured 的 cv-delta.width）；此前写死 72 属偏差，已按基准修正 */
  width: 64px;
  flex: 0 0 64px;
  height: 22px;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-rule-2);

  &.up { color: var(--color-success); }
  &.down { color: var(--color-error); }
}
</style>
