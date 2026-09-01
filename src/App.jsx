import { useState } from 'react'

import AppShell from './components/AppShell.jsx'
import GoalsPanel from './components/GoalsPanel.jsx'
import HealthPanel from './components/HealthPanel.jsx'
import HighlightsPanel from './components/HighlightsPanel.jsx'
import LowBatteryPanel from './components/LowBatteryPanel.jsx'
import MoodCheckIn from './components/MoodCheckIn.jsx'
import {
  feelings,
  healthMetrics,
  initialGoal,
  initialHighlights,
  moods,
} from './data/demoData.js'
import { createCompliment } from './lib/dashboard.js'

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [selectedMood, setSelectedMood] = useState('steady')
  const [selectedFeeling, setSelectedFeeling] = useState('drained')
  const [highlights, setHighlights] = useState(initialHighlights)
  const [goal, setGoal] = useState(initialGoal)

  function addHighlight(entry) {
    setHighlights((current) => [
      { id: current.length + 1, entry, compliment: createCompliment(entry), time: 'Now' },
      ...current,
    ])
  }

  function toggleMilestone(id) {
    setGoal((current) => ({
      ...current,
      milestones: current.milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, complete: !milestone.complete } : milestone,
      ),
    }))
  }

  function navigateTo(section) {
    setActiveSection(section)
    document.getElementById(section)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  return (
    <AppShell activeSection={activeSection} onNavigate={navigateTo}>
      <div className="dashboard-intro">
        <div className="welcome-copy">
          <p className="date-line">Monday, 31 August</p>
          <h1>Good morning, Stella</h1>
          <p className="welcome-note">
            Let’s notice what’s here, celebrate what helped, and choose one
            gentle next step.
          </p>
        </div>
        <div className="daylight-mark" aria-hidden="true"><span /></div>
      </div>
      <MoodCheckIn moods={moods} selectedMood={selectedMood} onSelect={setSelectedMood} />
      <div className="dashboard-grid">
        <HighlightsPanel highlights={highlights} onAddHighlight={addHighlight} />
        <LowBatteryPanel feelings={feelings} selectedFeeling={selectedFeeling}
          onSelectFeeling={setSelectedFeeling} />
        <HealthPanel metrics={healthMetrics} />
        <GoalsPanel goal={goal} onToggleMilestone={toggleMilestone} />
      </div>
    </AppShell>
  )
}
