/**
 * 产品档案管理端接口（契约 09 §5.1 / 04 §8）
 * <p>
 * 后端 /api/act/admin/theme/{themeId}/product-profiles/**。
 * 工作区（v0）编辑；发布快照行不可改写；候选生成只返回不落库。
 */
import request from './request'

export interface ProductProfile {
  id: string
  themeId: string
  contentVersionNo: number
  profileKey: string
  profileName: string
  category: string | null
  description: string | null
  detailMarkdown: string | null
  customFields: string | null
  sortOrder: number | null
}

export interface ProductProfileUpsert {
  profileName: string
  category?: string | null
  description?: string | null
  detailMarkdown?: string | null
  customFieldsJson?: string | null
}

export interface ProductProfileCandidate {
  profileKey: string
  profileName: string
  category?: string | null
  description?: string | null
  detailMarkdown?: string | null
  customFields?: Array<{ key: string; value: string; sortOrder: number }> | null
  source?: { type: string; materialIds?: string[] }
}

/** 工作区档案列表（v0） */
export function listProductProfiles(themeId: string) {
  return request.get<unknown, ProductProfile[]>(`/act/admin/theme/${themeId}/product-profiles`)
}

/** 新建（profileKey 服务端生成） */
export function createProductProfile(themeId: string, body: ProductProfileUpsert) {
  return request.post<unknown, ProductProfile>(`/act/admin/theme/${themeId}/product-profiles`, body)
}

/** 更新（profileKey 不可变；发布快照行拒绝） */
export function updateProductProfile(
  themeId: string,
  profileId: string,
  body: ProductProfileUpsert,
) {
  return request.put<unknown, ProductProfile>(
    `/act/admin/theme/${themeId}/product-profiles/${profileId}`,
    body,
  )
}

/** 删除（被场景引用时后端拒绝并返回场景清单） */
export function deleteProductProfile(themeId: string, profileId: string) {
  return request.delete<unknown, void>(`/act/admin/theme/${themeId}/product-profiles/${profileId}`)
}

/** AI 候选生成（只返回候选不落库；最多 5 个材料） */
export function generateProfileCandidates(
  themeId: string,
  body: {
    materialIds: string[]
    profileNameHint?: string
    instructions?: string
    customFieldKeys?: string[]
  },
) {
  return request.post<unknown, { candidates: ProductProfileCandidate[]; warnings: string[] }>(
    `/act/admin/theme/${themeId}/product-profiles/generate`,
    body,
  )
}

/** 场景关联（PUT 覆盖式） */
export function linkScenarioProfiles(themeId: string, scenarioId: string, profileKeys: string[]) {
  return request.put<unknown, void>(
    `/act/admin/theme/${themeId}/product-profiles/link/${scenarioId}`,
    { profileKeys },
  )
}

/** 场景已关联档案（回显） */
export function listScenarioProfiles(themeId: string, scenarioId: string) {
  return request.get<unknown, ProductProfile[]>(
    `/act/admin/theme/${themeId}/product-profiles/by-scenario/${scenarioId}`,
  )
}
