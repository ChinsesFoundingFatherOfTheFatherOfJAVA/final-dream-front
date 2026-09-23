import request from './request'

export function generateScript(data: { description: string; rounds: number; firstSpeaker?: string }) {
  return request.post('/admin/ai/generate-script', data)
}

export function generateScriptWithFile(formData: FormData) {
  return request.post('/admin/ai/generate-script/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/** FP-26/28 AI 生成陪练者形象（v1.1，接口 5.3）：调 Dify 生图工作流，返回转存后的图片 URL；生成耗时 10~30s */
export function generateAvatar(data: { prompt: string }) {
  return request.post<unknown, { imageUrl: string }>('/admin/ai/generate-avatar', data, {
    timeout: 60000
  })
}
