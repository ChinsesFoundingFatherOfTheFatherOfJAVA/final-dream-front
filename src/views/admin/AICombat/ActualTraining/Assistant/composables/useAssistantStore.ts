/**
 * AI 设计助手 Pinia store
 *
 * 职责（02-技术实现方案 §6）：
 *  · 消息列表（含 data 块 bizType 状态）
 *  · 当前 artifact（右面板数据源）
 *  · part 缓冲区：text_delta 打字机追加、data_delta 累积到 part-end 整体 JSON.parse 再按 bizType 派发
 *  · 加载态（session-finish 解除，驱动输入禁用）
 *
 * 事件分发入口 handleEvent 按 03-接口文档 §3.3 事件名路由。
 */
import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import {
  createAssistantSession,
  getAssistantArtifact,
  getAssistantMessages,
  getSessionMaterials,
} from '@/api/assistant'
import { importAssistantKngMaterials as importKngMaterialsApi } from '@/api/kngAiSource'
import type {
  ArtifactGeneratedParams,
  ArtifactUpdatedParams,
  AssistantArtifactContent,
  AssistantArtifactSnapshot,
  AssistantBizType,
  AssistantChatMessage,
  AssistantEventFrame,
  AssistantFileResp,
  AssistantMaterialBrief,
  AssistantPanelTab,
  AssistantRenderBlock,
  AssistantSender,
  AssistantServerFrame,
  AssistantWsStatus,
  CaseGeneratedParams,
  MessageStartData,
  PartContentData,
  PartEndData,
  PartStartData,
  SaveSuccessParams,
  TopicChangedParams,
  UpdateMaterialParams,
} from '@/types/assistant'
import type { AssistantKngImportResp } from '@/api/kngAiSource'

/** 控制类 action：仅驱动后端流程，不在消息流里渲染成事件卡（重放时跳过，避免噪音） */
const CONTROL_ACTIONS = new Set(['common-session-start', 'biz-side-manage-confirm'])

/** 解析卡兜底轮询：间隔与最大次数（60 次约 5 分钟，超过即放弃，不再无限打接口） */
const PARSE_RECONCILE_INTERVAL_MS = 5000
const PARSE_RECONCILE_MAX_TRIES = 60
/** 兜底校正时展示的材料摘要预览长度（与后端 parse-file 事件的 summary 口径一致） */
const PARSE_SUMMARY_PREVIEW_CHARS = 120

/** 渲染块里的事件块（解析卡就地改写只碰这一支，避免到处窄化 kind） */
type EventBlock = Extract<AssistantRenderBlock, { kind: 'event' }>

/** 服务端 data 块（事件）在历史消息中的持久化形状 */
interface WireDataBlock {
  type: 'data'
  data?: {
    type?: string
    bizType?: string
    actionName?: string
    params?: Record<string, unknown>
  } | null
}

/** biz-common-parse-file 事件里的 files[] 条目（status：0 解析中 / 1 完成） */
interface ParseFileEntry {
  id?: string | number
  name?: string
  status?: number
}

/** 发送通道：由 useAssistantWs 注册，避免 store ↔ composable 循环依赖 */
export interface AssistantTransport {
  sendText(text: string): void
  sendFileBlock(file: AssistantFileResp): void
  sendConfirm(artifactId: string, version: string): void
  sendUpdateMaterial(params: UpdateMaterialParams): void
  /** 验收用：手动断开（验证指数退避重连） */
  simulateDrop(): void
}

const ADMIN_SENDER: AssistantSender = { id: 'admin', name: '管理员', avatar: '' }

/** 助手角色判定：后端落库为 agent 时用 assistant，协议文档措辞为 agent，两种都认 */
function isAgentRole(role: unknown): boolean {
  const r = String(role ?? '').toLowerCase()
  return r === 'assistant' || r === 'agent'
}

/** 生成前端 uuid（WS 发送时使用；优先 crypto.randomUUID） */
export function newUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID()
  return `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Date.now() + Math.floor(performance.now() * 1000)) % 16
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** 生成 traceId（32 位）/ spanId（16 位）十六进制串 */
export function newTraceId(len = 32): string {
  const bytes = new Uint8Array(Math.ceil(len / 2))
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = (Date.now() + i * 37) % 256
  }
  let s = ''
  for (const b of bytes) s += b.toString(16).padStart(2, '0')
  return s.slice(0, len)
}

/**
 * 把"三档连成一串"的评分标准拆成三档，规则与后端 ArtifactSupport.criteriaTiers 一致：
 * 先按分隔符（中/英文分号、换行）切；切不出三段时退化为按档位标签前视切分；
 * 每段去掉前导标签（如"优秀(90-100分)："）只留等级要求正文。
 */
export function splitCriteriaText(text: string): {
  excellent: string
  good: string
  improve: string
} {
  const clean = (segment: string): string => {
    const colon = segment.search(/[：:]/)
    // 走标签兜底切分时，上一段的收尾分隔符（逗号/顿号等）会留在尾部，需去掉
    return (colon >= 0 ? segment.slice(colon + 1) : segment).replace(/[，,；;、\s]+$/, '').trim()
  }
  let segments = text
    .split(/[;；\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  if (segments.length < 3) {
    // 兜底：三档之间可能没有分号（模型直接连写），按档位标签前视切分
    const byLabel = text
      .split(/(?=(?:优秀|良好|需改进|待改进|不合格))/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    if (byLabel.length > segments.length) segments = byLabel
  }
  const bodies = segments.map(clean).filter((s) => s.length > 0)
  return {
    excellent: bodies[0] ?? '',
    good: bodies[1] ?? '',
    improve: bodies[2] ?? '',
  }
}

/** 归一化 dimension.criteria → 三档文案（artifact schema 未固定该字段形状，做兼容） */
export function normalizeCriteria(criteria: unknown): {
  excellent: string
  good: string
  improve: string
} {
  const empty = { excellent: '', good: '', improve: '' }
  if (!criteria) return empty
  // 字符串形态最常见：模型返回一整串，如
  // "优秀(90-100分)：…；良好(70-89分)：…；需改进(<70分)：…"。
  // 早期实现把整串直接塞进 excellent，页面表现为"优秀"格里是全部三档、"良好/需改进"显示"—"（实测踩到）。
  if (typeof criteria === 'string') return splitCriteriaText(criteria)
  if (Array.isArray(criteria)) {
    const [a, b, c] = criteria as unknown[]
    return {
      excellent: a == null ? '' : String(a),
      good: b == null ? '' : String(b),
      improve: c == null ? '' : String(c),
    }
  }
  if (typeof criteria === 'object') {
    const o = criteria as Record<string, unknown>
    const pick = (...keys: string[]): string => {
      for (const k of keys) {
        const v = o[k]
        if (typeof v === 'string' && v) return v
      }
      return ''
    }
    return {
      excellent: pick('excellent', '优秀', 'excellentStandard'),
      good: pick('good', '良好', 'goodStandard'),
      improve: pick('improve', '需改进', 'improveStandard'),
    }
  }
  return empty
}

export const useAssistantStore = defineStore('assistant', () => {
  // ---------- 会话 ----------
  const sessionId = ref('')
  const themeId = ref('')
  const themeName = ref('')
  /** 主题状态（0草稿 … 5已结束）：已结束进入为只读会话（FP-30） */
  const themeStatus = ref<number>(0)
  const loadingSession = ref(false)

  // ---------- 消息 ----------
  const messages = ref<AssistantChatMessage[]>([])
  const loadingHistory = ref(false)
  /** 助手回复中（session-finish 解除）→ 输入框禁用 */
  const generating = ref(false)
  /**
   * 当前轮次的 traceId（由 session-start 记录，该帧带 traceId）。
   * 用于"轮次归属"判断：连接抖动/重连会产生重复握手帧，服务端对重复握手只回 ack + session-finish；
   * 若不做归属判断，这条提前到达的 finish 会把正在流式的轮次提前收尾，并删掉刚建好、还没有内容的
   * 助手气泡（后续 part-* 找不到归属而丢弃）——表现就是"助手消息库里有、页面不显示"。
   */
  const activeRoundTraceId = ref('')
  /**
   * 并存的轮次集合。智能体轮次与后台事件轮次（生成受理 / 分段 / 完成事件各起一轮）会同时存在，
   * 用单值记录会被后到的 session-start 覆盖，使先到的那一轮 finish 被误判为"非本轮"而丢弃——
   * 实测表现为：消息流里留下多个没有内容的助手头像、"正在生成…"卡片永不结束。
   */
  const activeRoundTraces = ref<string[]>([])

  // ---------- artifact ----------
  const artifact = shallowRef<AssistantArtifactSnapshot | null>(null)
  /** topic-changed 后展开右面板（FP-33：此前纯聊天单栏） */
  const topicChanged = ref(false)
  /** 确认落库成功时间戳：页面据此提示成功 / 触发详情数据刷新 */
  const savedAt = ref(0)
  const savedThemeId = ref('')

  // ---------- 会话材料（培训材料 tab / 解析卡展开共用） ----------
  /** 会话材料列表：在线课堂导入后刷新；解析卡展开时的兜底数据源 */
  const materials = ref<AssistantMaterialBrief[]>([])
  /**
   * 请求右面板切换 Tab（一次性信号）。
   * 面板的 activeTab 是 ArtifactPanel 内部状态，导入材料后要"跳过去让用户看见"，
   * 由 store 发信号、面板 consume 后清空，避免把面板状态整体搬进 store。
   */
  const panelTabRequest = ref<AssistantPanelTab | ''>('')

  // ---------- WS ----------
  const wsStatus = ref<AssistantWsStatus>('idle')
  const reconnectAttempt = ref(0)

  // ---------- part 缓冲区 ----------
  interface PartBuffer {
    messageId: string
    index: number
    kind: 'text' | 'data'
    text: string
    raw: string
    done: boolean
  }
  const partBuffers = ref<Record<string, PartBuffer>>({})
  /** 当前助手的 taskId/contextId（message-extra-info） */
  const extraInfo = ref<{ taskId: string; contextId: string } | null>(null)

  /** index → 消息内块位次（part-start 建立，part-end 清理） */
  const partBlockIndex = new Map<string, number>()
  /** 助手消息 → 所属轮次 traceId：轮次收尾时据此只清理"本轮自己的"空气泡 */
  const messageRoundTrace = new Map<string, string>()
  /** 本轮是否有 case-generated（案例正文需在轮次结束后从 artifact 拉取） */
  let pendingArtifactRefresh = false

  /** 解析卡兜底轮询：自排队的 setTimeout 句柄与已试次数 */
  let parseReconcileTimer: number | null = null
  let parseReconcileTries = 0
  /** 上一轮看到的"未完成解析卡"指纹：集合变化（有新文件要等）时重置计数 */
  let parseReconcileSig = ''

  let transport: AssistantTransport | null = null

  const registerTransport = (t: AssistantTransport | null) => {
    transport = t
  }

  // ---------- 派生 ----------
  /** 右面板是否出现（方向明确或已有产物） */
  const panelVisible = computed(() => topicChanged.value || artifact.value != null)
  const artifactContent = computed<AssistantArtifactContent | null>(
    () => artifact.value?.content ?? null,
  )
  const readOnly = computed(() => themeStatus.value === 5)
  /** 未连接时不能发送：帧发不出去，本地气泡会造成"已发送"的错觉 */
  const connected = computed(() => wsStatus.value === 'open')
  const inputDisabled = computed(
    () => generating.value || readOnly.value || loadingSession.value || !connected.value,
  )
  const isEmptyConversation = computed(() => !loadingHistory.value && messages.value.length === 0)

  // ---------- 工具 ----------
  const bufferKey = (messageId: string, index: number) => `${messageId}#${index}`

  function findMessage(id: string): AssistantChatMessage | undefined {
    return messages.value.find((m) => m.id === id)
  }

  function findMessageByDbId(dbId: string): AssistantChatMessage | undefined {
    return messages.value.find((m) => m.dbId === dbId)
  }

  /** wire 内容块 → 渲染块 */
  function toRenderBlocks(content: unknown): AssistantRenderBlock[] {
    if (!Array.isArray(content)) return []
    const out: AssistantRenderBlock[] = []
    for (const raw of content) {
      if (!raw || typeof raw !== 'object') continue
      const block = raw as {
        type?: string
        text?: string
        file?: { uri?: string }
        extendedData?: Record<string, unknown>
        data?: unknown
      }
      if (block.type === 'text') {
        out.push({ kind: 'text', text: String(block.text ?? '') })
      } else if (block.type === 'file') {
        const ext = block.extendedData ?? {}
        out.push({
          kind: 'file',
          uri: String(block.file?.uri ?? ''),
          name: String(ext.name ?? '未命名文件'),
          fileType: String(ext.fileType ?? ''),
          fileSize: Number(ext.fileSize ?? 0),
        })
      } else if (block.type === 'data') {
        const parsed = parseWireDataBlock(block as WireDataBlock)
        // 客户端 action 帧（common-session-start / confirm）只是控制帧，不进消息流
        if (parsed.actionName && CONTROL_ACTIONS.has(parsed.actionName)) continue
        out.push({
          kind: 'event',
          bizType: parsed.bizType,
          ...(parsed.actionName ? { actionName: parsed.actionName } : {}),
          params: parsed.params,
          raw: '',
          done: true,
          parseError: parsed.error,
        })
      }
    }
    return out
  }

  /**
   * 历史消息里的 data 块解析，三种形状：
   *  1. 事件：{bizType, params}（后端业务事件原样落库）
   *  2. 客户端 action：{type:"action", actionName, params}（控制帧原样落库）
   *  3. 兼容：{type:"biz", data:"<JSON 串>"}
   */
  function parseWireDataBlock(block: WireDataBlock): {
    bizType: AssistantBizType | ''
    actionName: string
    params: Record<string, unknown>
    error: string
  } {
    const empty = { bizType: '' as AssistantBizType | '', actionName: '', params: {}, error: '' }
    const data = block.data
    if (!data) return empty
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data) as {
          bizType?: string
          actionName?: string
          params?: Record<string, unknown>
        }
        return {
          bizType: (parsed.bizType ?? '') as AssistantBizType | '',
          actionName: parsed.actionName ?? '',
          params: parsed.params ?? {},
          error: '',
        }
      } catch (e) {
        return { ...empty, error: e instanceof Error ? e.message : '解析失败' }
      }
    }
    if (typeof data === 'object') {
      if (typeof data.bizType === 'string') {
        return {
          bizType: data.bizType as AssistantBizType,
          actionName: '',
          params: data.params ?? {},
          error: '',
        }
      }
      if (typeof data.actionName === 'string') {
        return { bizType: '', actionName: data.actionName, params: data.params ?? {}, error: '' }
      }
      // 兼容 {type:'biz', data:'JSON 串'}
      const inner = (data as { data?: unknown }).data
      if (typeof inner === 'string') {
        try {
          const parsed = JSON.parse(inner) as {
            bizType?: string
            actionName?: string
            params?: Record<string, unknown>
          }
          return {
            bizType: (parsed.bizType ?? '') as AssistantBizType | '',
            actionName: parsed.actionName ?? '',
            params: parsed.params ?? {},
            error: '',
          }
        } catch (e) {
          return { ...empty, error: e instanceof Error ? e.message : '解析失败' }
        }
      }
    }
    return empty
  }

  // ---------- 会话加载 ----------

  /** 建立/恢复会话（FP-31）：建会话 → 拉历史 → 拉 artifact。仅"建会话"失败才算失败 */
  async function initSession(routeThemeId?: string) {
    loadingSession.value = true
    try {
      const resp = await createAssistantSession(routeThemeId)
      sessionId.value = resp.sessionId
      themeId.value = resp.themeId ?? routeThemeId ?? ''
      artifact.value = resp.artifact ?? null
      if (artifact.value) topicChanged.value = true
      // 历史与 artifact 是兜底数据：失败不阻塞对话页（WS 连接只依赖 sessionId）
      try {
        await Promise.all([loadHistory(), refreshArtifact()])
      } catch {
        /* 兜底数据拉取失败：保留会话，继续连 WS */
      }
    } finally {
      loadingSession.value = false
    }
  }

  async function loadHistory() {
    if (!sessionId.value) return
    loadingHistory.value = true
    try {
      const resp = await getAssistantMessages(sessionId.value, 1000, '')
      const history: AssistantChatMessage[] = (resp.messages ?? [])
        .map((m) => ({
          id: m.id,
          // 后端落库 role 为 user/assistant；协议文档措辞为 agent，两种都归一化为助手
          role: isAgentRole(m.role) ? ('agent' as const) : ('user' as const),
          blocks: toRenderBlocks(m.content),
          sender:
            m.sender ??
            (isAgentRole(m.role)
              ? { id: 'agent', name: '无所不知的大贤者', avatar: '' }
              : ADMIN_SENDER),
          createdAt: m.createdAt ?? '',
          dbId: m.dbId ?? '',
          streaming: false,
        }))
        // 纯控制帧（如 common-session-start）转换后无块，不占消息流位置
        .filter((m) => m.blocks.length > 0)
      // 以库为准覆盖；但服务端返回空而本地已有消息时不擦除当前会话（避免重连瞬间白屏）
      if (history.length > 0 || messages.value.length === 0) {
        messages.value = history
      }
      collapseGeneratedCards(history)
      settleInterruptedGeneration(history)
      settleGenerationPlaceholder(history, generationSettled(history))
      // 历史里的 data 块需要重放状态（解析中→完成两态合并、右面板数据源）。
      // 必须遍历副本：重放会把被合并掉、已无内容的消息从 messages 里回收（见 dropEventBlock），
      // 直接在活数组上迭代会因元素左移漏掉相邻消息。
      for (const msg of [...messages.value]) {
        for (const b of [...msg.blocks]) {
          if (b.kind === 'event' && b.bizType) {
            dispatchBizEvent(b.bizType, b.params, { block: b, messageId: msg.id, replay: true })
          }
        }
      }
    } finally {
      loadingHistory.value = false
    }
  }

  /** 兜底刷新 artifact（进入会话 / 重连后 / 事件丢失时） */
  async function refreshArtifact() {
    if (!sessionId.value) return
    const snap = await getAssistantArtifact(sessionId.value)
    if (snap) {
      artifact.value = snap
      topicChanged.value = true
    }
  }

  // ---------- 发送（委托 transport） ----------

  function sendText(text: string) {
    const value = text.trim()
    if (!value || inputDisabled.value) return
    const id = newUuid()
    // 用户气泡立即出现（FP-32 GWT）
    messages.value.push({
      id,
      role: 'user',
      blocks: [{ kind: 'text', text: value }],
      sender: ADMIN_SENDER,
      createdAt: '',
      dbId: '',
      streaming: false,
      local: true,
    })
    transport?.sendText(value)
  }

  function sendFile(file: AssistantFileResp) {
    messages.value.push({
      id: newUuid(),
      role: 'user',
      blocks: [
        {
          kind: 'file',
          uri: file.fileId,
          name: file.name,
          fileType: file.fileType,
          fileSize: file.fileSize,
        },
      ],
      sender: ADMIN_SENDER,
      createdAt: '',
      dbId: '',
      streaming: false,
      local: true,
    })
    transport?.sendFileBlock(file)
  }

  /** 确认按钮：发 biz-side-manage-confirm action */
  function confirmArtifact() {
    const snap = artifact.value
    if (!snap) return
    transport?.sendConfirm(snap.artifactId, snap.versionNo)
  }

  /** 材料「学员可见」开关：发 biz-side-manage-update-material action（经用户确认新增的 WS action） */
  function toggleMaterialVisibility(materialId: string, visibility: number) {
    const snap = artifact.value
    if (!snap) return
    transport?.sendUpdateMaterial({
      id: snap.artifactId,
      version: snap.versionNo,
      materialId,
      visibility,
    })
  }

  function simulateDrop() {
    transport?.simulateDrop()
  }

  /**
   * 导入在线课堂培训材料（2026-10-28，03-接口文档 §3 API-04）。
   *
   * 后端同步抽取并落库后返回成功项与逐条失败原因；成功时：
   *  1. 拉一次会话材料（培训材料 tab 的数据源兜底，事件丢失也能刷出来）；
   *  2. 以服务端为准刷新 artifact（材料条目含 fileSource=3 的来源标识）。
   * 这里不往消息流塞本地卡片：解析完成卡片由后端推 biz-common-parse-file 事件生成，
   * 否则刷新/重进会看到两张重复卡。
   */
  async function importKngMaterials(coursewareIds: string[]): Promise<AssistantKngImportResp> {
    if (!sessionId.value) throw new Error('会话尚未建立，请稍后重试')
    const resp = await importKngMaterialsApi(sessionId.value, coursewareIds)
    if (resp.materials.length > 0) {
      await Promise.all([
        refreshMaterials().catch(() => undefined),
        refreshArtifact().catch(() => undefined),
      ])
    }
    return resp
  }

  /** 会话材料列表（"培训材料"tab 兜底；接口失败返回空列表，不打断对话） */
  async function refreshMaterials(): Promise<AssistantMaterialBrief[]> {
    if (!sessionId.value) return []
    try {
      const resp = await getSessionMaterials(sessionId.value)
      materials.value = resp.materials ?? []
    } catch {
      /* 兜底数据：失败保留上一次结果 */
    }
    return materials.value
  }

  /** 请求右面板切到指定 Tab（一次性信号，面板消费后调用 consumePanelTab） */
  function requestPanelTab(tab: AssistantPanelTab) {
    panelTabRequest.value = tab
  }

  /** 面板消费完信号后清空，避免重复触发 */
  function consumePanelTab() {
    panelTabRequest.value = ''
  }

  // ---------- 事件分发（§3.3） ----------

  function handleFrame(frame: AssistantServerFrame) {
    if (frame.type !== 'event') return
    handleEvent(frame)
  }

  function handleEvent(frame: AssistantEventFrame) {
    const data = frame.data as Record<string, unknown>
    switch (frame.event) {
      case 'user-message-ack': {
        const messageId = String(data.userMessageId ?? '')
        const target = findMessage(messageId)
        if (target) {
          target.dbId = String(data.userMessageDbId ?? '')
          target.local = false
        }
        break
      }
      case 'session-start': {
        generating.value = true
        // 记录本轮 traceId（session-start 帧自带），登记进并存集合供 session-finish 做归属判断
        const startedTrace = String((frame.data as { traceId?: string }).traceId ?? '')
        activeRoundTraceId.value = startedTrace
        if (startedTrace && !activeRoundTraces.value.includes(startedTrace)) {
          activeRoundTraces.value = [...activeRoundTraces.value, startedTrace].slice(-20)
        }
        // 轮次超时兜底：连接半死 / 代理断流时可能**永远收不到 session-finish**
        //（消息却已在库里），表现为"一直正在回复 + 助手消息不显示"。
        // 超时后按库回补消息并解除"回复中"；正常轮次结束时该 trace 已从集合移除，此兜底自动失效。
        const roundTrace = startedTrace
        window.setTimeout(() => {
          if (generating.value && roundTrace && activeRoundTraces.value.includes(roundTrace)) {
            console.warn(
              '[ws] 本轮长时间未收到 session-finish，按库回补消息并解除回复中',
              roundTrace,
            )
            activeRoundTraces.value = activeRoundTraces.value.filter((t) => t !== roundTrace)
            if (activeRoundTraceId.value === roundTrace) activeRoundTraceId.value = ''
            generating.value = false
            void loadHistory().catch(() => undefined)
            void refreshArtifact().catch(() => undefined)
          }
        }, 210000)
        break
      }
      case 'message-extra-info': {
        const info = data.extraInfo as { taskId?: string; contextId?: string } | undefined
        extraInfo.value = { taskId: info?.taskId ?? '', contextId: info?.contextId ?? '' }
        break
      }
      case 'message-start': {
        const d = frame.data as MessageStartData
        // 归属：记下本条消息属于哪一轮，轮次收尾时据此只清理本轮遗留的空气泡
        const ownerTrace = String((frame.data as { traceId?: string }).traceId ?? '')
        if (ownerTrace) messageRoundTrace.set(String(d.messageId), ownerTrace)
        // 助手消息开：建空气泡，后续 part 渐次填充（打字机）
        const existing = findMessage(String(d.messageId))
        if (existing) {
          existing.dbId = String(d.agentMessageDbId ?? '')
          existing.streaming = true
        } else {
          messages.value.push({
            id: String(d.messageId),
            role: 'agent',
            blocks: [],
            sender: d.sender ?? { id: 'agent', name: 'Nova', avatar: '' },
            createdAt: String(d.agentMessageCreatedAt ?? ''),
            dbId: String(d.agentMessageDbId ?? ''),
            streaming: true,
          })
        }
        break
      }
      case 'part-start': {
        const d = frame.data as PartStartData
        openPart(d)
        break
      }
      case 'part-content': {
        const d = frame.data as PartContentData
        appendPartDelta(d)
        break
      }
      case 'part-end': {
        const d = frame.data as PartEndData
        closePart(d)
        break
      }
      case 'session-finish': {
        // 轮次归属：只收尾本连接登记过的轮次，用并存集合判断而不是单值比较——
        // 后台事件轮次的 session-start 会覆盖智能体轮次，若按单值比较，先到的那一轮 finish
        // 会被判为"非本轮"而整条丢弃，空气泡因此永久残留、"正在生成"永不结束（实测踩到）。
        // 真正要忽略的是"从未登记过"的收尾：重复握手帧的回执（服务端只回 ack + finish）。
        const finishTraceId = String((frame.data as { traceId?: string }).traceId ?? '')
        if (finishTraceId && !activeRoundTraces.value.includes(finishTraceId)) {
          console.warn(
            '[ws] 忽略未登记轮次的 session-finish',
            finishTraceId,
            '活跃轮次=',
            activeRoundTraces.value,
          )
          break
        }
        activeRoundTraces.value = activeRoundTraces.value.filter((t) => t !== finishTraceId)
        const lastRound = activeRoundTraces.value.length === 0
        if (lastRound) {
          activeRoundTraceId.value = ''
          generating.value = false
          // 兜底：全部轮次结束后按库回补一次历史消息，保证"库里有的消息页面上一定有"。
          // 仅靠 WS 帧不足以保证一致：连接半死/抖动会丢帧，而后端是异步落库的（库里有、页面没有）。
          // 必须等最后一轮再回补：中途整体覆盖消息列表会把仍在流式的助手气泡冲掉，后续 part-* 无处可写。
          void loadHistory().catch(() => undefined)
        }
        // 无内容的空气泡（服务端只发了 message-start 的情形）不保留。
        // 只删"本轮自己的"或"全部轮次已结束"的空气泡：其它仍活跃轮次的气泡是 part-* 的落点，
        // 删掉会让后续增量找不到归属而丢弃（表现为助手消息不显示）。
        const stillActive = new Set(activeRoundTraces.value)
        messages.value = messages.value.filter((m) => {
          if (!m.streaming || m.blocks.length > 0) return true
          const owner = messageRoundTrace.get(m.id) ?? ''
          if (owner && owner !== finishTraceId && stillActive.has(owner)) return true
          if (owner || lastRound) {
            messageRoundTrace.delete(m.id)
            return false
          }
          return true
        })
        if (lastRound) {
          messages.value.forEach((m) => {
            m.streaming = false
          })
        }
        // 重连兜底：本轮若有案例生成，事件可能丢失案例正文，刷新 artifact 取回
        if (pendingArtifactRefresh && lastRound) {
          pendingArtifactRefresh = false
          void refreshArtifact()
        }
        break
      }
      default:
        break
    }
  }

  /**
   * part-start：建立 part 缓冲区并定位渲染块。
   *
   * 文本 part 会与上一条文本块合并：一条助手消息里可能开多个 text part
   * （后端按 chunk 切分流式），若每个 part 各建一个气泡，markdown 会被切断
   * （实测出现 "**主" / "要训练对象**" 分属两个气泡）。连续文本 part 合并成
   * 一个气泡即可得到完整 markdown；中间夹了 data part（事件卡）时自然重新开块，
   * 保持 text→data→text 的交织顺序。
   *
   * 文本块延迟到首个 delta 才创建（避免出现空气泡）；位次 -1 表示待创建。
   */
  function openPart(d: PartStartData) {
    const messageId = String(d.messageId ?? '')
    const index = Number(d.index ?? 0)
    const msg = findMessage(messageId)
    if (!msg) return
    const kind: 'text' | 'data' = d.contentType === 'data' ? 'data' : 'text'
    const key = bufferKey(messageId, index)
    partBuffers.value = {
      ...partBuffers.value,
      [key]: { messageId, index, kind, text: '', raw: '', done: false },
    }
    if (kind === 'text') {
      const last = msg.blocks[msg.blocks.length - 1]
      partBlockIndex.set(key, last && last.kind === 'text' ? msg.blocks.length - 1 : -1)
      return
    }
    msg.blocks.push({
      kind: 'event',
      bizType: '',
      params: {},
      raw: '',
      done: false,
      parseError: '',
    })
    // 记录 index → 块位次，供 part-content/part-end 定位
    partBlockIndex.set(key, msg.blocks.length - 1)
  }

  /** part-content：text_delta 打字机追加；data_delta 累积原始 JSON 片段 */
  function appendPartDelta(d: PartContentData) {
    const messageId = String(d.messageId ?? '')
    const index = Number(d.index ?? 0)
    const key = bufferKey(messageId, index)
    const buffer = partBuffers.value[key]
    const msg = findMessage(messageId)
    if (!msg) return
    const blockPos = partBlockIndex.get(key)
    if (blockPos == null) return

    const delta = d.delta
    if (delta?.type === 'text_delta') {
      const text = String(delta.text ?? '')
      if (buffer) buffer.text += text
      // 文本块延迟创建（位次 -1）：首个 delta 到达时才落块，避免空气泡
      let pos = blockPos
      if (pos < 0) {
        msg.blocks.push({ kind: 'text', text: '' })
        pos = msg.blocks.length - 1
        partBlockIndex.set(key, pos)
      }
      const block = msg.blocks[pos]
      if (block && block.kind === 'text') block.text += text
      return
    }
    if (delta?.type === 'data_delta') {
      const chunk = String(delta.data ?? '')
      if (buffer) buffer.raw += chunk
      const block = msg.blocks[blockPos]
      if (block && block.kind === 'event') block.raw += chunk
    }
  }

  /** part-end：data 块整体 JSON.parse → 按 bizType 派发 */
  function closePart(d: PartEndData) {
    const messageId = String(d.messageId ?? '')
    const index = Number(d.index ?? 0)
    const key = bufferKey(messageId, index)
    const buffer = partBuffers.value[key]
    const msg = findMessage(messageId)
    const blockPos = partBlockIndex.get(key)
    const block = msg && blockPos != null ? msg.blocks[blockPos] : undefined

    if (block?.kind === 'event') {
      const raw = block.raw
      try {
        const parsed = JSON.parse(raw) as { bizType?: string; params?: Record<string, unknown> }
        block.bizType = (parsed.bizType ?? '') as AssistantBizType | ''
        block.params = parsed.params ?? {}
        block.parseError = ''
        if (block.bizType) dispatchBizEvent(block.bizType, block.params, { block, messageId })
      } catch (e) {
        block.parseError = e instanceof Error ? e.message : '解析失败'
      }
    }
    if (block?.kind === 'event') block.done = true
    if (buffer) buffer.done = true
    partBlockIndex.delete(key)
  }

  // ---------- §3.4 bizType 派发 ----------

  function dispatchBizEvent(
    bizType: AssistantBizType,
    params: Record<string, unknown>,
    ctx: { block?: AssistantRenderBlock; messageId?: string; replay?: boolean } = {},
  ) {
    switch (bizType) {
      case 'biz-common-parse-file':
        handleParseFile(params, ctx)
        break
      case 'biz-side-manage-topic-changed':
        handleTopicChanged(params as unknown as TopicChangedParams)
        break
      case 'biz-side-manage-artifact-updated':
        handleArtifactUpdated(params as unknown as ArtifactUpdatedParams)
        break
      case 'biz-side-manage-artifact-generated':
        handleArtifactGenerated(params as unknown as ArtifactGeneratedParams, ctx)
        break
      case 'biz-side-manage-case-generated':
        handleCaseGenerated(params as unknown as CaseGeneratedParams)
        break
      case 'biz-side-manage-save-success':
        handleSaveSuccess(params as unknown as SaveSuccessParams)
        break
      default:
        break
    }
  }

  /**
   * 文件解析两态：同 context_id（同一次解析）的 status=1 事件到达时，
   * 就地更新先前的 status=0 卡片（"正在解析 → 解析完成"）并移除这张重复卡，
   * 保证一次解析在消息流里只有一张两态卡片。历史重放走同一逻辑。
   */
  function handleParseFile(
    params: Record<string, unknown>,
    ctx: { block?: AssistantRenderBlock; messageId?: string },
  ) {
    const key = String(params.context_id ?? params.call_id ?? '')
    if (!key) return
    if (!isParseCardDone(params)) {
      // 解析中：挂上兜底轮询。完成事件只走 WS 推送，丢帧时卡片会永远转圈（见 runParseReconcile）
      scheduleParseReconcile()
      return
    }
    let alreadyResolved = false
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const msg = messages.value[i]
      if (!msg) continue
      for (let j = msg.blocks.length - 1; j >= 0; j--) {
        const b = msg.blocks[j]
        if (!b || b.kind !== 'event' || b.bizType !== 'biz-common-parse-file') continue
        if (b === ctx.block) continue
        if (String(b.params.context_id ?? b.params.call_id ?? '') !== key) continue
        if (isParseCardDone(b.params)) {
          // 同一次解析已有完成卡（多半是兜底轮询先校正过）：这张新卡是重复的，丢掉
          alreadyResolved = true
          continue
        }
        b.params = params
        dropEventBlock(ctx)
        if (collectPendingParseIds().length > 0) scheduleParseReconcile()
        return
      }
    }
    if (alreadyResolved) dropEventBlock(ctx)
  }

  /** 事件 params 的 files[]（非数组按空处理） */
  function parseFilesOf(params: Record<string, unknown>): ParseFileEntry[] {
    return Array.isArray(params.files) ? (params.files as ParseFileEntry[]) : []
  }

  /** 一张解析卡是否到完成态：必须带文件条目且全部 status=1 */
  function isParseCardDone(params: Record<string, unknown>): boolean {
    const files = parseFilesOf(params)
    return files.length > 0 && files.every((f) => Number(f.status ?? 0) === 1)
  }

  /**
   * 移除非渲染所需的事件块（内容已合并进先前那张卡时清掉本次的重复卡）。
   *
   * 卡片被合并掉之后，承载它的消息常常就没有任何内容块了（后端一条独立事件消息只装一块），
   * 留着会渲染成"只有头像、没有输出"的空气泡，故就地回收。
   * 流式中的消息不回收：part-* 帧还要往它身上落，删了会让后续增量找不到归属。
   */
  function dropEventBlock(ctx: { block?: AssistantRenderBlock; messageId?: string }) {
    if (!ctx.block || !ctx.messageId) return
    const owner = findMessage(ctx.messageId)
    const pos = owner ? owner.blocks.indexOf(ctx.block) : -1
    if (!owner || pos < 0) return
    owner.blocks.splice(pos, 1)
    if (owner.streaming || owner.blocks.length > 0) return
    const at = messages.value.findIndex((m) => m.id === owner.id)
    if (at >= 0) messages.value.splice(at, 1)
    messageRoundTrace.delete(owner.id)
  }

  /** 消息流里所有"仍在解析中"卡片的文件 ID（去重） */
  function collectPendingParseIds(): string[] {
    const ids: string[] = []
    for (const msg of messages.value) {
      for (const b of msg.blocks) {
        if (b.kind !== 'event' || b.bizType !== 'biz-common-parse-file') continue
        if (isParseCardDone(b.params)) continue
        for (const f of parseFilesOf(b.params)) {
          const id = String(f.id ?? '')
          if (id && !ids.includes(id)) ids.push(id)
        }
      }
    }
    return ids
  }

  /** 排一次兜底校正（已排队则忽略；没有会话 ID 时无从查起） */
  function scheduleParseReconcile() {
    if (parseReconcileTimer !== null || !sessionId.value) return
    parseReconcileTimer = window.setTimeout(() => {
      parseReconcileTimer = null
      void runParseReconcile()
    }, PARSE_RECONCILE_INTERVAL_MS)
  }

  /** 停止兜底轮询并复位计数（离开会话 / 重置时） */
  function stopParseReconcile() {
    if (parseReconcileTimer !== null) {
      window.clearTimeout(parseReconcileTimer)
      parseReconcileTimer = null
    }
    parseReconcileTries = 0
    parseReconcileSig = ''
  }

  /**
   * 解析结果兜底校正（2026-09-21 补偿逻辑）
   *
   * 「解析中」卡片靠 WS 上的 status=1 事件停转，而该事件是一次性推送、不重试：
   * 连接抖动、或推送瞬间没有活跃连接，卡片就一直转（库里其实早已解析完）。
   * 材料行只在文本提取成功后才写库，所以"会话材料列表里出现了这个 fileId"就是完成的确证，
   * 据此把卡片原地改成完成态。轮询是兜底而非常态：无未完成卡即停；约 5 分钟仍确认不到，
   * 就把卡片收口成"确认超时"终态——任何一条路径都不留永久转圈。
   */
  async function runParseReconcile() {
    const pending = collectPendingParseIds()
    if (pending.length === 0) return
    const sig = pending.join(',')
    if (sig !== parseReconcileSig) {
      // 等待的文件集合变了（有新上传）：计数从头算，否则老文件耗尽次数后新文件永不被校正
      parseReconcileSig = sig
      parseReconcileTries = 0
    }
    if (parseReconcileTries >= PARSE_RECONCILE_MAX_TRIES) {
      // 轮询用尽仍未在服务端看到该材料：要么解析失败（失败不写材料行），要么根本没受理。
      // 此时把卡片收敛成"确认失败"终态——本兜底逻辑的目的就是不让它一直转，不能转回原点。
      console.warn('[assistant] 解析结果兜底轮询已达上限，按未确认收口', pending)
      for (const fileId of pending) applyParseUnresolved(fileId)
      return
    }
    parseReconcileTries += 1
    try {
      const resp = await getSessionMaterials(sessionId.value)
      const materials = resp.materials ?? []
      for (const fileId of pending) {
        const parsed = materials.find((m) => String(m.fileId ?? '') === fileId)
        if (parsed) applyParseFallback(fileId, parsed)
      }
    } catch {
      /* 接口异常：下一轮再试，兜底逻辑不该打扰用户 */
    }
    if (collectPendingParseIds().length > 0) scheduleParseReconcile()
  }

  /** 找到"仍在解析中"且含该文件的那张卡（两条兜底收口路径共用的定位器） */
  function pendingParseCardOf(fileId: string): EventBlock | null {
    for (const msg of messages.value) {
      for (const b of msg.blocks) {
        if (b.kind !== 'event' || b.bizType !== 'biz-common-parse-file') continue
        if (isParseCardDone(b.params)) continue
        if (parseFilesOf(b.params).some((f) => String(f.id ?? '') === fileId)) return b
      }
    }
    return null
  }

  /** 用服务端材料结果把「解析中」卡片就地改成完成态（不新增气泡） */
  function applyParseFallback(fileId: string, material: AssistantMaterialBrief) {
    const card = pendingParseCardOf(fileId)
    if (!card) return
    const files = parseFilesOf(card.params)
    card.params = {
      ...card.params,
      content: `材料《${material.name ?? ''}》解析完成（提取 ${material.extractLength ?? 0} 字，按服务端结果校正）`,
      files: files.map((f) => (String(f.id ?? '') === fileId ? { ...f, status: 1 } : f)),
      summary: String(material.preview ?? '').slice(0, PARSE_SUMMARY_PREVIEW_CHARS),
    }
  }

  /** 兜底轮询用尽：把卡片收口成"未确认"终态，让它停止转圈而不是永远停在中转态 */
  function applyParseUnresolved(fileId: string) {
    const card = pendingParseCardOf(fileId)
    if (!card) return
    card.params = {
      ...card.params,
      content: `${String(card.params.content ?? '')}\n（未能确认解析结果：本会话材料列表里没有它，多半是解析失败或未受理，请重新上传）`,
      files: parseFilesOf(card.params).map((f) =>
        String(f.id ?? '') === fileId ? { ...f, status: 1 } : f,
      ),
    }
  }

  /** topic-changed：建草稿/改名 → 右面板展开、主题名更新（FP-33/39） */
  function handleTopicChanged(params: TopicChangedParams) {
    topicChanged.value = true
    if (params.topic) themeName.value = params.topic
    if (!artifact.value) {
      artifact.value = { artifactId: '', versionNo: '1', status: 'working', content: null }
    }
  }

  /** artifact-updated：JSON-Patch（op=full_replace 按 path 局部更新） */
  function handleArtifactUpdated(params: ArtifactUpdatedParams) {
    if (params.id && artifact.value && !artifact.value.artifactId)
      artifact.value.artifactId = params.id
    if (params.version && artifact.value) artifact.value.versionNo = params.version
    const patches = Array.isArray(params.content) ? params.content : []
    for (const patch of patches) {
      applyPatch(patch)
    }
    topicChanged.value = true
  }

  /** 应用单条 JSON-Patch：path 形如 /materials、/scenarios/0 等，仅支持 full_replace */
  function applyPatch(patch: { op?: string; path?: string; value?: unknown }) {
    const path = String(patch.path ?? '')
    const key = path.replace(/^\//, '').split('/')[0] ?? ''
    if (!key) return
    const snap = artifact.value
    if (!snap) return
    const content: AssistantArtifactContent = snap.content ?? emptyArtifactContent()
    const next = { ...content } as unknown as Record<string, unknown>
    // full_replace 为文档中的唯一 op；其它 op 退化为"按顶级字段整段替换"
    next[key] = patch.value
    artifact.value = { ...snap, content: next as unknown as AssistantArtifactContent }
  }

  /** 历史里已有完成或失败的生成卡。没有就不要把「请稍候」换成成功文案。 */
  function generationSettled(history: AssistantChatMessage[]): boolean {
    for (const msg of history) {
      for (const block of msg.blocks) {
        if (block.kind !== 'event' || block.bizType !== 'biz-side-manage-artifact-generated')
          continue
        const status = String(block.params.status ?? '')
        if (status === 'completed' || status === 'failed') return true
      }
    }
    return false
  }

  /**
   * 生成已收口时，替换助手留下的“请稍候”。只改内存，重进时按结果卡再替换一次。
   *
   * @param settled true=成功文案；false=不处理；传字符串=失败文案（生成 failed 时用，
   *        否则失败会被替换成"已生成完成"，与右侧空的产物面板自相矛盾）
   */
  function settleGenerationPlaceholder(
    history: AssistantChatMessage[],
    settled: boolean | string = true,
  ) {
    if (settled === false) return
    const replacement =
      typeof settled === 'string'
        ? settled
        : '训练配置已生成完成：可在右侧查看场景单元、客户画像、评估维度与案例；需要我继续生成实战案例就说一声。'
    const placeholder = /请稍候|正在生成/
    for (let i = history.length - 1; i >= 0; i--) {
      const blocks = history[i]?.blocks ?? []
      for (let j = blocks.length - 1; j >= 0; j--) {
        const block = blocks[j]
        if (block && block.kind === 'text' && placeholder.test(block.text)) {
          block.text = replacement
          return
        }
      }
    }
  }

  /**
   * 同一产物的生成卡只留最终那条。完成事件在另一条消息里，重放时会先被归并掉，
   * 旧卡就停在受理时的 0 个场景。这里在重放前把旧卡收成最终状态。
   */
  function collapseGeneratedCards(history: AssistantChatMessage[]) {
    const latest = new Map<string, Record<string, unknown>>()
    for (const msg of history) {
      for (const block of msg.blocks) {
        if (block.kind !== 'event' || block.bizType !== 'biz-side-manage-artifact-generated')
          continue
        const id = String(block.params.id ?? '')
        if (!id) continue
        const prev = latest.get(id)
        const incoming = String(block.params.status ?? '')
        const previous = String(prev?.status ?? '')
        if (
          prev &&
          (previous === 'completed' || previous === 'failed') &&
          incoming === 'in_progress'
        )
          continue
        latest.set(id, block.params)
      }
    }
    const seen = new Set<string>()
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i]
      if (!msg) continue
      for (let j = msg.blocks.length - 1; j >= 0; j--) {
        const block = msg.blocks[j]
        if (
          !block ||
          block.kind !== 'event' ||
          block.bizType !== 'biz-side-manage-artifact-generated'
        )
          continue
        const id = String(block.params.id ?? '')
        const winner = latest.get(id)
        if (!winner) continue
        if (seen.has(id)) {
          msg.blocks.splice(j, 1)
          continue
        }
        seen.add(id)
        block.params = winner
      }
      if (msg.blocks.length === 0) history.splice(i, 1)
    }
  }

  /**
   * 重进时历史里还停在 in_progress，说明这轮生成没有写出 completed/failed。
   * 进度事件不落库，断线后服务端任务也已丢失，不能继续显示「正在生成」。
   */
  function settleInterruptedGeneration(history: AssistantChatMessage[]) {
    const settled = new Set<string>()
    for (const msg of history) {
      for (const block of msg.blocks) {
        if (block.kind !== 'event' || block.bizType !== 'biz-side-manage-artifact-generated')
          continue
        const status = String(block.params.status ?? '')
        const id = String(block.params.id ?? '')
        if (id && (status === 'completed' || status === 'failed')) settled.add(id)
      }
    }
    for (const msg of history) {
      for (const block of msg.blocks) {
        if (block.kind !== 'event' || block.bizType !== 'biz-side-manage-artifact-generated')
          continue
        if (String(block.params.status ?? '') !== 'in_progress') continue
        const id = String(block.params.id ?? '')
        if (id && settled.has(id)) continue
        block.params = {
          ...block.params,
          status: 'failed',
          error: '生成已中断，请重新生成',
        }
      }
    }
  }

  /**
   * artifact-generated：受理(in_progress) → 分段(in_progress)×N → completed / failed
   *
   * 后端一次主题生成会推多条同 params.id 的事件（分段渐次渲染），消息流里必须
   * 归并成**一张**卡片：同 artifact id 的卡片原地更新 params（内容以最新一次为准），
   * 不新增气泡；completed 把那张卡变完成态，failed 在同一张卡上显示 error。
   */
  function handleArtifactGenerated(
    params: ArtifactGeneratedParams,
    ctx: { block?: AssistantRenderBlock; messageId?: string } = {},
  ) {
    const snap = artifact.value ?? {
      artifactId: params.id ?? '',
      versionNo: params.version ?? '1',
      status: 'working' as const,
      content: null,
    }
    // 右面板：params.content 每次都是"当前全量产物"，按顶层字段以最新覆盖
    const merged = mergeArtifactContent(snap.content, params.content)
    artifact.value = {
      ...snap,
      artifactId: params.id || snap.artifactId,
      versionNo: params.version || snap.versionNo,
      content: merged,
    }
    topicChanged.value = true
    if (params.status === 'completed') {
      // 生成完成：以服务端为准做一次兜底刷新，取回完整产物（含案例正文）
      pendingArtifactRefresh = true
      settleGenerationPlaceholder(messages.value)
    } else if (params.status === 'failed') {
      settleGenerationPlaceholder(messages.value, '主题内容生成失败，可重新发起生成。')
    }
    // 消息流：同 artifact id 的生成卡原地更新
    mergeGeneratedCard(params, ctx)
  }

  /**
   * 把本次事件归并到已有生成卡上（消息流里按 params.id 定位，从新到旧找）。
   * 找到 → 覆盖其 params（重渲染为最新状态）并移除本次产生的重复卡。
   */
  function mergeGeneratedCard(
    params: ArtifactGeneratedParams,
    ctx: { block?: AssistantRenderBlock; messageId?: string },
  ) {
    const artifactId = String(params.id ?? '')
    if (!artifactId) return
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const msg = messages.value[i]
      if (!msg) continue
      for (let j = msg.blocks.length - 1; j >= 0; j--) {
        const b = msg.blocks[j]
        if (!b || b.kind !== 'event' || b.bizType !== 'biz-side-manage-artifact-generated') continue
        if (b === ctx.block) continue
        if (String(b.params.id ?? '') !== artifactId) continue
        const previous = String(b.params.status ?? '')
        const incoming = String(params.status ?? '')
        // 受理卡没有 content，场景数是 0。完成事件已经落库后，不能再被这条空进度盖回去。
        if ((previous === 'completed' || previous === 'failed') && incoming === 'in_progress') {
          dropEventBlock(ctx)
          return
        }
        b.params = params as unknown as Record<string, unknown>
        // 本次事件块是新的一段：合并进先前卡片后移除，空出来的消息一并回收（见 dropEventBlock）
        dropEventBlock(ctx)
        return
      }
    }
  }

  /** case-generated：对应场景卡 +1 案例；案例正文不入事件流，从 artifact 拉取 */
  function handleCaseGenerated(params: CaseGeneratedParams) {
    const content = artifact.value?.content
    if (content) {
      const scenarios = content.scenarios.map((s) => {
        if (s.id !== params.scenarioId) return s
        if (s.cases.some((c) => c.scriptName === params.scriptName)) return s
        return {
          ...s,
          cases: [
            ...s.cases,
            {
              scriptName: params.scriptName,
              difficulty: params.difficulty,
              actorName: '',
              actorPosition: '',
              scriptBackground: '',
              scriptOpening: '',
            },
          ],
        }
      })
      artifact.value = { ...artifact.value!, content: { ...content, scenarios } }
    }
    pendingArtifactRefresh = true
    topicChanged.value = true
  }

  /** save-success：确认落库成功（FP-40） */
  function handleSaveSuccess(params: SaveSuccessParams) {
    if (artifact.value) artifact.value = { ...artifact.value, status: 'confirmed' }
    if (params.ex_id) {
      themeId.value = params.ex_id
      savedThemeId.value = params.ex_id
    }
    savedAt.value = Date.now()
  }

  // ---------- artifact 合并 ----------

  function emptyArtifactContent(): AssistantArtifactContent {
    return {
      materials: [],
      scenarios: [],
      customerProfiles: [],
      icebergModel: {
        visible: { knowledge: [], skills: [] },
        hidden: { roles: [], selfConcept: [], personalities: [], motives: [] },
      },
      evaluationCriteria: { passScore: 0, dimensions: [], defaultDimensionWeights: [] },
      professionalKnowledge: null,
      productProfiles: [],
      version: '',
    }
  }

  /** 按顶级字段合并（in_progress 只带已生成部分；completed 带全量，两者同一逻辑即可） */
  function mergeArtifactContent(
    base: AssistantArtifactContent | null,
    incoming: Partial<AssistantArtifactContent> | null | undefined,
  ): AssistantArtifactContent {
    const current = base ?? emptyArtifactContent()
    if (!incoming) return current
    const merged = { ...current } as unknown as Record<string, unknown>
    for (const [k, v] of Object.entries(incoming)) {
      if (v == null) continue
      merged[k] = v
    }
    return merged as unknown as AssistantArtifactContent
  }

  /** 重置（路由切换 / 离开页面） */
  function reset() {
    stopParseReconcile()
    sessionId.value = ''
    themeId.value = ''
    themeName.value = ''
    themeStatus.value = 0
    messages.value = []
    artifact.value = null
    topicChanged.value = false
    generating.value = false
    partBuffers.value = {}
    partBlockIndex.clear()
    extraInfo.value = null
    savedAt.value = 0
    savedThemeId.value = ''
    materials.value = []
    reconnectAttempt.value = 0
    wsStatus.value = 'idle'
  }

  return {
    // state
    sessionId,
    themeId,
    themeName,
    themeStatus,
    loadingSession,
    messages,
    loadingHistory,
    generating,
    artifact,
    topicChanged,
    savedAt,
    savedThemeId,
    materials,
    panelTabRequest,
    wsStatus,
    reconnectAttempt,
    partBuffers,
    extraInfo,
    // getters
    panelVisible,
    artifactContent,
    readOnly,
    connected,
    inputDisabled,
    isEmptyConversation,
    // actions
    registerTransport,
    initSession,
    loadHistory,
    refreshArtifact,
    sendText,
    sendFile,
    confirmArtifact,
    toggleMaterialVisibility,
    importKngMaterials,
    refreshMaterials,
    requestPanelTab,
    consumePanelTab,
    simulateDrop,
    handleFrame,
    handleEvent,
    normalizeCriteria,
    reset,
  }
})
