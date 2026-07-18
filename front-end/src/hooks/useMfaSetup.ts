// =============================================================================
// HOOK — useMfaSetup
// Gerencia o fluxo de configuração do MFA (geração de QR + ativação).
// Princípio S: lógica de setup MFA isolada e reutilizável.
// =============================================================================

import { useState, useCallback } from 'react'
import { generateMfaSecret, enableMfa } from '../api/mfaApi'
import { useAuth } from '../contexts/AuthContext'

export interface UseMfaSetupReturn {
  qrCodeUrl: string | null
  secret: string | null
  code: string
  setCode: (code: string) => void
  loading: boolean
  activating: boolean
  error: string | null
  success: boolean
  generateSecret: () => Promise<void>
  activateMfa: () => Promise<void>
}

export function useMfaSetup(): UseMfaSetupReturn {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { setMfaEnabled } = useAuth()

  // ---- Gera o QR Code e o secret ----
  const generateSecret = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const data = await generateMfaSecret()
      setSecret(data.secret)
      setQrCodeUrl(data.qrCodeUrl)
    } catch {
      setError('Não foi possível gerar o QR Code. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---- Ativa o MFA com o código inserido pelo usuário ----
  const activateMfa = useCallback(async () => {
    if (!code || code.length !== 6) {
      setError('Insira um código válido de 6 dígitos.')
      return
    }
    setActivating(true)
    setError(null)
    try {
      await enableMfa(code)
      setSuccess(true)
      setMfaEnabled(true)
      setCode('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Código inválido. Verifique e tente novamente.'
      setError(msg)
    } finally {
      setActivating(false)
    }
  }, [code])

  return {
    qrCodeUrl,
    secret,
    code,
    setCode,
    loading,
    activating,
    error,
    success,
    generateSecret,
    activateMfa,
  }
}
