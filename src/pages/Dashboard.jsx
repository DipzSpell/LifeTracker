import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isValid } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  Flame, CheckCircle2, TrendingUp, Calendar, Plus, Moon,
  ArrowRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { todayKey, getLast7Days, getLast30Days } from '../lib/storage'
import QuickLogModal from '../components/QuickLogModal'
import Toast, { useToast } from '../components/ui/Toast'
import { playVictorySound } from '../lib/sounds'
import AIMorningBrief, { generateDailyInsight } from '../components/AIMorningBrief'
import ModuleSummaryCard from '../components/ui/ModuleSummaryCard'
import QuickActionPills from '../components/ui/QuickActionPills'
import DataTable from '../components/ui/DataTable'

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS  (pastel palette)
───────────────────────────────────────────────────────────────────────────── */
const SAGE   = '#87a68c'
const SKY    = '#7db8d8'
const CORAL  = '#e87c6e'
const AMBER  = '#d4a847'

/* ─────────────────────────────────────────────────────────────────────────────
   UTILS
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   INTERSECTION OBSERVER HOOK — fade-in sections as they enter viewport
───────────────────────────────────────────────────────────────────────────── */
function useFadeInSection() {
  const ref  = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION WRAPPER — shared card + fade animation
───────────────────────────────────────────────────────────────────────────── */
function SectionCard({ children, style = {} }) {
  const [ref, visible] = useFadeInSection()
  return (
    <div
      ref={ref}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        padding: '1rem 1.1rem',
        transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(22px)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: '0.65rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'rgba(255,255,255,0.28)',
      marginBottom: '0.85rem',
      fontFamily: 'ui-monospace, JetBrains Mono, monospace',
    }}>
      {children}
    </p>
  )
}

/* gradient text helper */
function GradNum({ children, from = SAGE, to = SKY, style = {} }) {
  return (
    <span style={{
      backgroundImage: `linear-gradient(90deg, ${from}, ${to})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      fontFamily: 'ui-monospace, JetBrains Mono, monospace',
      fontWeight: 700,
      ...style,
    }}>
      {children}
    </span>
  )
}

/* Skeleton pulse block */
function Skeleton({ w = '100%', h = 18, r = 8, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'rgba(255,255,255,0.07)',
      animation: 'dash-pulse 1.4s ease-in-out infinite',
      ...style,
    }} />
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION 1 — HABIT BREAKDOWN GRID
───────────────────────────────────────────────────────────────────────────── */
function CircleRing({ pct, color, size = 44, stroke = 4 }) {
  const r   = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  )
}

function HabitBreakdownGrid({ habits, getHabitStreak, last7 }) {
  const goodHabits = useMemo(
    () => Object.values(habits).filter(h => h.type === 'good').slice(0, 6),
    [habits]
  )
  const loading = !Object.keys(habits).length

  if (loading) {
    return (
      <SectionCard>
        <SectionLabel>Habit Breakdown</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} h={84} r={14} style={{ marginBottom: 0 }} />
          ))}
        </div>
      </SectionCard>
    )
  }

  if (!goodHabits.length) {
    return (
      <SectionCard>
        <SectionLabel>Habit Breakdown</SectionLabel>
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🌱</div>
          No habits set up yet — add some in the Habits page!
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard>
      <SectionLabel>Habit Breakdown · This Week</SectionLabel>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 10,
      }}>
        {goodHabits.map(h => {
          const streak   = getHabitStreak(h.id)
          const doneDays = last7.filter(d => h.entries?.[d]?.status === 'done').length
          const weekPct  = Math.round((doneDays / 7) * 100)
          const ringColor = weekPct >= 70 ? SAGE : weekPct >= 40 ? AMBER : CORAL
          const glowColor = weekPct >= 70
            ? 'rgba(135,166,140,0.22)' : weekPct >= 40
            ? 'rgba(212,168,71,0.18)' : 'rgba(232,124,110,0.12)'

          return (
            <div
              key={h.id}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${glowColor.replace('0.22', '0.35').replace('0.18','0.3').replace('0.12','0.22')}`,
                borderRadius: 14,
                padding: '0.7rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                boxShadow: `0 0 18px ${glowColor}`,
                transition: 'box-shadow 0.3s',
              }}
            >
              {/* Top row: icon + ring */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.4rem' }}>{h.icon}</span>
                <div style={{ position: 'relative' }}>
                  <CircleRing pct={weekPct} color={ringColor} size={40} stroke={3.5} />
                  <span style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.52rem', fontWeight: 700, color: ringColor,
                    fontFamily: 'ui-monospace, monospace',
                  }}>
                    {weekPct}%
                  </span>
                </div>
              </div>
              {/* Habit name */}
              <p style={{
                fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)',
                margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {h.name}
              </p>
              {/* Streak */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Flame size={11} style={{ color: CORAL, flexShrink: 0 }} />
                <span style={{
                  fontSize: '0.68rem', fontFamily: 'ui-monospace, monospace',
                  color: streak > 0 ? CORAL : 'rgba(255,255,255,0.25)',
                }}>
                  {streak > 0 ? `${streak}d streak` : 'No streak'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION 2 — WEEKLY TREND CHART
───────────────────────────────────────────────────────────────────────────── */
function CustomAreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: 'rgba(11,17,33,0.95)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      padding: '0.55rem 0.85rem',
      fontSize: '0.72rem',
      color: 'rgba(255,255,255,0.85)',
      fontFamily: 'ui-monospace, monospace',
      backdropFilter: 'blur(8px)',
    }}>
      <p style={{ margin: 0, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{d?.fullDate || label}</p>
      <p style={{ margin: '2px 0', color: SAGE }}>Points: <strong>{d?.pts ?? 0}</strong></p>
      <p style={{ margin: '2px 0', color: SKY }}>Habits: <strong>{d?.habitsStr ?? '—'}</strong></p>
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
    <SectionCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <SectionLabel children="Weekly Points Trend" />
        <GradNum from={SAGE} to={SKY} style={{ fontSize: '0.85rem' }}>{totalPts} pts</GradNum>
      </div>

      {totalPts === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
          Start logging to see your weekly trend!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={weekData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="sageSkySkyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SAGE} stopOpacity={0.45} />
                <stop offset="60%" stopColor={SKY}  stopOpacity={0.15} />
                <stop offset="100%" stopColor={SKY} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="sageSkyLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={SAGE} />
                <stop offset="100%" stopColor={SKY}  />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="day"
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontFamily: 'ui-monospace, monospace' }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }} />
            <Area
              type="monotone" dataKey="pts"
              stroke="url(#sageSkyLine)"
              strokeWidth={2.5}
              fill="url(#sageSkySkyGrad)"
              dot={{ fill: SAGE, strokeWidth: 0, r: 3 }}
              activeDot={{ fill: '#fff', stroke: SAGE, strokeWidth: 2, r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION 3 — UPCOMING TASKS WIDGET
───────────────────────────────────────────────────────────────────────────── */
const PRIORITY_DOT = {
  high:   { bg: CORAL,  label: 'High' },
  medium: { bg: AMBER,  label: 'Med'  },
  low:    { bg: SAGE,   label: 'Low'  },
}

function UpcomingTasksWidget({ todos, navigate }) {
  // Next 3 days pending todos sorted by due date
  const upcoming = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 3)
    return todos
      .filter(t => {
        if (t.status === 'done') return false
        if (!t.dueDate) return false
        try {
          const due = new Date(t.dueDate)
          return isValid(due) && due >= now && due <= cutoff
        } catch { return false }
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 3)
  }, [todos])

  return (
    <SectionCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <SectionLabel children="Upcoming Tasks · Next 3 Days" />
        <button
          onClick={() => navigate('/todo')}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: '0.65rem', color: SKY, background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: 'ui-monospace, monospace', fontWeight: 600,
            textDecoration: 'none', padding: 0,
          }}
        >
          View all <ArrowRight size={11} />
        </button>
      </div>

      {upcoming.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '1.5rem 0',
          color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem',
          lineHeight: 1.6,
        }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🎉</div>
          Sab clear hai! Koi pending task nahi.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcoming.map(task => {
            const p = PRIORITY_DOT[task.priority] || PRIORITY_DOT.low
            let dueStr
            try { dueStr = format(new Date(task.dueDate), 'MMM d, h:mm a') } catch { dueStr = 'Soon' }
            return (
              <div
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, padding: '0.6rem 0.75rem',
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: p.bg, flexShrink: 0,
                  boxShadow: `0 0 6px ${p.bg}`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: '0.78rem', fontWeight: 600,
                    color: 'rgba(255,255,255,0.88)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {task.title}
                  </p>
                  <p style={{
                    margin: 0, fontSize: '0.63rem',
                    color: 'rgba(255,255,255,0.35)',
                    fontFamily: 'ui-monospace, monospace', marginTop: 2,
                  }}>
                    {dueStr}
                  </p>
                </div>
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, fontFamily: 'ui-monospace, monospace',
                  padding: '2px 7px', borderRadius: 20,
                  background: `${p.bg}22`, color: p.bg, border: `1px solid ${p.bg}44`,
                }}>
                  {p.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION 4 — STREAK SUMMARY STRIP
───────────────────────────────────────────────────────────────────────────── */
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
      <SectionCard>
        <SectionLabel>Active Streaks</SectionLabel>
        <div style={{ textAlign: 'center', padding: '1.25rem 0', color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>🔥</div>
          Complete habits daily to build streaks!
        </div>
      </SectionCard>
    )
  }

  const maxStreak = streaks[0]?.streak || 0

  return (
    <SectionCard>
      <SectionLabel>Active Streaks</SectionLabel>
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}>
        {streaks.map((h, idx) => {
          const isTop = h.streak === maxStreak && idx === 0
          return (
            <div
              key={h.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '0.45rem 0.85rem',
                borderRadius: 100,
                flexShrink: 0,
                border: isTop
                  ? `1.5px solid ${AMBER}66`
                  : '1px solid rgba(255,255,255,0.1)',
                background: isTop
                  ? `linear-gradient(135deg, ${AMBER}22, rgba(255,255,255,0.04))`
                  : 'rgba(255,255,255,0.05)',
                boxShadow: isTop
                  ? `0 0 18px ${AMBER}44, 0 0 6px ${AMBER}33`
                  : 'none',
                transition: 'all 0.3s',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{h.icon}</span>
              <span style={{
                fontSize: '0.71rem',
                fontWeight: 600,
                color: isTop ? AMBER : 'rgba(255,255,255,0.75)',
                whiteSpace: 'nowrap',
              }}>
                {h.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Flame size={11} style={{ color: isTop ? AMBER : CORAL }} />
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  fontFamily: 'ui-monospace, monospace',
                  color: isTop ? AMBER : CORAL,
                }}>
                  {h.streak}d
                </span>
                {isTop && <span style={{ fontSize: '0.65rem', marginLeft: 2 }}>🏆</span>}
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION 5 — MONTHLY HEATMAP
───────────────────────────────────────────────────────────────────────────── */
function HeatmapTooltip({ data, x, y }) {
  if (!data) return null
  return (
    <div style={{
      position: 'fixed',
      left: Math.min(x + 10, window.innerWidth - 180),
      top: y + 10,
      zIndex: 1000,
      background: 'rgba(11,17,33,0.96)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      padding: '0.5rem 0.75rem',
      fontSize: '0.68rem',
      color: 'rgba(255,255,255,0.85)',
      fontFamily: 'ui-monospace, monospace',
      pointerEvents: 'none',
      backdropFilter: 'blur(8px)',
      minWidth: 150,
    }}>
      <p style={{ margin: 0, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{data.label}</p>
      <p style={{ margin: '2px 0', color: SAGE }}>Points: <strong>{data.pts}</strong></p>
      <p style={{ margin: '2px 0', color: SKY }}>Habits: <strong>{data.habitsStr}</strong></p>
    </div>
  )
}

function MonthlyHeatmap({ pointsHistory, habits, last30 }) {
  const [tooltip, setTooltip] = useState(null) // { data, x, y }

  // Build cell data
  const cells = useMemo(() => {
    const allHabits = Object.values(habits).filter(h => h.type === 'good')
    const maxPts = Math.max(...last30.map(d => pointsHistory[d] || 0), 1)
    return last30.map(d => {
      const pts  = pointsHistory[d] || 0
      const done = allHabits.filter(h => h.entries?.[d]?.status === 'done').length
      const intensity = pts / maxPts  // 0–1
      return {
        dateKey: d,
        label: format(new Date(d), 'MMM d, yyyy'),
        pts,
        habitsStr: `${done}/${allHabits.length}`,
        intensity,
      }
    })
  }, [pointsHistory, habits, last30])

  // Intensity to color: empty → faint, full → vivid sage
  function cellColor(intensity) {
    if (intensity <= 0) return 'rgba(255,255,255,0.05)'
    if (intensity < 0.25) return `${SAGE}40`
    if (intensity < 0.5)  return `${SAGE}70`
    if (intensity < 0.75) return `${SAGE}aa`
    return SAGE
  }

  return (
    <SectionCard>
      <SectionLabel>Last 30 Days · Activity Heatmap</SectionLabel>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'ui-monospace, monospace' }}>Less</span>
        {[0, 0.2, 0.5, 0.75, 1].map(v => (
          <div key={v} style={{
            width: 12, height: 12, borderRadius: 3,
            background: cellColor(v), border: '1px solid rgba(255,255,255,0.06)',
          }} />
        ))}
        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'ui-monospace, monospace' }}>More</span>
      </div>

      {/* Grid — 6 columns of 5 weeks */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10, 1fr)',
        gap: 5,
      }}>
        {cells.map(cell => (
          <div
            key={cell.dateKey}
            style={{
              aspectRatio: '1',
              borderRadius: 5,
              background: cellColor(cell.intensity),
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: cell.pts > 0 ? 'pointer' : 'default',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: cell.intensity > 0.5 ? `0 0 8px ${SAGE}55` : 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.25)'
              setTooltip({ data: cell, x: e.clientX, y: e.clientY })
            }}
            onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : t)}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              setTooltip(null)
            }}
          />
        ))}
      </div>

      {tooltip && <HeatmapTooltip data={tooltip.data} x={tooltip.x} y={tooltip.y} />}
    </SectionCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   ANIMATION VARIANTS (existing)
───────────────────────────────────────────────────────────────────────────── */
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' } }),
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN DASHBOARD COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    todos, habits, dailyLogs, fitnessLogs, pointsHistory,
    todayPoints, getHabitStreak, getUpcomingTodos, settings,
    profile, completeProfileOnboarding,
  } = useApp()
  const [quickLogOpen,    setQuickLogOpen]    = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [insight,          setInsight]          = useState(null)
  const [isRefreshing,     setIsRefreshing]     = useState(false)

  // Memoize good habits list
  const goodHabits = useMemo(() =>
    Object.values(habits).filter(h => h.type === 'good'), [habits])

  const loadInsight = useCallback(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const yesterdayK = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const yLog     = dailyLogs[yesterdayK] || {}
    const yFitness = fitnessLogs[yesterdayK] || {}
    const pHigh    = todos.filter(t => t.status === 'pending' && t.priority === 'high')
    const pMedium  = todos.filter(t => t.status === 'pending' && t.priority === 'medium')
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

  // Profile form state
  const [displayName, setDisplayName] = useState('')
  const [dob,         setDob]         = useState('')
  const [height,      setHeight]      = useState('')
  const [weight,      setWeight]      = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  const userProfile = profile || {}
  const showBanner  = !userProfile.onboarding_completed && (!userProfile.dob || !userProfile.height || !userProfile.weight)

  useEffect(() => {
    if (profileModalOpen) {
      setDisplayName(user?.displayName || '')
      setDob(profile?.dob || '')
      setHeight(profile?.height || '')
      setWeight(profile?.weight || '')
    }
  }, [profileModalOpen, user?.displayName, profile])

  const getProgressPercentage = () => {
    let filled = 0
    if (displayName?.trim()) filled++
    if (dob)                  filled++
    if (height && parseFloat(height) > 0) filled++
    if (weight && parseFloat(weight) > 0) filled++
    return (filled / 4) * 100
  }
  const progressPercentage = getProgressPercentage()

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

  const today        = todayKey()
  const last7        = getLast7Days()
  const last30       = getLast30Days()
  const todayLog     = dailyLogs[today] || {}
  const todayFitness = fitnessLogs[today] || {}

  // Today's habits
  const doneToday = goodHabits.filter(h => h.entries?.[today]?.status === 'done').length
  const habitPct  = goodHabits.length ? Math.round((doneToday / goodHabits.length) * 100) : 0

  // Top streaks
  const topStreaks = Object.values(habits)
    .map(h => ({ ...h, streak: getHabitStreak(h.id) }))
    .filter(h => h.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 4)

  // Upcoming tasks
  const upcomingTasks = getUpcomingTodos(2)

  // Weekly points chart data (for the small mini chart at top)
  const weekDays     = getLast7Days()
  const weekChartData = weekDays.map(d => ({
    day: format(new Date(d), 'EEE'),
    pts: pointsHistory[d] || 0,
  }))

  // 7-day history rows
  const historyRows = useMemo(() =>
    getLast7Days().map(dateKey => {
      const log     = dailyLogs[dateKey] || {}
      const fitness = fitnessLogs[dateKey] || {}
      const allH    = Object.values(habits).filter(h => h.type === 'good')
      const doneCnt = allH.filter(h => h.entries?.[dateKey]?.status === 'done').length
      const pts     = pointsHistory[dateKey] || 0
      return {
        id:     dateKey,
        date:   format(new Date(dateKey), 'MMM d'),
        habits: `${doneCnt}/${allH.length}`,
        steps:  (fitness.steps || log.steps || 0).toLocaleString(),
        mood:   log.mood ? `${log.mood}/10` : '—',
        sleep:  log.wakeTime && log.sleepTime ? (() => {
          const [sh, sm] = log.sleepTime.split(':').map(Number)
          const [wh, wm] = log.wakeTime.split(':').map(Number)
          let d = (wh * 60 + wm) - (sh * 60 + sm)
          if (d < 0) d += 1440
          return `${Math.floor(d / 60)}h${d % 60 ? `${d % 60}m` : ''}`
        })() : '—',
        pts: pts > 0 ? `+${pts}` : '—',
      }
    }).reverse()
  , [dailyLogs, fitnessLogs, habits, pointsHistory])

  const historyColumns = [
    { key: 'date',   label: 'Date'   },
    { key: 'habits', label: 'Habits' },
    { key: 'steps',  label: 'Steps'  },
    { key: 'mood',   label: 'Mood'   },
    { key: 'sleep',  label: 'Sleep'  },
    { key: 'pts',    label: 'Pts'    },
  ]

  return (
    <div className="space-y-4 page-enter">
      {/* Pulse animation keyframe for skeletons */}
      <style>{`
        @keyframes dash-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Profile Banner ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="overflow-hidden"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/90 via-indigo-600/95 to-indigo-700/90 p-4 shadow-lg border border-amber-500/30 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0 animate-bounce">🎁</span>
                <div>
                  <h4 className="text-sm font-bold text-amber-200">Welcome Back!</h4>
                  <p className="text-xs text-white/95 font-medium">
                    Complete your profile setup to unlock full stats and earn +15 points!
                  </p>
                </div>
              </div>
              <button
                id="complete-setup-btn"
                onClick={() => setProfileModalOpen(true)}
                className="flex-shrink-0 bg-amber-400 hover:bg-amber-300 text-navy-950 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 text-center"
              >
                Complete Setup
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Greeting ────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
          {format(new Date(), 'EEEE, MMMM d · yyyy')}
        </p>
        <h1 className="text-lg font-display font-bold text-white mt-0.5 leading-tight">
          Good{new Date().getHours() < 12 ? ' Morning' : new Date().getHours() < 17 ? ' Afternoon' : ' Evening'},{' '}
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, var(--primary), var(--accent))' }}>
            {profile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'there'}
          </span>{' '}✦
        </h1>
      </motion.div>

      {/* ── AI Brief ────────────────────────────────────────────────── */}
      <AIMorningBrief insight={insight} onRefresh={triggerRefresh} isRefreshing={isRefreshing} />

      {/* ── Today Summary ───────────────────────────────────────────── */}
      <ModuleSummaryCard
        title={format(new Date(), 'EEE, MMM d')}
        icon="Today"
        accentRgb="99 102 241"
        tiles={[
          { label: 'Habits', value: doneToday + '/' + goodHabits.length, pct: habitPct, ringColor: habitPct >= 80 ? 'rgb(52,211,153)' : habitPct >= 50 ? 'rgb(251,191,36)' : 'rgb(248,113,113)' },
          { label: 'Steps', value: (todayFitness.steps || todayLog.steps || 0).toLocaleString(), pct: Math.min(100, Math.round(((todayFitness.steps || todayLog.steps || 0) / (settings?.stepGoal || 8000)) * 100)), ringColor: 'rgb(34,211,238)' },
          { label: 'Mood', value: todayLog.mood ? todayLog.mood + '/10' : '--', pct: todayLog.mood ? (todayLog.mood / 10) * 100 : 0, ringColor: 'rgb(192,132,252)' },
          { label: 'Points', value: '+' + todayPoints, pct: Math.min(100, (todayPoints / 50) * 100), ringColor: 'rgb(251,146,60)' },
        ]}
      />

      {/* ── Quick Actions ────────────────────────────────────────────── */}
      <QuickActionPills actions={[
        { id: 'pill-log',     icon: '📋', label: 'Log Today',   onClick: () => setQuickLogOpen(true),  accentRgb: '99 102 241' },
        { id: 'pill-journal', icon: '📓', label: 'Journal',     onClick: () => navigate('/journal'),   accentRgb: '184 158 220' },
        { id: 'pill-habits',  icon: '🏃', label: 'Habits',      onClick: () => navigate('/habits'),    accentRgb: '135 166 140' },
        { id: 'pill-task',    icon: '✅', label: 'Add Task',    onClick: () => navigate('/todo'),      accentRgb: '100 180 160' },
        { id: 'pill-fitness', icon: '💪', label: 'Log Fitness', onClick: () => navigate('/fitness'),   accentRgb: '232 124 110' },
        { id: 'pill-stats',   icon: '📈', label: 'Stats',       onClick: () => navigate('/stats'),     accentRgb: '212 168 71' },
      ]} />

      {/* ── 7-Day Log History ───────────────────────────────────────── */}
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
        <div className="glass-card p-4">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white/40 mb-3">7-Day Log History</h3>
          <DataTable columns={historyColumns} rows={historyRows} emptyMessage="No logs yet" />
        </div>
      </motion.div>

      {/* ── Quick Log button ─────────────────────────────────────────── */}
      {!todayLog.loggedAt && (
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
          <button
            id="dashboard-quick-log"
            onClick={() => setQuickLogOpen(true)}
            className="w-full glass-card p-4 flex items-center gap-3 border-dashed border-cyber-500/30 hover:border-cyber-400/50 hover:bg-white/8 transition-all duration-200 active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-cyber-500/20 flex items-center justify-center">
              <Plus size={20} className="text-cyber-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Quick Log Today</p>
              <p className="text-xs text-white/40">Tap to log your day in 30 seconds</p>
            </div>
            <div className="ml-auto">
              <span className="badge-cyan">Today</span>
            </div>
          </button>
        </motion.div>
      )}

      {/* ── Habits Progress Card (existing) ─────────────────────────── */}
      <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
                  whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.985 }}
                  onClick={() => navigate('/habits')} className="cursor-pointer">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Today's Habits
            </h3>
            <span className={`text-sm font-bold ${habitPct >= 80 ? 'text-emerald-400' : 'text-white/60'}`}>{habitPct}%</span>
          </div>
          <div className="progress-bar mb-3">
            <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${habitPct}%` }} transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {goodHabits.slice(0, 6).map(h => {
              const done = h.entries?.[today]?.status === 'done'
              return (
                <div key={h.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${done ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                  <span>{h.icon}</span>
                  <span>{h.name}</span>
                  {done && <CheckCircle2 size={10} />}
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Streaks Card (existing) ──────────────────────────────────── */}
      {topStreaks.length > 0 && (
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible"
                    whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.985 }}
                    onClick={() => navigate('/habits')} className="cursor-pointer">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Flame size={16} className="text-orange-400 streak-fire" />
              Active Streaks
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {topStreaks.map(h => (
                <div key={h.id} className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5">
                  <span className="text-lg">{h.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{h.name}</p>
                    <p className="text-xs text-orange-400 font-bold">{h.streak}🔥 day streak</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Upcoming Tasks (existing) ────────────────────────────────── */}
      {upcomingTasks.length > 0 && (
        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible"
                    whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.985 }}
                    onClick={() => navigate('/todo')} className="cursor-pointer">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar size={16} className="text-cyber-400" />
                Upcoming Tasks
              </h3>
              <span className="text-xs text-white/40">{upcomingTasks.length} tasks</span>
            </div>
            <div className="space-y-2">
              {upcomingTasks.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{task.title}</p>
                    <p className="text-xs text-white/40">
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM d, h:mm a') : 'No due date'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Weekly Points Mini Chart (existing) ─────────────────────── */}
      <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible"
                  whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.985 }}
                  onClick={() => navigate('/stats')} className="cursor-pointer">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-cyber-400" />
              This Week's Points
            </h3>
            <span className="text-xs text-cyber-400 font-semibold">
              {weekChartData.reduce((s, d) => s + d.pts, 0)} pts
            </span>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={weekChartData}>
              <defs>
                <linearGradient id="ptsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="rgb(var(--color-cyber-500))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="rgb(var(--color-cyber-500))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: 'rgb(var(--color-white) / 0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgb(var(--color-navy-900))', border: '1px solid rgb(var(--color-white) / 0.1)', borderRadius: 8 }}
                labelStyle={{ color: 'rgb(var(--color-white) / 0.6)', fontSize: 11 }}
                itemStyle={{ color: 'rgb(var(--color-cyber-500))', fontSize: 11 }}
              />
              <Area type="monotone" dataKey="pts" stroke="rgb(var(--color-cyber-500))" fill="url(#ptsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Sleep (existing) ─────────────────────────────────────────── */}
      <AnimatePresence>
        {settings?.sleepTrackerEnabled !== false && (todayLog.wakeTime || todayLog.sleepTime) && (
          <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible" exit={{ opacity: 0, height: 0 }}
                      whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.985 }}
                      onClick={() => navigate('/log')} className="cursor-pointer overflow-hidden">
            <div className="glass-card p-4 flex items-center gap-4">
              <span className="text-3xl">😴</span>
              <div className="flex-1">
                <p className="text-xs text-white/40 font-medium mb-0.5">Last Night's Sleep</p>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <p className="text-sm font-semibold text-white">
                    {todayLog.sleepTime || '—'} → {todayLog.wakeTime || '—'}
                  </p>
                  {todayLog.sleepTime && todayLog.wakeTime && (
                    <span className="text-xs text-cyber-400 font-medium flex items-center gap-1 bg-cyber-500/10 border border-cyber-500/20 px-2.5 py-0.5 rounded-full">
                      <Moon size={10} className="text-cyber-400" />
                      {calculateSleepDuration(todayLog.sleepTime, todayLog.wakeTime)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          NEW SECTIONS BELOW 7-DAY LOG HISTORY
      ═══════════════════════════════════════════════════════════════ */}

      {/* SECTION 1 — Habit Breakdown Grid */}
      <HabitBreakdownGrid
        habits={habits}
        getHabitStreak={getHabitStreak}
        last7={last7}
      />

      {/* SECTION 2 — Weekly Trend Chart (enhanced, full tooltip) */}
      <WeeklyTrendChart
        pointsHistory={pointsHistory}
        habits={habits}
        last7={last7}
      />

      {/* SECTION 3 — Upcoming Tasks Widget (next 3 days) */}
      <UpcomingTasksWidget todos={todos} navigate={navigate} />

      {/* SECTION 4 — Streak Summary Strip */}
      <StreakStrip habits={habits} getHabitStreak={getHabitStreak} />

      {/* SECTION 5 — Monthly Heatmap */}
      <MonthlyHeatmap
        pointsHistory={pointsHistory}
        habits={habits}
        last30={last30}
      />

      {/* bottom padding for nav */}
      <div style={{ height: '1.5rem' }} />

      {/* ── Profile Modal (existing) ─────────────────────────────────── */}
      <AnimatePresence>
        {profileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setProfileModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[85vh]"
            >
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} className="bg-gradient-to-r from-teal-400 to-blue-500 h-full rounded-full" />
              </div>
              <div className="px-6 pt-5 pb-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">🎁 Complete Your Profile</h2>
                  <p className="text-[10px] text-white/40 mt-0.5">Unlock full stats & earn +15 points!</p>
                </div>
                <button onClick={() => setProfileModalOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all duration-200 active:scale-90">
                  <span className="text-white/60 text-sm">✕</span>
                </button>
              </div>
              <form onSubmit={handleProfileSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/50 mb-1">
                    <span>Profile Completion</span>
                    <span className="text-teal-400 font-bold">{progressPercentage}%</span>
                  </div>
                  {[
                    { id: 'display-name-input', label: 'Display Name', type: 'text', value: displayName, onChange: e => setDisplayName(e.target.value), placeholder: 'Your Name' },
                    { id: 'dob-input', label: 'Date of Birth', type: 'date', value: dob, onChange: e => setDob(e.target.value), placeholder: '' },
                    { id: 'height-input', label: 'Height (cm)', type: 'number', value: height, onChange: e => setHeight(e.target.value), placeholder: 'e.g. 175', min: 50, max: 300 },
                    { id: 'weight-input', label: 'Weight (kg)', type: 'number', value: weight, onChange: e => setWeight(e.target.value), placeholder: 'e.g. 72.5', min: 10, max: 500, step: 0.1 },
                  ].map(field => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className="text-xs text-white/40 block mb-1 font-medium">{field.label}</label>
                      <input id={field.id} {...field} label={undefined} required className="input-cyber text-sm w-full font-sans bg-background/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyber-500 transition-all" />
                    </div>
                  ))}
                </div>
                <div className="flex-shrink-0 p-4 border-t border-white/10 bg-card flex items-center justify-between gap-3">
                  <button type="button" onClick={() => setProfileModalOpen(false)} className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 px-4 rounded-xl transition-all">Cancel</button>
                  <button type="submit" disabled={submitting || progressPercentage < 100}
                    className={`w-1/2 font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] ${progressPercentage === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md cursor-pointer' : 'bg-slate-700 text-white/40 border border-white/5 cursor-not-allowed'}`}
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
  )
}
