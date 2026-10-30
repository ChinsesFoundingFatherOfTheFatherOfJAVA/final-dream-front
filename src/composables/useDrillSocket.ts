/**
 * 对练 WS composable（契约 02 §5.5）
 * <p>
 * - 直连 8082（网关 WebMVC 版不支持 WS upgrade，dev 由 vite 代理 `/api/act/ws`，生产同源直连）
 * - 服务端 20s ping，这里回 pong；客户端同时按 30s 无帧兜底重连
 * - 断线指数退避 1s/2s/4s/8s/15s；重连后由页面先拉 attempt 快照再续传
 * - 事件按 seq 去重（服务端每轮帧 seq 单调）
 * - 发送统一带 clientMessageId（服务端 uk_attempt_client_message 幂等）
 */
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

export type DrillEventHandler = (event: string, seq: number, data: Record<string, unknown>) => void

export function useDrillSocket(attemptId: string, onEvent: DrillEventHandler) {
  const auth = useAuthStore()
  const connected = ref(false)
  let socket: WebSocket | null = null
  let retry = 0
  let closedByUser = false
  let pingTimer: number | null = null
  /** 已处理的最大 seq（去重；0=connected 帧不走去重） */
  let lastSeq = 0

  const backoff = () => Math.min(15000, 1000 * Math.pow(2, retry))

  function connect() {
    closedByUser = false
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const base = import.meta.env.DEV ? '' : `${proto}://${window.location.host}`
    // dev 走 vite 代理 /api/act/ws → ws://localhost:8082；prod 由网关同源直连 8082
    const url = `${base || `${proto}://${window.location.host}`}/api/act/ws/drill?attemptId=${attemptId}&token=${auth.token}`
    socket = new WebSocket(url)
    socket.onopen = () => {
      connected.value = true
      retry = 0
      startPing()
    }
    socket.onmessage = (frame) => {
      try {
        const payload = JSON.parse(frame.data) as {
          type: string
          event?: string
          seq?: number
          data?: Record<string, unknown>
        }
        if (payload.type === 'ping') {
          sendRaw({ type: 'pong' })
          return
        }
        if (payload.type === 'event' && payload.event) {
          const seq = payload.seq ?? 0
          // connected 帧 seq=0 不参与去重；其余按 seq 单调去重
          if (seq > 0) {
            if (seq <= lastSeq) return
            lastSeq = seq
          }
          onEvent(payload.event, seq, payload.data ?? {})
        }
      } catch {
        // 非 JSON 帧（如代理探活）忽略
      }
    }
    socket.onclose = () => {
      connected.value = false
      stopPing()
      if (!closedByUser && retry < 6) {
        // 指数退避重连；重连后页面负责重新拉 attempt 快照
        window.setTimeout(connect, backoff())
        retry++
      }
    }
    socket.onerror = () => {
      socket?.close()
    }
  }

  function startPing() {
    stopPing()
    // 服务端 20s ping；这里 25s 无任何帧则主动断开触发重连（兜底假连接）
    pingTimer = window.setTimeout(() => socket?.close(), 25_000)
    const reset = () => {
      if (pingTimer) window.clearTimeout(pingTimer)
      pingTimer = window.setTimeout(() => socket?.close(), 25_000)
    }
    socket!.addEventListener('message', reset)
  }

  function stopPing() {
    if (pingTimer) {
      window.clearTimeout(pingTimer)
      pingTimer = null
    }
  }

  /** 学员发言（chat 帧）：clientMessageId 防重发 */
  function sendChat(clientMessageId: string, text: string) {
    sendRaw({
      type: 'chat',
      payload: { message: { id: clientMessageId, text } },
    })
  }

  function sendRaw(frame: unknown) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(frame))
    }
  }

  function close() {
    closedByUser = true
    stopPing()
    socket?.close()
    socket = null
  }

  return { connected, connect, close, sendChat }
}
