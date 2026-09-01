import {
  Apple,
  BatteryLow,
  BookHeart,
  ChevronRight,
  Compass,
  Flag,
  HeartHandshake,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Moon,
  NotebookPen,
  Settings,
  WalletCards,
  Dumbbell,
  BookOpen,
  Sparkles,
} from 'lucide-react'

const primaryItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'highlights', label: 'Highlights', icon: Sparkles },
  { id: 'battery', label: 'Low Battery', icon: BatteryLow },
  { id: 'health', label: 'Diet & Health', icon: Apple },
  { id: 'goals', label: 'Goals', icon: Flag },
]

const upcomingItems = [
  { label: 'Weekly Reflection', icon: BookHeart },
  { label: 'Mood Trends', icon: LineChart },
  { label: 'Self-care Library', icon: Compass },
  { label: 'Community Comfort', icon: HeartHandshake },
  { label: 'Tasks', icon: ListTodo },
  { label: 'Finance', icon: WalletCards },
  { label: 'Study', icon: BookOpen },
  { label: 'Workout', icon: Dumbbell },
  { label: 'Sleeping', icon: Moon },
  { label: 'Diary', icon: NotebookPen },
  { label: 'Settings', icon: Settings },
]

export default function Sidebar({ activeSection, onNavigate, mobile = false, user, profile, onSignOut }) {
  return (
    <aside className={mobile ? 'navigation-panel' : 'navigation-rail'}>
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true"><span /><span /></span>
        <span><strong>Life</strong><small>management</small></span>
      </div>

      <nav aria-label={mobile ? 'Mobile navigation' : 'Dashboard'}>
        <div className="nav-group">
          {primaryItems.map(({ id, label, icon: Icon }) => (
            <button className="navigation-link" type="button" key={id}
              aria-current={activeSection === id ? 'page' : undefined}
              onClick={() => onNavigate(id)}>
              <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
              <span>{label}</span>
              <ChevronRight className="nav-arrow" aria-hidden="true" size={15} />
            </button>
          ))}
        </div>

        <div className="upcoming-group">
          <p className="nav-caption">A little further ahead</p>
          {upcomingItems.map(({ label, icon: Icon }) => (
            <button className="upcoming-link" type="button" key={label} disabled>
              <Icon aria-hidden="true" size={17} strokeWidth={1.7} />
              <span>{label}</span>
              <small>Coming soon</small>
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
