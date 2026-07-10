import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { useApp } from '../context/AppContext'
import { todayKey } from '../lib/storage'
import { playLevelUpSound, playVictorySound } from '../lib/sounds'
import { useCelebration } from '../hooks/useCelebration'
import EmojiMoodPicker from '../components/ui/EmojiMoodPicker'
import {
  Save, Dumbbell, Clock, Droplets, BookOpen, Heart,
  CheckCircle2, Loader2, ListChecks, Flame, ChevronDown, ChevronUp,
} from 'lucide-react'
import Toast, { useToast } from '../components/ui/Toast'

// ─── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ icon: Icon, color, title, children, badge }) => (
  <div className="glass-card p-4">
    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
      <Icon size={16} className={color} />
      <span className="flex-1">{title}</span>
      {badge}
    </h3>
    {children}
  </div>
)

// ─── Habit toggle pill (inline log-page variant) ───────────────────────────────
function HabitPill({ habit, today, onToggle }) {
  const entry  = habit.entries?.[today]
  const status = entry?.status
  const isBad  = habit.type === 'bad'

  // For good habits: "done" = success. For bad habits: "clean" = resisted (success).
  const isSuccess = isBad ? status === 'clean' : status === 'done'
  const isFailed  = isBad ? status === 'done'  : status === 'failed'
  const isSkipped = status === 'skipped'

  const handleClick = () => {
    if (isBad) {
      onToggle(habit.id, status === 'clean' ? null : 'clean')
    } else {
      onToggle(habit.id, status === 'done' ? null : 'done')
    }
  }

  return (
    <motion.button
      id={`log-habit-${habit.id}`}
      layout
      whileTap={{ scale: 0.93 }}
      onClick={handleClick}
      className={`
        flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left
        transition-all duration-200 w-full
        ${isSuccess
          ? 'border-emerald-500/50 bg-emerald-500/12 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
          : isFailed
            ? 'border-red-500/30 bg-red-500/8'
            : isSkipped
              ? 'border-yellow-500/30 bg-yellow-500/8'
              : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
        }
      `}
    >
      {/* Icon bubble */}
      <span className={`
        flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base
        transition-colors
        ${isSuccess ? 'bg-emerald-500/25' : 'bg-white/8'}
      `}>
        {habit.icon}
      </span>

      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${isSuccess ? 'text-emerald-300' : 'text-white/80'}`}>
          {habit.name}
        </p>
        <p className="text-[10px] text-white/30 capitalize">{habit.category}</p>
      </div>

      {/* Status indicator */}
      <div className={`
        flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
        transition-all duration-200
        ${isSuccess
          ? 'border-emerald-400 bg-emerald-400'
          : isBad && status === 'done'
            ? 'border-red-400 bg-red-400/30'
            : 'border-white/20'
        }
      `}>
        {isSuccess && <span className="text-white text-[9px] font-bold">✓</span>}
        {isBad && status === 'done' && <span className="text-red-300 text-[9px]">✕</span>}
      </div>
    </motion.button>
  )
}

// ─── Circular progress ring ───────────────────────────────────────────────────
function ProgressRing({ pct, size = 48, stroke = 4, color = 'var(--primary)' }) {
  const r  = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ─── Loading skeleton for a single section ─────────────────────────────────────
function SectionSkeleton({ rows = 2 }) {
  return (
    <div className="glass-card p-4 space-y-3 animate-pulse">
      <div className="h-4 w-32 bg-white/10 rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-white/5 rounded-xl" />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DailyLog() {
  const {
    dispatch, dailyLogs, habits, settings, recalcPoints, initialized,
    getHabitStreak, notify,
  } = useApp()
  const { toasts, addToast, removeToast } = useToast()
  const { celebrate } = useCelebration()
  const today = todayKey()

  // ── Derived existing data ────────────────────────────────────────────────────
  // Re-compute whenever dailyLogs changes (fires when AppContext initializes)
  const existing = dailyLogs[today] || {}

  const sleepEnabled   = settings?.sleepTrackerEnabled   !== false
  const fitnessEnabled = settings?.fitnessTrackerEnabled !== false

  // ── Form state ───────────────────────────────────────────────────────────────
  const buildForm = useCallback((src) => ({
    gymStatus:    src.gymStatus    || '',
    workoutType:  src.workoutType  || '',
    brushed:      src.brushed      || false,
    bathed:       src.bathed       || false,
    meditated:    src.meditated    || false,
    wakeTime:     src.wakeTime     || '',
    sleepTime:    src.sleepTime    || '',
    mood:         src.mood         || 0,
    notes:        src.notes        || '',
    waterGlasses: src.waterGlasses || 0,
    steps:        src.steps        !== undefined ? String(src.steps || '') : '',
  }), [])

  const [form, setForm] = useState(() => buildForm(existing))

  // ── ① Async hydration: re-sync form ONCE when AppContext finishes loading ──────
  // This handles the race condition where the component mounts before Supabase
  // data has been fetched. The `initialized` flag flips to true after the load.
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (initialized && !hydratedRef.current) {
      hydratedRef.current = true
      setForm(buildForm(dailyLogs[today] || {}))
      // Also update the alreadyLoggedRef to reflect the loaded state
      alreadyLoggedRef.current = !!(dailyLogs[today]?.loggedAt)
    }
  }, [initialized, today]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Anti-exploit guards ──────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const alreadyLoggedRef                  = useRef(!!existing.loggedAt)
  // Track which habit IDs were already done at the start of THIS session
  // so the update path can detect NEWLY checked habits for incremental points.
  const snapshotHabitsRef = useRef(null)

  // ── Habits data ──────────────────────────────────────────────────────────────
  const goodHabits = useMemo(() =>
    Object.values(habits)
      .filter(h => h.type === 'good')
      .sort((a, b) => a.name.localeCompare(b.name))
  , [habits])

  const badHabits = useMemo(() =>
    Object.values(habits)
      .filter(h => h.type === 'bad')
      .sort((a, b) => a.name.localeCompare(b.name))
  , [habits])

  const allHabits = useMemo(() => [...goodHabits, ...badHabits], [goodHabits, badHabits])

  // Habit checklist completion counts
  const habitsDoneCount = goodHabits.filter(h => h.entries?.[today]?.status === 'done').length
  const habitsPct       = goodHabits.length ? Math.round((habitsDoneCount / goodHabits.length) * 100) : 0

  // Collapse state for habits section (open by default if any habits exist)
  const [habitsExpanded, setHabitsExpanded] = useState(true)

  // ── Habit toggle handler ─────────────────────────────────────────────────────
  const handleHabitToggle = useCallback((habitId, status) => {
    dispatch({ type: 'LOG_HABIT', payload: { habitId, date: today, status } })
    const habit = habits[habitId]
    if (!habit) return

    const isSuccess = habit.type === 'good' ? status === 'done' : status === 'clean'
    if (isSuccess && settings?.soundEffectsEnabled !== false) {
      playVictorySound()
    }
    if (isSuccess) {
      const streak = getHabitStreak(habitId)
      notify(
        'Habit logged! 🎯',
        `${habit.icon} "${habit.name}" ${streak >= 1 ? `— ${streak + 1} day streak!` : 'done for today!'}`,
        'streak',
      )
    }
  }, [dispatch, habits, today, settings, getHabitStreak, notify])

  const WORKOUT_TYPES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body', 'HIIT', 'Yoga']

  // ── ③ Intelligent save handler ───────────────────────────────────────────────
  const handleSave = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      // Snapshot habit completion state BEFORE this save (for delta calculation)
      if (!snapshotHabitsRef.current) {
        snapshotHabitsRef.current = new Set(
          goodHabits
            .filter(h => h.entries?.[today]?.status === 'done')
            .map(h => h.id)
        )
      }

      const isFirstLog = !alreadyLoggedRef.current

      const wakeHour  = form.wakeTime  ? parseInt(form.wakeTime.split(':')[0])  : null
      const sleepHour = form.sleepTime ? parseInt(form.sleepTime.split(':')[0]) : null

      // ─ Dispatch the daily log update ─
      dispatch({
        type: 'SAVE_DAILY_LOG',
        payload: {
          date: today,
          log: {
            ...form,
            steps:        parseInt(form.steps) || 0,
            wokeEarly:    wakeHour  !== null && wakeHour  < 6,
            sleptOnTime:  sleepHour !== null && sleepHour <= 23,
            sleptLate:    sleepHour !== null && sleepHour >= 2,
            waterGoalMet: form.waterGlasses >= 8,
            // Preserve original timestamp on re-saves; only stamp on first save
            ...(isFirstLog ? { loggedAt: new Date().toISOString() } : {}),
          },
        },
      })

      // ─ Sync habits that are cross-linked from the daily log form ─
      if (form.gymStatus  === 'done') dispatch({ type: 'LOG_HABIT', payload: { habitId: 'habit_gym',      date: today, status: 'done' } })
      if (form.meditated)             dispatch({ type: 'LOG_HABIT', payload: { habitId: 'habit_meditate', date: today, status: 'done' } })
      if (form.waterGlasses >= 8)     dispatch({ type: 'LOG_HABIT', payload: { habitId: 'habit_water',    date: today, status: 'done' } })

      // ─ Recalculate points after React state settles ─
      setTimeout(recalcPoints, 120)

      // ─ Celebration logic — strict anti-exploit ─
      if (isFirstLog) {
        // FIRST ever save today — full celebration
        // Ref is intentionally updated here (event handler) in addition to the
        // hydration effect above, marking the session "already logged" so a
        // re-save in the same session is treated as an update, not a first log.
        // eslint-disable-next-line react-hooks/immutability
        alreadyLoggedRef.current = true
        snapshotHabitsRef.current = new Set(
          goodHabits.filter(h => h.entries?.[today]?.status === 'done').map(h => h.id)
        )

        celebrate()
        playLevelUpSound()
        addToast('Day logged! Points awarded & streak updated 🏆', 'success')
      } else {
        // RE-SAVE — detect newly checked habits since session start
        const prevSnapshot = snapshotHabitsRef.current || new Set()
        const newlyDone = goodHabits.filter(
          h => h.entries?.[today]?.status === 'done' && !prevSnapshot.has(h.id)
        )

        // Update snapshot with current state
        snapshotHabitsRef.current = new Set(
          goodHabits.filter(h => h.entries?.[today]?.status === 'done').map(h => h.id)
        )

        if (newlyDone.length > 0) {
          // Newly checked habits this session — award incremental feedback
          playVictorySound()
          addToast(`Log updated! +${newlyDone.length} new habit${newlyDone.length > 1 ? 's' : ''} checked ✅`, 'success')
        } else {
          addToast('Log updated! 📝', 'info')
        }
      }

    } catch (err) {
      console.error('[DailyLog] Save failed:', err)
      addToast('Something went wrong. Please try again.', 'error')
    } finally {
      setTimeout(() => setIsSubmitting(false), 1200)
    }
  }

  // ── Loading skeleton while AppContext is fetching from Supabase ──────────────
  if (!initialized) {
    return (
      <div className="space-y-4 page-enter">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-24 bg-white/10 rounded-lg animate-pulse" />
            <div className="h-3 w-40 bg-white/5 rounded mt-1 animate-pulse" />
          </div>
        </div>
        <SectionSkeleton rows={3} />
        <SectionSkeleton rows={2} />
        <SectionSkeleton rows={4} />
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 page-enter">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Daily Log</h1>
          <p className="text-xs text-white/40">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <AnimatePresence>
          {existing.loggedAt && (
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              className="badge-green flex items-center gap-1"
            >
              <CheckCircle2 size={10} />
              Logged today
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── ② TODAY'S HABITS CHECKLIST ── */}
      {allHabits.length > 0 && (
        <div className="glass-card overflow-hidden">
          {/* Section header — collapsible */}
          <button
            id="log-habits-toggle"
            onClick={() => setHabitsExpanded(v => !v)}
            className="w-full flex items-center gap-2 p-4 hover:bg-white/5 transition-colors"
          >
            <ListChecks size={16} className="text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-white flex-1 text-left">
              Today's Habits Checklist
            </span>

            {/* Progress ring + count */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="relative flex items-center justify-center">
                <ProgressRing pct={habitsPct} size={36} stroke={3} color="var(--accent)" />
                <span className="absolute text-[9px] font-bold text-white/80">
                  {habitsPct}%
                </span>
              </div>
              <span className="text-[10px] text-white/40 font-medium">
                {habitsDoneCount}/{goodHabits.length}
              </span>
              {habitsExpanded
                ? <ChevronUp size={14} className="text-white/30" />
                : <ChevronDown size={14} className="text-white/30" />
              }
            </div>
          </button>

          <AnimatePresence initial={false}>
            {habitsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4">

                  {/* Progress bar */}
                  <div className="progress-bar">
                    <motion.div
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${habitsPct}%` }}
                      transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                    />
                  </div>

                  {/* Good habits */}
                  {goodHabits.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70 mb-2">
                        ✅ Good Habits
                      </p>
                      <div className="space-y-2">
                        <AnimatePresence>
                          {goodHabits.map(h => (
                            <motion.div
                              key={h.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <HabitPill habit={h} today={today} onToggle={handleHabitToggle} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* Bad habits */}
                  {badHabits.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-400/70 mb-2">
                        ⚠️ Habits to Resist
                      </p>
                      <div className="space-y-2">
                        <AnimatePresence>
                          {badHabits.map(h => (
                            <motion.div
                              key={h.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <HabitPill habit={h} today={today} onToggle={handleHabitToggle} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* Quick streak highlights */}
                  {(() => {
                    const streakers = goodHabits
                      .map(h => ({ ...h, streak: getHabitStreak(h.id) }))
                      .filter(h => h.streak >= 2)
                      .sort((a, b) => b.streak - a.streak)
                      .slice(0, 3)

                    return streakers.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {streakers.map(h => (
                          <span key={h.id}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1
                                       rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300">
                            <Flame size={9} className="text-orange-400" />
                            {h.icon} {h.streak}d streak
                          </span>
                        ))}
                      </div>
                    ) : null
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Gym & Workout ── */}
      <AnimatePresence>
        {fitnessEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Section icon={Dumbbell} color="text-orange-400" title="Gym & Workout">
              <div className="flex gap-2 mb-3">
                {[
                  { val: 'done',    label: '💪 Done',     color: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' },
                  { val: 'skipped', label: '❌ Skipped',  color: 'border-red-500/50 bg-red-500/15 text-red-300' },
                  { val: 'rest',    label: '🛋️ Rest Day', color: 'border-yellow-500/50 bg-yellow-500/15 text-yellow-300' },
                ].map(({ val, label, color }) => (
                  <button key={val} id={`log-gym-${val}`}
                    onClick={() => setForm(f => ({ ...f, gymStatus: val }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                      form.gymStatus === val ? color : 'border-white/10 bg-white/5 text-white/40'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {form.gymStatus === 'done' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <label className="text-xs text-white/40 block mb-2">Workout Type</label>
                    <div className="flex flex-wrap gap-2">
                      {WORKOUT_TYPES.map(t => (
                        <button key={t} id={`log-workout-${t.toLowerCase()}`}
                          onClick={() => setForm(f => ({ ...f, workoutType: t }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            form.workoutType === t
                              ? 'border-cyber-500/50 bg-cyber-500/20 text-cyber-300'
                              : 'border-white/10 bg-white/5 text-white/40'
                          }`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Morning Routine ── */}
      <Section icon={Heart} color="text-pink-400" title="Morning Routine">
        <div className="space-y-2">
          {[
            { key: 'brushed',   label: 'Brushed Teeth',     icon: '🦷' },
            { key: 'bathed',    label: 'Bathed / Showered',  icon: '🚿' },
            { key: 'meditated', label: 'Meditated',          icon: '🧘' },
          ].map(({ key, label, icon }) => (
            <button key={key} id={`log-${key}`}
              onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                form[key] ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 bg-white/5'
              }`}>
              <span className="text-lg">{icon}</span>
              <span className="flex-1 text-sm font-medium text-white text-left">{label}</span>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                form[key] ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'
              }`}>
                {form[key] && <span className="text-white text-xs">✓</span>}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Sleep + Steps ── */}
      <AnimatePresence>
        {(sleepEnabled || fitnessEnabled) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Section icon={Clock} color="text-cyber-400" title="Sleep & Steps">
              <AnimatePresence initial={false}>
                {sleepEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-2 gap-3 mb-3 overflow-hidden"
                  >
                    <div>
                      <label htmlFor="log-wake" className="text-xs text-white/40 mb-1 block">
                        Wake Time
                        {form.wakeTime && (
                          <span className="ml-2 text-cyber-400 font-semibold">{form.wakeTime}</span>
                        )}
                      </label>
                      <input id="log-wake" type="time"
                        value={form.wakeTime}
                        onChange={e => setForm(f => ({ ...f, wakeTime: e.target.value }))}
                        className="input-cyber text-sm w-full"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="log-sleep" className="text-xs text-white/40 mb-1 block">
                        Sleep Time
                        {form.sleepTime && (
                          <span className="ml-2 text-cyber-400 font-semibold">{form.sleepTime}</span>
                        )}
                      </label>
                      <input id="log-sleep" type="time"
                        value={form.sleepTime}
                        onChange={e => setForm(f => ({ ...f, sleepTime: e.target.value }))}
                        className="input-cyber text-sm w-full"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {fitnessEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <label htmlFor="log-steps" className="text-xs text-white/40 mb-1 block">
                      Steps Today
                      {form.steps && parseInt(form.steps) > 0 && (
                        <span className={`ml-2 font-semibold ${
                          parseInt(form.steps) >= (settings?.stepGoal || 8000)
                            ? 'text-emerald-400' : 'text-cyber-400'
                        }`}>
                          {parseInt(form.steps).toLocaleString()} / {(settings?.stepGoal || 8000).toLocaleString()}
                        </span>
                      )}
                    </label>
                    <input id="log-steps" type="number" placeholder="e.g. 8000"
                      value={form.steps}
                      onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                      className="input-cyber text-sm w-full"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Water Intake ── */}
      <Section icon={Droplets} color="text-cyan-400" title="Water Intake">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.button
                key={i}
                id={`log-water-${i + 1}`}
                whileTap={{ scale: 0.85 }}
                onClick={() => setForm(f => ({
                  ...f,
                  waterGlasses: f.waterGlasses === i + 1 ? i : i + 1, // tap same = decrease
                }))}
                className={`w-9 h-9 rounded-xl text-base transition-all duration-150 ${
                  i < form.waterGlasses
                    ? 'bg-cyber-500/40 border border-cyber-500/60 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'bg-white/5 border border-white/10 opacity-40'
                }`}
              >
                💧
              </motion.button>
            ))}
          </div>
          {/* Goal indicator */}
          <div className="flex items-center justify-between">
            <span className={`text-sm font-bold ${
              form.waterGlasses >= 8 ? 'text-emerald-400' : 'text-cyber-400'
            }`}>
              {form.waterGlasses} / 8 glasses
            </span>
            {form.waterGlasses >= 8 && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[10px] font-bold text-emerald-400 flex items-center gap-1
                           bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
              >
                <CheckCircle2 size={9} /> Goal met!
              </motion.span>
            )}
          </div>
        </div>
      </Section>

      {/* ── Mood ── */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-4">
          💭 Mood Today
          {form.mood > 0 && (
            <span className="ml-2 text-[11px] font-normal text-white/40">
              ({form.mood}/10)
            </span>
          )}
        </h3>
        <EmojiMoodPicker value={form.mood} onChange={v => setForm(f => ({ ...f, mood: v }))} />
      </div>

      {/* ── Notes ── */}
      <Section icon={BookOpen} color="text-purple-400" title="Journal / Notes">
        <textarea id="log-notes" rows={4}
          placeholder="How was your day? Anything noteworthy..."
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className="input-cyber resize-none text-sm w-full"
          style={{ color: 'var(--text)' }}
        />
        {form.notes.trim().length > 0 && (
          <p className="text-[10px] text-white/25 mt-1.5 text-right">
            {form.notes.trim().length} chars
          </p>
        )}
      </Section>

      {/* ── ④ Save Button — isSubmitting guard + smart label ── */}
      <motion.button
        id="log-save"
        onClick={handleSave}
        disabled={isSubmitting}
        whileTap={isSubmitting ? {} : { scale: 0.97 }}
        className={`
          w-full flex items-center justify-center gap-2 mb-4 rounded-xl px-6 py-3.5
          font-semibold text-sm transition-all duration-200
          ${isSubmitting
            ? 'bg-white/10 border border-white/10 text-white/40 cursor-not-allowed'
            : 'btn-primary cursor-pointer'
          }
        `}
      >
        <AnimatePresence mode="wait">
          {isSubmitting ? (
            <motion.span
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Save size={16} />
              {existing.loggedAt ? 'Update Daily Log ✏️' : 'Save Daily Log ⚡'}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
