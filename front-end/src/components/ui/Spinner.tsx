// =============================================================================
// UI — SPINNER
// Indicador de loading genérico e reutilizável.
// =============================================================================

import styles from './Spinner.module.css'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  /** Se true, centraliza dentro do pai com padding */
  fullPage?: boolean
}

export function Spinner({ size = 'md', fullPage = false }: SpinnerProps) {
  return (
    <div className={`${styles.wrapper} ${fullPage ? styles.fullPage : ''}`}>
      <div className={`${styles.spinner} ${styles[size]}`} role="status">
        <span className="sr-only">Carregando...</span>
      </div>
    </div>
  )
}
