// =============================================================================
// LAYOUT — DASHBOARD LAYOUT
// Estrutura principal: Sidebar fixa + área de conteúdo scrollável.
// =============================================================================

import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import styles from './DashboardLayout.module.css'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <main className={styles.content} id="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
