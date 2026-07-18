// =============================================================================
// API — AUTH ENDPOINTS
// =============================================================================

import apiClient from './axios'
import type { AuthUser } from '../types'

export interface LoginResponse {
  token: string
  user: AuthUser
}

/** POST /auth/login */
export async function login(email: string, senha: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, senha })
  return data
}

/** POST /auth/register */
export async function register(nome: string, email: string, senha: string): Promise<void> {
  await apiClient.post('/auth/register', { nome, email, senha })
}
