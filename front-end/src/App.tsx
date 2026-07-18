// =============================================================================
// APP — Roteamento principal e composição de Providers
//
// Hierarquia de Providers (de fora para dentro):
//   ToastProvider          → notificações globais
//     AuthProvider         → token JWT e usuário
//       MfaProvider        → fluxo de step-up (Promise resolver)
//         Router           → navegação
//           StepUpModal    → montado UMA vez, globalmente
//           Routes         → páginas
// =============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { MfaProvider } from './contexts/MfaContext'
import { ToastProvider } from './components/ui/Toast'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { StepUpModal } from './components/mfa/StepUpModal'
import { DashboardPage } from './pages/DashboardPage'
import { ClientesPage } from './pages/ClientesPage'
import { MfaSetupPage } from './pages/MfaSetupPage'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MfaProvider>
          <BrowserRouter>
            {/*
              StepUpModal fica FORA das rotas mas DENTRO do MfaProvider.
              Isso garante que ele pode ser aberto de qualquer página sem
              re-montar ao trocar de rota.
            */}
            <StepUpModal />

            <DashboardLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/mfa-setup" element={<MfaSetupPage />} />
                {/* Redireciona qualquer rota desconhecida para home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </DashboardLayout>
          </BrowserRouter>
        </MfaProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
