// =============================================================================
// LAYOUT — SIDEBAR
// Navegação lateral fixa com links e identidade visual da aplicação.
// =============================================================================

import { NavLink } from 'react-router-dom'
import { Users, ShieldCheck, LayoutDashboard, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Sidebar.module.css'

const navItems = [
  {
    to: '/',
    icon: <LayoutDashboard size={18} />,
    label: 'Dashboard',
    id: 'nav-dashboard',
    end: true,
  },
  {
    to: '/clientes',
    icon: <Users size={18} />,
    label: 'Clientes',
    id: 'nav-clientes',
  },
  {
    to: '/mfa-setup',
    icon: <ShieldCheck size={18} />,
    label: 'Segurança MFA',
    id: 'nav-mfa',
  },
]

export function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <ShieldCheck size={20} />
        </div>
        <div>
          <span className={styles.logoName}>Mini CRM</span>
          <span className={styles.logoTag}>Secure Edition</span>
        </div>
      </div>

      {/* Navegação */}
      <nav className={styles.nav} aria-label="Navegação principal">
        <ul>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                id={item.id}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Rodapé com usuário */}
      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {user?.nome?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{user?.nome ?? 'Usuário'}</span>
            <span className={styles.userEmail}>{user?.email ?? ''}</span>
          </div>
        </div>
        <button
          className={styles.logoutBtn}
          onClick={logout}
          title="Sair"
          id="btn-logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
