import request from './request'

export function getTemplateList(params: { page?: number; pageSize?: number; status?: number; keyword?: string }) {
  return request.get('/admin/speech-template/list', { params })
}

export function getTemplateDetail(id: number) {
  return request.get(`/admin/speech-template/${id}`)
}

export function createTemplate(data: { name: string; description: string; permission: number }) {
  return request.post('/admin/speech-template', data)
}

export function updateTemplate(id: number, data: any) {
  return request.put(`/admin/speech-template/${id}`, data)
}

export function deleteTemplate(id: number) {
  return request.delete(`/admin/speech-template/${id}`)
}

export function getTemplateFlow(id: number) {
  return request.get(`/admin/speech-template/${id}/nodes`)
}

export function saveTemplateFlow(id: number, data: { nodes: any[]; edges: any[] }) {
  return request.post(`/admin/speech-template/${id}/nodes`, data)
}
