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

export default function SupportingTiles() {
  return (
    <>
      <Tile id="tasks" title="Tasks" icon={CheckCircle2} className="tasks-tile">
        <span className="support-copy">3 of 5 done</span>
        <span className="mini-progress"><span /></span>
      </Tile>
      <Tile id="study" title="Study" icon={BookOpen} className="study-tile">
        <strong className="support-value">UI design</strong>
        <span className="support-note">Logged today</span>
      </Tile>
      <Tile id="workout" title="Workout" icon={Dumbbell} className="workout-tile">
        <div className="workout-bars" role="img" aria-label="Workout hours across seven days">
          {[2, 1, 4, 2, 1, 4, 5].map((height, index) => <span key={index} style={{ '--bar-height': `${height * 7}px` }} />)}
        </div>
        <span className="support-note">30 min today</span>
      </Tile>
      <Tile id="sleeping" title="Sleeping" icon={Moon} className="sleeping-tile">
        <div className="sleep-summary"><strong>7h 20m</strong><span>avg 7h</span></div>
        <svg className="sleep-line" viewBox="0 0 280 42" role="img" aria-label="Sleep trend">
          <line x1="8" y1="21" x2="272" y2="21" />
          <path d="M15 24 L58 21 L100 29 L142 16 L184 19 L226 27 L268 20" />
          <circle cx="15" cy="24" r="3" /><circle cx="58" cy="21" r="3" /><circle cx="100" cy="29" r="3" />
          <circle cx="142" cy="16" r="3" /><circle cx="184" cy="19" r="3" /><circle cx="226" cy="27" r="3" />
          <circle className="sleep-today" cx="268" cy="20" r="4" />
        </svg>
      </Tile>
    </>
  )
}
