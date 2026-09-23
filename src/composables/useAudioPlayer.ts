import { ref } from 'vue'

/**
 * FP-24 音频播放组合式函数（v1.1）
 * new Audio(url) 播放封装：切换播放目标时自动停止上一个。
 *
 * 自动播放策略是语音对话的第一道坎：页面尚未收到用户手势时（进训练页就自动播报第一条陪练者
 * 问题正是这种情况）浏览器直接拒绝 play()，原实现把异常吞掉，用户只会看到"有气泡没声音"。
 * 现在记下被拦下的 URL 并挂一次性手势监听——用户点任意处即续播，同时暴露 blocked 供 UI 提示。
 */
export function useAudioPlayer() {
  /** 当前正在播放的 URL（用于 🔊 图标激活态） */
  const playingUrl = ref<string | null>(null)
  /** 播放被自动播放策略拦截，等待用户手势解锁 */
  const blocked = ref(false)

  let current: HTMLAudioElement | null = null
  /** 被拦截时待续播的 URL */
  let pendingUrl = ''
  let unlockHandler: (() => void) | null = null

  function stop() {
    disarmUnlock()
    pendingUrl = ''
    blocked.value = false
    if (current) {
      current.pause()
      current.src = ''
      current.onended = null
      current.onerror = null
      current = null
    }
    playingUrl.value = null
  }

  /** 播放指定 URL；先停止上一个，同一个 URL 再次调用即重播 */
  function play(url: string) {
    stop()
    start(url)
  }

  function start(url: string) {
    current = new Audio(url)
    current.onended = () => {
      playingUrl.value = null
      current = null
    }
    current.onerror = () => {
      playingUrl.value = null
    }
    playingUrl.value = url
    current.play().catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        pendingUrl = url
        blocked.value = true
        armUnlock()
        return
      }
      // 真·加载失败：清掉激活态，让 🔊 图标回到可点状态
      playingUrl.value = null
    })
  }

  /** 同一 URL 再次点击时视为停止（切换/重播语义） */
  function toggle(url: string) {
    if (playingUrl.value === url) {
      stop()
    } else {
      play(url)
    }
  }

  /** 挂手势监听：click/keydown 任一即算用户已授权，之后自动播报不再被拦 */
  function armUnlock() {
    if (unlockHandler) return
    unlockHandler = () => {
      disarmUnlock()
      blocked.value = false
      const url = pendingUrl
      pendingUrl = ''
      if (url) start(url)
    }
    window.addEventListener('pointerdown', unlockHandler)
    window.addEventListener('keydown', unlockHandler)
  }

  function disarmUnlock() {
    if (!unlockHandler) return
    window.removeEventListener('pointerdown', unlockHandler)
    window.removeEventListener('keydown', unlockHandler)
    unlockHandler = null
  }

  return { playingUrl, blocked, play, stop, toggle }
}
