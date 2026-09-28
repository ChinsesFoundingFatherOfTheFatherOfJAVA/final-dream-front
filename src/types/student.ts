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
  /** 消息音频 URL（陪练者=TTS 合成结果；学员=上传的录音），v1.1 */
  audioUrl?: string | null
  /** 音频时长（毫秒），v1.1 */
  audioDurationMs?: number | null
  /** 输入方式：1=文字 2=语音（学员消息），v1.1 */
  inputMode?: 1 | 2 | null
}

export interface StartSessionResp {
  sessionId: ID
  trainerName: string
  totalRounds: number
  finishedRounds: number
  /** 0=语音对话 1=文字对话，v1.1 */
  dialogueMode?: 0 | 1
  /** 陪练者形象图片 URL；null 显示默认占位图，v1.1 */
  trainerAvatar?: string | null
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
  /** 0=语音对话 1=文字对话，v1.1 */
  dialogueMode?: 0 | 1
  /** 陪练者形象图片 URL；null 显示默认占位图，v1.1 */
  trainerAvatar?: string | null
  messages: SessionMessage[]
}

export interface SendMessageResp {
  withdrawn: boolean
  /**
   * true=语音输入没被识别出内容（"没听到"），此时 keyPoints 必为空，
   * 前端提示重说而不是弹要点弹窗（v1.2）
   */
  noSpeech: boolean
  keyPoints: string[]
  passed: boolean
  finished: boolean
  finishedRounds: number
  totalRounds: number
  nextTrainerMessage: SessionMessage | null
}

/** FP-24/28 学员语音消息响应（接口 5.2）：流转字段与 SendMessageResp 同构，附加语音字段 */
export interface SendVoiceMessageResp extends SendMessageResp {
  recognizedText: string
  messageId: ID
  audioUrl: string
  audioDurationMs: number
}

/** FP-24/28 TTS 合成响应（接口 5.1） */
export interface TtsResp {
  messageId: ID
  audioUrl: string
  durationMs: number
  cached: boolean
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
  /** null = 本次训练该维度未参与评分（如纯文字作答时的语音维度），comment 说明原因 */
  score: number | null
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
  /** 陪练者形象图片 URL（与训练页左栏同源）；null 显示内置默认形象，v1.2 */
  trainerAvatar?: string | null
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

// ===== 5. 学员排名模块 =====

export interface RankItem {
  rankIndex: number
  userId: string
  fullname: string
  deptName: string
  score: number
  isMe: boolean
}

export interface MyRank {
  rankIndex: number
  score: number
}

export interface ProjectRankResp {
  dimensions: string[]
  rankList: RankItem[]
  myRank: MyRank | null
}
