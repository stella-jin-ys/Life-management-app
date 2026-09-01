import { Menu, X } from 'lucide-react'

export default function MobileHeader({ open, onToggle }) {
  return (
    <header className="mobile-header">
      <div className="mobile-wordmark">
        <span className="brand-mark" aria-hidden="true"><span /><span /></span>
        <strong>Life Management</strong>
      </div>
      <button className="menu-trigger" type="button"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open} onClick={onToggle}>
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>
    </header>
  )
}
