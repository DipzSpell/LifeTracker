/**
 * Fitness.jsx — Fitness & Health page (design-system restyle).
 *
 * Logic preserved: MET calorie estimation, cardio/strength type buckets,
 * SAVE_FITNESS_LOG + SAVE_DAILY_LOG sync, recalcPoints, module-disabled guard.
 * Steps section gets the cyan→lime intensity ring; sections are glass-cards
 * with section-label headers. Accents: steps/water=cyan, strength=lime,
 * vitals=coral, weight=violet.
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { todayKey, getLast7Days } from '../lib/storage'
import Toast, { useToast } from '../components/ui/Toast'
import ProgressRing from '../components/bevel/ProgressRing'
import { Save, Dumbbell, Droplets, Scale, Map, Flame, Ruler } from 'lucide-react'

/* CSS-var strings, not hex, so they re-resolve live on theme switch */
const CYAN = 'var(--accent)'
const LIME = 'var(--success)'
const VIOLET = 'var(--special)'
const CORAL = 'var(--danger)'
const MONO = "'JetBrains Mono', ui-monospace, monospace"

// ── Metabolic Equivalent of Task (MET) Matrix ──────────────────────────────────
const MET_MATRIX = {
  HIIT: 8.0,
  Running: 8.0,
  Yoga: 2.5,
  // All other cardio, strength splits, or custom types default to 5.0
}

// ── Canonical cardio set — drives the Distance-field visibility logic ──────────
// This is the single source of truth in the COMPONENT layer.
// The actual workout-type *labels* come from AppContext (state.settings.workoutTypes).
const CARDIO_TYPES = new Set(['Cardio', 'Running', 'Swimming', 'Cycling'])

// Default fallback list (in case user's state hasn't migrated yet)
const DEFAULT_WORKOUT_TYPES = [
  'Cardio', 'Running', 'Swimming', 'Cycling',
  'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core',
  'Full Body', 'HIIT', 'Yoga', 'Push', 'Pull', 'Mix',
]

const Section = ({ icon: Icon, accent, title, children }) => (
  <div className="glass-card p-4">
    <div className="flex items-center gap-2 mb-4">
      <div style={{ padding: 6, borderRadius: 8, background: `color-mix(in srgb, ${accent} 10%, transparent)`, display: 'flex' }}>
        <Icon size={14} style={{ color: accent }} />
      </div>
      <span className="section-label">{title}</span>
    </div>
    {children}
  </div>
)

/* Workout-type chip */
function TypeChip({ id, label, active, color, onClick }) {
  return (
    <motion.button
      id={id}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="px-4 py-2.5 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-xs font-semibold transition-all"
      style={active
        ? { border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 12%, transparent)`, color }
        : { border: '1px solid var(--border-subtle)', background: 'var(--bg-glass)', color: 'var(--text-muted)' }}
    >
      {label}
    </motion.button>
  )
}

export default function Fitness() {
  const { dispatch, fitnessLogs, dailyLogs, settings, recalcPoints, profile } = useApp()
  const { toasts, addToast, removeToast } = useToast()
  const today = todayKey()
  const existing = fitnessLogs[today] || {}

  // ── Pull workout types from global settings (with safe fallback) ─────────────
  const workoutTypes = settings?.workoutTypes?.length
    ? settings.workoutTypes
    : DEFAULT_WORKOUT_TYPES

  const [form, setForm] = useState({
    workoutType:   existing.workoutType   || '',
    distance:      existing.distance      || '',
    duration:      existing.duration      || '',
    calories:      existing.calories      || '',
    waterGlasses:  existing.waterGlasses  ?? dailyLogs[today]?.waterGlasses ?? 0,
    weight:        existing.weight        || '',
    steps:         existing.steps         ?? dailyLogs[today]?.steps ?? '',
    heartRate:     existing.heartRate     || '',
    activeMinutes: existing.activeMinutes || '',
  })

  // ── Derived: is the selected workout type a cardio type? ─────────────────────
  const isCardio = CARDIO_TYPES.has(form.workoutType)

  // Auto-estimate calories based on MET matrix
  const estimateCalories = () => {
    const durationVal = parseFloat(form.duration)
    if (form.workoutType && durationVal > 0) {
      const weight = parseFloat(profile?.weight) || 70
      const met = MET_MATRIX[form.workoutType] || 5.0
      const calculatedCals = Math.round(met * 3.5 * (weight / 200) * durationVal)
      setForm(f => ({ ...f, calories: String(calculatedCals) }))
    }
  }

  // Live-calculate estimated calories on workoutType/duration change
  useEffect(() => {
    const durationVal = parseFloat(form.duration)
    if (form.workoutType && durationVal > 0) {
      const weight = parseFloat(profile?.weight) || 70
      const met = MET_MATRIX[form.workoutType] || 5.0
      const calculatedCals = Math.round(met * 3.5 * (weight / 200) * durationVal)
      setForm(f => ({ ...f, calories: String(calculatedCals) }))
    } else if (!form.duration) {
      setForm(f => ({ ...f, calories: '' }))
    }
  }, [form.workoutType, form.duration, profile?.weight])

  // ── Guard: fitness module disabled ───────────────────────────────────────────
  if (settings?.fitnessTrackerEnabled === false) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSave = () => {
    dispatch({
      type: 'SAVE_FITNESS_LOG',
      payload: {
        date: today,
        log: {
          ...form,
          // Clear distance if switching from cardio to strength avoids stale data
          distance:      isCardio ? parseFloat(form.distance) || 0 : 0,
          steps:         parseInt(form.steps)         || 0,
          duration:      parseInt(form.duration)      || 0,
          calories:      parseInt(form.calories)      || 0,
          waterGlasses:  parseInt(form.waterGlasses)  || 0,
          weight:        parseFloat(form.weight)      || 0,
          heartRate:     parseInt(form.heartRate)     || 0,
          activeMinutes: parseInt(form.activeMinutes) || 0,
          savedAt: new Date().toISOString(),
        },
      },
    })
    // Sync shared fields back to the daily log
    dispatch({
      type: 'SAVE_DAILY_LOG',
      payload: {
        date: today,
        log: {
          steps:        parseInt(form.steps)        || 0,
          waterGlasses: parseInt(form.waterGlasses) || 0,
        },
      },
    })
    setTimeout(recalcPoints, 100)
    addToast('Fitness data saved! 💪', 'success')
  }

  // Last 7 days weight history
  const last7 = getLast7Days()
  const weightHistory = last7.map(d => fitnessLogs[d]?.weight).filter(Boolean)
  const latestWeight = weightHistory[weightHistory.length - 1]

  // Step goal progress
  const stepGoal   = settings?.stepGoal || 8000
  const stepsToday = parseInt(form.steps) || 0
  const stepPct    = Math.min(100, Math.round((stepsToday / stepGoal) * 100))

  // ── Split the full list into two buckets for section headings ─────────────────
  const cardioList   = workoutTypes.filter(t => CARDIO_TYPES.has(t))
  const strengthList = workoutTypes.filter(t => !CARDIO_TYPES.has(t))

  return (
    <div className="space-y-4 page-enter">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div>
        <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Fitness & Health</h1>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Track your physical progress</p>
      </div>

      {/* ── Steps Progress — cyan→lime intensity ring ── */}
      <Section icon={Map} accent={CYAN} title="Steps Today">
        <div className="flex items-center gap-4 mb-3">
          <ProgressRing pct={stepPct} size={72} stroke={7} from={CYAN} to={LIME} mini
            trackColor="var(--border-subtle)"
            center={<span style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO, color: 'var(--text-primary)' }}>{stepPct}%</span>} />
          <div className="flex-1">
            <span className="stat-number" style={{ fontSize: 26, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {stepsToday.toLocaleString()}
            </span>
            <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: MONO, margin: '2px 0 0' }}>
              Goal: {stepGoal.toLocaleString()}
            </p>
          </div>
        </div>
        <input id="fitness-steps" type="number" placeholder="Enter steps"
          value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
          className="glass-input" />
      </Section>

      {/* ── Workout Log ── */}
      <Section icon={Dumbbell} accent={LIME} title="Workout Log">

        {/* Type picker — grouped into Cardio + Strength rows */}
        {cardioList.length > 0 && (
          <div className="mb-3">
            <p className="section-label mb-2" style={{ color: `color-mix(in srgb, ${CYAN} 60%, transparent)` }}>
              🏃 Cardio
            </p>
            <div className="flex flex-wrap gap-2">
              {cardioList.map(t => (
                <TypeChip
                  key={t}
                  id={`fitness-workout-${t.toLowerCase().replace(/\s+/g, '-')}`}
                  label={t}
                  color={CYAN}
                  active={form.workoutType === t}
                  onClick={() => setForm(f => ({ ...f, workoutType: t, distance: f.distance }))}
                />
              ))}
            </div>
          </div>
        )}

        {strengthList.length > 0 && (
          <div className="mb-4">
            <p className="section-label mb-2" style={{ color: `color-mix(in srgb, ${LIME} 60%, transparent)` }}>
              🏋️ Strength / Gym
            </p>
            <div className="flex flex-wrap gap-2">
              {strengthList.map(t => (
                <TypeChip
                  key={t}
                  id={`fitness-workout-${t.toLowerCase().replace(/\s+/g, '-')}`}
                  label={t}
                  color={LIME}
                  active={form.workoutType === t}
                  onClick={() => setForm(f => ({
                    ...f,
                    workoutType: t,
                    distance: '',  // clear distance when switching to strength
                  }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Metric inputs — Distance shown ONLY for cardio ─────────────────── */}
        <div className="space-y-3">

          {/* Distance — conditionally rendered with animated slide */}
          <AnimatePresence initial={false}>
            {isCardio && (
              <motion.div
                key="distance-field"
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-1">
                  <label className="text-xs mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Ruler size={11} style={{ color: CYAN }} />
                    Distance (km)
                  </label>
                  <input
                    id="fitness-distance"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={form.distance}
                    onChange={e => setForm(f => ({ ...f, distance: e.target.value }))}
                    className="glass-input"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Duration — always visible */}
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Duration (mins)</label>
            <input id="fitness-duration" type="number" placeholder="0"
              value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              className="glass-input" />
          </div>

          {/* Calories */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Estimated Calories</label>
              <button
                type="button"
                onClick={estimateCalories}
                className="text-[10px] hover:underline"
                style={{ color: CYAN, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Auto-estimate
              </button>
            </div>
            <div className="relative">
              <Flame size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: CORAL }} />
              <input id="fitness-calories" type="number" placeholder="0"
                value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                className="glass-input pl-10" />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Vitals ── */}
      <Section icon={Flame} accent={CORAL} title="Vitals">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Heart Rate (bpm)</label>
            <input id="fitness-hr" type="number" placeholder="72"
              value={form.heartRate} onChange={e => setForm(f => ({ ...f, heartRate: e.target.value }))}
              className="glass-input" />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Active Minutes</label>
            <input id="fitness-active" type="number" placeholder="30"
              value={form.activeMinutes} onChange={e => setForm(f => ({ ...f, activeMinutes: e.target.value }))}
              className="glass-input" />
          </div>
        </div>
      </Section>

      {/* ── Water ── */}
      <Section icon={Droplets} accent={CYAN} title="Water Intake">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <button key={i} id={`fitness-water-${i + 1}`}
              onClick={() => setForm(f => ({ ...f, waterGlasses: i + 1 }))}
              className="w-9 h-9 rounded-xl text-base transition-all"
              style={i < form.waterGlasses
                ? { background: 'rgb(var(--accent-rgb)/0.20)', border: '1px solid rgb(var(--accent-rgb)/0.5)' }
                : { background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', opacity: 0.4 }}>
              💧
            </button>
          ))}
        </div>
        <p className="text-sm font-bold" style={{ color: CYAN, fontFamily: MONO }}>{form.waterGlasses} / 8 glasses</p>
      </Section>

      {/* ── Weight Log ── */}
      <Section icon={Scale} accent={VIOLET} title="Weight Log">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Today's Weight (kg)</label>
            <input id="fitness-weight" type="number" step="0.1" placeholder="e.g. 72.5"
              value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
              className="glass-input" />
          </div>
          {latestWeight && (
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last logged</p>
              <p className="text-lg font-bold" style={{ color: VIOLET, fontFamily: MONO }}>{latestWeight} kg</p>
            </div>
          )}
        </div>
      </Section>

      {/* Google Fit note */}
      <div className="glass-card p-4" style={{ borderColor: 'rgb(var(--accent-rgb)/0.2)' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: CYAN }}>📱 Smartwatch / Google Fit Sync</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          To auto-sync steps, heart rate, and calories from your Fastrack or any Google Fit-compatible watch:
          <br />1. Open Google Fit app on your phone
          <br />2. Ensure your watch is paired and syncing
          <br />3. Data will be available via Google Fit API (setup required in settings)
        </p>
      </div>

      <button id="fitness-save" onClick={handleSave}
        className="glass-btn glass-btn-accent w-full mb-4"
        style={{ padding: '0.75rem', fontSize: 14, fontWeight: 700 }}>
        <Save size={16} /> Save Fitness Log
      </button>
    </div>
  )
}
