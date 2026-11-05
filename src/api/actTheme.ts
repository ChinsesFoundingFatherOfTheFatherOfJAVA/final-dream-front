/**
 * AI实战训练场（管理端）接口封装
 * 接口路径对齐 03-接口文档.md：网关 /api/act/** → AtualCombatTraining(8082)
 *
 * Mock 开关：后端就绪联调时将 ACT_USE_MOCK 置为 false，
 * 即切换为走 request.ts 的真实请求（baseURL 不变 http://localhost:8080/api）。
 */
import request from './request'
import {
  mockGetThemeDetail,
  mockGetThemeList,
  mockGetScenarioUnits,
  mockGetThemeSettings,
  mockGetThemeVersions,
  mockPauseTheme,
  mockFinishTheme,
  mockRollbackThemeVersion,
  mockSaveThemeSettings
} from '@/views/admin/AICombat/ActualTraining/mock/actThemeMock'
import type {
  ActCompareEnd,
  ActAnalysisScope,
  ActPageResult,
  ActRollbackResp,
  ActScenarioUnit,
  ActThemeAnalysis,
  ActThemeCard,
  ActThemeDetail,
  ActThemeListReq,
  ActThemeSettings,
  ActThemeSettingsSaveReq,
  ActThemeSettingsSaveResp,
  ActThemeStatusResp,
  ActVersionItem
} from '@/types/actTheme'

export const ACT_USE_MOCK = false

/** Mock 统一包 Promise，模拟网络延迟 */
function mockInvoke<T>(fn: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(fn())
      } catch (e) {
        reject(e)
      }
    }, 200)
  })
}

/** FP-06 分页查询主题列表 */
export function getThemeList(params: ActThemeListReq): Promise<ActPageResult<ActThemeCard>> {
  if (ACT_USE_MOCK) return mockInvoke(() => mockGetThemeList(params))
  return request.get('/act/admin/theme/list', { params })
}

/** FP-07/08 主题详情（头部信息+统计+计数） */
export function getThemeDetail(id: string): Promise<ActThemeDetail> {
  if (ACT_USE_MOCK) return mockInvoke(() => mockGetThemeDetail(id))
  return request.get(`/act/admin/theme/${id}`)
}

/** FP-09 暂停 / 恢复（已发布⇄已暂停） */
export function pauseTheme(id: string): Promise<ActThemeStatusResp> {
  if (ACT_USE_MOCK) return mockInvoke(() => mockPauseTheme(id))
  return request.post(`/act/admin/theme/${id}/pause`)
}

/** FP-09 结束（终态不可逆） */
export function finishTheme(id: string): Promise<ActThemeStatusResp> {
  if (ACT_USE_MOCK) return mockInvoke(() => mockFinishTheme(id))
  return request.post(`/act/admin/theme/${id}/finish`)
}

/** FP-11/20 场景单元列表（当前版本，含评估维度） */
export function getScenarioUnits(id: string): Promise<ActScenarioUnit[]> {
  if (ACT_USE_MOCK) return mockInvoke(() => mockGetScenarioUnits(id))
  return request.get(`/act/admin/theme/${id}/scenario-units`)
}

/**
 * FP-20 数据分析（真实统计）。
 * <p>sceneUnitId 不传 = 当前版本全部场景单元合并；scope 四档缺省 last；
 * compareEnd 两档缺省 last；studyMode 1 训练 / 2 考核 / 不传不限。
 * <p>响应只包含「当前 scope」的一套分布与掌握，切换下拉必须重新请求（服务端按 scope 选报告集合）。
 */
export function getThemeAnalysis(
  id: string,
  params: {
    sceneUnitId?: string
    scope?: ActAnalysisScope
    compareEnd?: ActCompareEnd
    studyMode?: number
  },
): Promise<ActThemeAnalysis> {
  return request.get(`/act/admin/theme/${id}/analysis`, { params })
}

/** FP-13~17 读取主题设置（当前版本五表单 + 内容概览） */export function getThemeSettings(id: string): Promise<ActThemeSettings> {
  if (ACT_USE_MOCK) return mockInvoke(() => mockGetThemeSettings(id))
  return request.get(`/act/admin/theme/${id}/settings`)
}

/** FP-18 保存主题设置（五表单整体保存，版本+1） */
export function saveThemeSettings(id: string, data: ActThemeSettingsSaveReq): Promise<ActThemeSettingsSaveResp> {
  if (ACT_USE_MOCK) return mockInvoke(() => mockSaveThemeSettings(id, data))
  return request.put(`/act/admin/theme/${id}/settings`, data)
}

/** FP-19 版本列表（新在上，当前版本带 current=true） */
export function getThemeVersions(id: string): Promise<ActVersionItem[]> {
  if (ACT_USE_MOCK) return mockInvoke(() => mockGetThemeVersions(id))
  return request.get(`/act/admin/theme/${id}/versions`)
}

/** FP-19 回滚到指定版本（仅切换 current_version_no 指针） */
export function rollbackThemeVersion(id: string, versionNo: string): Promise<ActRollbackResp> {
  if (ACT_USE_MOCK) return mockInvoke(() => mockRollbackThemeVersion(id, versionNo))
  return request.post(`/act/admin/theme/${id}/version/${versionNo}/rollback`)
}
