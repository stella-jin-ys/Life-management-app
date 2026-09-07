import { Menu, SunMedium, X } from 'lucide-react'

export default function MobileHeader({ open, onToggle }) {
  return (
    <header className="mobile-header">
      <div className="mobile-wordmark">
        <span className="daylight-mark" aria-hidden="true"><SunMedium size={28} strokeWidth={1.7} /></span>
        <span className="mobile-greeting"><strong>Good morning, Stella</strong><small>Monday, 31 August</small></span>
      </div>
      <button className="menu-trigger" type="button"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open} onClick={onToggle}>
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
    </header>
  )
}
