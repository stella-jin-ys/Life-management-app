import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import App from '../../App.jsx'
import AppShell from '../../components/AppShell.jsx'
import GoalsPage from '../goals/GoalsPage.jsx'
import HealthPage from '../health/HealthPage.jsx'
import HighlightsPage from '../highlights/HighlightsPage.jsx'
import ModulePage from './ModulePage.jsx'

const moduleRoutes = new Set(['tasks', 'study', 'workout', 'sleeping', 'diary', 'finance'])
const featureRoutes = new Set(['highlights', 'health', 'goals'])

function useDemoNavigation() {
  const navigate = useNavigate()
  return (section) => navigate(moduleRoutes.has(section) || featureRoutes.has(section) ? `/${section}` : '/')
}

function DemoFeatureRoute({ feature }) {
  const navigate = useDemoNavigation()
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())
  const Page = { highlights: HighlightsPage, health: HealthPage, goals: GoalsPage }[feature]
  return <AppShell activeSection={feature} onNavigate={navigate} dateLabel={dateLabel}>
    <Page />
  </AppShell>
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
      <Route path="/highlights" element={<DemoFeatureRoute feature="highlights" />} />
      <Route path="/health" element={<DemoFeatureRoute feature="health" />} />
      <Route path="/goals" element={<DemoFeatureRoute feature="goals" />} />
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
