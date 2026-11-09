import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ActorAvatar from './ActorAvatar.vue'

/**
 * 数字人形象图的降级闸门（设计 §9.1 U1/U2/U3）。
 *
 * <p>三条必须锁死的行为：
 * 1. 有 URL → 渲染 img（圆框 cover 由调用方尺寸类 + 组件 img 规则保证）；
 * 2. 无 URL（老主题 / 降级链全不命中）→ 仍然是「角色名首字」，不能渲染空 src；
 * 3. 加载失败（404 / URL 过期）→ 立刻回退首字，不能留破图图标。
 *
 * <p>组件不 import 任何 api（src 由调用方 resolveAssetUrl 补全），因此本 spec 不需要
 * mock element-plus——避免把真实 element-plus 写进 isolate 的模块注册表。
 */

const mountAvatar = (props: Record<string, unknown> = {}) => mount(ActorAvatar, { props })

describe('ActorAvatar', () => {
  it('有形象地址时渲染图片，并带可读 alt', () => {
    const wrapper = mountAvatar({ src: '/api/avatar/m-A3-04.webp', name: '王经理' })
    const img = wrapper.find('img')

    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('/api/avatar/m-A3-04.webp')
    expect(img.attributes('alt')).toBe('王经理的头像')
    expect(wrapper.find('span').exists()).toBe(false)
  })

  it('无形象地址时回退首字圆形占位（不是空 src 的 img）', () => {
    const wrapper = mountAvatar({ src: '', name: '王经理' })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('span').text()).toBe('王')
  })

  it('地址为 null/undefined 时同样走首字占位', () => {
    for (const src of [null, undefined]) {
      const wrapper = mountAvatar({ src, name: '李顾问' })
      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.find('span').text()).toBe('李')
    }
  })

  it('角色名缺失时首字占位为 AI（与准备页/运行态既有兜底口径一致）', () => {
    const wrapper = mountAvatar({ name: '' })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('span').text()).toBe('AI')
  })

  it('图片加载失败（404 / URL 过期）自动回退首字，不保留破图', async () => {
    const wrapper = mountAvatar({ src: '/api/avatar/m-BROKEN.webp', name: '王经理' })

    await wrapper.find('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('span').text()).toBe('王')
  })

  it('地址切换到新图时复位失败标记，避免旧 URL 的失败拖累新图', async () => {
    const wrapper = mountAvatar({ src: '/api/avatar/m-BROKEN.webp', name: '王经理' })
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)

    await wrapper.setProps({ src: '/api/avatar/m-B3-02.webp' })

    expect(wrapper.find('img').attributes('src')).toBe('/api/avatar/m-B3-02.webp')
  })
})
