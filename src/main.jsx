import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import App from './App.jsx'
import AppShell from './components/AppShell.jsx'
import AuthPage from './features/auth/AuthPage.jsx'
import { AuthProvider, useAuth } from './features/auth/AuthProvider.jsx'
import { ProtectedRoute, PublicOnlyRoute } from './features/auth/ProtectedRoute.jsx'
import ResetPasswordPage from './features/auth/ResetPasswordPage.jsx'
import DemoRoutes from './features/modules/DemoRoutes.jsx'
import ModulePage from './features/modules/ModulePage.jsx'
import './styles.css'

function AuthenticatedApp() {
  const { user, profile, signOut } = useAuth()
  return <App user={user} profile={profile} onSignOut={signOut} />
}

const moduleRoutes = new Set(['tasks', 'study', 'workout', 'sleeping', 'diary', 'finance'])

function useShellNavigation() {
  const navigate = useNavigate()
  return (section) => {
    if (moduleRoutes.has(section)) navigate(`/${section}`)
    else if (section === 'settings') navigate('/settings')
    else navigate('/')
  }
}

function ModuleRoute({ module }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useShellNavigation()
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: profile?.timezone || undefined,
  }).format(new Date())
  return <AppShell activeSection={module} onNavigate={navigate} user={user} profile={profile}
    onSignOut={signOut} dateLabel={dateLabel}><ModulePage module={module} user={user} profile={profile} /></AppShell>
}

function SettingsRoute() {
  const { user, profile, signOut } = useAuth()
  const navigate = useShellNavigation()
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: profile?.timezone || undefined,
  }).format(new Date())
  return <AppShell activeSection="settings" onNavigate={navigate} user={user} profile={profile}
    onSignOut={signOut} dateLabel={dateLabel} />
}

function AppRoutes() {
  return (
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
          <Route path="/tasks" element={<ModuleRoute module="tasks" />} />
          <Route path="/study" element={<ModuleRoute module="study" />} />
          <Route path="/workout" element={<ModuleRoute module="workout" />} />
          <Route path="/sleeping" element={<ModuleRoute module="sleeping" />} />
          <Route path="/diary" element={<ModuleRoute module="diary" />} />
          <Route path="/finance" element={<ModuleRoute module="finance" />} />
          <Route path="/settings" element={<SettingsRoute />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

const demoMode = import.meta.env.VITE_DEMO_MODE === 'true' || (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {demoMode ? <DemoRoutes /> : <AppRoutes />}
    </BrowserRouter>
  </React.StrictMode>,
)
