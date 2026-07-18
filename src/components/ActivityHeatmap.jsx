/**
 * ActivityHeatmap.jsx — GitHub-style contribution heatmap on the design
 * system (glass-card context; lime intensity ramp, cyan today-ring).
 *
 * Reusable: Dashboard today, Stats later.
 *
 * Props:
 *   data — array of { date: 'yyyy-MM-dd', pts, habitsDone, habitsTotal }.
 *          Missing dates render as "No activity". Source is the caller's
 *          Supabase-backed pointsHistory/habits (AppContext) — this
 *          component is presentation-only and fetches nothing.
 *   days — window length ending today (default 35).
 *
 * Grid: columns = weeks (Monday-start), rows = Mon→Sun. The window's
 * start is snapped back to its Monday so every column is a full week;
 * leading out-of-window cells and future cells are invisible placeholders
 * (they keep the rectangle aligned without claiming "no activity" for
 * days we have no window over).
 */
import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { dateKey } from '../lib/storage'

const LIME = '#A3E635'
const CYAN = '#22D3EE'
const MONO = "'JetBrains Mono', ui-monospace, monospace"

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']
const CELL_CLS = 'w-3 h-3 sm:w-3.5 sm:h-3.5'   // 12px mobile / 14px desktop

/* Points → intensity level (0-4) */
function levelFor(pts) {
  if (pts >= 76) return 4
  if (pts >= 51) return 3
  if (pts >= 26) return 2
  if (pts >= 1) return 1
  return 0
}

function cellStyle(level, isToday) {
  const s = { borderRadius: 3 }
  if (level === 0) {
    s.background = 'rgba(255,255,255,0.04)'
    s.border = '1px solid var(--border-subtle)'
  } else if (level === 1) {
    s.background = 'rgba(163,230,53,0.25)'
  } else if (level === 2) {
    s.background = 'rgba(163,230,53,0.45)'
  } else if (level === 3) {
    s.background = 'rgba(163,230,53,0.70)'
  } else {
    s.background = LIME
    s.boxShadow = '0 0 6px rgba(163,230,53,0.55)'
  }
  if (isToday) {
    s.boxShadow = `0 0 0 1.5px ${CYAN}${level === 4 ? ', 0 0 6px rgba(163,230,53,0.55)' : ''}`
  }
  return s
}

const LEGEND_STYLES = [0, 1, 2, 3, 4].map(l => cellStyle(l, false))

function TooltipBox({ tip }) {
  if (!tip) return null
  return (
    <div style={{
      position: 'fixed',
      left: Math.min(tip.x + 10, window.innerWidth - 190),
      top: tip.y + 12,
      zIndex: 1000,
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8,
      padding: '0.4rem 0.65rem',
      fontSize: 11.5,
      fontWeight: 600,
      color: 'var(--text-primary)',
      boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    }}>
      {tip.text}
    </div>
  )
}

export default function ActivityHeatmap({ data = [], days = 35 }) {
  const [tip, setTip] = useState(null)

  const { weeks, activeDays, totalPts } = useMemo(() => {
    const byDate = new Map(data.map(d => [d.date, d]))

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const windowStart = new Date(today)
    windowStart.setDate(windowStart.getDate() - (days - 1))
    const gridStart = new Date(windowStart)
    gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7))  // snap to Monday

    const todayK = dateKey(today)
    const weeks = []
    let prevMonth = -1
    for (let ws = new Date(gridStart); ws <= today; ws.setDate(ws.getDate() + 7)) {
      const cells = []
      for (let r = 0; r < 7; r++) {
        const d = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + r)
        const key = dateKey(d)
        const entry = byDate.get(key)
        const pts = entry?.pts || 0
        const done = entry?.habitsDone || 0
        const total = entry?.habitsTotal || 0
        const hidden = d > today || d < windowStart
        const hasActivity = pts > 0 || done > 0
        cells.push({
          key,
          hidden,
          level: levelFor(pts),
          isToday: key === todayK,
          text: hasActivity
            ? `${format(d, 'MMM d')} · ${pts} pts · ${done}/${total} habits`
            : `${format(d, 'MMM d')} · No activity`,
        })
      }
      const m = ws.getMonth()
      weeks.push({ cells, monthLabel: m !== prevMonth ? format(ws, 'MMM') : null })
      prevMonth = m
    }

    return {
      weeks,
      activeDays: data.filter(d => (d.pts || 0) > 0 || (d.habitsDone || 0) > 0).length,
      totalPts: data.reduce((s, d) => s + (d.pts || 0), 0),
    }
  }, [data, days])

  const showTip = (cell, e) => {
    if (cell.hidden) return
    setTip(prev => (prev?.key === cell.key && e.type === 'click')
      ? null
      : { key: cell.key, text: cell.text, x: e.clientX, y: e.clientY })
  }

  return (
    <div onMouseLeave={() => setTip(null)}>
      {/* Summary line */}
      <p style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
        {activeDays} active days · {totalPts} total points this month
      </p>

      <div className="flex gap-[3px]">
        {/* Day labels — Mon / Wed / Fri, aligned to rows */}
        <div className="flex flex-col gap-[3px] flex-shrink-0" style={{ paddingTop: 17, marginRight: 3 }}>
          {DAY_LABELS.map((label, i) => (
            <div key={i} className={`${CELL_CLS} !w-[26px] flex items-center`}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1 }}>{label}</span>
            </div>
          ))}
        </div>

        <div>
          {/* Month labels */}
          <div className="flex gap-[3px]" style={{ height: 17 }}>
            {weeks.map((w, wi) => (
              <div key={wi} className={`${CELL_CLS} !h-auto relative`}>
                {w.monthLabel && (
                  <span style={{ position: 'absolute', left: 0, top: 0, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', lineHeight: 1 }}>
                    {w.monthLabel}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex gap-[3px]">
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {w.cells.map(cell => (
                  <div
                    key={cell.key}
                    className={CELL_CLS}
                    style={cell.hidden ? { visibility: 'hidden' } : cellStyle(cell.level, cell.isToday)}
                    onMouseEnter={e => showTip(cell, e)}
                    onClick={e => showTip(cell, e)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend — bottom-right */}
      <div className="flex items-center justify-end gap-[3px]" style={{ marginTop: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 3 }}>Less</span>
        {LEGEND_STYLES.map((s, i) => (
          <div key={i} className={CELL_CLS} style={s} />
        ))}
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>More</span>
      </div>

      <TooltipBox tip={tip} />
    </div>
  )
}
