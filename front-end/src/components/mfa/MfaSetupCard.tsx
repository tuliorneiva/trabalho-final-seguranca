// =============================================================================
// MFA — MFA SETUP CARD
// Interface de configuração do Google Authenticator.
// Componente puramente visual (dumb) — toda lógica está no useMfaSetup hook.
// =============================================================================

import { QRCodeSVG } from 'qrcode.react'
import {
  QrCode,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { Spinner } from '../ui/Spinner'
import type { UseMfaSetupReturn } from '../../hooks/useMfaSetup'
import styles from './MfaSetupCard.module.css'

// Re-exportamos o tipo para que a página possa usá-lo
// (evita import duplo do hook na página)
interface MfaSetupCardProps extends UseMfaSetupReturn {}

export function MfaSetupCard({
  qrCodeUrl,
  secret,
  code,
  setCode,
  loading,
  activating,
  error,
  success,
  generateSecret,
  activateMfa,
}: MfaSetupCardProps) {
  return (
    <div className={styles.container}>
      {/* ---- Passo 1: Gerar QR Code ---- */}
      <section className={`card ${styles.step}`}>
        <div className={styles.stepHeader}>
          <div className={styles.stepNumber}>1</div>
          <div>
            <h2 className={styles.stepTitle}>Gere o QR Code</h2>
            <p className={styles.stepDesc}>
              Clique no botão abaixo para gerar seu QR Code exclusivo e
              escaneie-o com o app Google Authenticator.
            </p>
          </div>
        </div>

        {!qrCodeUrl && !loading && (
          <button
            className={`btn btn-primary ${styles.generateBtn}`}
            onClick={generateSecret}
            id="btn-generate-qr"
          >
            <QrCode size={18} />
            Gerar QR Code
          </button>
        )}

        {loading && (
          <div className={styles.spinnerWrapper}>
            <Spinner size="lg" />
            <p className={styles.loadingText}>Gerando sua chave secreta...</p>
          </div>
        )}

        {qrCodeUrl && !loading && (
          <div className={styles.qrSection} id="qr-code-section">
            {/* QR Code */}
            <div className={styles.qrWrapper}>
              <QRCodeSVG
                value={qrCodeUrl}
                size={180}
                bgColor="transparent"
                fgColor="#F1F0FF"
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Secret manual */}
            {secret && (
              <div className={styles.secretBox}>
                <div className={styles.secretLabel}>
                  <KeyRound size={13} />
                  Chave manual (caso não consiga escanear):
                </div>
                <code className={styles.secretCode}>{secret}</code>
              </div>
            )}

            {/* Regerar */}
            <button
              className={`btn btn-ghost ${styles.regenBtn}`}
              onClick={generateSecret}
              id="btn-regen-qr"
            >
              <RefreshCw size={14} />
              Gerar novo QR Code
            </button>
          </div>
        )}
      </section>

      {/* ---- Passo 2: Confirmar código ---- */}
      <section className={`card ${styles.step} ${!qrCodeUrl ? styles.stepDisabled : ''}`}>
        <div className={styles.stepHeader}>
          <div className={styles.stepNumber}>2</div>
          <div>
            <h2 className={styles.stepTitle}>Confirme o código</h2>
            <p className={styles.stepDesc}>
              Abra o Google Authenticator, encontre "MiniCRM" e insira o código
              de 6 dígitos exibido para ativar a proteção.
            </p>
          </div>
        </div>

        {success ? (
          <div className={styles.successMsg} role="alert" id="mfa-success-msg">
            <CheckCircle2 size={20} />
            <div>
              <strong>MFA Ativado com sucesso!</strong>
              <p>Sua conta agora está protegida com autenticação em dois fatores.</p>
            </div>
          </div>
        ) : (
          <div className={styles.activateForm}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000 000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`input ${styles.codeInput} ${error ? 'input-error' : ''}`}
                maxLength={6}
                disabled={!qrCodeUrl || activating}
                id="mfa-setup-code-input"
              />
            </div>

            {error && (
              <div className={styles.errorMsg} role="alert" id="mfa-setup-error">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={activateMfa}
              disabled={!qrCodeUrl || activating || code.length !== 6}
              id="btn-activate-mfa"
            >
              {activating ? (
                <>
                  <Spinner size="sm" />
                  Ativando...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Ativar proteção MFA
                </>
              )}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
