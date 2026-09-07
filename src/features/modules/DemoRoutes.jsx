import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import App from '../../App.jsx'
import AppShell from '../../components/AppShell.jsx'
import ModulePage from './ModulePage.jsx'

const moduleRoutes = new Set(['tasks', 'study', 'workout', 'sleeping', 'diary', 'finance'])

function useDemoNavigation() {
  const navigate = useNavigate()
  return (section) => navigate(moduleRoutes.has(section) ? `/${section}` : '/')
}

function DemoModuleRoute({ module }) {
  const navigate = useDemoNavigation()
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())
  return <AppShell activeSection={module} onNavigate={navigate} dateLabel={dateLabel}>
    <ModulePage module={module} />
  </AppShell>
}

export default function DemoRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/tasks" element={<DemoModuleRoute module="tasks" />} />
      <Route path="/study" element={<DemoModuleRoute module="study" />} />
      <Route path="/workout" element={<DemoModuleRoute module="workout" />} />
      <Route path="/sleeping" element={<DemoModuleRoute module="sleeping" />} />
      <Route path="/diary" element={<DemoModuleRoute module="diary" />} />
      <Route path="/finance" element={<DemoModuleRoute module="finance" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
