// =============================================================================
// UI — TOAST NOTIFICATION
// Sistema global de feedback (sucesso, erro, info).
// =============================================================================

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import styles from './Toast.module.css'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.container} aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastItem
  onRemove: (id: number) => void
}) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4500)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  const icons = {
    success: <CheckCircle size={18} />,
    error:   <XCircle size={18} />,
    info:    <Info size={18} />,
  }

  return (
    <div className={`${styles.toast} ${styles[toast.type]}`} role="alert">
      <span className={styles.icon}>{icons[toast.type]}</span>
      <p className={styles.message}>{toast.message}</p>
      <button
        className={styles.dismiss}
        onClick={() => onRemove(toast.id)}
        aria-label="Dispensar notificação"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}
