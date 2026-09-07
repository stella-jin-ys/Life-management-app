import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import App from './App.jsx'
import AuthPage from './features/auth/AuthPage.jsx'
import { AuthProvider, useAuth } from './features/auth/AuthProvider.jsx'
import { ProtectedRoute, PublicOnlyRoute } from './features/auth/ProtectedRoute.jsx'
import ResetPasswordPage from './features/auth/ResetPasswordPage.jsx'
import './styles.css'

function AuthenticatedApp() {
  const { user, profile, signOut } = useAuth()
  return <App user={user} profile={profile} onSignOut={signOut} />
}

function AuthenticatedRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
            <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
          </Route>
          <Route element={<PublicOnlyRoute allowPasswordRecovery />}>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AuthenticatedApp />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true' || (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {demoMode ? <App /> : <AuthenticatedRoutes />}
  </React.StrictMode>,
)
