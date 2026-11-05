import { describe, expect, it } from 'vitest'
import { studentTableHeaders } from './studentModeDisplay'

/**
 * 学员列表的列集合（台账 R1-2/R1-3/R1-4）。
 * 为什么不挂载 StudentPanel：组件 import 了 element-plus，而 vitest 配置是 isolate:false
 * （同 worker 复用模块注册表），组件 spec 会把真实的 element-plus 提前解析进 registry，
 * 使 toast.spec.ts 的 vi.mock('element-plus') 失效、整个套件变红。
 * 列集合本身是纯数据，抽成 studentTableHeaders 后在这里锁定即可，不需要渲染。
 * 渲染层的取值口径由同目录 studentModeDisplay.spec.ts 覆盖（同源纯函数）。
 */
describe('StudentPanel · 表头列集合', () => {
  it('训考一体（mode=3）同时给出「训练均分」「考核均分」，位置在平均得分之后', () => {
    const headers = studentTableHeaders(3)
    expect(headers).toEqual([
      '学员姓名',
      '部门',
      '来源',
      '状态',
      '场景通过',
      '练习次数',
      '平均得分',
      '训练均分',
      '考核均分',
      '操作',
    ])
  })

  it('日常训练（mode=1）不出分模式列——单模式大号即该模式均分', () => {
    const headers = studentTableHeaders(1)
    expect(headers).not.toContain('训练均分')
    expect(headers).not.toContain('考核均分')
    expect(headers).toHaveLength(8)
  })

  it('通关考核（mode=2）不出分模式列', () => {
    const headers = studentTableHeaders(2)
    expect(headers).not.toContain('训练均分')
    expect(headers).not.toContain('考核均分')
    expect(headers).toHaveLength(8)
  })
})
