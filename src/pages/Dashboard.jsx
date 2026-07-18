/**
 * Dashboard.jsx — rebuilt on the design-system foundation (src/styles/theme.css).
 *
 * Presentation only: all data hooks, derived state, and handlers are unchanged
 * from the previous version. Uses .glass-card / .glass-btn / .stat-number /
 * .section-label utilities and the system palette (cyan / lime / violet / coral).
 *
 * NOTE on colors in JS: the CSS variable --accent is shadowed by the legacy
 * per-theme --accent in index.css, so cyan is referenced by literal hex here.
 * The other tokens (--success/--special/--danger/--text-*) are safe as vars,
 * but recharts + SVG props need literals anyway, so the palette is mirrored
 * in the C constant below — keep it in sync with src/styles/theme.css.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isValid } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  Flame, CheckCircle2, Plus, Moon, ArrowRight, Sparkles,
  Footprints, Smile, Award, ClipboardList, BookMarked,
  X, Gift, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { todayKey, dateKey, getLast7Days } from '../lib/storage'
import QuickLogModal from '../components/QuickLogModal'
import Toast, { useToast } from '../components/ui/Toast'
import { playVictorySound } from '../lib/sounds'
import { generateDailyInsight } from '../components/AIMorningBrief'
import ProgressRing from '../components/bevel/ProgressRing'
import { Dot } from '../components/bevel/BevelUI'
import ActivityHeatmap from '../components/ActivityHeatmap'

/* ─────────────────────────────────────────────────────────────────────────
   PALETTE — mirrors src/styles/theme.css tokens for JS/SVG/recharts use
───────────────────────────────────────────────────────────────────────── */
const C = {
  cyan: '#22D3EE',
  lime: '#A3E635',
  violet: '#A78BFA',
  coral: '#F87171',
  text: '#F1F5F9',
  secondary: '#94A3B8',
  muted: '#64748B',
  elevated: '#151A23',
  borderSubtle: 'rgba(255,255,255,0.08)',
}

const MONO = "'JetBrains Mono', ui-monospace, monospace"

/* ─────────────────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────────────────── */
function calculateSleepDuration(sleepTime, wakeTime) {
  if (!sleepTime || !wakeTime) return ''
  try {
    const [sh, sm] = sleepTime.split(':').map(Number)
    const [wh, wm] = wakeTime.split(':').map(Number)
    if ([sh, sm, wh, wm].some(isNaN)) return ''
    let diff = (wh * 60 + wm) - (sh * 60 + sm)
    if (diff < 0) diff += 1440
    return `${Math.floor(diff / 60)}h ${diff % 60 ? `${diff % 60}m` : ''}`
  } catch { return '' }
}

const PRIORITY_COLOR = { high: C.coral, medium: C.cyan, low: C.lime }

/* ─────────────────────────────────────────────────────────────────────────
   HERO RING — big cyan→lime progress ring with soft glow
───────────────────────────────────────────────────────────────────────── */
const RING_VB = 160          // SVG viewBox size; CSS scales it 140/160px
const RING_STROKE = 12
const RING_R = (RING_VB - RING_STROKE) / 2
const RING_CIRC = 2 * Math.PI * RING_R

function HeroRingCard({ dayScore }) {
  const pct = Math.min(Math.max(dayScore, 0), 100)
  const dash = (pct / 100) * RING_CIRC

  return (
    <div className="glass-card flex flex-col items-center" style={{ padding: '1.6rem 1.2rem 1.5rem' }}>
      <span className="section-label">{format(new Date(), 'EEEE, MMMM d')}</span>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 18px' }}>
        Today's Score
      </h2>

      <div className="relative flex items-center justify-center w-[140px] h-[140px] sm:w-[160px] sm:h-[160px]">
        {/* Soft cyan glow behind the ring */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: '-16%', borderRadius: '50%',
            background: 'radial-gradient(closest-side, var(--accent-glow), transparent 72%)',
            filter: 'blur(26px)', pointerEvents: 'none',
          }}
        />
        <svg width="100%" height="100%" viewBox={`0 0 ${RING_VB} ${RING_VB}`} style={{ transform: 'rotate(-90deg)', position: 'relative' }}>
          <defs>
            <linearGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={C.cyan} />
              <stop offset="100%" stopColor={C.lime} />
            </linearGradient>
          </defs>
          {/* Faint track — visible even at 0% */}
          <circle cx={RING_VB / 2} cy={RING_VB / 2} r={RING_R} fill="none" stroke={C.borderSubtle} strokeWidth={RING_STROKE} />
          <motion.circle
            cx={RING_VB / 2} cy={RING_VB / 2} r={RING_R}
            fill="none" stroke="url(#heroRingGrad)" strokeWidth={RING_STROKE} strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            initial={{ strokeDashoffset: RING_CIRC }}
            animate={{ strokeDashoffset: RING_CIRC - dash }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat-number" style={{ color: 'var(--text-primary)', lineHeight: 1 }}>{pct}%</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>
            completed today
          </span>
        </div>
      </div>

      {pct === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '14px 0 0', textAlign: 'center' }}>
          Start logging to fill your ring ✨
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   AI INSIGHT — dark glass + violet left accent border
───────────────────────────────────────────────────────────────────────── */
function InsightCard({ insight, onRefresh, refreshing }) {
  return (
    <div className="glass-card" style={{ padding: '1rem 1.1rem', borderLeft: `3px solid ${C.violet}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={15} style={{ color: C.violet, flexShrink: 0 }} />
          <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {insight.title}
          </p>
          {insight.tag && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
              background: 'rgba(167,139,250,0.14)', color: C.violet,
            }}>
              {insight.tag}
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh insight"
          className="glass-btn flex-shrink-0"
          style={{ width: 32, height: 32, minHeight: 32, padding: 0, borderRadius: 10 }}
        >
          <motion.span animate={{ rotate: refreshing ? 360 : 0 }} transition={{ duration: 0.7 }} className="flex">
            <RefreshCw size={12} style={{ color: 'var(--text-muted)' }} />
          </motion.span>
        </button>
      </div>
      <motion.p
        key={insight.body}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)', margin: '8px 0 0' }}
      >
        {insight.body}
      </motion.p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   STAT GRID — glass cards with mini progress arc in the corner
───────────────────────────────────────────────────────────────────────── */
function StatTile({ icon: Icon, label, value, pct, color }) {
  return (
    <div className="glass-card relative" style={{ padding: '0.9rem 1rem' }}>
      <div className="absolute" style={{ top: 12, right: 12 }}>
        <ProgressRing pct={pct} size={28} stroke={3} from={color} to={color} mini animate={false} trackColor={C.borderSubtle} />
      </div>
      <Icon size={16} style={{ color }} />
      <div className="stat-number" style={{ color: 'var(--text-primary)', lineHeight: 1.15, margin: '10px 0 2px' }}>
        {value}
      </div>
      <span className="section-label">{label}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   7-DAY HISTORY — compact rows: date + habit dots + points (mono)
───────────────────────────────────────────────────────────────────────── */
function HistoryCard({ rows }) {
  return (
    <div className="glass-card" style={{ padding: '1.1rem' }}>
      <span className="section-label block" style={{ marginBottom: 12 }}>7-Day History</span>
      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: 13 }}>No logs yet</div>
      ) : (
        <div className="flex flex-col">
          {rows.map((r, i) => (
            <div
              key={r.id}
              className="flex items-center gap-3"
              style={{
                padding: '0.55rem 0.15rem',
                borderBottom: i < rows.length - 1 ? `1px solid ${C.borderSubtle}` : 'none',
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', width: 52, flexShrink: 0 }}>
                {r.date}
              </span>
              <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                {Array.from({ length: r.total }).map((_, di) => (
                  <span
                    key={di}
                    style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: di < r.doneCnt ? C.lime : 'rgba(255,255,255,0.10)',
                    }}
                  />
                ))}
                {r.total === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
              </div>
              <span style={{
                fontFamily: MONO, fontSize: 12.5, fontWeight: 700, textAlign: 'right', flexShrink: 0,
                color: r.pts > 0 ? C.lime : 'var(--text-muted)',
              }}>
                {r.pts > 0 ? `+${r.pts}` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   WEEKLY TREND CHART
───────────────────────────────────────────────────────────────────────── */
function CustomAreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: C.elevated, border: `1px solid ${C.borderSubtle}`, borderRadius: 12,
      padding: '0.55rem 0.85rem', fontSize: 12, color: 'var(--text-primary)', boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
    }}>
      <p style={{ margin: 0, fontWeight: 700 }}>{d?.fullDate || label}</p>
      <p style={{ margin: '2px 0', color: C.cyan }}>Points: <strong>{d?.pts ?? 0}</strong></p>
      <p style={{ margin: '2px 0', color: C.lime }}>Habits: <strong>{d?.habitsStr ?? '—'}</strong></p>
    </div>
  )
}

function WeeklyTrendChart({ pointsHistory, habits, last7 }) {
  const weekData = useMemo(() => {
    const allHabits = Object.values(habits).filter(h => h.type === 'good')
    return last7.map(d => {
      const done = allHabits.filter(h => h.entries?.[d]?.status === 'done').length
      return {
        day: format(new Date(d), 'EEE'),
        fullDate: format(new Date(d), 'MMM d'),
        pts: pointsHistory[d] || 0,
        habitsStr: `${done}/${allHabits.length}`,
      }
    })
  }, [pointsHistory, habits, last7])

  const totalPts = weekData.reduce((s, d) => s + d.pts, 0)

  return (
    <div className="glass-card" style={{ padding: '1.1rem' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="section-label">Weekly Points Trend</span>
        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.cyan }}>{totalPts} pts</span>
      </div>
      {totalPts === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
          Start logging to see your weekly trend!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={weekData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="dsPtsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.cyan} stopOpacity={0.3} />
                <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dsLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={C.cyan} />
                <stop offset="100%" stopColor={C.lime} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="day" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }} />
            <Area
              type="monotone" dataKey="pts" stroke="url(#dsLineGrad)" strokeWidth={2.5}
              fill="url(#dsPtsGrad)"
              dot={{ fill: C.cyan, strokeWidth: 0, r: 3 }}
              activeDot={{ fill: '#fff', stroke: C.cyan, strokeWidth: 2, r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   HABIT BREAKDOWN GRID
───────────────────────────────────────────────────────────────────────── */
function HabitBreakdownGrid({ habits, getHabitStreak, last7 }) {
  const goodHabits = useMemo(() => Object.values(habits).filter(h => h.type === 'good').slice(0, 6), [habits])
  const loading = !Object.keys(habits).length

  if (loading || !goodHabits.length) {
    return (
      <div className="glass-card" style={{ padding: '1.1rem' }}>
        <span className="section-label block" style={{ marginBottom: 12 }}>Habit Breakdown</span>
        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🌱</div>
          No habits set up yet — add some in the Habits page!
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ padding: '1.1rem' }}>
      <span className="section-label block" style={{ marginBottom: 12 }}>Habit Breakdown · This Week</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {goodHabits.map(h => {
          const streak = getHabitStreak(h.id)
          const doneDays = last7.filter(d => h.entries?.[d]?.status === 'done').length
          const weekPct = Math.round((doneDays / 7) * 100)
          const ringColor = weekPct >= 70 ? C.lime : weekPct >= 40 ? C.cyan : C.coral
          return (
            <div key={h.id} style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '0.7rem',
              display: 'flex', flexDirection: 'column', gap: 8, border: `1px solid ${C.borderSubtle}`,
            }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '1.3rem' }}>{h.icon}</span>
                <ProgressRing pct={weekPct} size={40} stroke={4} from={ringColor} to={ringColor} center={`${weekPct}%`} />
              </div>
              <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h.name}
              </p>
              <div className="flex items-center gap-1">
                <Flame size={11} style={{ color: streak > 0 ? C.coral : C.muted }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: streak > 0 ? C.coral : C.muted }}>
                  {streak > 0 ? `${streak}d streak` : 'No streak'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   UPCOMING TASKS
───────────────────────────────────────────────────────────────────────── */
function UpcomingTasksWidget({ todos, navigate }) {
  const upcoming = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 3)
    return todos
      .filter(t => {
        if (t.status === 'done' || !t.dueDate) return false
        try {
          const due = new Date(t.dueDate)
          return isValid(due) && due >= now && due <= cutoff
        } catch { return false }
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 3)
  }, [todos])

  return (
    <div className="glass-card" style={{ padding: '1.1rem' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="section-label">Upcoming Tasks · Next 3 Days</span>
        <button onClick={() => navigate('/todo')} className="flex items-center gap-1" style={{ fontSize: 11.5, fontWeight: 700, color: C.cyan, background: 'none', border: 'none', cursor: 'pointer' }}>
          View all <ArrowRight size={11} />
        </button>
      </div>
      {upcoming.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.25rem 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ fontSize: '1.7rem', marginBottom: 6 }}>🎉</div>
          Sab clear hai! Koi pending task nahi.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {upcoming.map(task => {
            const color = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.low
            let dueStr
            try { dueStr = format(new Date(task.dueDate), 'MMM d, h:mm a') } catch { dueStr = 'Soon' }
            return (
              <div key={task.id} className="flex items-center gap-2.5" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '0.6rem 0.75rem', border: `1px solid ${C.borderSubtle}` }}>
                <Dot color={color} size={8} />
                <div className="flex-1 min-w-0">
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{dueStr}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: `${color}1F`, color }}>
                  {task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Med' : 'Low'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   ACTIVE STREAKS STRIP
───────────────────────────────────────────────────────────────────────── */
function StreakStrip({ habits, getHabitStreak }) {
  const streaks = useMemo(() =>
    Object.values(habits)
      .map(h => ({ ...h, streak: getHabitStreak(h.id) }))
      .filter(h => h.streak > 0)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 6)
  , [habits, getHabitStreak])

  if (!streaks.length) {
    return (
      <div className="glass-card" style={{ padding: '1.1rem' }}>
        <span className="section-label block" style={{ marginBottom: 10 }}>Active Streaks</span>
        <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>🔥</div>
          Complete habits daily to build streaks!
        </div>
      </div>
    )
  }

  const maxStreak = streaks[0]?.streak || 0

  return (
    <div className="glass-card" style={{ padding: '1.1rem' }}>
      <span className="section-label block" style={{ marginBottom: 10 }}>Active Streaks</span>
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {streaks.map((h, idx) => {
          const isTop = h.streak === maxStreak && idx === 0
          return (
            <div key={h.id} className="flex items-center gap-1.5 flex-shrink-0" style={{
              padding: '0.45rem 0.85rem', borderRadius: 999,
              background: isTop ? 'rgba(34,211,238,0.10)' : 'rgba(255,255,255,0.04)',
              border: isTop ? '1.5px solid rgba(34,211,238,0.4)' : `1px solid ${C.borderSubtle}`,
            }}>
              <span style={{ fontSize: '1rem' }}>{h.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: isTop ? C.cyan : 'var(--text-primary)' }}>{h.name}</span>
              <Flame size={11} style={{ color: C.coral }} />
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: isTop ? C.cyan : C.coral }}>{h.streak}d</span>
              {isTop && <span style={{ fontSize: 12 }}>🏆</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN DASHBOARD COMPONENT
───────────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    todos, habits, dailyLogs, fitnessLogs, pointsHistory,
    todayPoints, getHabitStreak, settings,
    profile, completeProfileOnboarding,
  } = useApp()
  const [quickLogOpen, setQuickLogOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [insight, setInsight] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const goodHabits = useMemo(() => Object.values(habits).filter(h => h.type === 'good'), [habits])

  const loadInsight = useCallback(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const yesterdayK = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const yLog = dailyLogs[yesterdayK] || {}
    const yFitness = fitnessLogs[yesterdayK] || {}
    const pHigh = todos.filter(t => t.status === 'pending' && t.priority === 'high')
    const pMedium = todos.filter(t => t.status === 'pending' && t.priority === 'medium')
    setInsight(generateDailyInsight(yLog, yFitness, goodHabits, yesterdayK, pHigh, pMedium))
  }, [dailyLogs, fitnessLogs, goodHabits, todos])

  useEffect(() => {
    if (dailyLogs && fitnessLogs && habits && todos) loadInsight()
  }, [dailyLogs, fitnessLogs, habits, todos, loadInsight])

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true)
    setTimeout(() => { loadInsight(); setIsRefreshing(false) }, 800)
  }, [loadInsight])

  const { toasts, addToast, removeToast } = useToast()

  const [displayName, setDisplayName] = useState('')
  const [dob, setDob] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const userProfile = profile || {}
  const showBanner = !userProfile.onboarding_completed && (!userProfile.dob || !userProfile.height || !userProfile.weight)

  useEffect(() => {
    if (profileModalOpen) {
      setDisplayName(user?.displayName || '')
      setDob(profile?.dob || '')
      setHeight(profile?.height || '')
      setWeight(profile?.weight || '')
    }
  }, [profileModalOpen, user?.displayName, profile])

  const progressPercentage = useMemo(() => {
    let filled = 0
    if (displayName?.trim()) filled++
    if (dob) filled++
    if (height && parseFloat(height) > 0) filled++
    if (weight && parseFloat(weight) > 0) filled++
    return (filled / 4) * 100
  }, [displayName, dob, height, weight])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    if (!displayName || !dob || !height || !weight || progressPercentage < 100) return
    setSubmitting(true)
    try {
      playVictorySound()
      await completeProfileOnboarding(displayName, dob, parseFloat(height), parseFloat(weight))
      addToast('Profile Completed! +15 Points added to your account! 🔥', 'success')
      setProfileModalOpen(false)
    } catch (err) {
      console.error('Failed to update profile:', err)
      addToast(err.message || 'Failed to update profile', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const today = todayKey()
  const last7 = getLast7Days()
  const todayLog = dailyLogs[today] || {}
  const todayFitness = fitnessLogs[today] || {}

  const doneToday = goodHabits.filter(h => h.entries?.[today]?.status === 'done').length
  const habitPct = goodHabits.length ? Math.round((doneToday / goodHabits.length) * 100) : 0
  const todaySteps = todayFitness.steps || todayLog.steps || 0
  const stepPct = Math.min(100, Math.round((todaySteps / (settings?.stepGoal || 8000)) * 100))
  const moodPct = todayLog.mood ? todayLog.mood * 10 : 0
  const pointsPct = Math.min(100, Math.round((todayPoints / 50) * 100))
  const dayScore = Math.round((habitPct + stepPct + moodPct + pointsPct) / 4)

  const historyRows = useMemo(() =>
    getLast7Days().map(dateKey => {
      const allH = Object.values(habits).filter(h => h.type === 'good')
      const doneCnt = allH.filter(h => h.entries?.[dateKey]?.status === 'done').length
      return {
        id: dateKey,
        date: format(new Date(dateKey), 'MMM d'),
        doneCnt,
        total: allH.length,
        pts: pointsHistory[dateKey] || 0,
      }
    }).reverse()
  , [habits, pointsHistory])

  // Last 35 days for the contribution heatmap — same Supabase-backed
  // pointsHistory/habit entries the rest of the dashboard reads.
  const heatmapData = useMemo(() => {
    const allH = Object.values(habits).filter(h => h.type === 'good')
    const arr = []
    for (let i = 34; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = dateKey(d)
      arr.push({
        date: key,
        pts: pointsHistory[key] || 0,
        habitsDone: allH.filter(h => h.entries?.[key]?.status === 'done').length,
        habitsTotal: allH.length,
      })
    }
    return arr
  }, [habits, pointsHistory])

  const greeting = new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'
  const firstName = profile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'there'

  return (
    <div className="relative">
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="relative space-y-4" style={{ zIndex: 1 }}>
        {/* ── Greeting ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="px-1">
          <span className="section-label">{format(new Date(), 'EEEE, MMMM d')}</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0' }}>
            Good {greeting}, {firstName} ✦
          </h1>
        </motion.div>

        {/* ── Hero ring ──────────────────────────────────────────────── */}
        <HeroRingCard dayScore={dayScore} />

        {/* ── AI Insight ─────────────────────────────────────────────── */}
        {insight && (
          <InsightCard insight={insight} onRefresh={triggerRefresh} refreshing={isRefreshing} />
        )}

        {/* ── Stat grid — 2x2 mobile / 4 across desktop ──────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile icon={CheckCircle2} label="Habits" value={`${doneToday}/${goodHabits.length}`} pct={habitPct} color={C.lime} />
          <StatTile icon={Footprints} label="Steps" value={todaySteps.toLocaleString()} pct={stepPct} color={C.cyan} />
          <StatTile icon={Smile} label="Mood" value={todayLog.mood ? `${todayLog.mood}/10` : '--'} pct={moodPct} color={C.violet} />
          <StatTile icon={Award} label="Points" value={`+${todayPoints}`} pct={pointsPct} color={C.cyan} />
        </div>

        {/* ── Quick actions — row on desktop, 2x2 grid on mobile ─────── */}
        <div className="grid grid-cols-2 sm:flex gap-2">
          <button id="pill-log" onClick={() => setQuickLogOpen(true)} className="glass-btn sm:flex-1" style={{ padding: '0.6rem 1rem', fontSize: 12.5, fontWeight: 700 }}>
            <ClipboardList size={14} style={{ color: C.lime }} /> Log Today
          </button>
          <button id="pill-journal" onClick={() => navigate('/journal')} className="glass-btn sm:flex-1" style={{ padding: '0.6rem 1rem', fontSize: 12.5, fontWeight: 700 }}>
            <BookMarked size={14} style={{ color: C.violet }} /> Journal
          </button>
          <button id="pill-habits" onClick={() => navigate('/habits')} className="glass-btn sm:flex-1" style={{ padding: '0.6rem 1rem', fontSize: 12.5, fontWeight: 700 }}>
            <CheckCircle2 size={14} style={{ color: C.lime }} /> Habits
          </button>
          <button id="pill-task" onClick={() => navigate('/todo')} className="glass-btn sm:flex-1" style={{ padding: '0.6rem 1rem', fontSize: 12.5, fontWeight: 700 }}>
            <Plus size={14} style={{ color: C.cyan }} /> Add Task
          </button>
        </div>

        {/* ── Quick Log CTA ──────────────────────────────────────────── */}
        {!todayLog.loggedAt && (
          <button
            id="dashboard-quick-log"
            onClick={() => setQuickLogOpen(true)}
            className="glass-card w-full flex items-center gap-3 transition-all active:scale-[0.99]"
            style={{
              padding: '1rem 1.1rem',
              borderStyle: 'dashed',
              borderWidth: 1.5,
              borderColor: 'rgba(163,230,53,0.35)',
              cursor: 'pointer',
            }}
          >
            <div className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(163,230,53,0.12)' }}>
              <Plus size={20} style={{ color: C.lime }} />
            </div>
            <div className="text-left">
              <p style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Quick Log Today</p>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0 }}>Tap to log your day in 30 seconds</p>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: C.lime, background: 'rgba(163,230,53,0.12)', padding: '3px 9px', borderRadius: 20 }}>Today</span>
          </button>
        )}

        {/* ── 7-day history ──────────────────────────────────────────── */}
        <HistoryCard rows={historyRows} />

        {/* ── Welcome Back / Complete Setup banner ───────────────────── */}
        <AnimatePresence>
          {showBanner && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -12 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -12 }}
              className="overflow-hidden"
            >
              <div
                className="glass-card"
                style={{
                  padding: '1rem 1.1rem',
                  borderColor: 'rgba(34,211,238,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34, borderRadius: 12, background: 'rgba(34,211,238,0.14)' }}>
                    <Gift size={17} style={{ color: C.cyan }} />
                  </span>
                  <div className="min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Welcome Back!</p>
                    <p style={{ fontSize: 11.5, margin: 0, color: 'var(--text-muted)' }}>Complete your profile to unlock full stats + 15 points!</p>
                  </div>
                </div>
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="glass-btn glass-btn-accent flex-shrink-0"
                  style={{ fontSize: 12, fontWeight: 700, padding: '0.55rem 1rem', minHeight: 40 }}
                >
                  Complete Setup
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Weekly trend chart ─────────────────────────────────────── */}
        <WeeklyTrendChart pointsHistory={pointsHistory} habits={habits} last7={last7} />

        {/* ── Habit breakdown ────────────────────────────────────────── */}
        <HabitBreakdownGrid habits={habits} getHabitStreak={getHabitStreak} last7={last7} />

        {/* ── Upcoming tasks ─────────────────────────────────────────── */}
        <UpcomingTasksWidget todos={todos} navigate={navigate} />

        {/* ── Active streaks ─────────────────────────────────────────── */}
        <StreakStrip habits={habits} getHabitStreak={getHabitStreak} />

        {/* ── Activity heatmap — GitHub-style contribution grid ──────── */}
        <div className="glass-card" style={{ padding: '1.1rem' }}>
          <span className="section-label block" style={{ marginBottom: 12 }}>Last 35 Days · Activity Heatmap</span>
          <ActivityHeatmap data={heatmapData} days={35} />
        </div>

        {/* ── Sleep card ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {settings?.sleepTrackerEnabled !== false && (todayLog.wakeTime || todayLog.sleepTime) && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
              onClick={() => navigate('/log')} className="cursor-pointer"
            >
              <div className="glass-card flex items-center gap-3.5" style={{ padding: '1.1rem' }}>
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(167,139,250,0.14)' }}>
                  <Moon size={20} style={{ color: C.violet }} />
                </div>
                <div className="flex-1">
                  <span className="section-label">Last Night's Sleep</span>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {todayLog.sleepTime || '—'} → {todayLog.wakeTime || '—'}
                    </p>
                    {todayLog.sleepTime && todayLog.wakeTime && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.violet, background: 'rgba(167,139,250,0.14)', padding: '2px 9px', borderRadius: 20 }}>
                        {calculateSleepDuration(todayLog.sleepTime, todayLog.wakeTime)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ height: '1.5rem' }} />

        {/* ── Profile modal — bottom sheet on mobile, centered card on sm+ ── */}
        <AnimatePresence>
          {profileModalOpen && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setProfileModalOpen(false)}
                className="absolute inset-0"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              />
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="glass-card relative w-full max-w-md overflow-hidden flex flex-col z-10 max-h-[88vh] sm:max-h-[85vh]
                           rounded-t-3xl sm:rounded-[26px]"
                style={{ background: 'var(--bg-elevated)', boxShadow: '0 16px 40px rgba(0,0,0,0.45)' }}
              >
                <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.3 }}
                    style={{ height: '100%', background: `linear-gradient(90deg, ${C.cyan}, ${C.lime})` }} />
                </div>
                {/* Drag handle — mobile bottom-sheet only */}
                <div className="sm:hidden flex justify-center pt-2.5 pb-0.5 flex-shrink-0">
                  <div className="w-10 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                </div>
                <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '0.85rem 1.25rem 0.75rem', borderBottom: `1px solid ${C.borderSubtle}` }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>🎁 Complete Your Profile</h2>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>Unlock full stats & earn +15 points!</p>
                  </div>
                  <button onClick={() => setProfileModalOpen(false)} className="glass-btn flex-shrink-0" style={{ width: 36, height: 36, minHeight: 36, padding: 0, borderRadius: '50%' }}>
                    <X size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
                <form onSubmit={handleProfileSubmit} className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-3.5" style={{ padding: '1.25rem' }}>
                    <div className="flex items-center justify-between" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>
                      <span>Profile Completion</span>
                      <span style={{ color: C.lime, fontWeight: 800 }}>{progressPercentage}%</span>
                    </div>
                    {[
                      { id: 'display-name-input', label: 'Display Name', type: 'text', value: displayName, onChange: e => setDisplayName(e.target.value), placeholder: 'Your Name' },
                      { id: 'dob-input', label: 'Date of Birth', type: 'date', value: dob, onChange: e => setDob(e.target.value), placeholder: '' },
                      { id: 'height-input', label: 'Height (cm)', type: 'number', value: height, onChange: e => setHeight(e.target.value), placeholder: 'e.g. 175', min: 50, max: 300 },
                      { id: 'weight-input', label: 'Weight (kg)', type: 'number', value: weight, onChange: e => setWeight(e.target.value), placeholder: 'e.g. 72.5', min: 10, max: 500, step: 0.1 },
                    ].map(field => (
                      <div key={field.id}>
                        <label htmlFor={field.id} style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'block', marginBottom: 4, fontWeight: 600 }}>{field.label}</label>
                        <input
                          id={field.id} {...field} label={undefined} required
                          className="w-full transition-all focus:outline-none"
                          style={{
                            fontSize: 13.5, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.borderSubtle}`,
                            borderRadius: 12, padding: '0.6rem 0.75rem', color: 'var(--text-primary)',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex-shrink-0 flex items-center justify-between gap-3 pb-safe" style={{ padding: '1rem 1.25rem', borderTop: `1px solid ${C.borderSubtle}` }}>
                    <button type="button" onClick={() => setProfileModalOpen(false)} className="glass-btn w-1/2"
                      style={{ color: 'var(--text-muted)', fontWeight: 700, padding: '0.65rem 1rem', fontSize: 13 }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={submitting || progressPercentage < 100}
                      className="glass-btn glass-btn-accent w-1/2"
                      style={{ fontWeight: 800, padding: '0.65rem 1rem', fontSize: 13 }}
                    >
                      {submitting ? 'Saving...' : 'Complete Setup 🚀'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <QuickLogModal isOpen={quickLogOpen} onClose={() => setQuickLogOpen(false)} />
      </div>
    </div>
  )
}
