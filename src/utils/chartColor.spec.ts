import { describe, expect, it, vi, beforeEach } from 'vitest'
import { resolveChartColors } from '@/utils/chartColor'

/**
 * resolveChartColors 的单元测试。
 *
 * jsdom 没有真实 canvas 2d 上下午文（getContext 返回 null 或抛错），
 * 所以这里验证的是**遍历与透传行为**：颜色字段被识别、函数与普通值原样保留、
 * 结构不被破坏。真正的颜色归一化（oklch → rgba）在浏览器里跑，属集成验证范围。
 */

describe('resolveChartColors', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('递归遍历数组与对象，保留非颜色字符串不误改', () => {
    const option = {
      title: { text: '活跃人数/学习人数' },
      xAxis: { type: 'category', data: ['11-01', '11-02'] },
      series: [{ name: '活跃人数', data: [3, 5] }]
    }
    const out = resolveChartColors(option)
    expect(out.title.text).toBe('活跃人数/学习人数')
    expect(out.xAxis.data).toEqual(['11-01', '11-02'])
    expect(out.series[0]!.name).toBe('活跃人数')
    expect(out.series[0]!.data).toEqual([3, 5])
  })

  it('函数保持原引用（formatter 不能被替换成副本）', () => {
    const formatter = (p: unknown) => String(p)
    const option = { tooltip: { formatter } }
    const out = resolveChartColors(option)
    expect(out.tooltip.formatter).toBe(formatter)
  })

  it('不改变原对象（返回新结构，避免污染缓存的 option）', () => {
    const option = { grid: { left: 8 }, series: [{ data: [1] }] }
    const snapshot = JSON.stringify(option)
    resolveChartColors(option)
    expect(JSON.stringify(option)).toBe(snapshot)
  })

  it('数字、布尔、null 原样保留', () => {
    const option = { a: 1, b: true, c: null, d: undefined }
    const out = resolveChartColors(option)
    expect(out.a).toBe(1)
    expect(out.b).toBe(true)
    expect(out.c).toBeNull()
    expect(out.d).toBeUndefined()
  })

  it('类实例（Date）不被展开成普通对象', () => {
    const date = new Date('2026-11-18T00:00:00Z')
    const option = { markLine: { data: [{ xAxis: date }] } }
    const out = resolveChartColors(option)
    expect(out.markLine.data[0]!.xAxis).toBe(date)
  })
})
