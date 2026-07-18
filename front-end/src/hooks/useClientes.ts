// =============================================================================
// HOOK — useClientes
// Princípio S: toda lógica de negócio de clientes fica aqui, fora dos componentes.
// Princípio D: depende das abstrações de api/ e de context, não de implementações.
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import { getClientes, deleteCliente } from '../api/clientesApi'
import { useMfaContext } from '../contexts/MfaContext'
import type { Cliente, ApiErrorResponse } from '../types'

interface UseClientesReturn {
  clientes: Cliente[]
  loading: boolean
  error: string | null
  deletingId: string | number | null
  deleteError: string | null
  handleDelete: (id: string | number) => Promise<void>
  clearDeleteError: () => void
}

export function useClientes(): UseClientesReturn {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { requestStepUp } = useMfaContext()

  // ---- Carrega a lista de clientes ----
  const fetchClientes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getClientes()
      setClientes(data)
    } catch {
      setError('Não foi possível carregar os clientes. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  // ---- Fluxo de exclusão com Step-up ----
  const handleDelete = useCallback(
    async (id: string | number) => {
      setDeleteError(null)

      let mfaCode: string
      try {
        // 1. Pausa o fluxo e abre o modal de Step-up
        mfaCode = await requestStepUp({
          title: 'Confirmar Exclusão',
          description:
            'Esta é uma ação irreversível. Insira o código do seu Google Authenticator para confirmar.',
        })
      } catch {
        // Usuário cancelou o modal — nenhuma ação necessária
        return
      }

      // 2. Executa a exclusão com o código MFA
      setDeletingId(id)
      try {
        await deleteCliente(id, mfaCode)
        // 3. Atualiza a lista reativamente (sem re-fetch)
        setClientes((prev) => prev.filter((c) => c.id !== id))
      } catch (err: unknown) {
        // Trata erros de MFA retornados pelo backend
        const axiosErr = err as { response?: { data?: ApiErrorResponse } }
        const message =
          axiosErr?.response?.data?.message ??
          'Erro ao excluir o cliente. Tente novamente.'
        setDeleteError(message)
      } finally {
        setDeletingId(null)
      }
    },
    [requestStepUp]
  )

  const clearDeleteError = useCallback(() => setDeleteError(null), [])

  return {
    clientes,
    loading,
    error,
    deletingId,
    deleteError,
    handleDelete,
    clearDeleteError,
  }
}
