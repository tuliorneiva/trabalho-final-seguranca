// =============================================================================
// CONTEXT — AUTH
// Token JWT + usuário logado, persistidos em localStorage.
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types'

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  setMfaEnabled: (enabled: boolean) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('crm_token'))
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('crm_user')
    return stored ? (JSON.parse(stored) as AuthUser) : null
  })

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem('crm_token', newToken)
    localStorage.setItem('crm_user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('crm_token')
    localStorage.removeItem('crm_user')
    setToken(null)
    setUser(null)
  }, [])

  const setMfaEnabled = useCallback((enabled: boolean) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated = { ...prev, mfaEnabled: enabled }
      localStorage.setItem('crm_user', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{ token, user, login, logout, setMfaEnabled, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  }
  return ctx
}
