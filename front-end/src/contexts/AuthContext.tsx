// =============================================================================
// CONTEXT — AUTH
// Provê token JWT e dados do usuário logado para toda a árvore de componentes.
// Usa localStorage para persistência entre page refreshes.
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { AuthUser } from '../types'

// ---- Tipos do Contexto ----
interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  isAuthenticated: boolean
}

// ---- Criação do Contexto ----
const AuthContext = createContext<AuthContextValue | null>(null)

// ---- Usuário e Token mockados para demonstração ----
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock'
const MOCK_USER: AuthUser = {
  nome: 'Administrador Demo',
  email: 'admin@minicrm.com',
  mfaEnabled: false,
}

// ---- Provider ----
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('crm_token') ?? MOCK_TOKEN
  )
  const [user, setUser] = useState<AuthUser | null>(
    () => {
      const stored = localStorage.getItem('crm_user')
      return stored ? (JSON.parse(stored) as AuthUser) : MOCK_USER
    }
  )

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

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ---- Hook de consumo ----
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  }
  return ctx
}
