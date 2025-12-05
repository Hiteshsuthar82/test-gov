import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  mobile: string
  preparingForExam?: string
}

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('token', token)
        set({ user, token })
      },
      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, token: null })
      },
      isAuthenticated: () => {
        return !!get().token && !!get().user
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)

