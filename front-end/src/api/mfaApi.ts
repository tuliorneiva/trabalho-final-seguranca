// =============================================================================
// API — MFA ENDPOINTS
// Princípio I: este módulo expõe apenas as funções do domínio MFA.
// =============================================================================

import apiClient from './axios'
import type { MfaGenerateResponse } from '../types'

// ---- MOCK: Simula resposta da API enquanto o backend não está disponível ----
const USE_MOCK = false

const MOCK_MFA_RESPONSE: MfaGenerateResponse = {
  secret: 'JBSWY3DPEHPK3PXP',
  // URL compatível com Google Authenticator (otpauth://)
  qrCodeUrl:
    'otpauth://totp/MiniCRM:demo%40empresa.com?secret=JBSWY3DPEHPK3PXP&issuer=MiniCRM',
}

/**
 * Gera um novo secret MFA e a URL do QR Code para o Google Authenticator.
 * POST /mfa/generate
 */
export async function generateMfaSecret(): Promise<MfaGenerateResponse> {
  if (USE_MOCK) {
    await delay(800)
    return MOCK_MFA_RESPONSE
  }
  const { data } = await apiClient.post<MfaGenerateResponse>('/mfa/generate')
  return data
}

/**
 * Ativa o MFA para o usuário atual usando o código TOTP gerado pelo app.
 * POST /mfa/enable
 * @throws AxiosError com status 400 se o código for inválido
 */
export async function enableMfa(code: string): Promise<void> {
  if (USE_MOCK) {
    await delay(1000)
    // Simula: qualquer código de 6 dígitos é aceito no mock
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      throw new Error('Código inválido. Use 6 dígitos numéricos.')
    }
    return
  }
  await apiClient.post('/mfa/enable', { code })
}

// Helper para simular latência de rede
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
