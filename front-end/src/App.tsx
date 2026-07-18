import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { MfaProvider } from './contexts/MfaContext'
import { ToastProvider } from './components/ui/Toast'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { StepUpModal } from './components/mfa/StepUpModal'
import { ProtectedRoute } from './components/routing/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { ClientesPage } from './pages/ClientesPage'
import { MfaSetupPage } from './pages/MfaSetupPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MfaProvider>
          <BrowserRouter>
            <StepUpModal />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/clientes" element={<ClientesPage />} />
                        <Route path="/mfa-setup" element={<MfaSetupPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </MfaProvider>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
