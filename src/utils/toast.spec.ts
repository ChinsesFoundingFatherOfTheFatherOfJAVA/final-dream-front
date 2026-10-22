import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ElMessage } from 'element-plus'
import { toast } from './toast'

vi.mock('element-plus', () => ({ ElMessage: vi.fn() }))

describe('toast', () => {
  beforeEach(() => {
    vi.mocked(ElMessage).mockClear()
  })

  it('错误提示保持原 API，并映射为 Element Plus error', () => {
    toast.error('报告查询失败')
    expect(ElMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: '报告查询失败', type: 'error', grouping: true })
    )
  })

  it('支持自定义超时时间', () => {
    toast.error('会消失', 1000)
    expect(ElMessage).toHaveBeenCalledWith(expect.objectContaining({ duration: 1000 }))
  })

  it('同名消息分组，轮询连续失败不会堆满全屏', () => {
    toast.error('网络错误')
    toast.error('网络错误')
    expect(ElMessage).toHaveBeenCalledTimes(2)
    const calls = vi.mocked(ElMessage).mock.calls as unknown as Array<[Record<string, unknown>]>
    expect(calls.every(([options]) => options?.grouping)).toBe(true)
  })

  it('warn/success 分别映射为 warning/success', () => {
    toast.warn('注意')
    toast.success('已保存')
    expect(ElMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'warning' }))
    expect(ElMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ message: '✓ 已保存', type: 'success' })
    )
  })
})
