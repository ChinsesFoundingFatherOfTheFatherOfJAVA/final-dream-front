<template>
  <div class="radar-wrap">
    <div ref="chartRef" class="radar-chart"></div>
    <p v-if="empty" class="radar-mask">本次训练没有维度参与评分，暂无可展示的得分</p>
    <p v-else-if="lastIncomplete" class="radar-note">上次报告缺少本次部分维度的得分，不绘制"上次"对比线</p>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { lastScoresFor, scoredDimensions } from './reportRadar'
import type { LastDimension, ReportDimension } from '@/types/student'

const props = defineProps<{
  dimensions: ReportDimension[]
  lastDimensions: LastDimension[] | null
}>()

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

/** 无任何有分维度：画布留白会被当成"图坏了"，改说一句话 */
const empty = ref(false)
/** 上次报告未覆盖本次全部维度：缺的维度补 0 会画出一条假装暴跌的虚线，故整条对比线都不画 */
const lastIncomplete = ref(false)

const render = async () => {
  if (!chartRef.value) return

  // score=null 才是未参与；0 分要画出来，否则语速没开口会从雷达图消失
  const scored = scoredDimensions(props.dimensions)
  if (!scored.length) {
    empty.value = true
    chart?.clear()
    return
  }
  empty.value = false

  if (!chart) {
    // 容器随父级 v-if 挂载，等一帧再 init，否则宽高为 0，雷达图偏到左上角
    await nextTick()
    if (!chartRef.value) return
    chart = echarts.init(chartRef.value)
  }

  const indicator = scored.map((d) => ({
    name: `${d.dimensionName} ${d.score}分`,
    max: 100
  }))

  const currentData = scored.map((d) => d.score)
  /** 上次报告未覆盖本次全部维度时，整条"上次"对比线不画（缺失补 0 会画成暴跌） */
  const last = lastScoresFor(scored, props.lastDimensions)
  lastIncomplete.value = last.incomplete
  const hasLast = last.values != null

  const seriesData: echarts.RadarSeriesOption['data'] = [
    {
      value: currentData,
      name: '本次',
      itemStyle: { color: 'var(--color-accent)' },
      lineStyle: { color: 'var(--color-accent)', width: 2, type: 'solid' },
      areaStyle: { color: 'color-mix(in oklab, var(--color-accent) 18%, transparent)' }
    }
  ]
  if (hasLast && last.values) {
    seriesData.push({
      value: last.values,
      name: '上次',
      itemStyle: { color: 'var(--color-accent-2)' },
      lineStyle: { color: 'var(--color-accent-2)', width: 2, type: 'dashed' },
      areaStyle: undefined
    })
  }

  chart.setOption(
    {
      tooltip: {
        formatter: (params: { value?: unknown }) => {
          const values = Array.isArray(params.value) ? params.value : []
          return scored
            .map((dimension, index) => {
              const value = values[index]
              return `${dimension.dimensionName}: ${value == null ? '-' : `${value}分`}`
            })
            .join('<br/>')
        }
      },
      legend: {
        bottom: 0,
        itemWidth: 20,
        itemHeight: 8,
        textStyle: { color: 'var(--color-muted)', fontSize: 12 }
      },
      radar: {
        indicator,
        radius: '62%',
        center: ['50%', '46%'],
        axisName: {
          color: 'var(--color-ink-2)',
          fontSize: 12,
          formatter: (name: string) => {
            // 轴标签形如 "话术一致性 40分"，低分（<60）整段标红
            const match = name.match(/^(.*)\s(\d+(?:\.\d+)?)分$/)
            if (!match) return name
            const dimName = match[1] ?? ''
            const scoreStr = match[2] ?? ''
            const key = parseFloat(scoreStr) < 60 ? 'red' : 'normal'
            return `{n_${key}|${dimName}} {v_${key}|${scoreStr}分}`
          },
          rich: {
            n_normal: { color: 'var(--color-ink-2)', fontSize: 12 },
            v_normal: { color: 'var(--color-ink-2)', fontSize: 12 },
            n_red: { color: 'var(--color-error)', fontSize: 12 },
            v_red: { color: 'var(--color-error)', fontSize: 12, fontWeight: 'bold' }
          }
        },
        axisLine: { lineStyle: { color: 'var(--color-rule)' } },
        splitLine: { lineStyle: { color: 'var(--color-rule)' } },
        splitArea: { areaStyle: { color: ['var(--color-paper)', 'var(--color-paper-2)'] } }
      },
      series: [
        {
          type: 'radar',
          symbol: 'circle',
          symbolSize: 5,
          data: seriesData
        }
      ] as echarts.SeriesOption[]
    },
    true
  )
}

watch(() => [props.dimensions, props.lastDimensions], () => void render(), { deep: true })

onMounted(() => {
  void render()
  resizeHandler = () => chart?.resize()
  window.addEventListener('resize', resizeHandler)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler ?? (() => {}))
  chart?.dispose()
  chart = null
})
</script>

<style scoped lang="scss">
.radar-wrap {
  position: relative;
}

.radar-chart {
  width: 100%;
  height: 360px;
}

/* 无维度可画时盖在空白画布上，避免"图坏了"的观感 */
.radar-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 13px;
  color: var(--color-muted);
}

.radar-note {
  margin: -8px 0 0;
  text-align: center;
  font-size: 12px;
  color: var(--color-muted);
}
</style>
