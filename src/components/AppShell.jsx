import { useState } from 'react'

import MobileHeader from './MobileHeader.jsx'
import Sidebar from './Sidebar.jsx'

export default function AppShell({ activeSection, onNavigate, children, user, profile, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false)

  function navigate(section) {
    onNavigate(section)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onNavigate={navigate} user={user} profile={profile} onSignOut={onSignOut} />
      <MobileHeader open={menuOpen} onToggle={() => setMenuOpen((open) => !open)} />
      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-label="Navigation menu">
          <button className="menu-scrim" type="button" aria-label="Close navigation"
            onClick={() => setMenuOpen(false)} />
            <Sidebar activeSection={activeSection} onNavigate={navigate} user={user} profile={profile} onSignOut={onSignOut} mobile />
        </div>
      )}
      <main className="dashboard" id="dashboard">{children}</main>
    </div>
  )
}
