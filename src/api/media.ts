/**
 * 在线课堂 AI字幕与转码专项（/api/kng/admin/media/**、courseware/{id}/play|subtitles）接口封装。
 * 契约来源：《在线课堂媒体处理模块/03-接口文档.md》v1.0，函数与 FP-MT-04/05/06、FP-MT-05a/b/c 一一对应。
 */
import request from './request'

/** 媒体任务类型：1=transcode（转码） 2=subtitle（字幕） */
export type MediaJobType = 1 | 2

/** 页面 tab 语义：processing=pending+running，failed=失败 */
export type MediaJobTab = 'processing' | 'failed'

/** kng_media_job 行（03 §2 响应示例字段） */
export interface MediaJobItem {
  id: string
  jobType: MediaJobType
  /** 0 pending 1 running 2 success 3 failed */
  status: number
  /** subtitle 管线细分：asr/srt/translate；transcode 为 null */
  stage: string | null
  coursewareId: string
  coursewareTitle: string
  catalogName: string | null
  /** 失败原因（stderr 尾部/异常消息），仅 failed 有值 */
  error: string | null
  retryCount: number
  createdByName: string | null
  createdAt: string | null
  /** 课件上传时间（后端兼容扩展字段；当前"上传日期"列用 createdAt 渲染） */
  uploadTime?: string | null
  startedAt: string | null
  finishedAt: string | null
  /** 已转换时间（后端快照值）；转码中 tab 的实时耗时由前端按 startedAt 自算 */
  elapsedSeconds: number | null
}

export interface MediaJobPage {
  total: number
  records: MediaJobItem[]
}

/** 分页查询媒体任务（FP-MT-04/05）：转码管理页传 type=1，字幕管理页传 type=2。
 *  silent=true 用于"失败不打扰用户"的辅助查询（如失败 tab 下补查转码中 total） */
export function listMediaJobs(
  params: { page: number; pageSize: number },
  body: { type: MediaJobType; tab: MediaJobTab; keyword?: string },
  config?: { silent?: boolean },
) {
  return request.post<unknown, MediaJobPage>('/kng/admin/media/jobs', body, {
    params,
    silent: config?.silent,
  })
}

/** 重试失败任务（FP-MT-04/05 retry）：仅 status=failed 且 retryCount<3 可重试，重置回 pending */
export function retryMediaJob(id: string) {
  return request.post<unknown, null>(`/kng/admin/media/jobs/${id}/retry`)
}

/** 获取播放地址（FP-MT-06）：转码未完成/非视频类时后端返回 code=1"暂无可播放内容"。
 *  传 silent=true 时不弹全局 toast，由抽屉预览区自行渲染空态 */
export function getPlayUrl(id: string, config?: { silent?: boolean }) {
  return request.get<unknown, { playUrl: string; durationSeconds: number | null }>(
    `/kng/admin/courseware/${id}/play`,
    { silent: config?.silent },
  )
}

/** 字幕条目（标准 SRT 时间戳：HH:MM:SS,mmm） */
export interface SubtitleEntry {
  index: number
  beginTime: string
  endTime: string
  text: string
}

/** 读取字幕（FP-MT-05a）：未生成时 subtitlesFlag=false, languages:[], entries:{} */
export interface SubtitleData {
  subtitlesFlag: boolean
  languages: string[]
  entries: Partial<Record<'zh' | 'ha' | 'en' | 'vi', SubtitleEntry[]>>
}

export function getSubtitles(id: string, config?: { silent?: boolean }) {
  return request.get<unknown, SubtitleData>(`/kng/admin/courseware/${id}/subtitles`, {
    silent: config?.silent,
  })
}

/** 保存字幕（FP-MT-05b）：按语言整份 SRT 重写落盘；字幕 job 活跃中返回 code=1"字幕生成中，稍后保存" */
export function saveSubtitles(
  id: string,
  lang: 'zh' | 'ha' | 'en' | 'vi',
  entries: SubtitleEntry[],
) {
  return request.put<unknown, null>(`/kng/admin/courseware/${id}/subtitles/${lang}`, { entries })
}

/** 重新生成字幕（FP-MT-05c）：重投 subtitle job 从 asr 全量重跑，覆盖现有 SRT；已有活跃 job 返回 code=1 */
export function regenerateSubtitles(id: string) {
  return request.post<unknown, null>(`/kng/admin/courseware/${id}/subtitles/regenerate`)
}
