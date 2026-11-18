/**
 * 平台预览看板（管理端首页「平台总览」）接口类型。
 *
 * 与 D:/JACK/plan/平台预览看板/03-接口文档.md 第 1~2 节一一对应：
 * 四个业务域端点共用 range + activity 骨架，cards 各自不同；StaffManagement 只提供账号计数。
 * 改字段必须同步接口文档与该文档第 5 节的字段映射表。
 */

/** 统计区间与分桶粒度回执；truncated 为 true 时后端已按上限截断区间 */
export interface PlatformStatRange {
  from: string
  to: string
  granularity: 'day' | 'week' | 'month'
  truncated: boolean
}

/** 折线图上的一个分桶；bucket 标签 day/week 为 MM-DD，month 为 YYYY-MM */
export interface PlatformStatPoint {
  bucket: string
  activeUsers: number
  activeHours: number
}

/** 各域共用的「活跃」数据块：本域去重活跃人数、活跃时长与趋势分桶 */
export interface PlatformStatActivity {
  activeUsers: number
  activeHours: number
  series: PlatformStatPoint[]
}

/** 四域业务端点的公共响应形状 */
export interface PlatformStatBase<C> {
  range: PlatformStatRange
  activity: PlatformStatActivity
  cards: C
}

/** 在线课堂（kng）卡片指标 */
export interface KngStatCards {
  courseTotal: number
  courseNew: number
  studyVisits: number
  studyHours: number
  finishedVisits: number
  commentCount: number
}

/** 话术训练（ST）卡片指标 */
export interface SpeechStatCards {
  projectTotal: number
  projectNew: number
  coveredUsers: number
  studyVisits: number
  finishedVisits: number
  studyRate: number
  finishRate: number
}

/** 实战训练场（ACT）卡片指标 */
export interface ActStatCards {
  practiceVisits: number
  finishedVisits: number
  practiceHours: number
}

/** 测练中心（Exam）卡片指标 */
export interface ExamStatCards {
  examTotal: number
  examNew: number
  coveredUsers: number
  attemptVisits: number
  passedVisits: number
  passRate: number
}

/** StaffManagement 账号计数（不随时间区间变化） */
export interface StaffStat {
  enabledUsers: number
  totalUsers: number
}

/** 四域统计的请求参数：区间由前端换算成绝对时间，后端只按传入粒度分桶 */
export interface PlatformStatQuery {
  from: string
  to: string
  granularity: 'day' | 'week' | 'month'
}
