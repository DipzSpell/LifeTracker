import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { todayKey, getLast7Days } from '../lib/storage'
import Toast, { useToast } from '../components/ui/Toast'
import { Save, Dumbbell, Droplets, Scale, Map, Flame, Ruler } from 'lucide-react'

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

const Section = ({ icon: Icon, color, title, children }) => (
  <div className="glass-card p-4">
    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
      <Icon size={16} className={color} />{title}
    </h3>
    {children}
  </div>
)

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

  // ── Guard: fitness module disabled ───────────────────────────────────────────
  if (settings?.fitnessTrackerEnabled === false) {
    return <Navigate to="/dashboard" replace />
  }

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
        <h1 className="text-xl font-display font-bold text-white">Fitness & Health</h1>
        <p className="text-xs text-white/40">Track your physical progress</p>
      </div>

      {/* ── Steps Progress ── */}
      <Section icon={Map} color="text-cyan-400" title="Steps Today">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold gradient-text">{stepsToday.toLocaleString()}</span>
          <span className="text-xs text-white/40">Goal: {stepGoal.toLocaleString()}</span>
        </div>
        <div className="progress-bar mb-3">
          <motion.div className="progress-fill" initial={{ width: 0 }}
            animate={{ width: `${stepPct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
        </div>
        <input id="fitness-steps" type="number" placeholder="Enter steps"
          value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
          className="input-cyber text-sm" />
      </Section>

      {/* ── Workout Log ── */}
      <Section icon={Dumbbell} color="text-orange-400" title="Workout Log">

        {/* Type picker — grouped into Cardio + Strength rows */}
        <label className="text-xs text-white/40 block mb-1.5">Workout Type</label>

        {cardioList.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-wider text-cyan-400/60 font-semibold mb-2">
              🏃 Cardio
            </p>
            <div className="flex flex-wrap gap-2">
              {cardioList.map(t => (
                <motion.button
                  key={t}
                  id={`fitness-workout-${t.toLowerCase().replace(/\s+/g, '-')}`}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setForm(f => ({ ...f, workoutType: t, distance: f.distance }))}
                  className={`px-4 py-2.5 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-xs font-semibold border transition-all ${
                    form.workoutType === t
                      ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-300'
                      : 'border-white/10 bg-white/5 text-white/40'
                  }`}
                >
                  {t}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {strengthList.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-orange-400/60 font-semibold mb-2">
              🏋️ Strength / Gym
            </p>
            <div className="flex flex-wrap gap-2">
              {strengthList.map(t => (
                <motion.button
                  key={t}
                  id={`fitness-workout-${t.toLowerCase().replace(/\s+/g, '-')}`}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setForm(f => ({
                    ...f,
                    workoutType: t,
                    distance: '',  // clear distance when switching to strength
                  }))}
                  className={`px-4 py-2.5 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-xs font-semibold border transition-all ${
                    form.workoutType === t
                      ? 'border-orange-400/50 bg-orange-500/15 text-orange-300'
                      : 'border-white/10 bg-white/5 text-white/40'
                  }`}
                >
                  {t}
                </motion.button>
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
                  <label className="text-xs text-white/40 block mb-1 flex items-center gap-1.5">
                    <Ruler size={11} className="text-cyan-400" />
                    Distance (km)
                  </label>
                  <input
                    id="fitness-distance"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={form.distance}
                    onChange={e => setForm(f => ({ ...f, distance: e.target.value }))}
                    className="input-cyber text-sm"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Duration — always visible */}
          <div>
            <label className="text-xs text-white/40 block mb-1">Duration (mins)</label>
            <input id="fitness-duration" type="number" placeholder="0"
              value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              className="input-cyber text-sm" />
          </div>

          {/* Calories */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-white/40">Estimated Calories</label>
              <button
                type="button"
                onClick={estimateCalories}
                className="text-[10px] text-cyber-400 hover:underline"
              >
                Auto-estimate
              </button>
            </div>
            <div className="relative">
              <Flame size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-400" />
              <input id="fitness-calories" type="number" placeholder="0"
                value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
                className="input-cyber text-sm pl-10" />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Vitals ── */}
      <Section icon={Flame} color="text-red-400" title="Vitals">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 block mb-1">Heart Rate (bpm)</label>
            <input id="fitness-hr" type="number" placeholder="72"
              value={form.heartRate} onChange={e => setForm(f => ({ ...f, heartRate: e.target.value }))}
              className="input-cyber text-sm" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Active Minutes</label>
            <input id="fitness-active" type="number" placeholder="30"
              value={form.activeMinutes} onChange={e => setForm(f => ({ ...f, activeMinutes: e.target.value }))}
              className="input-cyber text-sm" />
          </div>
        </div>
      </Section>

      {/* ── Water ── */}
      <Section icon={Droplets} color="text-cyber-400" title="Water Intake">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <button key={i} id={`fitness-water-${i + 1}`}
              onClick={() => setForm(f => ({ ...f, waterGlasses: i + 1 }))}
              className={`w-9 h-9 rounded-xl text-base transition-all ${
                i < form.waterGlasses
                  ? 'bg-cyber-500/40 border border-cyber-500/60'
                  : 'bg-white/5 border border-white/10 opacity-40'
              }`}>
              💧
            </button>
          ))}
        </div>
        <p className="text-sm font-bold text-cyber-400">{form.waterGlasses} / 8 glasses</p>
      </Section>

      {/* ── Weight Log ── */}
      <Section icon={Scale} color="text-purple-400" title="Weight Log">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-white/40 block mb-1">Today's Weight (kg)</label>
            <input id="fitness-weight" type="number" step="0.1" placeholder="e.g. 72.5"
              value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
              className="input-cyber text-sm" />
          </div>
          {latestWeight && (
            <div className="text-right">
              <p className="text-xs text-white/40">Last logged</p>
              <p className="text-lg font-bold text-purple-400">{latestWeight} kg</p>
            </div>
          )}
        </div>
      </Section>

      {/* Google Fit note */}
      <div className="glass-card p-4 border-cyber-500/20">
        <p className="text-xs font-semibold text-cyber-400 mb-1">📱 Smartwatch / Google Fit Sync</p>
        <p className="text-xs text-white/40 leading-relaxed">
          To auto-sync steps, heart rate, and calories from your Fastrack or any Google Fit-compatible watch:
          <br />1. Open Google Fit app on your phone
          <br />2. Ensure your watch is paired and syncing
          <br />3. Data will be available via Google Fit API (setup required in settings)
        </p>
      </div>

      <button id="fitness-save" onClick={handleSave}
        className="btn-primary w-full flex items-center justify-center gap-2 mb-4">
        <Save size={16} /> Save Fitness Log
      </button>
    </div>
  )
}
