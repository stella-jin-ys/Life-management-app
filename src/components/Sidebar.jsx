import {
  Apple,
  ChevronRight,
  Flag,
  LayoutDashboard,
  ListTodo,
  Moon,
  NotebookPen,
  Settings,
  WalletCards,
  Dumbbell,
  BookOpen,
  Sparkles,
  SunMedium,
} from 'lucide-react'

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'highlights', label: 'Highlights', icon: Sparkles },
  { id: 'health', label: 'Diet', icon: Apple },
  { id: 'sleeping', label: 'Sleeping', icon: Moon },
  { id: 'diary', label: 'Diary', icon: NotebookPen },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'study', label: 'Study', icon: BookOpen },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'goals', label: 'Goals', icon: Flag },
  { id: 'finance', label: 'Finance', icon: WalletCards },
  { id: 'settings', label: 'Settings', icon: Settings, divider: true },
]

export default function Sidebar({ activeSection, onNavigate, mobile = false, user, profile, onSignOut }) {
  return (
    <aside className={mobile ? 'navigation-panel' : 'navigation-rail'}>
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true"><SunMedium size={28} strokeWidth={1.7} /></span>
        <span><strong>Life</strong><small>management</small></span>
      </div>

      <nav aria-label={mobile ? 'Mobile navigation' : 'Dashboard'}>
        <div className="nav-group">
          {navigationItems.map(({ id, label, icon: Icon, divider }) => (
            <button className={`navigation-link${divider ? ' navigation-divider' : ''}`} type="button" key={label}
              aria-current={activeSection === id ? 'page' : undefined}
              onClick={() => id && onNavigate(id)}>
              <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
              <span>{label}</span>
              <ChevronRight className="nav-arrow" aria-hidden="true" size={15} />
            </button>
          ))}
        </div>
      </nav>

      <div className="rail-note">
        <span className="rail-note-dot" aria-hidden="true" />
        <p><strong>Small steps count.</strong>You have already begun.</p>
      </div>
      {user && <div className="account-footer"><div><strong>{profile?.display_name || 'Friend'}</strong><small>{user.email}</small></div><button type="button" onClick={onSignOut}>Sign out</button></div>}
    </aside>
  )
}
