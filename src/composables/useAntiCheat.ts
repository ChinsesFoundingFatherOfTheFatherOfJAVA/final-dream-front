/**
 * 防作弊 composable（契约 02 §5.7）
 * <p>
 * - visibilitychange/blur 上报 screen.hidden（1 秒去重 + clientEventId 幂等，契约 03 §12：前端去重，服务端记原始事件并只对超阈值动作）
 * - 考核模式（faceCheckBefore/Ongoing 启用）时请求摄像头并按间隔抓帧——首期仅上报 face.pass 事件占位审计，
 *   真实 provider 比对属 FaceVerificationProvider 适配器（后端偏差记录）
 * - violation=true 时回调 onViolation（页面停止输入，等待服务端 attempt.ended）
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import request from '@/api/request'

export interface AntiCheatReportResult {
  recorded: boolean
  violation: boolean
}

export function useAntiCheat(
  attemptId: string,
  options: {
    /** 是否启用切屏上报（进行中的 attempt 才允许；由调用方传 getter） */
    enabled: () => boolean
    /** 考核抓帧开关（provider 接入前为 false） */
    faceOngoingEnabled: () => boolean
  },
  handlers: { onViolation?: () => void } = {},
) {
  const lastReportAt = ref(0)
  let timer: number | null = null
  let stream: MediaStream | null = null

  async function report(eventType: string): Promise<AntiCheatReportResult | null> {
    try {
      return await request.post<unknown, AntiCheatReportResult>(
        `/act/student/attempts/${attemptId}/anti-cheat`,
        {
          eventType,
          clientEventId: `${eventType}-${Date.now()}`,
          data: null,
        },
      )
    } catch {
      // 上报失败不打断练习（服务端有原始事件审计兜底）
      return null
    }
  }

  /** 切屏：1 秒去重（契约 03 §12：前端去重） */
  async function onHidden() {
    if (!options.enabled()) return
    const now = Date.now()
    if (now - lastReportAt.value < 1000) return
    lastReportAt.value = now
    const result = await report('screen.hidden')
    if (result?.violation) handlers.onViolation?.()
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') void onHidden()
  }

  function onBlur() {
    void onHidden()
  }

  /** 考核抓帧占位：请求摄像头成功后定期上报 face.pass（真实比对待 provider 接入） */
  async function startFaceMonitor() {
    if (!options.faceOngoingEnabled()) return
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true })
      // 5 分钟间隔上报（契约 03 §12.2：进行中每 5 分钟抓拍）
      timer = window.setInterval(
        async () => {
          const result = await report('face.pass')
          if (result?.violation) handlers.onViolation?.()
        },
        5 * 60 * 1000,
      )
    } catch {
      // 摄像头权限被拒：考核不允许开始（契约 02 §5.7），由页面根据 enabled 前置请求处理
    }
  }

  function stop() {
    if (timer) window.clearInterval(timer)
    timer = null
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('blur', onBlur)
    void startFaceMonitor()
  })
  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('blur', onBlur)
    stop()
  })

  return { stop }
}
