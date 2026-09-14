// 后端 ↔ 前端 数据格式转换工具

// --- nodeType 数字 ↔ 字符串 ---
const NODE_TYPE_MAP: Record<number, string> = { 1: 'start', 2: 'trainer_ask', 3: 'student_ask', 4: 'end' }
const NODE_TYPE_MAP_REVERSE: Record<string, number> = { start: 1, trainer_ask: 2, student_ask: 3, end: 4 }

export const toNodeType = (n: number) => NODE_TYPE_MAP[n] || 'start'
export const toNodeTypeInt = (s: string) => NODE_TYPE_MAP_REVERSE[s] || 1

// --- 状态 ---
const STATUS_MAP: Record<number, string> = { 0: 'draft', 1: 'published' }
const STATUS_MAP_REVERSE: Record<string, number> = { draft: 0, published: 1 }
export const toStatus = (s: number) => STATUS_MAP[s] || 'draft'
export const toStatusInt = (s: string) => STATUS_MAP_REVERSE[s] || 0

// --- 项目类型 ---
export const toProjectType = (t: number) => t === 0 ? 'train' : 'examine'
export const toProjectTypeInt = (t: string) => t === 'train' ? 0 : 1

// --- 安排类型 ---
export const toAssignType = (t: number) => t === 0 ? 'project' : 'single'

// --- 对话方式 ---
export const toDialogueMode = (d: number) => d === 0 ? 'voice' : 'text'
export const toDialogueModeInt = (d: string) => d === 'voice' ? 0 : 1

// --- 流转条件类型 ---
const CONDITION_MAP: Record<number, string> = { 1: 'normal', 2: 'any_n', 3: 'specified' }
const CONDITION_MAP_REVERSE: Record<string, number> = { normal: 1, any_n: 2, specified: 3 }
export const toPassConditionType = (t: number | null) => t == null ? 'normal' : (CONDITION_MAP[t] || 'normal')
export const toPassConditionTypeInt = (s: string) => CONDITION_MAP_REVERSE[s] || 1

// --- 要点解析 (后端存JSON字符串) ---
export const parseKeyPoints = (raw: string | null | undefined): Array<{ id: string; content: string }> => {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}
export const stringifyKeyPoints = (points: Array<{ id: string; content: string }> | undefined) => {
  if (!points || !points.length) return null
  return JSON.stringify(points)
}

// --- 日期格式化 (后端 ISO 字符串 → 前端 "YYYY-MM-DD HH:mm") ---
export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  return iso.replace('T', ' ').slice(0, 16)
}

// --- 后端项目 → 前端列表卡片 ---
export interface ProjectCard {
  id: number
  name: string
  type: string
  status: string
  assignType: string
  startTime: string
  endTime: string
  responsiblePersonName: string
  coverImage: string | null
}
export const toProjectCard = (r: any): ProjectCard => ({
  id: r.id,
  name: r.name,
  type: toProjectType(r.projectType),
  status: toStatus(r.status),
  assignType: toAssignType(r.assignType),
  startTime: formatDate(r.startTime),
  endTime: formatDate(r.endTime),
  responsiblePersonName: r.responsiblePersonName || '',
  coverImage: r.coverImage
})

// --- 后端项目详情 → 前端表单 ---
export interface ProjectFormData {
  name: string
  code: string
  description: string
  startTime: string
  endTime: string
  projectType: string
  completionStandard: number
  passScore: number
  passStrategy: string
  passStrategyN: number
  dialogueMode: string
  responsiblePerson: string
  responsiblePersonName: string
  coverImage: string
}
export const toProjectForm = (r: any): ProjectFormData => ({
  name: r.name || '',
  code: r.code || '',
  description: r.description || '',
  startTime: formatDate(r.startTime),
  endTime: formatDate(r.endTime),
  projectType: toProjectType(r.projectType),
  completionStandard: r.completionStandard ?? 1,
  passScore: r.passScore ?? 60,
  passStrategy: r.passStrategy === 2 ? 'cumulative' : r.passStrategy === 3 ? 'consecutive' : 'single',
  passStrategyN: r.passStrategyN ?? 0,
  dialogueMode: toDialogueMode(r.dialogueMode),
  responsiblePerson: r.responsiblePerson || '',
  responsiblePersonName: r.responsiblePersonName || '',
  coverImage: r.coverImage || ''
})

// --- 后端评分维度 → 前端 ---
export interface ScoringDim {
  id: number
  name: string
  weight: number
  enabled: boolean
  ruleType: number
  scoringRule: string
  isCustom: boolean
}
export const toScoringDims = (dims: any[]): ScoringDim[] =>
  (dims || []).map((d: any) => ({
    id: d.id,
    name: d.dimensionName,
    weight: d.weight,
    enabled: d.enabled === 1,
    ruleType: d.ruleType,
    scoringRule: d.scoringRule || '',
    isCustom: d.isCustom === 1
  }))

// --- 前端评分维度 → 后端 ---
export const toScoringDimsPayload = (dims: ScoringDim[]) =>
  dims.map((d) => ({
    id: d.id || undefined,
    dimensionName: d.name,
    weight: d.weight,
    enabled: d.enabled ? 1 : 0,
    ruleType: d.ruleType,
    scoringRule: d.scoringRule,
    isCustom: d.isCustom ? 1 : 0
  }))

// --- 后端虚拟陪练 → 前端 ---
export const toVirtualTrainer = (vt: any) => ({
  name: vt?.trainerName || '',
  language: vt?.language || 'mandarin',
  voiceId: vt?.voiceId || '',
  speed: vt?.speed ?? 30,
  inputLanguage: (vt?.inputLanguage || 'mandarin').split(','),
  forbiddenWords: vt?.forbiddenWords || ''
})

// --- 后端节点 → vue-flow ---
export interface VfNodeData {
  backendId: number | null
  nodeType: string
  nodeTypeTitle: string
  nodeName: string
  trainerQuestion: string
  standardScript: string
  keyPoints: Array<{ id: string; content: string }>
  analysis: string
  passCondition: { type: string; n: number; specifiedPointIds: string[] }
  activeSubType: string | null
  deletable: boolean
}
export interface VfNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: VfNodeData
  deletable: boolean
}

export const toVfNode = (n: any): VfNode => {
  const nodeType = toNodeType(n.nodeType)
  const isSimple = nodeType === 'start' || nodeType === 'end'
  return {
    id: `vf-${n.id}`,
    type: nodeType,
    position: { x: n.positionX ?? 0, y: n.positionY ?? 0 },
    data: {
      backendId: n.id ?? null,
      nodeType,
      nodeTypeTitle: isSimple ? (nodeType === 'start' ? '开始' : '结束') :
        n.nodeType === 2 ? '陪练者问学员说' : '学员问陪练者说',
      nodeName: n.nodeName || '',
      trainerQuestion: n.trainerQuestion || '',
      standardScript: n.standardScript || '',
      keyPoints: parseKeyPoints(n.keyPoints),
      analysis: n.analysis || '',
      passCondition: {
        type: toPassConditionType(n.passConditionType),
        n: n.passConditionN ?? 1,
        specifiedPointIds: n.passConditionPoints ? n.passConditionPoints.split(',').filter(Boolean) : []
      },
      activeSubType: null,
      deletable: !isSimple
    },
    deletable: !isSimple
  }
}

// --- vue-flow 节点 → 后端 ---
// tempId: 前端分配的临时数字ID（后端会映射为真实ID，必须非空且与 edges 引用一致）
export const toBackendNode = (n: VfNode, tempId: number) => {
  const d = n.data
  const typeName: Record<string, string> = {
    start: '开始',
    end: '结束',
    trainer_ask: '陪练者问学员说',
    student_ask: '学员问陪练者说'
  }
  return {
    id: tempId,
    nodeType: toNodeTypeInt(n.type),
    nodeName: d.nodeName || typeName[n.type] || n.type,
    positionX: n.position.x,
    positionY: n.position.y,
    trainerQuestion: d.trainerQuestion || null,
    standardScript: d.standardScript || null,
    // 后端期望数组，不是 JSON 字符串
    keyPoints: (d.keyPoints && d.keyPoints.length)
      ? d.keyPoints.map((p, i) => ({ id: p.id, content: p.content, order: i + 1 }))
      : null,
    analysis: d.analysis || null,
    passConditionType: d.passCondition ? toPassConditionTypeInt(d.passCondition.type) : 1,
    passConditionN: d.passCondition?.n ?? null,
    passConditionPoints: d.passCondition?.type === 'specified'
      ? (d.passCondition.specifiedPointIds || []).join(',') : null,
    sortOrder: 0
  }
}

// --- 后端连线 → vue-flow ---
export interface VfEdge {
  id: string
  source: string
  target: string
  weight: number
  label?: string
  [key: string]: any
}
export const toVfEdge = (e: any): VfEdge => ({
  id: `ef-${e.id}`,
  source: `vf-${e.sourceNodeId}`,
  target: `vf-${e.targetNodeId}`,
  weight: e.weight || 1,
  label: String(e.weight || 1),
  type: 'smoothstep',
  animated: true,
  markerEnd: { type: 'arrowclosed' },
  style: { stroke: '#1890ff', strokeWidth: 2 },
  data: { weight: e.weight || 1, backendId: e.id ?? null }
})

// --- vue-flow 连线 → 后端 ---
// idMap: vue-flow节点id → 临时数字ID，与 toBackendNode 分配的 tempId 保持一致
export const toBackendEdge = (e: VfEdge, idMap: Record<string, number>) => {
  return {
    id: null,
    sourceNodeId: idMap[e.source] ?? 0,
    targetNodeId: idMap[e.target] ?? 0,
    weight: e.weight || 1
  }
}

// --- 后端模板列表 → 前端 ---
export interface TemplateCard {
  id: number
  name: string
  description: string
  permission: string
  status: string
  createdBy: string
  createdAt: string
}
export const toTemplateCard = (r: any): TemplateCard => ({
  id: r.id,
  name: r.name,
  description: r.description || '',
  permission: r.permission === 0 ? 'private' : 'public',
  status: toStatus(r.status),
  createdBy: r.createdByName || '',
  createdAt: formatDate(r.createdAt)
})
