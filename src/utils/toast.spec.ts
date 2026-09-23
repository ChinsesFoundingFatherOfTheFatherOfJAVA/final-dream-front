import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from './toast'

const boxes = () => Array.from(document.querySelectorAll('.qt-toast'))

describe('toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('提示以非阻塞方式出现在 DOM 中', () => {
    toast.error('报告查询失败')
    expect(boxes()).toHaveLength(1)
    expect(boxes()[0]?.textContent).toBe('报告查询失败')
  })

  it('超时自动消失', () => {
    toast.error('会消失', 1000)
    vi.advanceTimersByTime(1500)
    expect(boxes()).toHaveLength(0)
  })

  it('同屏最多 4 条，最早的先被挤掉：轮询连续失败不会堆满全屏', () => {
    for (let i = 0; i < 6; i++) toast.error(`第${i}条`)
    const texts = boxes().map((el) => el.textContent)
    expect(texts).toHaveLength(4)
    expect(texts[0]).toBe('第2条')
  })

  it('容器带 aria-live，读屏能读到', () => {
    toast.warn('注意')
    const box = document.querySelector('.qt-toast-box')
    expect(box?.getAttribute('aria-live')).toBe('polite')
  })
})
