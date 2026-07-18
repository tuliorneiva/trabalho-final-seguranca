// =============================================================================
// PAGE — MFA SETUP
// Página de configuração do Google Authenticator.
// Delegação total de lógica para useMfaSetup hook.
// =============================================================================

import { ShieldCheck, Info } from 'lucide-react'
import { MfaSetupCard } from '../components/mfa/MfaSetupCard'
import { useMfaSetup } from '../hooks/useMfaSetup'
import styles from './MfaSetupPage.module.css'

export function MfaSetupPage() {
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

      {/* Card de setup (dumb component) */}
      <MfaSetupCard {...mfaSetup} />
    </div>
  )
}
