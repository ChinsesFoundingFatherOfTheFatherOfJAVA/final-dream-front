<template>
  <!-- F14 统计分析 tab：指标卡 + 分值统计 + 正确率柱状图（维度可切） -->
  <section class="list-card">
    <p v-if="!base" class="empty-cell">暂无数据，先点「分析数据」重算统计</p>

    <template v-else>
      <!-- 指标卡 -->
      <div class="cards">
        <div class="card"><b>{{ base.totalQty }}</b><span>应考人数</span></div>
        <div class="card"><b>{{ base.answerQty }}</b><span>已交卷</span></div>
        <div class="card"><b>{{ formatRate(base.answerQtyRate) }}</b><span>交卷率</span></div>
        <div class="card"><b>{{ base.passQty }}</b><span>通过人数</span></div>
        <div class="card"><b>{{ formatRate(base.passRate) }}</b><span>通过率</span></div>
        <div class="card"><b>{{ formatRate(base.oncePassRate) }}</b><span>首考通过率</span></div>
        <div class="card"><b>{{ base.answerPersonTime }}</b><span>作答人次</span></div>
        <div class="card"><b>{{ formatRate(base.excellentRate) }}</b><span>优秀率</span></div>
      </div>

      <!-- 分值统计 -->
      <div v-if="score" class="block">
        <p class="block-title">分值统计</p>
        <div class="cards small">
          <div class="card"><b>{{ score.totalScore }}</b><span>试卷总分</span></div>
          <div class="card"><b>{{ score.passScore }}</b><span>及格分</span></div>
          <div class="card">
            <b>{{ score.highestScore }}</b>
            <span>最高分 · {{ score.highestScoreFullname || '--' }}({{ score.highestScoreUserName || '--' }})</span>
          </div>
          <div class="card">
            <b>{{ score.minimumScore }}</b>
            <span>最低分 · {{ score.minimumScoreFullname || '--' }}({{ score.minimumScoreUserName || '--' }})</span>
          </div>
          <div class="card"><b>{{ score.averageScore }}</b><span>平均分</span></div>
          <div class="card"><b>{{ score.averageTime }}</b><span>平均用时（分钟）</span></div>
        </div>
      </div>

      <!-- 正确率柱状图 -->
      <div class="block">
        <div class="block-head">
          <p class="block-title">正确率统计</p>
          <div class="dim-tabs">
            <button v-for="d in DIMENSIONS" :key="d.value" class="dim-tab" type="button"
                    :class="{ active: dimension === d.value }" @click="switchDimension(d.value)">{{ d.label }}</button>
          </div>
        </div>
        <div ref="chartRef" class="chart"></div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import {
  getArrangeAnalysisOverview, getArrangeAnalysisScore, getArrangeCorrectRate,
  type ArrangeOverviewBaseInfo, type ArrangeRateItem, type ArrangeScoreInfo
} from '@/api/arrange'

const props = defineProps<{ arrangeId: string }>()

const DIMENSIONS = [
  { value: 'type' as const, label: '按题型' },
  { value: 'level' as const, label: '按难度' },
  { value: 'point' as const, label: '按考核点' }
]
const TYPE_LABELS: Record<number, string> = { 0: '单选题', 1: '多选题', 2: '判断题', 3: '填空题', 4: '问答题', 5: '组合题' }
const LEVEL_LABELS: Record<number, string> = { 0: '易', 1: '中', 2: '难' }

const base = ref<ArrangeOverviewBaseInfo | null>(null)
const score = ref<ArrangeScoreInfo | null>(null)
const rates = ref<{ quesType: ArrangeRateItem[]; difficulty: ArrangeRateItem[]; point: ArrangeRateItem[] } | null>(null)
const dimension = ref<'type' | 'level' | 'point'>('type')
const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

const formatRate = (r: number) => `${(((r ?? 0) * 100)).toFixed(2)}%`

const items = computed<ArrangeRateItem[]>(() => {
  if (!rates.value) return []
  if (dimension.value === 'type') return rates.value.quesType || []
  if (dimension.value === 'level') return rates.value.difficulty || []
  return rates.value.point || []
})

const labelOf = (key: number | string) => {
  if (dimension.value === 'type') return TYPE_LABELS[Number(key)] ?? String(key)
  if (dimension.value === 'level') return LEVEL_LABELS[Number(key)] ?? String(key)
  return String(key)
}

const renderChart = async () => {
  await nextTick()
  if (!chartRef.value) return
  chart = chart ?? echarts.init(chartRef.value)
  const data = items.value
  chart.setOption({
    grid: { left: 50, right: 20, top: 24, bottom: 46 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        const hit = data[p.dataIndex]
        return `${p.name}<br/>正确率 ${formatRate(hit?.value ?? 0)}<br/>题数 ${hit?.quesCount ?? 0}`
      }
    },
    xAxis: { type: 'category', data: data.map(d => labelOf(d.key)), axisLabel: { fontSize: 12, color: '#4a5368' } },
    yAxis: { type: 'value', max: 1, axisLabel: { formatter: (v: number) => `${Math.round(v * 100)}%`, color: '#8a92a5' } },
    series: [{
      type: 'bar',
      barMaxWidth: 42,
      data: data.map(d => d.value),
      itemStyle: { color: '#1890ff', borderRadius: [3, 3, 0, 0] },
      label: { show: true, position: 'top', formatter: (p: any) => formatRate(Number(p.value)) }
    }]
  }, true)
}

const switchDimension = async (d: 'type' | 'level' | 'point') => {
  dimension.value = d
  await renderChart()
}

const load = async () => {
  try {
    base.value = (await getArrangeAnalysisOverview(props.arrangeId)).baseInfo
  } catch { /* 拦截器已提示 */ }
  try {
    score.value = (await getArrangeAnalysisScore(props.arrangeId)).scoreInfo
  } catch { /* 拦截器已提示 */ }
  try {
    rates.value = (await getArrangeCorrectRate(props.arrangeId, dimension.value)).accuracyRate
  } catch { /* 拦截器已提示 */ }
  await renderChart()
}

const resize = () => chart?.resize()

onMounted(() => {
  load()
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
})
</script>

<style scoped lang="scss">
.list-card { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding: 0 0 12px; }
.empty-cell { text-align: center; color: #999; padding: 60px 0; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.card {
  display: flex; flex-direction: column; gap: 6px; align-items: center; justify-content: center;
  padding: 16px 10px; background: #fafbfd; border: 1px solid #eef1f6; border-radius: 8px;
  b { font-size: 22px; font-weight: 500; color: #303133; }
  span { font-size: 12px; color: #8a92a5; text-align: center; }
}
.cards.small .card b { font-size: 18px; }
.block { border-top: 1px solid #f0f2f5; padding-top: 14px; }
.block-head { display: flex; align-items: center; justify-content: space-between; }
.block-title { margin: 0 0 10px; font-size: 14px; color: #303133; }
.dim-tabs { display: flex; gap: 6px; }
.dim-tab {
  padding: 5px 14px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff;
  font-size: 12px; color: #4a5368; cursor: pointer;
  &.active { border-color: #1890ff; background: #f0f8ff; color: #1890ff; }
}
.chart { height: 320px; }
</style>