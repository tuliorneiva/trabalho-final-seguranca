// =============================================================================
// PAGE — CLIENTES
// Tabela reativa de clientes com fluxo de exclusão Step-up MFA.
// Componente "smart": orquestra hooks e UI components.
// =============================================================================

import { useEffect } from 'react'
import {
  Users,
  Trash2,
  RefreshCw,
  AlertTriangle,
  UserCheck,
} from 'lucide-react'
import { Spinner } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'
import { useClientes } from '../hooks/useClientes'
import { useToast } from '../components/ui/Toast'
import styles from './ClientesPage.module.css'

export function ClientesPage() {
  const {
    clientes,
    loading,
    error,
    deletingId,
    deleteError,
    handleDelete,
    clearDeleteError,
  } = useClientes()

  const { showToast } = useToast()

  // Exibe o erro de exclusão como toast e limpa o estado
  useEffect(() => {
    if (deleteError) {
      showToast(deleteError, 'error')
      clearDeleteError()
    }
  }, [deleteError, showToast, clearDeleteError])

  return (
    <div className={styles.page}>
      {/* Stats rápido */}
      <div className={styles.statsRow}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIcon}>
            <UserCheck size={20} />
          </div>
          <div>
            <p className={styles.statValue}>{clientes.length}</p>
            <p className={styles.statLabel}>Total de Clientes</p>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>
            <Users size={20} />
          </div>
          <div>
            <p className={styles.statValue}>
              {clientes.filter((c) => c.status === 'Ativo').length}
            </p>
            <p className={styles.statLabel}>Clientes Ativos</p>
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className={`${styles.statIcon} ${styles.iconYellow}`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className={styles.statValue}>
              {clientes.filter((c) => c.status === 'Pendente').length}
            </p>
            <p className={styles.statLabel}>Pendentes</p>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>
            <Users size={18} />
            Base de Clientes
          </h2>
          {loading && <Spinner size="sm" />}
        </div>

        {/* Estado: erro de carregamento */}
        {error && !loading && (
          <div className={styles.errorState} role="alert">
            <AlertTriangle size={32} />
            <p>{error}</p>
            <button
              className="btn btn-ghost"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={14} />
              Tentar novamente
            </button>
          </div>
        )}

        {/* Estado: carregando */}
        {loading && clientes.length === 0 && (
          <Spinner fullPage size="lg" />
        )}

        {/* Estado: lista vazia */}
        {!loading && !error && clientes.length === 0 && (
          <div className={styles.emptyState}>
            <Users size={48} strokeWidth={1} />
            <p>Nenhum cliente cadastrado.</p>
          </div>
        )}

        {/* Tabela de dados */}
        {clientes.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table} id="clientes-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th className={styles.thActions}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className={`${styles.row} ${deletingId === cliente.id ? styles.rowDeleting : ''}`}
                  >
                    <td>
                      <div className={styles.clienteCell}>
                        <div className={styles.clienteAvatar}>
                          {String(cliente.nome).charAt(0).toUpperCase()}
                        </div>
                        <span className={styles.clienteName}>{cliente.nome}</span>
                      </div>
                    </td>
                    <td className={styles.emailCell}>{cliente.email}</td>
                    <td>
                      <Badge status={cliente.status} />
                    </td>
                    <td className={styles.actionsCell}>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(cliente.id)}
                        disabled={!!deletingId}
                        id={`btn-delete-${cliente.id}`}
                        aria-label={`Excluir cliente ${cliente.nome}`}
                        title="Excluir cliente (requer MFA)"
                      >
                        {deletingId === cliente.id ? (
                          <Spinner size="sm" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
