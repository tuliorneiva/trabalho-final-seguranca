// =============================================================================
// MFA — STEP-UP MODAL
// Modal que intercepta ações sensíveis e exige código TOTP.
// Conectado ao MfaContext via hook — zero acoplamento com o componente chamador.
// =============================================================================

import { useState, useRef, useEffect, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { ShieldAlert, Lock, AlertCircle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useMfaContext } from '../../contexts/MfaContext'
import styles from './StepUpModal.module.css'

// O modal lida internamente com: validação, loading e erro de código inválido.
// Quando o código é confirmado (válido), ele chama confirmCode() que resolve a Promise suspensa.

export function StepUpModal() {
  const { isOpen, options, confirmCode, cancelStepUp } = useMfaContext()

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Foca no input ao abrir e limpa estado ao fechar
  useEffect(() => {
    if (isOpen) {
      setCode('')
      setError(null)
      // Pequeno delay para o modal renderizar antes de focar
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Aceita apenas dígitos, máximo 6
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    if (error) setError(null)
  }

  const handleConfirm = () => {
    if (code.length !== 6) {
      setError('Por favor, insira os 6 dígitos do código.')
      return
    }

    // Faz a validação otimista: passa o código para o hook chamador via Promise.
    // O loading do DELETE fica no hook (deletingId). Aqui apenas disparamos o resolver.
    confirmCode(code)
  }

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleConfirm()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={cancelStepUp}
      title={options.title ?? 'Verificação de Segurança'}
      disableBackdropClose={false}
      size="sm"
    >
      <div className={styles.content}>
        {/* Ícone de segurança */}
        <div className={styles.iconWrapper}>
          <div className={styles.iconRing}>
            <ShieldAlert size={28} />
          </div>
        </div>

        {/* Descrição */}
        <p className={styles.description}>
          {options.description ??
            'Esta ação requer verificação adicional. Abra seu app Google Authenticator e insira o código de 6 dígitos.'}
        </p>

        {/* Input do código */}
        <div className={styles.inputGroup}>
          <label htmlFor="totp-code-input" className={styles.label}>
            <Lock size={13} />
            Código do Authenticator
          </label>
          <input
            ref={inputRef}
            id="totp-code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            className={`input ${styles.codeInput} ${error ? 'input-error' : ''}`}
            maxLength={6}
            disabled={false}
            aria-describedby={error ? 'totp-error' : undefined}
          />
          {/* Indicador de progresso de dígitos */}
          <div className={styles.dots}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`${styles.dot} ${i < code.length ? styles.dotFilled : ''}`}
              />
            ))}
          </div>

          {/* Erro de validação local */}
          {error && (
            <div className={styles.errorMsg} id="totp-error" role="alert">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Ações */}
        <div className={styles.actions}>
          <button
            className="btn btn-ghost"
            onClick={cancelStepUp}
            disabled={false}
            id="stepup-cancel-btn"
          >
            Cancelar
          </button>
          <button
            className={`btn btn-primary ${styles.confirmBtn}`}
            onClick={handleConfirm}
            disabled={code.length !== 6}
            id="stepup-confirm-btn"
          >
            <>
              <ShieldAlert size={16} />
              Confirmar
            </>
          </button>
        </div>
      </div>
    </Modal>
  )
}
