import { describe, expect, it } from 'vitest'
import { pickGranularity, resolveWindow } from '@/composables/usePlatformOverview'

/**
 * 时间标签换算的单元测试（平台预览看板 01-需求文档.md 第 3 节）。
 *
 * 为什么要测：这七个标签的边界（月末最后一秒、季度首日、跨年）是「看起来显然、写起来容易错」的地方，
 * 且后端只认绝对区间——换算错了接口会返回空数据，页面表现为「一片 0」，很难从现象反推原因。
 * 固定 now 为 2026-11-17 12:00:00，保证结果可复现。
 */
const NOW = new Date(2026, 10, 17, 12, 0, 0)

describe('resolveWindow', () => {
  it('当月：从本月 1 日 00:00:00 到当前时刻', () => {
    expect(resolveWindow('当月', NOW)).toEqual({
      from: '2026-11-01 00:00:00',
      to: '2026-11-17 12:00:00',
      granularity: 'day'
    })
  })

  it('上月：上月末日 23:59:59 收尾，不越界到本月', () => {
    expect(resolveWindow('上月', NOW)).toEqual({
      from: '2026-10-01 00:00:00',
      to: '2026-10-31 23:59:59',
      granularity: 'day'
    })
  })

  it('上季度：跨年时正确回退（1 月属 Q1，上季度是去年 Q4）', () => {
    const jan = new Date(2026, 0, 5, 9, 0, 0)
    expect(resolveWindow('上季度', jan)).toEqual({
      from: '2025-10-01 00:00:00',
      to: '2025-12-31 23:59:59',
      granularity: 'week'
    })
  })

  it('当季度：从本季度首日开始（11 月属 Q4 → 10-01）', () => {
    expect(resolveWindow('当季度', NOW)).toEqual({
      from: '2026-10-01 00:00:00',
      to: '2026-11-17 12:00:00',
      granularity: 'day'
    })
  })

  it('上一年：整年区间，末日在 12-31 23:59:59', () => {
    expect(resolveWindow('上一年', NOW)).toEqual({
      from: '2025-01-01 00:00:00',
      to: '2025-12-31 23:59:59',
      granularity: 'week'
    })
  })

  it('累计：起点固定 2000-01-01，按月分桶', () => {
    expect(resolveWindow('累计', NOW)).toEqual({
      from: '2000-01-01 00:00:00',
      to: '2026-11-17 12:00:00',
      granularity: 'month'
    })
  })
})

describe('pickGranularity', () => {
  it('62 天以内按日', () => {
    expect(pickGranularity(new Date(2026, 10, 1), new Date(2026, 10, 20))).toBe('day')
  })

  it('超过 62 天按周', () => {
    expect(pickGranularity(new Date(2026, 0, 1), new Date(2026, 5, 1))).toBe('week')
  })

  it('超过 400 天按月', () => {
    expect(pickGranularity(new Date(2024, 0, 1), new Date(2026, 0, 1))).toBe('month')
  })
})
