import api from './axiosClient'

export const authApi = {
  register: payload => api.post('/auth/register', payload).then(r => r.data),
  login: payload => api.post('/auth/login', payload).then(r => r.data),
  logout: () => api.post('/auth/logout').then(r => r.data),
  refresh: () => api.post('/auth/refresh').then(r => r.data),
  getMe: () => api.get('/auth/me').then(r => r.data),
  forgotPassword: email => api.post('/auth/forgot-password', { email }).then(r => r.data),
  resetPassword: (token, password, confirmPassword) =>
    api.post(`/auth/reset-password/${token}`, { password, confirmPassword }).then(r => r.data),
  revokeSessions: sessionId =>
    sessionId
      ? api.delete(`/auth/sessions/${sessionId}`).then(r => r.data)
      : api.delete('/auth/sessions').then(r => r.data),
}

export default authApi