import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import AppShell from './components/AppShell.jsx'
import GoalsPanel from './components/GoalsPanel.jsx'
import HealthPanel from './components/HealthPanel.jsx'
import HighlightsPanel from './components/HighlightsPanel.jsx'
import LowBatteryPanel from './components/LowBatteryPanel.jsx'
import MoodCheckIn from './components/MoodCheckIn.jsx'
import SupportingTiles from './components/SupportingTiles.jsx'
import { SunMedium } from 'lucide-react'
import { feelings, moods } from './data/demoData.js'
import useDashboardData from './features/dashboard/useDashboardData.js'

export default function App({ user, profile, onSignOut }) {
  const [activeSection, setActiveSection] = useState('dashboard')
  const navigate = useNavigate()
  const { selectedMood, selectedFeeling, highlights, metrics, goal, signal, supporting, loading, error,
    meals, mealFeedback, selectMood, selectFeeling, addHighlight, updateMetric, toggleMilestone, toggleTask } = useDashboardData(user, profile)
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: profile?.timezone || undefined,
  }).format(new Date())

  function navigateTo(section) {
    if (['highlights', 'health', 'goals', 'tasks', 'study', 'workout', 'sleeping', 'diary', 'finance'].includes(section)) {
      setActiveSection(section)
      navigate(`/${section}`)
      return
    }
    if (section === 'settings') {
      setActiveSection(section)
      navigate('/settings')
      return
    }
    setActiveSection(section)
    document.getElementById(section)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  return (
    <AppShell activeSection={activeSection} onNavigate={navigateTo} user={user} profile={profile}
      onSignOut={onSignOut} dateLabel={dateLabel}>
      <div className="dashboard-intro">
        <div className="daylight-mark" aria-hidden="true"><SunMedium size={28} strokeWidth={1.7} /></div>
        <div className="welcome-copy">
          <h1>Good morning, {profile?.display_name || 'Stella'}</h1>
          <p className="date-line">{dateLabel}</p>
          <p className="welcome-note">
            Let’s notice what’s here, celebrate what helped, and choose one
            gentle next step.
          </p>
        </div>
      </div>
      {error && <p className="data-error" role="alert">{error}</p>}
      {loading && <p className="data-loading" role="status">Gathering your latest notes…</p>}
      <MoodCheckIn moods={moods} selectedMood={selectedMood} onSelect={selectMood} />
      <div className="dashboard-grid">
        <HighlightsPanel highlights={highlights} onAddHighlight={addHighlight} onOpenPage={navigateTo} isDemo={!user} />
        <LowBatteryPanel feelings={feelings} selectedFeeling={selectedFeeling}
          signal={signal} onSelectFeeling={selectFeeling} />
        <HealthPanel metrics={metrics} meals={meals} mealFeedback={mealFeedback} onAdjustMetric={updateMetric} onOpenPage={navigateTo} />
        <GoalsPanel goal={goal} onToggleMilestone={toggleMilestone} onOpenPage={navigateTo} />
        <SupportingTiles summaries={supporting} onToggleTask={toggleTask} onOpenPage={navigateTo} />
      </div>
    </AppShell>
  )
}
