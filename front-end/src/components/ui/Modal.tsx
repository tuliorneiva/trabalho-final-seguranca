// =============================================================================
// UI — MODAL (Genérico e Reutilizável)
// Princípio O: extensível — aceita qualquer children.
// Princípio L: pode ser substituído por qualquer componente de modal compatível.
// =============================================================================

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './Modal.module.css'

interface ModalProps {
  isOpen: boolean
  onClose?: () => void
  title?: string
  children: ReactNode
  /** Impede fechar ao clicar no backdrop */
  disableBackdropClose?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  disableBackdropClose = false,
  size = 'md',
}: ModalProps) {
  // Trava o scroll do body quando o modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Fecha com Escape
  useEffect(() => {
    if (!isOpen || !onClose) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleBackdropClick = () => {
    if (!disableBackdropClose && onClose) onClose()
  }

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`${styles.panel} ${styles[size]} animate-fade-in-scale`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className={styles.header}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {onClose && (
              <button
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Fechar modal"
                id="modal-close-btn"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
