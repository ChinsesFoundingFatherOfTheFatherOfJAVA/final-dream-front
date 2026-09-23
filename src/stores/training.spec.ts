import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTrainingStore } from './training'
import type { SessionMessage } from '@/types/student'

const msg = (over: Partial<SessionMessage>): SessionMessage => ({
  messageId: 'm1',
  seq: 1,
  role: 2,
  content: '回答',
  passed: null,
  withdrawn: 0,
  likeCount: 0,
  ...over
})

describe('training store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('训练页消息列表不含已撤回消息', () => {
    const store = useTrainingStore()
    store.setMessages([msg({ messageId: 'a' }), msg({ messageId: 'b', withdrawn: 1 })])
    expect(store.messages.map((m) => m.messageId)).toEqual(['a'])
  })

  it('撤回按对象身份删除：删的是这一条，不是最后一条学员消息', () => {
    const store = useTrainingStore()
    const first = msg({ messageId: '1', seq: 1 })
    const second = msg({ messageId: '2', seq: 3 })
    store.setMessages([first, second])

    store.withdrawMessage(first)

    expect(store.messages.map((m) => m.messageId)).toEqual(['2'])
  })

  it('撤回一个不在列表里的对象时不误删任何消息', () => {
    const store = useTrainingStore()
    const kept = msg({ messageId: 'keep' })
    store.setMessages([kept])

    store.withdrawMessage(msg({ messageId: 'gone' }))

    expect(store.messages).toEqual([kept])
  })

  it('进度百分比取自接口返回的轮次，而不是前端自行数气泡', () => {
    const store = useTrainingStore()
    store.updateProgress(3, 8)
    expect(store.finishedRounds).toBe(3)
    expect(store.progressPercent).toBe(38)
  })

  it('总轮次为 0 时进度为 0，不出现 NaN', () => {
    const store = useTrainingStore()
    expect(store.progressPercent).toBe(0)
  })
})
