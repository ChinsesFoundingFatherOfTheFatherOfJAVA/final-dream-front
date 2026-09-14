// ===== 学员端 AI对练-话术训练 类型定义（对应 03-接口文档.md） =====

/** 长整型 ID 统一用 string（超出 JS 安全整数范围，路由参数天然为 string） */
export type ID = string

/** 项目状态（后端计算口径） */
export type ProjectStatus = 'not_started' | 'ongoing' | 'expired' | 'finished'

/** 会话状态：0=进行中 / 1=已完成 / 2=未完成退出 */
export type SessionStatus = 0 | 1 | 2

/** 报告状态：0=未开始 / 1=生成中 / 2=已生成 / 3=失败 */
export type ReportStatus = 0 | 1 | 2 | 3

// ===== 1. 学员项目模块 =====

export interface StudentProjectCard {
  projectId: ID
  name: string
  projectType: number // 0=训练 / 1=考核
  coverImage: string | null
  startTime: string
  endTime: string
  status: ProjectStatus
  completed: boolean
}

export interface StudentProjectListResp {
  records: StudentProjectCard[]
  total: number
  page: number
  pageSize: number
}

export interface StudentProjectDetail {
  projectId: ID
  name: string
  projectType: number // 0=训练 / 1=考核
  description: string
  coverImage: string | null
  startTime: string
  endTime: string
  completionStandard: number
  passScore: number | null
  participantCount: number
  practicedCount: number
  completed: boolean
  trainerName: string
  recordCount: number
  rankNo: number
}

// ===== 2. 练习会话模块 =====

export interface SessionMessage {
  messageId: ID
  seq: number
  role: 1 | 2 // 1=陪练者, 2=学员
  content: string
  passed: 0 | 1 | null
  withdrawn: 0 | 1
  likeCount: number
}

export interface StartSessionResp {
  sessionId: ID
  trainerName: string
  totalRounds: number
  finishedRounds: number
  messages: SessionMessage[]
}

export interface SessionDetailResp {
  sessionId: ID
  projectId: ID
  projectName: string
  status: SessionStatus
  trainerName: string
  totalRounds: number
  finishedRounds: number
  messages: SessionMessage[]
}

export interface SendMessageResp {
  withdrawn: boolean
  keyPoints: string[]
  passed: boolean
  finished: boolean
  finishedRounds: number
  totalRounds: number
  nextTrainerMessage: SessionMessage | null
}

// ===== 3. 练习记录模块 =====

export interface PracticeRecord {
  sessionId: ID
  startTime: string
  status: 1 | 2 // 1=已完成, 2=未完成
  totalScore: number | null
  roundCount: number
  durationSeconds: number | null
}

// ===== 4. 报告模块 =====

export interface ReportDimension {
  dimensionName: string
  weight: number
  score: number
  comment: string
  goodPoints: string[]
  improvements: string[]
  sortOrder: number
}

export interface LastDimension {
  dimensionName: string
  score: number
}

export interface RoundSuggestion {
  seq: number
  suggestion: string
}

export interface ReportResp {
  reportId: ID
  sessionId: ID
  reportStatus: ReportStatus
  // 以下字段 reportStatus=2 时返回
  projectName?: string
  projectType?: number
  studentName?: string
  totalScore?: number
  rankNo?: number
  exceedPercent?: number
  scoreChange?: number | null
  durationSeconds?: number
  roundCount?: number
  dimensions?: ReportDimension[]
  lastDimensions?: LastDimension[] | null
  roundSuggestions?: RoundSuggestion[]
}

export interface ConsistencyKeyPoint {
  content: string
  hit: boolean
}

export interface ConsistencyRound {
  seq: number
  trainerQuestion: string
  studentAnswer: string
  keyPoints: ConsistencyKeyPoint[]
}

export interface ConsistencyResp {
  rounds: ConsistencyRound[]
}
