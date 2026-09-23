import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SessionMessage } from '@/types/student'

/**
 * 训练会话状态（FP-10~13）
 * 训练页 ScriptTraining 与其子组件共享：会话信息 / 消息列表 / 进度 / 发送 loading
 */
export const useTrainingStore = defineStore('training', () => {
  // 会话信息
  const sessionId = ref<string>('')
  const projectId = ref<string>('')
  const projectName = ref<string>('')
  const trainerName = ref<string>('')
  const sessionStatus = ref<number>(0) // 0=进行中 1=已完成 2=未完成退出
  /** 对话方式：0=语音对话 1=文字对话（v1.1，FP-24） */
  const dialogueMode = ref<0 | 1>(1)
  /** 陪练者形象图片 URL（v1.1，FP-27；空=左栏显示默认占位图） */
  const trainerAvatar = ref<string>('')

  // 进度
  const totalRounds = ref<number>(0)
  const finishedRounds = ref<number>(0)

  // 消息列表（训练页展示用，不含 withdrawn=1）
  const messages = ref<SessionMessage[]>([])

  // 发送中（判定期间输入框 loading）
  const sending = ref(false)

  // 右栏训练详情展开状态
  const detailPanelVisible = ref(true)

  /** 进度百分比（取自接口返回，不前端自行计算） */
  const progressPercent = ref(0)

  function setSession(detail: {
    sessionId: string
    projectId: string
    projectName: string
    trainerName: string
    status: number
    totalRounds: number
    finishedRounds: number
    /** v1.1 可选：0=语音 1=文字 */
    dialogueMode?: 0 | 1
    /** v1.1 可选：陪练者形象图片 URL */
    trainerAvatar?: string | null
  }) {
    sessionId.value = detail.sessionId
    projectId.value = detail.projectId
    projectName.value = detail.projectName
    trainerName.value = detail.trainerName
    sessionStatus.value = detail.status
    totalRounds.value = detail.totalRounds
    finishedRounds.value = detail.finishedRounds
    dialogueMode.value = detail.dialogueMode ?? 1
    trainerAvatar.value = detail.trainerAvatar ?? ''
    updateProgress()
  }

  function setMessages(list: SessionMessage[]) {
    // 训练页过滤撤回消息
    messages.value = list.filter((m) => !m.withdrawn)
  }

  function appendMessage(msg: SessionMessage) {
    messages.value.push(msg)
  }

  /**
   * 撤回指定的那条学员消息（未通过流转 / 请求失败时回滚乐观气泡）。
   * <p>按对象身份删除而不是"删最后一条学员消息"：占位气泡可能已被别的路径移除，
   * 位置式删除会连带删掉上一条**已通过**的合法回答，进度与消息列表从此对不上。
   */
  function withdrawMessage(target: SessionMessage) {
    const idx = messages.value.indexOf(target)
    if (idx >= 0) messages.value.splice(idx, 1)
  }

  function updateProgress(finished?: number, total?: number) {
    if (finished !== undefined) finishedRounds.value = finished
    if (total !== undefined) totalRounds.value = total
    progressPercent.value =
      totalRounds.value > 0 ? Math.round((finishedRounds.value / totalRounds.value) * 100) : 0
  }

  function reset() {
    sessionId.value = ''
    projectId.value = ''
    projectName.value = ''
    trainerName.value = ''
    sessionStatus.value = 0
    dialogueMode.value = 1
    trainerAvatar.value = ''
    totalRounds.value = 0
    finishedRounds.value = 0
    messages.value = []
    sending.value = false
    detailPanelVisible.value = true
    progressPercent.value = 0
  }

  return {
    sessionId,
    projectId,
    projectName,
    trainerName,
    sessionStatus,
    dialogueMode,
    trainerAvatar,
    totalRounds,
    finishedRounds,
    progressPercent,
    messages,
    sending,
    detailPanelVisible,
    setSession,
    setMessages,
    appendMessage,
    withdrawMessage,
    updateProgress,
    reset
  }
})
