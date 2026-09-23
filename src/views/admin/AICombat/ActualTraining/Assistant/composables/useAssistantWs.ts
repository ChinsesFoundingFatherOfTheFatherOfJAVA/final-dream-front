/**
 * AI 设计助手 WebSocket 客户端（FP-31/34）
 *
 * 协议严格对齐 03-接口文档.md §3：
 *  · URL ws://host/api/act/ws/chat?sessionId={id}
 *  · 连接建立后自动发 common-session-start（messageId 前端 uuid、sender 写管理员）
 *  · 收服务端 {"type":"ping"} 自动回 {"type":"pong"}（20s 内）
 *  · 断线指数退避重连：1s / 2s / 4s / 8s / 16s，上限 30s
 *  · 事件帧按 §3.3 分发到 store（event 字段路由）
 *
 * 后端未就绪时（ASSISTANT_USE_MOCK）改用假 WS 传输 MockAssistantSocket，
 * 帧序列与线上同形，心跳/重连/分发逻辑走的是同一条代码路径。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ASSISTANT_USE_MOCK } from '@/api/assistant'
import { API_BASE_URL } from '@/api/request'
import { MockAssistantSocket } from '@/views/admin/AICombat/ActualTraining/Assistant/mock/assistantMock'
import { newTraceId, newUuid, useAssistantStore } from './useAssistantStore'
import type {
  AssistantActionBlock,
  AssistantChatFrame,
  AssistantContentBlock,
  AssistantFileResp,
  AssistantServerFrame,
  AssistantWsStatus,
  UpdateMaterialParams
} from '@/types/assistant'

/** 退避序列（ms）：1s/2s/4s/8s/16s，上限 30s */
const BACKOFF_STEPS = [1000, 2000, 4000, 8000, 16000]
const BACKOFF_MAX = 30000

/**
 * 由 API 基地址推导 WS 地址：http(s)://host/api → ws(s)://host/api/act/ws/chat
 *
 * 注意：同源代理模式下 API_BASE_URL 是相对路径（'/api'），此时**必须**用 location 拼成绝对地址——
 * 直接把相对路径交给 new WebSocket() 在各浏览器行为不一致，实测表现为页面状态一直「未连接」
 * （通道本身是通的：从页面建 ws://host/api/act/ws/chat 可正常 open）。
 */
export function buildWsUrl(sessionId: string): string {
  const httpBase = /^https?:\/\//i.test(API_BASE_URL)
    ? API_BASE_URL
    : `${location.protocol}//${location.host}${API_BASE_URL.startsWith('/') ? '' : '/'}${API_BASE_URL}`
  const wsBase = httpBase.replace(/^http/i, 'ws').replace(/\/$/, '')
  return `${wsBase}/act/ws/chat?sessionId=${encodeURIComponent(sessionId)}`
}

/** 最小 WS 传输抽象：浏览器 WebSocket 与假 WS 同形 */
interface AssistantSocketLike {
  readyState: number
  send(data: string): void
  close(): void
  onopen: (() => void) | null
  onmessage: ((ev: { data: string }) => void) | null
  onclose: ((ev?: { code: number; reason: string }) => void) | null
  onerror: ((ev?: unknown) => void) | null
}

export function useAssistantWs() {
  const store = useAssistantStore()
  const settings = { projectId: '' }

  let socket: AssistantSocketLike | null = null
  /** 当前连接对应的会话 ID（幂等判断用） */
  let socketSessionId = ''
  /**
   * 已发送过 common-session-start 的会话 ID（每种会话只发一次）。
   * 重连不再重发：重复握手帧会产生多余的"空轮次"（服务端对重复握手只回 ack + finish），
   * 干扰前端的轮次状态——实测同一会话 3 分钟内被发了 3 次。
   */
  let sessionStartSentFor = ''
  let manualClose = false
  let reconnectTimer: number | null = null
  /** 重连成功后需要补拉历史与 artifact（消息以库为准恢复，02 方案 5.5） */
  let recovering = false
  const lastError = ref('')

  function setStatus(status: AssistantWsStatus) {
    store.wsStatus = status
  }

  /** chat 帧构造：messageId 前端 uuid、sender 写管理员、含 traceId/spanId */
  function buildChatFrame(blocks: AssistantContentBlock[]): AssistantChatFrame {
    return {
      type: 'chat',
      payload: {
        message: {
          id: newUuid(),
          role: 'user',
          content: blocks,
          sender: { id: 'admin', name: '管理员', avatar: '' }
        }
      },
      traceId: newTraceId(32),
      spanId: newTraceId(16)
    }
  }

  /** 发送 action 帧（common-session-start / biz-side-manage-confirm / biz-side-manage-update-material） */
  function sendAction(actionName: string, params: Record<string, unknown>) {
    const block: AssistantActionBlock = {
      type: 'data',
      data: { type: 'action', actionName: actionName as AssistantActionBlock['data']['actionName'], params }
    }
    const frame = buildChatFrame([block])
    socket?.send(JSON.stringify(frame))
  }

  /** 连接建立后自动发 common-session-start（params: sessionId + projectId） */
  function sendSessionStart() {
    sendAction('common-session-start', {
      sessionId: store.sessionId,
      projectId: settings.projectId || store.themeId || ''
    })
  }

  function handleMessage(raw: string) {
    let frame: AssistantServerFrame
    try {
      frame = JSON.parse(raw) as AssistantServerFrame
    } catch {
      return
    }
    if (frame.type === 'ping') {
      // 服务端心跳 → 20s 内回 pong（§3.1）
      socket?.send(JSON.stringify({ type: 'pong' }))
      return
    }
    if (frame.type === 'event') {
      store.handleFrame(frame)
    }
  }

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  /** 退避延迟：1s/2s/4s/8s/16s，此后固定 30s 上限 */
  function backoffDelay(attempt: number): number {
    const step = BACKOFF_STEPS[attempt - 1]
    return step == null ? BACKOFF_MAX : Math.min(step, BACKOFF_MAX)
  }

  function scheduleReconnect() {
    if (manualClose) return
    store.reconnectAttempt += 1
    const delay = backoffDelay(store.reconnectAttempt)
    setStatus('reconnecting')
    clearReconnectTimer()
    reconnectTimer = window.setTimeout(() => {
      connect(store.sessionId, { recovering: true })
    }, delay)
  }

  function createSocket(url: string): AssistantSocketLike {
    if (ASSISTANT_USE_MOCK) return new MockAssistantSocket(url) as unknown as AssistantSocketLike
    return new WebSocket(url) as unknown as AssistantSocketLike
  }

  function connect(sessionId: string, opts: { recovering?: boolean } = {}) {
    if (!sessionId) return
    // 幂等：同一会话已有连接在建立中/已打开时不重复建连
    // （sessionId 的 watcher 与调用方的显式 connect 都会触发，重复连接会导致事件双发）
    if (socket && socketSessionId === sessionId && socket.readyState <= 1) return
    manualClose = false
    recovering = opts.recovering === true
    clearReconnectTimer()
    setStatus(store.reconnectAttempt > 0 ? 'reconnecting' : 'connecting')

    const url = buildWsUrl(sessionId)
    // 诊断用：确认地址形如 ws://host/api/act/ws/chat?sessionId=...（绝对、同源）
    console.log('[ws] connecting', url)
    socket = createSocket(url)
    socketSessionId = sessionId
    socket.onopen = () => {
      console.log('[ws] connected', url)
      setStatus('open')
      store.reconnectAttempt = 0
      lastError.value = ''
      // 重连成功：先按库恢复（历史 + artifact），再发 session-start 续接上下文
      if (recovering) {
        recovering = false
        void store.loadHistory().catch(() => undefined)
        void store.refreshArtifact().catch(() => undefined)
      }
      // 每个会话只发一次握手帧；重连不重发（见 sessionStartSentFor 说明）
      if (sessionStartSentFor !== sessionId) {
        sessionStartSentFor = sessionId
        sendSessionStart()
      }
    }
    socket.onmessage = (ev) => handleMessage(typeof ev.data === 'string' ? ev.data : String(ev.data))
    socket.onerror = () => {
      lastError.value = '连接异常'
      console.warn('[ws] error', url)
    }
    socket.onclose = (ev) => {
      socket = null
      // 连接已断，本轮不可能再收到 session-finish：立即解除"回复中"，
      // 否则输入框会被永久锁住（表现为：一直转圈/不可输入）
      store.generating = false
      if (manualClose) {
        setStatus('closed')
        return
      }
      lastError.value = ev?.reason || `连接已关闭（code ${ev?.code ?? '--'}）`
      console.warn('[ws] closed', url, ev?.code, ev?.reason)
      scheduleReconnect()
    }
  }

  /**
   * sessionId 变为非空即连接（不依赖调用方时机）：
   * 会话是异步建立的，若调用方在拿到 sessionId 前就调了 connect 且被忽略，
   * 页面会永远停在「未连接」。这里兜底，谁先到都能连上。
   */
  watch(
    () => store.sessionId,
    (id) => {
      if (id && !socket && !manualClose) connect(id)
    }
  )

  /** 关闭连接（离开页面 / 手动） */
  function close() {
    manualClose = true
    clearReconnectTimer()
    socket?.close()
    socket = null
    socketSessionId = ''
    setStatus('closed')
  }

  // ---------- 对外发送 ----------

  function sendText(text: string) {
    const frame = buildChatFrame([{ type: 'text', text, extendedData: {} }])
    socket?.send(JSON.stringify(frame))
  }

  /** 文件块：{type:'file', file:{uri:fileId}, extendedData:{name,fileType,fileSize,target,source:2}} */
  function sendFileBlock(file: AssistantFileResp) {
    const frame = buildChatFrame([
      {
        type: 'file',
        file: { uri: file.fileId },
        extendedData: {
          name: file.name,
          fileType: file.fileType,
          fileSize: file.fileSize,
          target: '',
          source: 2
        }
      }
    ])
    socket?.send(JSON.stringify(frame))
  }

  /** 确认按钮：biz-side-manage-confirm（params: id=artifactId, version） */
  function sendConfirm(artifactId: string, version: string) {
    sendAction('biz-side-manage-confirm', { id: artifactId, version })
  }

  /** 材料学员可见开关：biz-side-manage-update-material（经用户确认新增的 action） */
  function sendUpdateMaterial(params: UpdateMaterialParams) {
    sendAction('biz-side-manage-update-material', { ...params })
  }

  /** 验收用：手动断后端验证重连 */
  function simulateDrop() {
    const sock = socket as unknown as MockAssistantSocket | null
    if (sock && typeof sock.simulateDrop === 'function') {
      sock.simulateDrop()
      return
    }
    // 真实 WS：直接关闭底层连接，触发 onclose → 退避重连
    try {
      sock?.close()
    } catch {
      /* 忽略关闭异常 */
    }
  }

  /** 注册到 store（store 通过 transport 委托发送） */
  function register() {
    store.registerTransport({
      sendText,
      sendFileBlock,
      sendConfirm,
      sendUpdateMaterial,
      simulateDrop
    })
  }

  onBeforeUnmount(() => {
    store.registerTransport(null)
    close()
  })

  return {
    settings,
    wsStatus: computed(() => store.wsStatus),
    lastError,
    connect,
    close,
    sendText,
    sendFileBlock,
    sendConfirm,
    sendUpdateMaterial,
    simulateDrop,
    register,
    buildWsUrl
  }
}