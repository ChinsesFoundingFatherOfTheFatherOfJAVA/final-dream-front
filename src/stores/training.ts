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
  }) {
    sessionId.value = detail.sessionId
    projectId.value = detail.projectId
    projectName.value = detail.projectName
    trainerName.value = detail.trainerName
    sessionStatus.value = detail.status
    totalRounds.value = detail.totalRounds
    finishedRounds.value = detail.finishedRounds
    updateProgress()
  }

  function setMessages(list: SessionMessage[]) {
    // 训练页过滤撤回消息
    messages.value = list.filter((m) => !m.withdrawn)
  }

  function appendMessage(msg: SessionMessage) {
    messages.value.push(msg)
  }

  /** 撤回末尾学员消息（未通过流转时） */
  function withdrawLastStudentMessage() {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const msg = messages.value[i]
      if (msg && msg.role === 2) {
        messages.value.splice(i, 1)
        return
      }
    }
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
    totalRounds,
    finishedRounds,
    progressPercent,
    messages,
    sending,
    detailPanelVisible,
    setSession,
    setMessages,
    appendMessage,
    withdrawLastStudentMessage,
    updateProgress,
    reset
  }
})
