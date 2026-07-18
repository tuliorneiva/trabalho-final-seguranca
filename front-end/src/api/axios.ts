// =============================================================================
// API — AXIOS INSTANCE
// Princípio S: única responsabilidade — configuração HTTP base.
// Princípio D: componentes e hooks dependem desta abstração, não do fetch diretamente.
// =============================================================================

import axios from 'axios'

// A URL base é configurada via variável de ambiente.
// Em dev: define VITE_API_URL no .env.local
// Em produção (Vercel): defina nas Environment Variables do projeto.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ---- Request Interceptor ----
// Injeta automaticamente o Bearer token em todas as requisições.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crm_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ---- Response Interceptor ----
// Tratamento centralizado de erros HTTP.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Repassa o erro para o chamador tratar (hooks cuidam da lógica de MFA)
    return Promise.reject(error)
  }
)

export default apiClient
