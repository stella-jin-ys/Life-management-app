import { useState } from 'react'

import MobileHeader from './MobileHeader.jsx'
import Sidebar from './Sidebar.jsx'
import SettingsPage from '../features/settings/SettingsPage.jsx'
import { Apple, Home, Sparkles, Target } from 'lucide-react'

export default function AppShell({ activeSection, onNavigate, children, user, profile, onSignOut, dateLabel }) {
  const [menuOpen, setMenuOpen] = useState(false)

  function navigate(section) {
    onNavigate(section)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onNavigate={navigate} user={user} profile={profile} onSignOut={onSignOut} />
      <MobileHeader open={menuOpen} onToggle={() => setMenuOpen((open) => !open)}
        displayName={profile?.display_name || 'Stella'} dateLabel={dateLabel} />
      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-label="Navigation menu">
          <button className="menu-scrim" type="button" aria-label="Close navigation"
            onClick={() => setMenuOpen(false)} />
            <Sidebar activeSection={activeSection} onNavigate={navigate} user={user} profile={profile} onSignOut={onSignOut} mobile />
        </div>
      )}
      <main className="dashboard" id="dashboard">
        {activeSection === 'settings' && user ? <SettingsPage /> : children}
      </main>
      <nav className="mobile-bottom-nav" aria-label="Mobile shortcuts">
        <button type="button" aria-label="Home" aria-current={activeSection === 'dashboard' ? 'page' : undefined} onClick={() => navigate('dashboard')}><Home size={17} /><span>Home</span></button>
        <button type="button" aria-label="Highlights" aria-current={activeSection === 'highlights' ? 'page' : undefined} onClick={() => navigate('highlights')}><Sparkles size={17} /><span>Highlights</span></button>
        <button type="button" aria-label="Diet" aria-current={activeSection === 'health' ? 'page' : undefined} onClick={() => navigate('health')}><Apple size={17} /><span>Diet</span></button>
        <button type="button" aria-label="Goals" aria-current={activeSection === 'goals' ? 'page' : undefined} onClick={() => navigate('goals')}><Target size={17} /><span>Goals</span></button>
      </nav>
    </div>
  )
}
