import { Menu, SunMedium, X } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function MobileHeader({ open, onToggle, displayName = 'Stella', dateLabel = 'Monday, 31 August' }) {
  return (
    <header className="mobile-header">
      <Link className="mobile-wordmark" to="/" aria-label="Dashboard home">
        <span className="daylight-mark" aria-hidden="true"><SunMedium size={28} strokeWidth={1.7} /></span>
        <span className="mobile-greeting"><strong>Good morning, {displayName}</strong><small>{dateLabel}</small></span>
      </Link>
      <button className="menu-trigger" type="button"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open} onClick={onToggle}>
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
    </header>
  )
}
