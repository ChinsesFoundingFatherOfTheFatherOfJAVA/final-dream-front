import request from './request'

export function getProjectList(params: { page?: number; pageSize?: number; status?: number; projectType?: number; responsible?: string; keyword?: string }) {
  return request.get('/admin/training-project/list', { params })
}

export function getProjectDetail(id: number) {
  return request.get(`/admin/training-project/${id}`)
}

export function createProject(data: any) {
  return request.post('/admin/training-project', data)
}

export function createProjectWithFile(formData: FormData) {
  return request.post('/admin/training-project', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function updateProject(id: number, data: any) {
  return request.put(`/admin/training-project/${id}`, data)
}

export function updateProjectWithFile(id: number, formData: FormData) {
  return request.put(`/admin/training-project/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function publishProject(id: number) {
  return request.post(`/admin/training-project/${id}/publish`)
}

export function withdrawProject(id: number) {
  return request.post(`/admin/training-project/${id}/withdraw`)
}

export function deleteProject(id: number) {
  return request.delete(`/admin/training-project/${id}`)
}
