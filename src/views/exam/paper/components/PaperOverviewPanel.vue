<template>
  <!-- FP-15 概览面板：题型 / 考核点 / 难易程度 三环形图（中心"试题总数 N"+图例"名称 XX% X题"） -->
  <div class="overview-panel">
    <div v-if="overview && overview.total" class="charts">
      <div class="chart-box">
        <p class="chart-title">题型分析</p>
        <div ref="typeRef" class="chart"></div>
      </div>
      <div class="chart-box">
        <p class="chart-title">考核点分析</p>
        <div ref="pointRef" class="chart"></div>
      </div>
      <div class="chart-box third">
        <p class="chart-title">难易程度分析</p>
        <div ref="levelRef" class="chart"></div>
      </div>
    </div>
    <p v-else class="empty-cell">暂无试题，先到「题型」页添加题目</p>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { resolveChartColors } from '@/utils/chartColor'
import { getPaperOverview, type PaperOverview } from '@/api/paper'

const props = defineProps<{ paperId: string }>()

const overview = ref<PaperOverview | null>(null)
const typeRef = ref<HTMLDivElement | null>(null)
const pointRef = ref<HTMLDivElement | null>(null)
const levelRef = ref<HTMLDivElement | null>(null)

let typeChart: echarts.ECharts | null = null
let pointChart: echarts.ECharts | null = null
let levelChart: echarts.ECharts | null = null

const PALETTE = ['var(--color-accent-deep)', 'var(--color-accent-deep)', 'var(--color-accent-deep)', 'var(--color-accent-deep)', 'var(--color-accent-deep)']

/** 单个环形图：中心显示总数，右侧图例带百分比与题数。 */
const renderRing = (
  chart: echarts.ECharts | null,
  el: HTMLDivElement | null,
  items: { name: string; count: number }[],
  total: number
): echarts.ECharts | null => {
  if (!el) return chart
  const instance = chart ?? echarts.init(el)
  instance.setOption(resolveChartColors({
    color: PALETTE,
    tooltip: { trigger: 'item' },
    legend: {
      orient: 'vertical',
      right: 8,
      top: 'center',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 12, color: 'var(--color-ink-2)' },
      formatter: (name: string) => {
        const hit = items.find(i => i.name === name)
        if (!hit) return name
        const pct = total ? ((hit.count / total) * 100).toFixed(2) : '0.00'
        return `${name} ${pct}% ${hit.count}题`
      }
    },
    series: [{
      type: 'pie',
      radius: ['58%', '78%'],
      center: ['32%', '50%'],
      avoidLabelOverlap: false,
      label: {
        show: true,
        position: 'center',
        formatter: () => `{a|试题总数}\n{b|${total}}`,
        rich: {
          a: { fontSize: 12, color: 'var(--color-muted)', lineHeight: 20 },
          b: { fontSize: 22, color: 'var(--color-ink)', fontWeight: 600, lineHeight: 28 }
        }
      },
      emphasis: { scale: false },
      labelLine: { show: false },
      data: items.map(i => ({ name: i.name, value: i.count }))
    }]
  }))
  return instance
}

const renderAll = async () => {
  await nextTick()
  const o = overview.value
  if (!o) return
  const total = o.total
  typeChart = renderRing(typeChart, typeRef.value, o.byType || [], total)
  pointChart = renderRing(pointChart, pointRef.value, o.byPoint || [], total)
  levelChart = renderRing(levelChart, levelRef.value, o.byLevel || [], total)
}

const load = async () => {
  try {
    overview.value = await getPaperOverview(props.paperId)
    await renderAll()
  } catch { /* 拦截器已提示 */ }
}

const resize = () => {
  typeChart?.resize()
  pointChart?.resize()
  levelChart?.resize()
}

onMounted(() => {
  load()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  typeChart?.dispose()
  pointChart?.dispose()
  levelChart?.dispose()
})

watch(() => props.paperId, load)

defineExpose({ load })
</script>

<style scoped lang="scss">
.overview-panel { flex: 1; min-width: 0; overflow-y: auto; padding: 24px 28px; background: var(--color-paper); }

.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}

.chart-box {
  border-bottom: 1px solid var(--color-rule);
  padding-bottom: 20px;

  &.third { grid-column: 1 / 2; }

  .chart-title { margin: 0 0 6px; font-size: 15px; color: var(--color-ink); }
  .chart { height: 320px; }
}

.empty-cell { color: var(--color-muted); font-size: 13px; padding: 60px 0; text-align: center; }
</style>
