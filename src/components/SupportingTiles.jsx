import { BookOpen, CheckCircle2, Dumbbell, Moon } from 'lucide-react'

function Tile({ id, title, icon: Icon, children, className = '' }) {
  return (
    <section className={`panel support-tile ${className}`} id={id}
      aria-labelledby={`${title.toLowerCase()}-tile-title`}>
      <div className="support-heading">
        <span className="support-icon"><Icon aria-hidden="true" size={15} /></span>
        <h2 id={`${title.toLowerCase()}-tile-title`}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ''}` : `${remainder}m`
}

function WorkoutChart({ days }) {
  const max = Math.max(...days, 1)
  return (
    <div className="workout-bars" role="img" aria-label="Workout minutes across seven days">
      {days.map((minutes, index) => <span key={index} style={{ '--bar-height': `${minutes ? Math.max(5, Math.round(minutes / max * 35)) : 2}px` }} />)}
    </div>
  )
}

function SleepChart({ days }) {
  const max = Math.max(...days, 1)
  const points = days.map((minutes, index) => `${15 + index * 42} ${32 - Math.round(minutes / max * 22)}`).join(' L')
  return (
    <svg className="sleep-line" viewBox="0 0 280 42" role="img" aria-label="Sleep trend">
      <line x1="8" y1="21" x2="272" y2="21" />
      <path d={`M${points}`} />
      {days.map((minutes, index) => <circle className={index === days.length - 1 ? 'sleep-today' : undefined}
        key={index} cx={15 + index * 42} cy={32 - Math.round(minutes / max * 22)} r={index === days.length - 1 ? 4 : 3} />)}
    </svg>
  )
}

export default function SupportingTiles({ summaries = {} }) {
  const { tasks, study, workout, sleep } = summaries
  return (
    <>
      <Tile id="tasks" title="Tasks" icon={CheckCircle2} className="tasks-tile">
        {tasks ? <>
          <span className="support-copy">{tasks.complete} of {tasks.total} done</span>
          <span className="mini-progress"><span style={{ transform: `scaleX(${tasks.complete / tasks.total})` }} /></span>
        </> : <span className="support-empty">No tasks yet</span>}
      </Tile>
      <Tile id="study" title="Study" icon={BookOpen} className="study-tile">
        {study ? <>
          <strong className="support-value">{study.topic}</strong>
          <span className="support-note">Logged today</span>
        </> : <span className="support-empty">No study logged today</span>}
      </Tile>
      <Tile id="workout" title="Workout" icon={Dumbbell} className="workout-tile">
        {workout ? <>
          <WorkoutChart days={workout.days} />
          <span className="support-note">{workout.todayMinutes ? `${workout.todayMinutes} min today` : 'No workout today'}</span>
        </> : <span className="support-empty">No workouts logged yet</span>}
      </Tile>
      <Tile id="sleeping" title="Sleeping" icon={Moon} className="sleeping-tile">
        {sleep ? <>
          <div className="sleep-summary"><strong>{sleep.todayMinutes ? formatMinutes(sleep.todayMinutes) : 'No sleep today'}</strong><span>avg {formatMinutes(sleep.averageMinutes)}</span></div>
          <SleepChart days={sleep.days} />
        </> : <span className="support-empty">No sleep logged yet</span>}
      </Tile>
    </>
  )
}
