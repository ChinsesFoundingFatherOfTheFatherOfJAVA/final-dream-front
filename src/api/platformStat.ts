/**
 * 平台预览看板（管理端首页「平台总览」）接口封装。
 *
 * 对应后端四个业务域的统计端点 + StaffManagement 的账号计数端点，
 * 端点与字段定义见 D:/JACK/plan/平台预览看板/03-接口文档.md 第 2 节。
 *
 * 为什么分成五个函数而不是一个聚合接口：后端总纲要求一张表只有一个所有方，
 * 四域统计各自落在所属服务，前端并发取回后合并（该契约的 DER-06 决策）。
 * 任一域失败只影响它自己的卡片，故这里不做统一 catch。
 */
import request from './request'
import type {
  ActStatCards,
  ExamStatCards,
  KngStatCards,
  PlatformStatBase,
  PlatformStatQuery,
  SpeechStatCards,
  StaffStat
} from '@/types/platformStat'

/** 启用人数与账号总数（不随时间区间变化） */
export function getStaffStat() {
  return request.get<unknown, StaffStat>('/sm/admin/stat/users')
}

/** 在线课堂：课程情况 + 学习人数/时长与学习趋势 */
export function getKngStat(params: PlatformStatQuery) {
  return request.get<unknown, PlatformStatBase<KngStatCards>>('/kng/admin/stat/home', { params })
}

/** 话术训练：项目情况 + 训练人数/时长与训练趋势 */
export function getSpeechStat(params: PlatformStatQuery) {
  return request.get<unknown, PlatformStatBase<SpeechStatCards>>('/admin/stat/home', { params })
}

/** 实战训练场：练习人数/时长与练习趋势 */
export function getActStat(params: PlatformStatQuery) {
  return request.get<unknown, PlatformStatBase<ActStatCards>>('/act/admin/stat/home', { params })
}

/** 测练中心：考试情况 + 参考人数/时长与参考趋势 */
export function getExamStat(params: PlatformStatQuery) {
  return request.get<unknown, PlatformStatBase<ExamStatCards>>('/exam/admin/stat/home', { params })
}
