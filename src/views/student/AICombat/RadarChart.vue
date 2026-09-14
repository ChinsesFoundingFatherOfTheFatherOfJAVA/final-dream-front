<template>
  <div ref="chartRef" class="radar-chart"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import type { LastDimension, ReportDimension } from '@/types/student'

const props = defineProps<{
  dimensions: ReportDimension[]
  lastDimensions: LastDimension[] | null
}>()

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

const render = () => {
  if (!chartRef.value || !props.dimensions?.length) return

  if (!chart) {
    chart = echarts.init(chartRef.value)
  }

  const indicator = props.dimensions.map((d) => ({
    name: `${d.dimensionName} ${d.score}分`,
    max: 100
  }))

  const currentData = props.dimensions.map((d) => d.score)
  const hasLast = !!props.lastDimensions?.length

  const seriesData: echarts.RadarSeriesOption['data'] = [
    {
      value: currentData,
      name: '本次',
      itemStyle: { color: '#4A7CFF' },
      lineStyle: { color: '#4A7CFF', width: 2, type: 'solid' },
      areaStyle: { color: 'rgba(74, 124, 255, 0.18)' }
    }
  ]
  if (hasLast && props.lastDimensions) {
    const lastMap = new Map(props.lastDimensions.map((d) => [d.dimensionName, d.score]))
    const lastValues = props.dimensions.map((d) => lastMap.get(d.dimensionName) ?? 0)
    seriesData.push({
      value: lastValues,
      name: '上次',
      itemStyle: { color: '#22D3EE' },
      lineStyle: { color: '#22D3EE', width: 2, type: 'dashed' },
      areaStyle: undefined
    })
  }

  chart.setOption(
    {
      tooltip: {},
      legend: {
        bottom: 0,
        itemWidth: 20,
        itemHeight: 8,
        textStyle: { color: '#666', fontSize: 12 }
      },
      radar: {
        indicator,
        radius: '62%',
        center: ['50%', '46%'],
        axisName: {
          color: '#555',
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
            n_normal: { color: '#555', fontSize: 12 },
            v_normal: { color: '#555', fontSize: 12 },
            n_red: { color: '#e54545', fontSize: 12 },
            v_red: { color: '#e54545', fontSize: 12, fontWeight: 'bold' }
          }
        },
        axisLine: { lineStyle: { color: '#dde2ec' } },
        splitLine: { lineStyle: { color: '#e8ecf3' } },
        splitArea: { areaStyle: { color: ['#fff', '#fafbfe'] } }
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

watch(() => [props.dimensions, props.lastDimensions], render, { deep: true })

onMounted(() => {
  render()
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
.radar-chart {
  width: 100%;
  height: 360px;
}
</style>
