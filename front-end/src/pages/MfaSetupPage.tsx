// =============================================================================
// PAGE — MFA SETUP
// Página de configuração do Google Authenticator.
// Delegação total de lógica para useMfaSetup hook.
// =============================================================================

import { ShieldCheck, Info } from 'lucide-react'
import { MfaSetupCard } from '../components/mfa/MfaSetupCard'
import { useMfaSetup } from '../hooks/useMfaSetup'
import { useAuth } from '../contexts/AuthContext'
import styles from './MfaSetupPage.module.css'

export function MfaSetupPage() {
  const { user } = useAuth()
  const mfaSetup = useMfaSetup()

  return (
    <div className={styles.page}>
      {/* Banner informativo */}
      <div className={styles.infoBanner}>
        <ShieldCheck size={20} className={styles.bannerIcon} />
        <div>
          <strong>Por que configurar o MFA?</strong>
          <p>
            O MFA (Multi-Factor Authentication) protege ações críticas como a
            exclusão de clientes. Mesmo que sua senha seja comprometida, um
            atacante não conseguirá executar ações sensíveis sem o código do
            seu smartphone.
          </p>
        </div>
        <div className={styles.infoBadge}>
          <Info size={14} />
          Google Authenticator
        </div>
      </div>

      {/* Estado: MFA já ativo (evita reenviar POST /mfa/generate e receber 403) */}
      {user?.mfaEnabled ? (
        <section className={`card ${styles.activeState}`} role="status" id="mfa-already-active">
          <div className={styles.activeIcon}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className={styles.activeTitle}>MFA já está ativo</h2>
            <p className={styles.activeDesc}>
              Sua conta já está protegida com autenticação em dois fatores. O
              código do Google Authenticator será solicitado sempre que você
              executar ações críticas, como a exclusão de clientes.
            </p>
          </div>
        </section>
      ) : (
        /* Card de setup (dumb component) */
        <MfaSetupCard {...mfaSetup} />
      )}
    </div>
  )
}
