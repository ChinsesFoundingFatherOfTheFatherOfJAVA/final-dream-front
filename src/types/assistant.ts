/**
 * AI 设计助手类型定义
 * 严格对齐 03-接口文档.md：§3 WS 协议规范（帧字段逐字段照抄线上）、§3.4 bizType 事件字典、§2 HTTP、§3.5 artifact schema
 * 工程约定：所有 id / version 一律 string（防 JS 长整型精度丢失）
 */

// ============================================================
// §3.2 客户端 → 服务端
// ============================================================

/** 消息发送者；管理员侧固定 admin/管理员 */
export interface AssistantSender {
  id: string
  name: string
  avatar: string
}

/** file 块的 extendedData（§3.2 content 块类型表） */
export interface AssistantFileExtendedData {
  name: string
  fileType: string
  fileSize: number
  target?: string
  source?: number
}

/** text 块 */
export interface AssistantTextBlock {
  type: 'text'
  text: string
  extendedData: Record<string, unknown>
}

/** file 块（uri 存 fileId） */
export interface AssistantFileBlock {
  type: 'file'
  file: { uri: string }
  extendedData: AssistantFileExtendedData
}

/** data(action) 块：common-session-start / biz-side-manage-confirm / biz-side-manage-update-material */
export interface AssistantActionBlock {
  type: 'data'
  data: {
    type: 'action'
    actionName: AssistantActionName
    params: Record<string, unknown>
  }
}

export type AssistantContentBlock = AssistantTextBlock | AssistantFileBlock | AssistantActionBlock

/**
 * 服务端/历史消息中的 data 块：即 §3.4 的 bizType 事件 JSON（§2.2 原样存储原样返回）
 * 与客户端 action 块形状不同（无 actionName），前端重放时按 bizType 渲染为事件卡。
 */
export interface AssistantServerDataBlock {
  type: 'data'
  data: { bizType: AssistantBizType; params: Record<string, unknown> }
}

/** 落库/返回的消息内容块（含事件块） */
export type AssistantStoredContentBlock =
  | AssistantTextBlock
  | AssistantFileBlock
  | AssistantActionBlock
  | AssistantServerDataBlock

/** WS 客户端 chat 帧（§3.2） */
export interface AssistantChatFrame {
  type: 'chat'
  payload: { message: AssistantWireMessage }
  traceId: string
  spanId: string
}

/** WS 客户端心跳应答帧（§3.1） */
export interface AssistantPongFrame {
  type: 'pong'
}

/** action 名称字典（§3.2 action 定义） */
export type AssistantActionName =
  | 'common-session-start'
  | 'biz-side-manage-confirm'
  /** 材料「学员可见」开关：03 文档未定义写入通道，经用户确认新增本 action（params: id/version/materialId/visibility） */
  | 'biz-side-manage-update-material'

/** common-session-start 参数 */
export interface SessionStartParams {
  sessionId: string
  projectId: string
}

/** biz-side-manage-confirm 参数 */
export interface ConfirmActionParams {
  /** artifactId */
  id: string
  version: string
}

/** biz-side-manage-update-material 参数 */
export interface UpdateMaterialParams {
  /** artifactId */
  id: string
  version: string
  materialId: string
  /** 1 学员可见 / 0 不可见 */
  visibility: number
}

/** 传输中的消息体（客户端发送时 content 为 AssistantContentBlock[]） */
export interface AssistantWireMessage {
  id: string
  role: 'user' | 'agent'
  content: AssistantContentBlock[] | AssistantStoredContentBlock[]
  sender: AssistantSender
  dbId?: string
  sessionId?: string
  createdAt?: string
}

// ============================================================
// §3.3 服务端 → 客户端（事件流）
// ============================================================

/** 事件名：user-message-ack → session-start → message-extra-info → message-start → N×[part-start → part-content × M → part-end] → session-finish */
export type AssistantEventName =
  | 'user-message-ack'
  | 'session-start'
  | 'message-extra-info'
  | 'message-start'
  | 'part-start'
  | 'part-content'
  | 'part-end'
  | 'session-finish'

/** part-content 的 delta：text part 为 text_delta；data part 为 data_delta（JSON 字符串片段） */
export type AssistantPartDelta =
  | { type: 'text_delta'; text: string }
  | { type: 'data_delta'; data: string }

/** part 内容类型 */
export type AssistantPartContentType = 'text' | 'data'

export interface UserMessageAckData {
  userMessageDbId: string
  userMessageId: string
}

export interface SessionStartData {
  sessionId: string
  traceId: string
  timestamp: string
  seq: number
}

export interface MessageExtraInfoData {
  messageId: string
  extraInfo: { taskId: string; contextId: string }
}

export interface MessageStartData {
  messageId: string
  sender: AssistantSender
  agentMessageDbId: string
  agentMessageCreatedAt: string
}

export interface PartStartData {
  index: number
  type: string
  timestamp: string
  contentType: AssistantPartContentType
  partExtendedData: { partType: string }
  messageExtendedData?: Record<string, unknown>
  messageId: string
  seq: number
}

export interface PartContentData {
  index: number
  type: string
  timestamp: string
  delta: AssistantPartDelta
  messageId: string
  seq: number
}

export interface PartEndData {
  index: number
  type: string
  timestamp: string
  messageId: string
  seq: number
}

export interface SessionFinishData {
  sessionId: string
  timestamp: string
  seq?: number
}

/** 服务端事件帧（§3.3） */
export interface AssistantEventFrame {
  type: 'event'
  event: AssistantEventName
  data:
    | UserMessageAckData
    | SessionStartData
    | MessageExtraInfoData
    | MessageStartData
    | PartStartData
    | PartContentData
    | PartEndData
    | SessionFinishData
    | Record<string, unknown>
}

/** 服务端心跳帧（§3.1）：{"type":"ping","ts":...} */
export interface AssistantPingFrame {
  type: 'ping'
  ts: number
}

export type AssistantServerFrame = AssistantEventFrame | AssistantPingFrame

// ============================================================
// §3.4 bizType 事件字典（data part 完整 JSON）
// ============================================================

export type AssistantBizType =
  | 'biz-common-parse-file'
  | 'biz-side-manage-topic-changed'
  | 'biz-side-manage-artifact-updated'
  | 'biz-side-manage-artifact-generated'
  | 'biz-side-manage-case-generated'
  | 'biz-side-manage-save-success'

/** 文件解析状态：0 解析中 / 1 完成 */
export interface ParseFileParams {
  context_id?: string
  call_id?: string
  content?: string
  files?: { id: string; name: string; status: number }[]
}

/** 建草稿 / 改名 */
export interface TopicChangedParams {
  explicit: boolean
  topic: string
  description: string
}

/** JSON-Patch 更新 */
export interface ArtifactUpdatedParams {
  id: string
  version: string
  content: { op: string; path: string; value: unknown; reason?: string }[]
}

/** 主题生成 */
export interface ArtifactGeneratedParams {
  id: string
  version: string
  status: 'in_progress' | 'completed' | 'failed'
  content?: Partial<AssistantArtifactContent> | null
  error?: string
}

/** 单案例完成 */
export interface CaseGeneratedParams {
  id: string
  jsonArtifactId?: string
  scenarioId: string
  subjectId?: string
  scriptName: string
  difficulty: number
  status: string
}

/** 确认落库成功（ex_id = themeId） */
export interface SaveSuccessParams {
  id: string
  version: string
  ex_id: string
}

/** bizType → params 映射（供 store 强类型派发） */
export interface AssistantBizParamsMap {
  'biz-common-parse-file': ParseFileParams
  'biz-side-manage-topic-changed': TopicChangedParams
  'biz-side-manage-artifact-updated': ArtifactUpdatedParams
  'biz-side-manage-artifact-generated': ArtifactGeneratedParams
  'biz-side-manage-case-generated': CaseGeneratedParams
  'biz-side-manage-save-success': SaveSuccessParams
}

/** data part 完整 JSON 结构 */
export interface AssistantBizEventPayload {
  bizType: AssistantBizType
  params: Record<string, unknown>
}

// ============================================================
// §3.5 artifact JSON Schema（8 顶级字段）
// ============================================================

export interface ArtifactMaterial {
  id: string
  name: string
  fileType: string
  fileSize: number
  fileSizeUnit: string
  /** 1 学员可见 / 0 不可见 */
  visibility: number
  fileServId?: string
  fileSource?: number
  targetId?: string
}

/** 关联冰山模型要素（六层） */
export interface ArtifactIcebergElements {
  knowledge: string[]
  skills: string[]
  roles: string[]
  selfConcept: string[]
  personalities: string[]
  motives: string[]
}

export interface ArtifactCase {
  scriptName: string
  difficulty: number
  actorName: string
  actorPosition: string
  actorCompany?: string
  actorType?: string
  actorPersonality?: string
  actorCommunicationStyle?: string
  scriptBackground: string
  scriptOpening: string
}

export interface ArtifactDimensionWeight {
  dimensionId: string
  weight: number
}

export interface ArtifactScenario {
  id: string
  name: string
  audiences: string[]
  businessGoal: string
  behaviorGoals: string[]
  relatedIcebergElements: ArtifactIcebergElements
  businessImpact: string
  failureCost: string
  coreConflict: string
  failureReasons: string[]
  difficulties: string[]
  constraints: { forbidBehaviors: string[]; maxTime: number }
  relatedKnowledgeIds: string[]
  relatedScriptIds: string[]
  relatedProductProfileArtifactIds: string[]
  caseArtifactIds: string[]
  cases: ArtifactCase[]
  dimensionWeights: ArtifactDimensionWeight[]
}

export interface ArtifactCustomerProfile {
  id: string
  type: string
  description: string
  personalities: string[]
  decisionFactors: string[]
  communicationStyle: string
  painPoints: string[]
}

export interface ArtifactIcebergModel {
  visible: { knowledge: string[]; skills: string[] }
  hidden: { roles: string[]; selfConcept: string[]; personalities: string[]; motives: string[] }
}

/**
 * 维度三档评分标准。03 文档仅标注 criteria 字段、未固定形状，
 * 故渲染前用 normalizeCriteria 归一化：支持 {excellent/good/improve} 对象、
 * {优秀/良好/需改进} 对象、长度 3 的数组、以及单字符串。
 */
export type ArtifactDimensionCriteria = unknown

export interface ArtifactDimension {
  id: string
  name: string
  description: string
  criteria: ArtifactDimensionCriteria
}

export interface ArtifactEvaluationCriteria {
  passScore: number
  dimensions: ArtifactDimension[]
  defaultDimensionWeights: ArtifactDimensionWeight[]
}

export interface AssistantArtifactContent {
  materials: ArtifactMaterial[]
  scenarios: ArtifactScenario[]
  customerProfiles: ArtifactCustomerProfile[]
  icebergModel: ArtifactIcebergModel
  evaluationCriteria: ArtifactEvaluationCriteria
  professionalKnowledge: unknown
  productProfiles: unknown[]
  version: string
}

/** 会话响应 / 右面板数据源（§2.1 / §2.2b） */
export interface AssistantArtifactSnapshot {
  artifactId: string
  versionNo: string
  status: 'working' | 'confirmed'
  content: AssistantArtifactContent | null
}

// ============================================================
// §2 HTTP 请求 / 响应
// ============================================================

/** §2.1 建立/查找会话 */
export interface AssistantSessionResp {
  sessionId: string
  themeId: string | null
  isNew: boolean
  artifact: AssistantArtifactSnapshot | null
}

/** §2.2 历史消息 */
export interface AssistantMessageItem extends AssistantWireMessage {
  /** 历史消息 content 含事件块（data 块原样存储） */
  content: AssistantStoredContentBlock[]
  dbId: string
  sessionId: string
  createdAt: string
}

export interface AssistantMessagesResp {
  messages: AssistantMessageItem[]
  pagination: { limit: number; hasNextPage: boolean; nextCursor: string }
}

/** §2.3 文件上传 */
export interface AssistantFileResp {
  fileId: string
  name: string
  fileType: string
  fileSize: number
}

/** §2.4 语音识别 */
export interface AssistantAsrResp {
  text: string
}

/** §2.6 发布 */
export interface AssistantPublishResp {
  status: number
  totalCases: number
}

/** §2.6 初始化进度（status 为主题状态：1 发布中 / 3 已发布） */
export interface AssistantScriptProgressResp {
  total: number
  completed: number
  failed: number
  progress: number
  status: number
}

// ============================================================
// 本地渲染模型（store → 组件）
// ============================================================

/** 渲染用内容块：由 wire 块 / 事件流转换而来 */
export type AssistantRenderBlock =
  | { kind: 'text'; text: string }
  | { kind: 'file'; uri: string; name: string; fileType: string; fileSize: number }
  | {
      kind: 'event'
      /** part-end 解析后得到；解析前为空串 */
      bizType: AssistantBizType | ''
      /** data 块为客户端 action 时（历史消息里形如 {type:"action",actionName,params}） */
      actionName?: string
      params: Record<string, unknown>
      /** data_delta 累积的原始 JSON 片段（调试/解析失败时展示） */
      raw: string
      /** part-end 是否已到达 */
      done: boolean
      /** JSON.parse 失败 */
      parseError: string
    }

/** 消息流条目（user 气泡 / agent 气泡 / 状态提示） */
export interface AssistantChatMessage {
  id: string
  role: 'user' | 'agent'
  blocks: AssistantRenderBlock[]
  sender: AssistantSender
  createdAt: string
  dbId: string
  /** 流式接收中（打字机进行中） */
  streaming: boolean
  /** 本地乐观插入、尚未收到服务端 ack/start（避免重复渲染） */
  local?: boolean
}

/** 连接状态（驱动顶部提示与重连提示） */
export type AssistantWsStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'

/** 右面板 Tab */
export type AssistantPanelTab = 'materials' | 'scenarios' | 'profiles' | 'iceberg' | 'criteria'

/** 允许上传的材料格式（§1 枚举） */
export const ASSISTANT_FILE_TYPES = ['ppt', 'pptx', 'doc', 'docx', 'pdf', 'txt', 'md'] as const

/** 材料 visibility 文案（03 §3.2 + AssistantActions：1 学员可见 / 0 内部可见） */
export const ASSISTANT_VISIBILITY_TEXT: Record<number, string> = {
  1: '学员可见',
  0: '内部可见'
}

// ============================================================
// §2.6 会话材料解析结果（"文件解析完成"卡片展开时按需拉取）
// ============================================================

/** 单条材料解析结果；preview 为提取文本前若干字，extractLength 为全文长度 */
export interface AssistantMaterialBrief {
  id: string
  fileId: string
  name: string
  fileType: string
  fileSize: number
  /** 1 学员可见 / 0 内部可见 */
  visibility: number
  extractLength: number
  /** preview 是否被截断（截断时仅给前 2000 字） */
  truncated: boolean
  preview: string
}

export interface AssistantMaterialListResp {
  materials: AssistantMaterialBrief[]
}