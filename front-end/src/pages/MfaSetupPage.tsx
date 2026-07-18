// =============================================================================
// PAGE — MFA SETUP
// Página de configuração do Google Authenticator.
// Delegação total de lógica para useMfaSetup hook.
// =============================================================================

import { useState } from 'react'
import { ShieldCheck, Info, ShieldOff } from 'lucide-react'
import { MfaSetupCard } from '../components/mfa/MfaSetupCard'
import { useMfaSetup } from '../hooks/useMfaSetup'
import { useAuth } from '../contexts/AuthContext'
import { useMfaContext } from '../contexts/MfaContext'
import { useToast } from '../components/ui/Toast'
import { disableMfa } from '../api/mfaApi'
import type { ApiErrorResponse } from '../types'
import styles from './MfaSetupPage.module.css'

export function MfaSetupPage() {
  const { user, setMfaEnabled } = useAuth()
  const { requestStepUp } = useMfaContext()
  const { showToast } = useToast()
  const mfaSetup = useMfaSetup()
  const [disabling, setDisabling] = useState(false)

  // Desativar MFA é ação crítica → passa pelo modal de step-up para obter o
  // código TOTP, que o backend valida no header x-mfa-code.
  async function handleDisableMfa() {
    let code: string
    try {
      code = await requestStepUp({
        title: 'Desativar MFA',
        description:
          'Digite o código do seu autenticador para confirmar a desativação do MFA.',
      })
    } catch {
      return // usuário cancelou o modal
    }

    setDisabling(true)
    try {
      await disableMfa(code)
      mfaSetup.reset() // limpa QR/secret/sucesso da configuração anterior
      setMfaEnabled(false)
      showToast('MFA desativado. Você pode configurá-lo novamente quando quiser.', 'success')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiErrorResponse } }
      showToast(
        axiosErr?.response?.data?.message ?? 'Não foi possível desativar o MFA.',
        'error',
      )
    } finally {
      setDisabling(false)
    }
  }

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
            <button
              className={styles.disableBtn}
              onClick={handleDisableMfa}
              disabled={disabling}
              id="btn-disable-mfa"
            >
              <ShieldOff size={16} />
              {disabling ? 'Desativando...' : 'Desativar MFA'}
            </button>
          </div>
        </section>
      ) : (
        /* Card de setup (dumb component) */
        <MfaSetupCard {...mfaSetup} />
      )}
    </div>
  )
}
