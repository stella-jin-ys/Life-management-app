import { Navigate, Outlet } from 'react-router-dom'

import { useAuth } from './AuthProvider.jsx'

export function ProtectedRoute() {
  const { session, loading } = useAuth()
  if (loading) return <div className="route-loading" role="status">Making a little room for you…</div>
  return session ? <Outlet /> : <Navigate to="/login" replace />
}

export function PublicOnlyRoute() {
  const { session, loading } = useAuth()
  if (loading) return <div className="route-loading" role="status">Getting things ready…</div>
  return session ? <Navigate to="/" replace /> : <Outlet />
}
