import axios from 'axios'
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

const isRefreshRequest = config => config?.url?.includes('/auth/refresh')

api.interceptors.request.use(
  config => {
    // Access token lives in memory only (see tokenStore.js).
    const token = getAccessToken()
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    // Never intercept the refresh call itself — otherwise a dead refresh
    // token would recurse/deadlock instead of logging the user out.
    if (!originalRequest || isRefreshRequest(originalRequest)) {
      clearAccessToken()
      window.dispatchEvent(new CustomEvent('sangam:unauthorized'))
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await api.post('/auth/refresh', {}, { withCredentials: true })
        const newAccessToken = response.data.data?.accessToken || response.data.accessToken

        if (newAccessToken) {
          setAccessToken(newAccessToken)
        }

        processQueue(null, newAccessToken)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearAccessToken()
        localStorage.removeItem('sangam_user')
        window.dispatchEvent(new CustomEvent('sangam:unauthorized'))
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
