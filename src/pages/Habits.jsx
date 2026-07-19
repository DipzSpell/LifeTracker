/**
 * Habits.jsx — Habit Tracker (design-system restyle).
 *
 * Layout: week-view strip (7-day dots + weekly %) → good/bad tabs →
 * habits grouped by time-of-day (Morning / Afternoon / Evening) as
 * glass-card rows with a check circle on the right.
 *
 * Logic preserved: LOG_HABIT / ADD_HABIT / DELETE_HABIT dispatches, streak
 * notifications, victory sound, good/bad tabs, skip/fail states (now compact
 * icon buttons next to the check circle instead of full-width buttons).
 *
 * timeOfDay: new habits pick it in the Add modal (stored on the habit —
 * additive field, schema-safe). Older habits without it are grouped via
 * CATEGORY_TIME_FALLBACK below (UI-only mapping, nothing written back).
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { useApp } from '../context/AppContext'
import { todayKey, dateKey } from '../lib/storage'
import { playVictorySound } from '../lib/sounds'
import Modal from '../components/ui/Modal'
import { Plus, Flame, Trash2, TrendingUp, Check, X, SkipForward } from 'lucide-react'

/* ── Design-system palette (mirrors src/styles/theme.css) — CSS-var strings
   so they re-resolve live on theme switch ──────────────────────────────── */
const LIME = 'var(--success)'
const CYAN = 'var(--accent)'
const CORAL = 'var(--danger)'
const MONO = "'JetBrains Mono', ui-monospace, monospace"

const HABIT_ICONS = ['🏋️','🚶','📚','🧘','💧','😴','🎯','💪','🥗','✍️','🎵','🏃','🧹','💊','🛁','☀️','🌙','🤸','🎨','🎮']
const HABIT_CATEGORIES = ['fitness', 'mind', 'health', 'productivity', 'social', 'other']

/* ── Time-of-day grouping ─────────────────────────────────────────────────── */
const TIME_GROUPS = [
  { id: 'morning',   label: '☀️ Morning' },
  { id: 'afternoon', label: '🌤 Afternoon' },
  { id: 'evening',   label: '🌙 Evening' },
]

// UI-only fallback for habits created before the timeOfDay field existed.
const CATEGORY_TIME_FALLBACK = {
  fitness: 'morning',
  health: 'morning',
  productivity: 'afternoon',
  other: 'afternoon',
  mind: 'evening',
  social: 'evening',
}

const timeGroupOf = h => h.timeOfDay || CATEGORY_TIME_FALLBACK[h.category] || 'afternoon'

/* ─────────────────────────────────────────────────────────────────────────────
   ADD HABIT MODAL
───────────────────────────────────────────────────────────────────────────── */
function AddHabitModal({ isOpen, onClose }) {
  const { dispatch } = useApp()
  const [form, setForm] = useState({ name: '', icon: '🎯', type: 'good', category: 'other', timeOfDay: 'morning' })

  const handleAdd = () => {
    if (!form.name.trim()) return
    const id = `habit_${Date.now()}`
    dispatch({
      type: 'ADD_HABIT',
      payload: { id, ...form, entries: {}, createdAt: new Date().toISOString() },
    })
    setForm({ name: '', icon: '🎯', type: 'good', category: 'other', timeOfDay: 'morning' })
    onClose()
  }

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="glass-btn w-1/2"
        style={{ padding: '0.65rem 1rem', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}
      >
        Cancel
      </button>
      <button
        id="habit-add-confirm"
        onClick={handleAdd}
        disabled={!form.name.trim()}
        className="glass-btn glass-btn-accent w-1/2"
        style={{ padding: '0.65rem 1rem', fontSize: 13, fontWeight: 700 }}
      >
        Save Habit
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Habit" footer={footer}>
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Habit Name</label>
        <input id="habit-name" type="text" placeholder="e.g. Read 20 mins"
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="glass-input" />
      </div>

      <div>
        <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Pick an Icon</label>
        <div className="flex flex-wrap gap-2">
          {HABIT_ICONS.map(icon => (
            <button key={icon} id={`habit-icon-${icon}`}
              onClick={() => setForm(f => ({ ...f, icon }))}
              className="w-10 h-10 rounded-xl text-xl transition-all"
              style={form.icon === icon
                ? { background: 'rgb(var(--accent-rgb)/0.15)', border: `1px solid ${CYAN}` }
                : { background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}>
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Type</label>
        <div className="flex gap-2">
          {[
            { val: 'good', label: '✅ Good Habit', activeStyle: { border: '1px solid rgb(var(--success-rgb)/0.5)', background: 'rgb(var(--success-rgb)/0.12)', color: LIME } },
            { val: 'bad', label: '⚠️ Bad Habit to Reduce', activeStyle: { border: '1px solid rgb(var(--danger-rgb)/0.5)', background: 'rgb(var(--danger-rgb)/0.12)', color: CORAL } },
          ].map(({ val, label, activeStyle }) => (
            <button key={val} id={`habit-type-${val}`}
              onClick={() => setForm(f => ({ ...f, type: val }))}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={form.type === val
                ? activeStyle
                : { border: '1px solid var(--border-subtle)', background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Time of Day</label>
        <div className="flex gap-2">
          {TIME_GROUPS.map(({ id, label }) => (
            <button key={id} id={`habit-time-${id}`}
              onClick={() => setForm(f => ({ ...f, timeOfDay: id }))}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={form.timeOfDay === id
                ? { border: `1px solid ${CYAN}`, background: 'rgb(var(--accent-rgb)/0.12)', color: CYAN }
                : { border: '1px solid var(--border-subtle)', background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Category</label>
        <div className="flex flex-wrap gap-2">
          {HABIT_CATEGORIES.map(c => (
            <button key={c} id={`habit-cat-${c}`}
              onClick={() => setForm(f => ({ ...f, category: c }))}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
              style={form.category === c
                ? { border: '1px solid rgb(var(--accent-rgb)/0.5)', background: 'rgb(var(--accent-rgb)/0.12)', color: CYAN }
                : { border: '1px solid var(--border-subtle)', background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
              {c}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   WEEK VIEW STRIP — 7-day dots + weekly completion %
   Dot filled (lime) when EVERY good habit was done that day; border-only
   otherwise; today gets a cyan ring.
───────────────────────────────────────────────────────────────────────────── */
function WeekStrip({ goodHabits }) {
  const today = todayKey()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return { date: d, key: dateKey(d) }
  })

  let done = 0, total = 0
  days.forEach(({ key }) => {
    goodHabits.forEach(h => {
      total++
      if (h.entries?.[key]?.status === 'done') done++
    })
  })
  const weeklyPct = total > 0 ? Math.round((done / total) * 100) : 0
  const pctColor = weeklyPct >= 70 ? LIME : weeklyPct >= 40 ? CYAN : CORAL

  return (
    <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <span className="section-label flex items-center gap-1.5">
          <TrendingUp size={13} style={{ color: CYAN }} /> This Week
        </span>
        <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: pctColor }}>
          {weeklyPct}%
        </span>
      </div>
      <div className="flex justify-between" style={{ maxWidth: 360, margin: '0 auto' }}>
        {days.map(({ date, key }) => {
          const dayDone = goodHabits.length > 0 &&
            goodHabits.every(h => h.entries?.[key]?.status === 'done')
          const isToday = key === today
          return (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <span style={{ fontSize: 10, color: isToday ? CYAN : 'var(--text-muted)', fontWeight: isToday ? 700 : 400 }}>
                {format(date, 'EEEEE')}
              </span>
              <div style={{
                width: 13, height: 13, borderRadius: '50%',
                background: dayDone ? LIME : 'transparent',
                border: dayDone ? 'none' : '1.5px solid var(--border-glass)',
                boxShadow: isToday ? `0 0 0 1.5px ${CYAN}` : 'none',
              }} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   HABIT ROW — glass-card: icon · name/streak · secondary states · check circle
───────────────────────────────────────────────────────────────────────────── */
function SmallStateBtn({ id, title, active, activeColor, onClick, children }) {
  return (
    <button
      id={id}
      title={title}
      onClick={onClick}
      className="flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
      style={{
        width: 28, height: 28, borderRadius: '50%',
        border: active ? `1.5px solid ${activeColor}` : '1px solid var(--border-subtle)',
        background: active ? `color-mix(in srgb, ${activeColor} 12%, transparent)` : 'transparent',
        color: active ? activeColor : 'var(--text-muted)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function HabitRow({ habit }) {
  const { dispatch, getHabitStreak, settings, notify } = useApp()
  const today = todayKey()
  const entry = habit.entries?.[today]
  const status = entry?.status
  const streak = getHabitStreak(habit.id)
  const isBad = habit.type === 'bad'
  const isChecked = isBad ? status === 'clean' : status === 'done'

  const logHabit = (s) => {
    dispatch({ type: 'LOG_HABIT', payload: { habitId: habit.id, date: today, status: s } })
    const isSuccess = habit.type === 'good' ? s === 'done' : s === 'clean'
    if (isSuccess) {
      if (settings?.soundEffectsEnabled !== false) playVictorySound()
      // Streak notification — fires every time a habit is successfully logged
      const streakMsg = streak >= 1
        ? `${habit.icon} "${habit.name}" streak is live — ${streak + 1} days strong!`
        : `${habit.icon} "${habit.name}" marked done. Keep it up!`
      notify('Streak Flaming! 🔥', streakMsg, 'streak')
    }
  }

  const deleteHabit = () => {
    if (confirm(`Delete "${habit.name}"? All history will be lost.`)) {
      dispatch({ type: 'DELETE_HABIT', payload: habit.id })
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass-card flex items-center gap-3"
      style={{
        padding: '0.75rem 0.9rem',
        transition: 'border-color 0.25s, background 0.25s',
        ...(isChecked
          ? { borderColor: 'rgb(var(--success-rgb)/0.45)', background: 'rgb(var(--success-rgb)/0.07)' }
          : isBad && status === 'done'
            ? { borderColor: 'rgb(var(--danger-rgb)/0.4)', background: 'rgb(var(--danger-rgb)/0.06)' }
            : {}),
      }}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: isChecked ? 'rgb(var(--success-rgb)/0.12)' : 'var(--bg-glass)' }}>
        {habit.icon}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', margin: 0 }}>
          {habit.name}
        </p>
        <div className="flex items-center gap-2" style={{ marginTop: 1 }}>
          <span className="text-xs capitalize" style={{ color: isBad ? CORAL : 'var(--text-muted)' }}>
            {habit.category}
          </span>
          {streak > 0 && (
            <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: LIME, fontFamily: MONO }}>
              <Flame size={10} /> {streak}d
            </span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button onClick={deleteHabit} className="p-1 transition-colors flex-shrink-0"
        style={{ color: 'var(--text-muted)', opacity: 0.5 }}
        onMouseEnter={e => { e.currentTarget.style.color = CORAL; e.currentTarget.style.opacity = 1 }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.opacity = 0.5 }}>
        <Trash2 size={14} />
      </button>

      {/* Secondary states */}
      {isBad ? (
        <SmallStateBtn
          id={`habit-${habit.id}-done`}
          title="Did it (slipped)"
          active={status === 'done'}
          activeColor={CORAL}
          onClick={() => logHabit(status === 'done' ? null : 'done')}
        >
          <X size={13} />
        </SmallStateBtn>
      ) : (
        <>
          <SmallStateBtn
            id={`habit-${habit.id}-skip`}
            title="Skip today"
            active={status === 'skipped'}
            activeColor={CYAN}
            onClick={() => logHabit(status === 'skipped' ? null : 'skipped')}
          >
            <SkipForward size={12} />
          </SmallStateBtn>
          <SmallStateBtn
            id={`habit-${habit.id}-fail`}
            title="Failed today"
            active={status === 'failed'}
            activeColor={CORAL}
            onClick={() => logHabit(status === 'failed' ? null : 'failed')}
          >
            <X size={13} />
          </SmallStateBtn>
        </>
      )}

      {/* Check circle — done (good) / resisted (bad) */}
      <button
        id={isBad ? `habit-${habit.id}-clean` : `habit-${habit.id}-done`}
        title={isBad ? 'Resisted today' : 'Done today'}
        onClick={() => logHabit(isChecked ? null : (isBad ? 'clean' : 'done'))}
        className="flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
        style={{
          width: 36, height: 36, borderRadius: '50%',
          border: isChecked ? `1.5px solid ${LIME}` : '1.5px solid var(--border-glass)',
          background: isChecked ? 'rgb(var(--success-rgb)/0.15)' : 'transparent',
          cursor: 'pointer',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <AnimatePresence>
          {isChecked && (
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="flex"
            >
              <Check size={17} style={{ color: LIME }} strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function Habits() {
  const { habits } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [tab, setTab] = useState('good')

  const goodHabits = Object.values(habits).filter(h => h.type === 'good')
  const badHabits = Object.values(habits).filter(h => h.type === 'bad')

  const shown = tab === 'good' ? goodHabits : badHabits

  // Group by time-of-day, keeping TIME_GROUPS order; empty groups skipped.
  const grouped = TIME_GROUPS
    .map(g => ({ ...g, items: shown.filter(h => timeGroupOf(h) === g.id) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Habit Tracker</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Build consistency, one day at a time</p>
        </div>
        <button id="habit-add-btn" onClick={() => setAddOpen(true)}
          className="glass-btn glass-btn-accent"
          style={{ width: 36, height: 36, minHeight: 36, padding: 0 }}>
          <Plus size={18} style={{ color: CYAN }} />
        </button>
      </div>

      {/* Week view strip */}
      <WeekStrip goodHabits={goodHabits} />

      {/* Tab toggle */}
      <div className="flex rounded-xl p-1" style={{ background: 'var(--bg-glass)' }}>
        <button id="habits-tab-good" onClick={() => setTab('good')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={tab === 'good'
            ? { background: 'rgb(var(--success-rgb)/0.15)', color: LIME, border: '1px solid rgb(var(--success-rgb)/0.35)' }
            : { color: 'var(--text-muted)', border: '1px solid transparent' }}>
          ✅ Good Habits ({goodHabits.length})
        </button>
        <button id="habits-tab-bad" onClick={() => setTab('bad')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          style={tab === 'bad'
            ? { background: 'rgb(var(--danger-rgb)/0.12)', color: CORAL, border: '1px solid rgb(var(--danger-rgb)/0.35)' }
            : { color: 'var(--text-muted)', border: '1px solid transparent' }}>
          ⚠️ To Reduce ({badHabits.length})
        </button>
      </div>

      {/* Habit list — grouped by time of day */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {shown.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-card p-8 text-center flex flex-col items-center justify-center">
              <p className="text-3xl mb-2">{tab === 'good' ? '🌱' : '🎯'}</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No {tab === 'bad' ? 'bad habits to track' : 'habits yet'}
              </p>
              <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
                Create your custom {tab === 'good' ? 'good habit' : 'bad habit'} here
              </p>
              <button
                id="habit-add-empty-btn"
                onClick={() => setAddOpen(true)}
                className="glass-btn glass-btn-accent"
                style={{ padding: '0.6rem 1.1rem', fontSize: 12, fontWeight: 700 }}
              >
                <Plus size={14} /> Add Habit
              </button>
            </motion.div>
          ) : (
            grouped.map(group => (
              <motion.div key={group.id} layout className="space-y-2">
                <p className="section-label" style={{ margin: '0.35rem 0.25rem 0' }}>{group.label}</p>
                {group.items.map(h => <HabitRow key={h.id} habit={h} />)}
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {shown.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-2"
          >
            <button
              id="habit-add-bottom-btn"
              onClick={() => setAddOpen(true)}
              className="glass-btn w-full"
              style={{ padding: '0.75rem', fontSize: 12, fontWeight: 700 }}
            >
              <Plus size={16} style={{ color: CYAN }} /> Add Custom Habit
            </button>
          </motion.div>
        )}
      </div>

      <AddHabitModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
