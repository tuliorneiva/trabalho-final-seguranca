// =============================================================================
// API — CLIENTES ENDPOINTS
// Princípio I: este módulo expõe apenas as funções do domínio Clientes.
// =============================================================================

import apiClient from './axios'
import type { Cliente } from '../types'

// ---- MOCK: Simula resposta da API enquanto o backend não está disponível ----
const USE_MOCK = true

const MOCK_CLIENTES: Cliente[] = [
  { id: 1, nome: 'Ana Beatriz Costa',      email: 'ana.costa@empresa.com',    status: 'Ativo' },
  { id: 2, nome: 'Carlos Eduardo Lima',    email: 'carlos.lima@startup.io',   status: 'Ativo' },
  { id: 3, nome: 'Fernanda Oliveira',      email: 'fernanda@consultoria.com', status: 'Inativo' },
  { id: 4, nome: 'Rafael Mendes',          email: 'rafael.mendes@tech.com',   status: 'Pendente' },
  { id: 5, nome: 'Julia Santos',           email: 'julia.santos@design.co',   status: 'Ativo' },
  { id: 6, nome: 'Pedro Alves Rodrigues',  email: 'pedro.alves@fintech.com',  status: 'Ativo' },
  { id: 7, nome: 'Mariana Ferreira',       email: 'mariana@agencia.com.br',   status: 'Inativo' },
  { id: 8, nome: 'Lucas Brandão',          email: 'lucas.brandao@corp.com',   status: 'Pendente' },
]

// Estado mutável do mock (simula banco de dados)
let mockClientesDb = [...MOCK_CLIENTES]

/**
 * Busca todos os clientes.
 * GET /clientes — requer Authorization: Bearer <token>
 */
export async function getClientes(): Promise<Cliente[]> {
  if (USE_MOCK) {
    await delay(700)
    return [...mockClientesDb]
  }
  const { data } = await apiClient.get<Cliente[]>('/clientes')
  return data
}

/**
 * Exclui um cliente permanentemente.
 * DELETE /clientes/:id
 * Requer: Authorization: Bearer <token> + x-mfa-code: <totp_code>
 *
 * @throws AxiosError 401 com code MFA_REQUIRED | MFA_INVALID
 */
export async function deleteCliente(
  id: string | number,
  mfaCode: string
): Promise<void> {
  if (USE_MOCK) {
    await delay(1200)

    // Simula código inválido: qualquer coisa diferente de 6 dígitos
    if (!/^\d{6}$/.test(mfaCode)) {
      const err = new Error('Código MFA inválido.') as Error & { response?: { data: { message: string; code: string }; status: number } }
      err.response = {
        data: { message: 'Código MFA inválido.', code: 'MFA_INVALID' },
        status: 401,
      }
      throw err
    }

    // Remove do "banco" mock
    mockClientesDb = mockClientesDb.filter((c) => c.id !== id)
    return
  }

  await apiClient.delete(`/clientes/${id}`, {
    headers: { 'x-mfa-code': mfaCode },
  })
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
