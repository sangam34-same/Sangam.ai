import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/authApi'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken) => {
        localStorage.setItem('sangam_access_token', accessToken)
        localStorage.setItem('sangam_user', JSON.stringify(user))
        set({ user, accessToken, isAuthenticated: true })
      },

      clearAuth: () => {
        localStorage.removeItem('sangam_access_token')
        localStorage.removeItem('sangam_user')
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
            localStorage.setItem('sangam_access_token', accessToken)
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
          localStorage.setItem('sangam_user', JSON.stringify(user))
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