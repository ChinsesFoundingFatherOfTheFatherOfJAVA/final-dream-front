// 要点
export interface KeyPoint {
  id: string
  content: string
}

// 流转条件
export interface PassCondition {
  type: 'normal' | 'any_n' | 'specified' // 正常流转 | 命中任意n个要点 | 命中部分要点
  n?: number
  specifiedPointIds?: string[]
}

// 节点数据
export interface FlowNodeData {
  nodeName: string
  narration?: string // 旁白（v1.2 旁白节点 nodeType=5 专用）
  trainerQuestion?: string // 陪练者问
  standardScript?: string // 标准话术
  keyPoints?: KeyPoint[] // 要点
  analysis?: string // 解析
  passCondition?: PassCondition // 流转条件
}

// 流程节点
export interface FlowNode {
  id: string
  type: 'start' | 'end' | 'trainer_ask' | 'student_ask'
  position: { x: number; y: number }
  data: FlowNodeData
}

// 流程连线
export interface FlowEdge {
  id: string
  source: string
  target: string
  weight: number
  label?: string
}

// 项目
export interface ProjectItem {
  id: string
  name: string
  type: 'train' | 'examine'
  status: 'draft' | 'published'
  assignType: 'project' | 'single'
  description: string
  code: string
  startTime: string
  endTime: string
  completionStandard?: number
  passScore?: number
  passStrategy?: string
  responsiblePerson: string
  coverImage: string
  dialogueMode: 'voice' | 'text'
  createdBy: string
  createdAt: string
}

// 话术模板
export interface TemplateItem {
  id: string
  name: string
  description: string
  permission: 'private' | 'public'
  status: 'draft' | 'withdrawn' | 'published'
  createdBy: string
  createdAt: string
}
