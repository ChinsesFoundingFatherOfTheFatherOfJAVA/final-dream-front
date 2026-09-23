import { describe, expect, it } from 'vitest'
import defaultTrainerImg from '@/assets/default-trainer.jpg'
import { trainerFace } from './trainerFace'

describe('trainerFace', () => {
  it('项目配置了形象：相对路径补成网关可访问的 URL', () => {
    expect(trainerFace('/trainer/avatar/1.png')).toBe(`/api/trainer/avatar/1.png`)
  })

  it('已是完整 URL 时原样使用', () => {
    expect(trainerFace('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
  })

  it('未配置形象时回落到内置默认形象，而不是空 src', () => {
    expect(trainerFace(null)).toBe(defaultTrainerImg)
    expect(trainerFace(undefined)).toBe(defaultTrainerImg)
    expect(trainerFace('')).toBe(defaultTrainerImg)
  })
})
