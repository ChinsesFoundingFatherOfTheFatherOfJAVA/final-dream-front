/**
 * 批阅待办列表单测（2026-11-12）。
 *
 * <p>守三条容易做错的规则：
 * 1. `markStatus` 缺省按**待批阅**处理（后端没下发时宁可多显示，不可漏）；
 * 2. 按钮文案复用 `markModel.markActionText`，待批阅「批阅」/已批阅「重新批阅」；
 * 3. 列表按提交时间**倒序**（最近交的最该先批）。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import MarkTodoList from './MarkTodoList.vue'

// mock 掉接口层，避免单测真的发请求
const listMock = vi.fn()
vi.mock('@/api/studentExam', () => ({
  listStudentMarkTodo: () => listMock()
}))

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/exam/mark/paper/:attemptId', component: { template: '<div/>' } }]
})

const rowOf = (over: Record<string, unknown> = {}) => ({
  attemptId: 'a1',
  arrangeId: 'arr1',
  arrangeName: 'E2E测试考试',
  fullname: '张三',
  deptName: '生产部',
  submitAt: '2026-11-11 16:43:13',
  score: null,
  passed: null,
  markStatus: 0,
  ...over
})

const mountList = () =>
  mount(MarkTodoList, {
    global: {
      plugins: [router],
      stubs: {
        'el-skeleton': true,
        'el-alert': { template: '<div class="stub-alert">{{ title }}</div>', props: ['title'] },
        'el-empty': { template: '<div class="stub-empty">{{ description }}</div>', props: ['description'] },
        'el-button': { template: '<button class="stub-btn" @click="$emit(\'click\')"><slot/></button>' }
      }
    }
  })

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('MarkTodoList（批阅待办）', () => {
  beforeEach(() => {
    listMock.mockReset()
  })

  it('待批阅：按钮显示「批阅」，标记为待批阅', async () => {
    listMock.mockResolvedValue({ records: [rowOf({ markStatus: 0 })], total: 1 })
    const w = mountList()
    await flush()
    expect(w.find('.item-tag').text()).toBe('待批阅')
    expect(w.find('.item-btn').text()).toBe('批阅')
  })

  it('已批阅：按钮显示「重新批阅」，标记为已批阅，并显示得分', async () => {
    listMock.mockResolvedValue({
      records: [rowOf({ markStatus: 1, score: 15 })],
      total: 1
    })
    const w = mountList()
    await flush()
    expect(w.find('.item-tag').text()).toBe('已批阅')
    expect(w.find('.item-btn').text()).toBe('重新批阅')
    expect(w.text()).toContain('得分 15')
  })

  it('markStatus 缺省时按待批阅处理（宁可多显示不可漏）', async () => {
    const row = rowOf()
    delete (row as Record<string, unknown>).markStatus
    listMock.mockResolvedValue({ records: [row], total: 1 })
    const w = mountList()
    await flush()
    expect(w.find('.item-tag').text()).toBe('待批阅')
    expect(w.find('.item-btn').text()).toBe('批阅')
  })

  it('待批阅计数只数待批阅的，不把已批阅算进去', async () => {
    listMock.mockResolvedValue({
      records: [
        rowOf({ attemptId: 'a1', markStatus: 0 }),
        rowOf({ attemptId: 'a2', markStatus: 1, score: 10 }),
        rowOf({ attemptId: 'a3', markStatus: 0 })
      ],
      total: 3
    })
    const w = mountList()
    await flush()
    expect(w.find('.todo-count strong').text()).toBe('2')
  })

  it('按提交时间倒序：最近提交的排在前面', async () => {
    listMock.mockResolvedValue({
      records: [
        rowOf({ attemptId: 'old', submitAt: '2026-11-10 09:00:00', fullname: '早交的' }),
        rowOf({ attemptId: 'new', submitAt: '2026-11-12 10:00:00', fullname: '晚交的' })
      ],
      total: 2
    })
    const w = mountList()
    await flush()
    const names = w.findAll('.item-name').map((n) => n.text())
    expect(names[0]).toBe('晚交的')
    expect(names[1]).toBe('早交的')
  })

  it('空列表：显示空态而不是空白', async () => {
    listMock.mockResolvedValue({ records: [], total: 0 })
    const w = mountList()
    await flush()
    expect(w.find('.stub-empty').exists()).toBe(true)
    expect(w.text()).toContain('暂无待批阅的答卷')
  })

  it('接口失败：显示错误而不是假空态（避免「以为批完了」）', async () => {
    listMock.mockRejectedValue(new Error('网络断了'))
    const w = mountList()
    await flush()
    expect(w.find('.stub-alert').text()).toBe('网络断了')
    expect(w.find('.stub-empty').exists()).toBe(false)
  })

  it('点「批阅」跳批阅页，路由带上 attemptId', async () => {
    listMock.mockResolvedValue({ records: [rowOf({ attemptId: 'abc123' })], total: 1 })
    const w = mountList()
    await flush()
    const push = vi.spyOn(router, 'push')
    await w.find('.item-btn').trigger('click')
    expect(push).toHaveBeenCalledWith('/exam/mark/paper/abc123')
  })
})
