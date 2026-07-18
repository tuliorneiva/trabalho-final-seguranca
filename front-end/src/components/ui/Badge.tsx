// =============================================================================
// UI — BADGE
// Exibe status do cliente com cor semântica.
// Princípio O: fácil de estender com novos status sem modificar o componente.
// =============================================================================

import styles from './Badge.module.css'
import type { Cliente } from '../../types'

interface BadgeProps {
  status: Cliente['status']
}

const statusConfig: Record<Cliente['status'], { label: string; className: string }> = {
  Ativo:    { label: 'Ativo',    className: styles.ativo },
  Inativo:  { label: 'Inativo',  className: styles.inativo },
  Pendente: { label: 'Pendente', className: styles.pendente },
}

export function Badge({ status }: BadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: '' }
  return (
    <span className={`${styles.badge} ${config.className}`}>
      <span className={styles.dot} />
      {config.label}
    </span>
  )
}
