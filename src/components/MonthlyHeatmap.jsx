/**
 * MonthlyHeatmap.jsx — interactive monthly calendar heatmap (design system).
 *
 * Reusable: Dashboard now, Stats later. Layout revives the old app's calendar
 * heatmap (month navigation, habit filter, tappable day cells, selected-day
 * details) on theme.css tokens: glass cards, lime intensity ramp, cyan today
 * ring, coral misses.
 *
 * Data: seeded from `habits` / `pointsHistory` props (AppContext state), and
 * silently re-fetched from Supabase user_states on month navigation — same
 * pattern the old Stats heatmap used — so freshly-synced data shows up when
 * browsing months.
 */
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { dateKey } from '../lib/storage'

const CYAN = '#22D3EE'
const LIME = '#A3E635'
const CORAL = '#F87171'
const AMBER = '#FBBF24'
const MONO = "'JetBrains Mono', ui-monospace, monospace"

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/* Completion level → cell style (lime ramp per design spec) */
function levelStyle(pct) {
  if (pct <= 0) return { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)' }
  if (pct <= 25) return { background: 'rgba(163,230,53,0.20)' }
  if (pct <= 50) return { background: 'rgba(163,230,53,0.35)' }
  if (pct <= 75) return { background: 'rgba(163,230,53,0.55)' }
  return { background: 'rgba(163,230,53,0.80)', boxShadow: '0 0 10px rgba(163,230,53,0.35)' }
}

const LEGEND_RAMP = [0, 20, 40, 65, 90].map(levelStyle)

function StatusPill({ color, children }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, fontFamily: MONO,
      padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
      background: `${color}1F`, color, border: `1px solid ${color}40`,
    }}>
      {children}
    </span>
  )
}

export default function MonthlyHeatmap({ habits: habitsProp = {}, pointsHistory: pointsProp = {} }) {
  const { user } = useAuth()

  const todayDate = new Date()
  const todayK = dateKey(todayDate)

  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth())
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear())
  const [filter, setFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(todayK)
  const [localHabits, setLocalHabits] = useState(habitsProp)
  const [localPoints, setLocalPoints] = useState(pointsProp)
  const [fetching, setFetching] = useState(false)

  // Seed/sync from props (AppContext keeps these live on Dashboard)
  useEffect(() => { setLocalHabits(habitsProp) }, [habitsProp])
  useEffect(() => { setLocalPoints(pointsProp) }, [pointsProp])

  // Silent Supabase refresh on month navigation — same as the old heatmap
  useEffect(() => {
    let active = true
    async function loadLatestState() {
      if (!user?.uid) return
      try {
        setFetching(true)
        const { data, error } = await supabase
          .from('user_states')
          .select('state')
          .eq('user_id', user.uid)
          .maybeSingle()
        if (error) throw error
        if (active && data?.state) {
          if (data.state.habits) setLocalHabits(data.state.habits)
          if (data.state.pointsHistory) setLocalPoints(data.state.pointsHistory)
        }
      } catch (err) {
        console.error('[MonthlyHeatmap] refresh failed:', err)
      } finally {
        if (active) setFetching(false)
      }
    }
    loadLatestState()
    return () => { active = false }
  }, [currentMonth, currentYear, user?.uid])

  const habitList = Object.values(localHabits)
  const goodHabits = habitList.filter(h => h.type === 'good')
  const selectedHabit = filter !== 'all' ? localHabits[filter] : null

  /* ── Calendar math (Monday-start week) ─────────────────────────────── */
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const offset = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7

  const monthDays = useMemo(() =>
    Array.from({ length: daysInMonth }, (_, i) =>
      `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)
  , [currentYear, currentMonth, daysInMonth])

  const isCurrentMonth = currentYear === todayDate.getFullYear() && currentMonth === todayDate.getMonth()
  const canGoNext = !isCurrentMonth &&
    (currentYear < todayDate.getFullYear() ||
     (currentYear === todayDate.getFullYear() && currentMonth < todayDate.getMonth()))

  const goPrev = () => {
    setSelectedDate(null)
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const goNext = () => {
    if (!canGoNext) return
    setSelectedDate(null)
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  /* ── Cell styling ──────────────────────────────────────────────────── */
  const cellStyleFor = (dk, isFuture) => {
    if (isFuture) return { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }
    if (filter === 'all') {
      if (!goodHabits.length) return levelStyle(0)
      const done = goodHabits.filter(h => h.entries?.[dk]?.status === 'done').length
      return levelStyle((done / goodHabits.length) * 100)
    }
    const h = localHabits[filter]
    if (!h) return levelStyle(0)
    const status = h.entries?.[dk]?.status
    const success = h.type === 'good' ? status === 'done' : status === 'clean'
    const missed = h.type === 'good' ? status === 'failed' : status === 'done'
    if (success) return { background: 'rgba(163,230,53,0.55)' }
    if (missed) return { background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)' }
    return levelStyle(0)
  }

  /* ── Monthly summary ───────────────────────────────────────────────── */
  const summary = useMemo(() => {
    let activeDays = 0, points = 0
    monthDays.forEach(dk => {
      const pts = localPoints[dk] || 0
      const anyDone = habitList.some(h =>
        h.entries?.[dk]?.status === 'done' || h.entries?.[dk]?.status === 'clean')
      if (pts > 0 || anyDone) activeDays++
      points += pts
    })
    return { activeDays, points }
  }, [monthDays, localPoints, habitList])

  /* ── Selected day details ──────────────────────────────────────────── */
  const selectedInMonth = selectedDate && monthDays.includes(selectedDate)
  const selectedDoneCount = selectedInMonth
    ? goodHabits.filter(h => h.entries?.[selectedDate]?.status === 'done').length
    : 0

  const statusBadge = (habit) => {
    const status = habit.entries?.[selectedDate]?.status
    if (habit.type === 'good') {
      if (status === 'done') return <StatusPill color={LIME}>Done</StatusPill>
      if (status === 'failed') return <StatusPill color={CORAL}>Missed</StatusPill>
      if (status === 'skipped') return <StatusPill color={AMBER}>Skipped</StatusPill>
    } else {
      if (status === 'clean') return <StatusPill color={LIME}>Resisted</StatusPill>
      if (status === 'done') return <StatusPill color={CORAL}>Slipped</StatusPill>
    }
    return <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>—</span>
  }

  const detailHabits = selectedHabit ? [selectedHabit] : habitList

  return (
    <div className="glass-card" style={{ padding: '1.1rem' }}>
      {/* ── Header: title + habit filter ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-2" style={{ marginBottom: 4 }}>
        <span className="section-label">Habit Heatmap</span>
        <select
          id="monthly-heatmap-filter"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-xs font-semibold outline-none cursor-pointer"
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)', borderRadius: 10, padding: '5px 8px', maxWidth: 160,
          }}
        >
          <option value="all">All Habits</option>
          {habitList.map(h => (
            <option key={h.id} value={h.id}>{h.icon} {h.name}</option>
          ))}
        </select>
      </div>

      {/* ── Summary line ─────────────────────────────────────────────── */}
      <p style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
        {summary.activeDays} active days · {summary.points} points this month
      </p>

      {/* ── Month navigation ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <button onClick={goPrev} aria-label="Previous month"
          className="glass-btn" style={{ width: 32, height: 32, minHeight: 32, padding: 0 }}>
          <ChevronLeft size={15} />
        </button>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          {fetching && (
            <span className="w-3 h-3 rounded-full border border-t-transparent border-cyan-400 animate-spin" />
          )}
        </div>
        <button onClick={goNext} disabled={!canGoNext} aria-label="Next month"
          className="glass-btn" style={{ width: 32, height: 32, minHeight: 32, padding: 0 }}>
          <ChevronRight size={15} />
        </button>
      </div>

      {/* ── Calendar grid ────────────────────────────────────────────── */}
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div className="grid grid-cols-7 text-center" style={{ gap: 6, marginBottom: 6 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="section-label" style={{ letterSpacing: 0 }}>{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7" style={{ gap: 6 }}>
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`sp-${i}`} aria-hidden />
          ))}

          {monthDays.map(dk => {
            const dayNum = parseInt(dk.slice(-2), 10)
            const isFuture = dk > todayK
            const isToday = dk === todayK
            const isSelected = selectedDate === dk
            return (
              <button
                key={dk}
                id={`mh-cell-${dk}`}
                disabled={isFuture}
                onClick={() => setSelectedDate(prev => prev === dk ? null : dk)}
                className="aspect-square w-full flex items-center justify-center transition-all duration-150 min-h-[40px] sm:min-h-[48px]"
                style={{
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: MONO,
                  color: isFuture ? 'var(--text-muted)' : 'var(--text-secondary)',
                  opacity: isFuture ? 0.4 : 1,
                  cursor: isFuture ? 'default' : 'pointer',
                  ...cellStyleFor(dk, isFuture),
                  ...(isToday
                    ? { boxShadow: `0 0 0 2px ${CYAN}`, color: 'var(--text-primary)' }
                    : isSelected
                      ? { boxShadow: '0 0 0 1.5px rgba(241,245,249,0.6)', color: 'var(--text-primary)' }
                      : {}),
                  ...(isSelected ? { transform: 'scale(1.05)' } : {}),
                }}
              >
                {dayNum}
              </button>
            )
          })}
        </div>

        {/* ── Legend ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end" style={{ gap: 4, marginTop: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 3 }}>Less</span>
          {LEGEND_RAMP.map((st, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 3, ...st, boxShadow: 'none' }} />
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>More</span>
        </div>
      </div>

      {/* ── Selected day details panel ───────────────────────────────── */}
      <AnimatePresence initial={false}>
        {selectedInMonth ? (
          <motion.div
            key={selectedDate}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="glass-card" style={{ padding: '0.9rem 1rem', marginTop: 14, background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center justify-between gap-2 flex-wrap" style={{ paddingBottom: 8, marginBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: CYAN, margin: 0 }}>
                    {format(new Date(currentYear, currentMonth, parseInt(selectedDate.slice(-2), 10)), 'EEEE, MMM d, yyyy')}
                  </p>
                  <p style={{ fontFamily: MONO, fontSize: 11.5, color: (localPoints[selectedDate] || 0) > 0 ? LIME : 'var(--text-muted)', margin: '3px 0 0' }}>
                    {(localPoints[selectedDate] || 0) > 0 ? `+${localPoints[selectedDate]} pts` : '0 pts'}
                  </p>
                </div>
                {!selectedHabit && goodHabits.length > 0 && (
                  <StatusPill color={LIME}>{selectedDoneCount}/{goodHabits.length} Done</StatusPill>
                )}
              </div>

              {detailHabits.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '0.75rem 0', margin: 0 }}>
                  No habits configured yet.
                </p>
              ) : (
                <div className="flex flex-col" style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {detailHabits.map((h, i) => (
                    <div key={h.id} className="flex items-center gap-2.5"
                      style={{ padding: '0.45rem 0.1rem', borderBottom: i < detailHabits.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{h.icon}</span>
                      <span className="truncate flex-1" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {h.name}
                      </span>
                      {statusBadge(h)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-muted)', margin: '12px 0 0' }}
          >
            Tap a day to see details
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
