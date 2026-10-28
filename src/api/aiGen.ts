import request from './request'

/**
 * AI生成话术闭环 v2.0 三步向导接口（03 接口文档升级版）。
 * 三步独立调用独立失败重试；sessionId 前端生成 uuid 三步共用；
 * sceneHash=场景数据 SHA-256（crypto.subtle），第二步起透传做一致性校验。
 */

export interface MaterialItem {
  fileName: string
  text: string
  truncated?: boolean
}

export interface SceneData {
  scene: string
  trainerRole: string
  trainerProfile: string
  studentRole: string
  goal: string
}

export interface OutlineItem {
  name: string
  assessmentPoints: string
  strategy: string
}

export interface KeyPointItem {
  content: string
  order: number
}

export interface RoundItem {
  round: number
  speakerOrder?: 'student' | 'trainer' | string
  trainerQuestion: string
  standardScript: string
  keyPoints: KeyPointItem[]
  analysis: string
}

export interface MaterialExtractResp {
  fileName: string
  text: string
  truncated: boolean
  chars: number
}

export interface KngMaterialItem {
  id: string
  title: string
  credits: number | null
  durationText: string
  createdByName: string
}

/** 场景数据 → SHA-256 hex（步骤一致性校验用；与后端 canonical JSON 的 SHA-256 对齐） */
export async function sha256OfScene(scene: SceneData): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(scene))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** SG-03a 本地素材抽取 */
export function extractMaterial(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request.post<unknown, MaterialExtractResp>('/admin/ai/material/extract', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  })
}

/** SG-03b 在线课堂文档类课件列表 */
export function listKngMaterials(page: number, pageSize: number, keyword: string) {
  return request.post<unknown, { total: number; records: KngMaterialItem[] }>(
    `/admin/ai/material/kng-list?page=${page}&pageSize=${pageSize}`,
    { keyword },
    { timeout: 60000 }
  )
}

/** SG-03c 课件素材抽取 */
export function extractKngMaterial(coursewareId: string) {
  return request.get<unknown, MaterialExtractResp>(
    `/admin/ai/material/kng-extract?coursewareId=${encodeURIComponent(coursewareId)}`,
    { timeout: 120000 }
  )
}

/** SG-04 工作流①场景生成 */
export function genScene(data: {
  sessionId: string
  description: string
  firstSpeaker: string
  materials: MaterialItem[]
}) {
  return request.post<unknown, SceneData & { elapsedMs?: number }>(
    '/admin/ai/gen-scene',
    data,
    { timeout: 180000 }
  )
}

/** SG-05 工作流②大纲生成 */
export function genOutline(data: {
  sessionId: string
  sceneHash: string
  scene: SceneData
  materials?: MaterialItem[]
}) {
  return request.post<unknown, { outlines: OutlineItem[] }>(
    '/admin/ai/gen-outline',
    data,
    { timeout: 180000 }
  )
}

/** SG-07 工作流③话术生成（v1.2：firstSpeaker 透传控制第1轮发言结构；narration=开场旁白） */
export function genScriptV2(data: {
  sessionId: string
  sceneHash: string
  scene: SceneData
  outlines: OutlineItem[]
  language: string
  firstSpeaker: string
}) {
  return request.post<unknown, { narration: string; rounds: RoundItem[]; elapsedMs?: number }>(
    '/admin/ai/gen-script-v2',
    data,
    { timeout: 300000 }
  )
}

/** SG-08 导入编排（v1.2：narration 非空时开始节点后插旁白节点） */
export function importScript(data: {
  sessionId: string
  firstSpeaker: string
  narration?: string
  rounds: RoundItem[]
}) {
  return request.post<unknown, { nodes: any[]; edges: any[] }>('/admin/ai/import-script', data)
}
