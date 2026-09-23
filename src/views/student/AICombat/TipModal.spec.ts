import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TipModal from './TipModal.vue'

const mountModal = (keyPoints: string[]) =>
  mount(TipModal, {
    props: { visible: true, keyPoints },
    global: { stubs: { teleport: true } }
  })

describe('TipModal', () => {
  it('有要点时逐条编号展示', () => {
    const wrapper = mountModal(['先确认客户预算', '再介绍分期方案'])
    const items = wrapper.findAll('.point-item')
    expect(items).toHaveLength(2)
    expect(items[0]?.text()).toBe('1、先确认客户预算')
    expect(items[1]?.text()).toBe('2、再介绍分期方案')
  })

  it('一个要点都没有时不渲染要点盒子：否则弹窗只剩一句空话加一块粉色空白', () => {
    const wrapper = mountModal([])
    expect(wrapper.find('.points-box').exists()).toBe(false)
    expect(wrapper.find('.tip-text').exists()).toBe(true)
  })

  it('visible=false 时整块不渲染', () => {
    const wrapper = mount(TipModal, {
      props: { visible: false, keyPoints: ['A'] },
      global: { stubs: { teleport: true } }
    })
    expect(wrapper.find('.tip-modal').exists()).toBe(false)
  })

  it('点击"知道了"抛出 close', async () => {
    const wrapper = mountModal(['A'])
    await wrapper.find('.know-btn').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
