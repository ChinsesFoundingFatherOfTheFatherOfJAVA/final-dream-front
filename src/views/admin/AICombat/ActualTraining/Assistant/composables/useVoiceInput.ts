/**
 * 语音输入（FP-32）：复用学员端 useRecorder（16kHz WAV）→ POST /api/act/assistant/asr → 文本回填输入框
 * 识别 <2 字提示重试（接口文档 §2.4 错误语义）。
 */
import { ref } from 'vue'
import { recognizeAssistantSpeech } from '@/api/assistant'
import { useRecorder } from '@/composables/useRecorder'

export function useVoiceInput(onText: (text: string) => void, onMessage?: (msg: string) => void) {
  const recorder = useRecorder()
  const recording = recorder.recording
  const error = recorder.error
  const recognizing = ref(false)

  const notify = (msg: string) => {
    if (onMessage) onMessage(msg)
  }

  async function start() {
    if (recording.value || recognizing.value) return
    try {
      await recorder.start()
    } catch {
      notify('无法访问麦克风，请检查权限后重试')
    }
  }

  /** 停止录音并送 ASR，成功则回填输入框（由用户确认后发送） */
  async function stop() {
    const result = recorder.stop()
    if (!result || result.durationMs < 300) {
      notify('录音时间太短，请重试')
      return
    }
    recognizing.value = true
    try {
      const resp = await recognizeAssistantSpeech(result.blob)
      const text = (resp.text ?? '').trim()
      if (text.length < 2) {
        notify('没有识别到内容，请重试')
        return
      }
      onText(text)
    } catch (e) {
      notify(e instanceof Error && e.message ? e.message : '语音识别失败，请重试')
    } finally {
      recognizing.value = false
    }
  }

  /** 点击式录音切换（线上支持按住/点击两种，这里统一为点击开始/结束） */
  async function toggle() {
    if (recording.value) await stop()
    else await start()
  }

  return { recording, recognizing, error, start, stop, toggle }
}