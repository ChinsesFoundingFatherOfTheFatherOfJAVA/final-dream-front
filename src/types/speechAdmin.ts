import type { ReportResp, SessionMessage, ConsistencyResp } from './student'

export interface PageData<T> {
  records: T[]
  total: number
  page?: number
  pageSize?: number
}

export interface ProjectSummary {
  totalStudentNum: number
  learnStudentNum: number
  totalLearnTimes: number
  percapitaLearnTimes: string
  completedPeoples: number
  completionRate: string
}

export interface TimesAverage {
  times: number
  average: number
}

export interface RadarMetric {
  totalScore: number | null
  dimScores: Record<string, number>
}

export interface ProjectRadar {
  dimensions: string[]
  overall: RadarMetric | null
  first: RadarMetric | null
}

export interface ActiveItem {
  hour: number
  count: number
}

export interface ProjectStudentRow {
  userId: string
  fullname: string
  username: string
  userNo: string
  deptFullName: string
  positionName: string
  userStatus: number
  learnTimes: number
  finishStatus: number
  finishStatusText: string
  highestScore: number | null
}

export interface ProjectOverviewStudentRow extends ProjectStudentRow {
  highestRank: number | null
  learnDurationMin: number | null
}

export interface DeptStatRow {
  deptFullName: string
  studentCount: number
  learnCount: number
  participationRate: string
  totalLearnTimes: number
  percapitaLearnTimes: string
  averageScore: number | null
  completedCount: number
  completionRate: string
}

export interface CandidateRow {
  userId: string
  fullname: string
  username: string
  userNo: string
  deptFullName: string
  positionName: string
}

export interface Tops {
  fullname: string
  userNo: string
  deptFullName: string
  positionName: string
  userStatus: number
  finishStatus: number
  finishStatusText: string
  highestScore: number | null
  rank: number | null
  reportCount: number
}

export interface PracticeItem {
  times: number
  score: number | null
  reportId: string
  time: string
}

export interface AttendRecordRow {
  reportId: string
  sessionId: string
  times: number
  time: string
  totalScore: number | null
  dimScores: Record<string, number>
}

export interface DepartmentNode {
  deptId: string
  deptCode: string
  deptName: string
  parentCode: string | null
  userCount: number
}

export interface PositionOption {
  positionName: string
  userCount: number
}

export interface StudentQuery {
  keyword?: string
  finishStatus?: number | null
  deptIds?: string[]
  postIds?: string[]
  accountStatus?: number | null
  page?: number
  pageSize?: number
}

export interface ReportBundle {
  report: ReportResp
  messages: SessionMessage[]
  consistency: ConsistencyResp | null
}
