// =============================================================================
// PAGE — DASHBOARD
// Página inicial com visão geral e cards de acesso rápido.
// =============================================================================

import { Link } from 'react-router-dom'
import {
  Users,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Lock,
} from 'lucide-react'
import styles from './DashboardPage.module.css'

export function DashboardPage() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroBadge}>
          <ShieldCheck size={14} />
          Step-up Authentication Ativo
        </div>
        <h1 className={styles.heroTitle}>
          Bem-vindo ao <span className={styles.highlight}>Mini CRM</span>
        </h1>
        <p className={styles.heroDesc}>
          Gerencie seus clientes com a segurança de autenticação em múltiplos
          fatores. Ações críticas são protegidas por MFA Step-up automático.
        </p>
      </div>

      {/* Quick access cards */}
      <div className={styles.cardsGrid}>
        <Link to="/clientes" className={`card ${styles.actionCard}`} id="card-clientes">
          <div className={styles.cardIcon}>
            <Users size={24} />
          </div>
          <div className={styles.cardContent}>
            <h3>Gestão de Clientes</h3>
            <p>
              Visualize, gerencie e exclua clientes. A exclusão é protegida
              por MFA Step-up automático.
            </p>
          </div>
          <div className={styles.cardArrow}>
            <ArrowRight size={18} />
          </div>
        </Link>

        <Link to="/mfa-setup" className={`card ${styles.actionCard}`} id="card-mfa-setup">
          <div className={`${styles.cardIcon} ${styles.iconShield}`}>
            <Lock size={24} />
          </div>
          <div className={styles.cardContent}>
            <h3>Configurar MFA</h3>
            <p>
              Configure o Google Authenticator para proteger sua conta com
              autenticação em dois fatores.
            </p>
          </div>
          <div className={styles.cardArrow}>
            <ArrowRight size={18} />
          </div>
        </Link>
      </div>

      {/* Info section */}
      <div className={`card ${styles.infoSection}`}>
        <div className={styles.infoIcon}>
          <TrendingUp size={20} />
        </div>
        <div>
          <h3>Como funciona o Step-up MFA?</h3>
          <p>
            Quando você clica em "Excluir" um cliente, a ação é interceptada
            automaticamente. Um modal de verificação aparece solicitando seu
            código TOTP do Google Authenticator. Apenas após validação, a ação
            prossegue — garantindo que apenas o usuário legítimo possa executar
            operações destrutivas.
          </p>
        </div>
      </div>
    </div>
  )
}
