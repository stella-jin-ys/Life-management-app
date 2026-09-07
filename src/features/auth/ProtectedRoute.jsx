import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from './AuthProvider.jsx'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) return <div className="route-loading" role="status">Making a little room for you…</div>
  return session ? <Outlet /> : <Navigate to="/login" replace />
}

export function PublicOnlyRoute({ allowPasswordRecovery = false }) {
  const { session, loading, isPasswordRecovery } = useAuth()
  if (loading) return <div className="route-loading" role="status">Getting things ready…</div>
  return session && !(allowPasswordRecovery && isPasswordRecovery) ? <Navigate to="/" replace /> : <Outlet />
}
