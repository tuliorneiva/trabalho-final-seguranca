// =============================================================================
// LAYOUT — HEADER
// Barra superior com título da página atual e ações globais.
// =============================================================================

import { useLocation } from 'react-router-dom'
import { Bell, ShieldCheck } from 'lucide-react'
import styles from './Header.module.css'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/':          { title: 'Dashboard',    subtitle: 'Visão geral do sistema' },
  '/clientes':  { title: 'Clientes',     subtitle: 'Gerencie sua base de clientes' },
  '/mfa-setup': { title: 'Segurança MFA', subtitle: 'Configure a autenticação em dois fatores' },
}

export function Header() {
  const { pathname } = useLocation()
  const page = pageTitles[pathname] ?? { title: 'Mini CRM', subtitle: '' }

  return (
    <header className={styles.header}>
      {/* Título da página */}
      <div className={styles.pageInfo}>
        <h1 className={styles.title}>{page.title}</h1>
        {page.subtitle && (
          <p className={styles.subtitle}>{page.subtitle}</p>
        )}
      </div>

      {/* Ações do header */}
      <div className={styles.actions}>
        {/* Badge de segurança */}
        <div className={styles.securityBadge} title="Step-up MFA ativo">
          <ShieldCheck size={14} />
          <span>MFA Protegido</span>
        </div>

        {/* Notificações */}
        <button
          className={styles.iconBtn}
          aria-label="Notificações"
          id="btn-notifications"
        >
          <Bell size={18} />
          <span className={styles.notifDot} />
        </button>
      </div>
    </header>
  )
}
