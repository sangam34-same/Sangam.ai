import api from './axiosClient'

export const adminApi = {
  stats: () => api.get('/admin/stats').then(r => r.data),
  users: (params = {}) => api.get('/admin/users', { params }).then(r => r.data),
  setRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }).then(r => r.data),
  revokeSessions: id => api.delete(`/admin/users/${id}/sessions`).then(r => r.data),
  lock: id => api.post(`/admin/users/${id}/lock`).then(r => r.data),
  unlock: id => api.post(`/admin/users/${id}/unlock`).then(r => r.data),
}

export default adminApi
