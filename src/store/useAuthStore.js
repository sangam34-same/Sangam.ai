import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/authApi'
import { setAccessToken, clearAccessToken } from '../api/tokenStore'

// NOTE: the JWT lives in memory only (tokenStore.js), never in storage.
// Only non-sensitive identity (user, isAuthenticated) is persisted so the
// UI can render instantly on reload; the first authenticated call silently
// refreshes the token from the httpOnly cookie via the axios interceptor.
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken) => {
        setAccessToken(accessToken)
        try {
          localStorage.setItem('sangam_user', JSON.stringify(user))
        } catch { /* storage unavailable */ }
        set({ user, accessToken, isAuthenticated: true })
      },

      clearAuth: () => {
        clearAccessToken()
        try {
          localStorage.removeItem('sangam_user')
        } catch { /* storage unavailable */ }
        set({ user: null, accessToken: null, isAuthenticated: false })
      },

      login: async payload => {
        set({ isLoading: true })
        try {
          const response = await authApi.login(payload)
          const { user, accessToken } = response.data
          get().setAuth(user, accessToken)
          return response
        } finally {
          set({ isLoading: false })
        }
      },

      register: async payload => {
        set({ isLoading: true })
        try {
          const response = await authApi.register(payload)
          const { user, accessToken } = response.data
          get().setAuth(user, accessToken)
          return response
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          get().clearAuth()
        }
      },

      refresh: async () => {
        try {
          const response = await authApi.refresh()
          const accessToken = response.data.data?.accessToken || response.data.accessToken
          if (accessToken) {
            setAccessToken(accessToken)
            set({ accessToken })
          }
          return response
        } catch (error) {
          get().clearAuth()
          throw error
        }
      },

      getMe: async () => {
        try {
          const response = await authApi.getMe()
          const { user } = response.data
          try {
            localStorage.setItem('sangam_user', JSON.stringify(user))
          } catch { /* storage unavailable */ }
          set({ user, isAuthenticated: true })
          return user
        } catch (error) {
          get().clearAuth()
          throw error
        }
      },

      forgotPassword: email => authApi.forgotPassword(email),
      resetPassword: (token, password, confirmPassword) =>
        authApi.resetPassword(token, password, confirmPassword),
    }),
    {
      name: 'sangam-auth',
      partialize: state => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

window.addEventListener('sangam:unauthorized', () => {
  useAuthStore.getState().clearAuth()
})
