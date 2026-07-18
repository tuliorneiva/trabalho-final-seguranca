// =============================================================================
// CONTEXT — MFA STEP-UP
// Implementa o padrão "Promise Suspension" para ações sensíveis.
//
// Como funciona:
//   1. Um hook chama requestStepUp() → recebe uma Promise pendente
//   2. O Context abre o <StepUpModal> globalmente
//   3. O usuário digita o código TOTP e confirma
//   4. O Context resolve a Promise com o código → o hook continua
//   5. Se o usuário cancelar → a Promise é rejeitada
//
// Princípio S: contexto cuida exclusivamente do fluxo de step-up, nada mais.
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react'
import type { StepUpRequest } from '../types'

// ---- Tipos internos ----
interface PendingStepUp {
  resolve: (code: string) => void
  reject: (reason?: string) => void
  options: StepUpRequest
}

interface MfaContextValue {
  isOpen: boolean
  options: StepUpRequest
  /**
   * Dispara o fluxo de Step-up.
   * Retorna uma Promise que resolve com o código TOTP quando o usuário confirmar.
   */
  requestStepUp: (opts?: StepUpRequest) => Promise<string>
  /** Chamado pelo modal ao confirmar o código */
  confirmCode: (code: string) => void
  /** Chamado pelo modal ao cancelar */
  cancelStepUp: () => void
}

// ---- Contexto ----
const MfaContext = createContext<MfaContextValue | null>(null)

// ---- Provider ----
export function MfaProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<StepUpRequest>({})
  const pendingRef = useRef<PendingStepUp | null>(null)

  const requestStepUp = useCallback((opts: StepUpRequest = {}): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      // Armazena os resolvers para serem chamados pelo modal
      pendingRef.current = { resolve, reject, options: opts }
      setOptions(opts)
      setIsOpen(true)
    })
  }, [])

  const confirmCode = useCallback((code: string) => {
    if (pendingRef.current) {
      pendingRef.current.resolve(code)
      pendingRef.current = null
    }
    setIsOpen(false)
  }, [])

  const cancelStepUp = useCallback(() => {
    if (pendingRef.current) {
      pendingRef.current.reject('Ação cancelada pelo usuário.')
      pendingRef.current = null
    }
    setIsOpen(false)
  }, [])

  return (
    <MfaContext.Provider
      value={{ isOpen, options, requestStepUp, confirmCode, cancelStepUp }}
    >
      {children}
    </MfaContext.Provider>
  )
}

// ---- Hook de consumo ----
export function useMfaContext() {
  const ctx = useContext(MfaContext)
  if (!ctx) {
    throw new Error('useMfaContext deve ser usado dentro de <MfaProvider>')
  }
  return ctx
}
