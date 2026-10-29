/**
 * 在线课堂 AI 素材源接口（AI 设计助手 / AI 出题接入在线课堂，2026-10-28）
 *
 * 对应 OnlineClassroom 的 KngAiSourceController：
 *  - POST /kng/admin/courseware/ai-sources/list            素材源列表（设计助手与出题共用）
 *  - POST /kng/admin/courseware/ai-sources/{id}/extract    抽取课件正文
 * 以及 AtualCombatTraining 的：
 *  - POST /act/assistant/materials/from-kng                 把在线课堂资源写进助手会话材料
 *
 * 契约见 D:\JACK\plan\在线课堂资源选择接入\03-接口文档.md §2/§3。
 */
import request from './request'

/** 用途：设计助手（3 万字上限）/ AI 出题（2 万字上限） */
export type KngSourcePurpose = 'designAssistant' | 'question'

/** 素材源列表项（首期只有文档类课件） */
export interface KngAiSourceItem {
  id: string
  title: string
  type: number
  typeDesc: string
  catalogId: string
  catalogName: string
  credits: number | null
  durationText: string
  createdByName: string | null
  createTime: string | null
  updateTime: string | null
  /** 本系统无课件过期字段，恒为 null（界面固定显示 --） */
  expirationDate: string | null
  hidden: boolean
  sourceFileId: string
  sourceFileName: string
  sourceFileType: string
}

export interface KngAiSourceListResp {
  total: number
  records: KngAiSourceItem[]
}

export interface KngAiSourceQuery {
  purpose: KngSourcePurpose
  keyword?: string
  type?: number
  catalogId?: string
  includeChildCatalog?: number
  createTimeStart?: string | null
  createTimeEnd?: string | null
  includeHidden?: boolean
}

export interface KngAiExtractResult {
  coursewareId: string
  coursewareTitle: string
  sourceFileId: string
  fileName: string
  fileType: string
  fileSize: number
  text: string
  chars: number
  truncated: boolean
}

/** 导入结果里的单条材料（对应 act_ai_material + artifact.materials 条目） */
export interface AssistantKngMaterial {
  id: string
  fileId: string
  name: string
  fileType: string
  fileSize: number
  /** 2 本地文件 / 3 在线课堂 */
  fileSource: number
  /** 在线课堂 coursewareId */
  sourceId: string | null
  visibility: number
}

export interface AssistantKngImportFailure {
  coursewareId: string
  reason: string
}

export interface AssistantKngImportResp {
  materials: AssistantKngMaterial[]
  failures: AssistantKngImportFailure[]
}

/**
 * 素材源列表。
 * total 为与筛选条件同口径的真实总数（不是当页条数），用于「共 N 条」与外分页。
 */
export function listKngAiSources(
  params: { page: number; pageSize: number; orderBy?: string; orderType?: string },
  body: KngAiSourceQuery,
) {
  return request.post<unknown, KngAiSourceListResp>('/kng/admin/courseware/ai-sources/list', body, {
    params,
    // 跨模块读课件，失败时让调用方在抽屉内展示错误与重试，不弹全局红条
    silent: true,
  })
}

/** 抽取课件正文；超长由后端截断并置 truncated=true */
export function extractKngAiSource(coursewareId: string, purpose: KngSourcePurpose) {
  return request.post<unknown, KngAiExtractResult>(
    `/kng/admin/courseware/ai-sources/${coursewareId}/extract`,
    null,
    { params: { purpose }, timeout: 120000, silent: true },
  )
}

/**
 * 把在线课堂资源写进助手会话材料。
 * 服务端按 fileId=kng_<coursewareId> upsert，并推 parse-file 完成事件 + artifact 更新事件。
 */
export function importAssistantKngMaterials(sessionId: string, coursewareIds: string[]) {
  return request.post<unknown, AssistantKngImportResp>(
    '/act/assistant/materials/from-kng',
    { sessionId, coursewareIds },
    { timeout: 120000 },
  )
}
