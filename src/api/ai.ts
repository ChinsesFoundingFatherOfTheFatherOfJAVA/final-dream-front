import request from './request'

export function generateScript(data: { description: string; rounds: number }) {
  return request.post('/admin/ai/generate-script', data)
}

export function generateScriptWithFile(formData: FormData) {
  return request.post('/admin/ai/generate-script/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
