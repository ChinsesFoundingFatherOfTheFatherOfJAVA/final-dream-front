import request from './request'

export function getProjectFlow(id: number) {
  return request.get(`/admin/training-project/${id}/nodes`)
}

export function saveProjectFlow(id: number, data: { nodes: any[]; edges: any[] }) {
  return request.post(`/admin/training-project/${id}/nodes`, data)
}
