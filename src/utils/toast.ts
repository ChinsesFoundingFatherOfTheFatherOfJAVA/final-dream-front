import { ElMessage } from 'element-plus'

export type ToastType = 'error' | 'warn' | 'info'

/**
 * 非阻塞的全局轻提示。
 *
 * 为什么不用 alert()：alert 会同步冻结 JS 主线程，录音与 ASR/TTS 上传期间的
 * 一次网络抖动就能把页面卡死几十秒；报告页轮询更是刻意"连续失败 3 次才提示"，
 * 而 alert 让每次抖动都弹窗，重试逻辑形同虚设。
 */

const DEFAULT_DURATION = 3000

const show = (text: string, type: ToastType, duration: number) => {
  ElMessage({
    message: text,
    type: type === 'warn' ? 'warning' : type,
    duration,
    offset: 24,
    grouping: true
  })
}

export const toast = {
  error: (text: string, duration = DEFAULT_DURATION) => show(text, 'error', duration),
  warn: (text: string, duration = DEFAULT_DURATION) => show(text, 'warn', duration),
  info: (text: string, duration = DEFAULT_DURATION) => show(text, 'info', duration),
  /** 操作成功提示（window.alert 的成功场景替代） */
  success: (text: string, duration = DEFAULT_DURATION) => {
    ElMessage({
      message: '✓ ' + text,
      type: 'success',
      duration,
      offset: 24,
      grouping: true
    })
  }
}
