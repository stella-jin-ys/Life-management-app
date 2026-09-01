import { useState } from 'react'

import AppShell from './components/AppShell.jsx'
import GoalsPanel from './components/GoalsPanel.jsx'
import HealthPanel from './components/HealthPanel.jsx'
import HighlightsPanel from './components/HighlightsPanel.jsx'
import LowBatteryPanel from './components/LowBatteryPanel.jsx'
import MoodCheckIn from './components/MoodCheckIn.jsx'
import { feelings, moods } from './data/demoData.js'
import useDashboardData from './features/dashboard/useDashboardData.js'

export default function App({ user, profile, onSignOut }) {
  const [activeSection, setActiveSection] = useState('dashboard')
  const { selectedMood, selectedFeeling, highlights, metrics, goal, signal, loading, error,
    selectMood, selectFeeling, addHighlight, updateMetric, toggleMilestone } = useDashboardData(user, profile)
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: profile?.timezone || undefined,
  }).format(new Date())

  function navigateTo(section) {
    setActiveSection(section)
    document.getElementById(section)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  return (
    <AppShell activeSection={activeSection} onNavigate={navigateTo} user={user} profile={profile} onSignOut={onSignOut}>
      <div className="dashboard-intro">
        <div className="welcome-copy">
          <p className="date-line">{dateLabel}</p>
          <h1>Good morning, {profile?.display_name || 'Stella'}</h1>
          <p className="welcome-note">
            Let’s notice what’s here, celebrate what helped, and choose one
            gentle next step.
          </p>
        </div>
        <div className="daylight-mark" aria-hidden="true"><span /></div>
      </div>
      {error && <p className="data-error" role="alert">{error}</p>}
      {loading && <p className="data-loading" role="status">Gathering your latest notes…</p>}
      <MoodCheckIn moods={moods} selectedMood={selectedMood} onSelect={selectMood} />
      <div className="dashboard-grid">
        <HighlightsPanel highlights={highlights} onAddHighlight={addHighlight} />
        <LowBatteryPanel feelings={feelings} selectedFeeling={selectedFeeling}
          signal={signal} onSelectFeeling={selectFeeling} />
        <HealthPanel metrics={metrics} onAdjustMetric={updateMetric} />
        <GoalsPanel goal={goal} onToggleMilestone={toggleMilestone} />
      </div>
    </AppShell>
  )
}
