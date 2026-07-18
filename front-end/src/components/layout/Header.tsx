// =============================================================================
// LAYOUT — HEADER
// Barra superior com título da página atual e ações globais.
// =============================================================================

import { useLocation } from 'react-router-dom'
import { Bell, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Header.module.css'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/':          { title: 'Dashboard',    subtitle: 'Visão geral do sistema' },
  '/clientes':  { title: 'Clientes',     subtitle: 'Gerencie sua base de clientes' },
  '/mfa-setup': { title: 'Segurança MFA', subtitle: 'Configure a autenticação em dois fatores' },
}

export function Header() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const mfaOn = !!user?.mfaEnabled
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
        {/* Badge de segurança — reflete o estado real do MFA da conta */}
        <div
          className={`${styles.securityBadge} ${mfaOn ? '' : styles.securityBadgeOff}`}
          title={mfaOn ? 'Step-up MFA ativo' : 'MFA não configurado nesta conta'}
        >
          {mfaOn ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
          <span>{mfaOn ? 'MFA Protegido' : 'MFA Inativo'}</span>
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
