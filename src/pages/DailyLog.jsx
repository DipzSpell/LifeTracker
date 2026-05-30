import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { useApp } from '../context/AppContext'
import { todayKey } from '../lib/storage'
import EmojiMoodPicker from '../components/ui/EmojiMoodPicker'
import { Save, Dumbbell, Clock, Droplets, BookOpen, Heart } from 'lucide-react'
import Toast, { useToast } from '../components/ui/Toast'

const Section = ({ icon: Icon, color, title, children }) => (
  <div className="glass-card p-4">
    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
      <Icon size={16} className={color} />{title}
    </h3>
    {children}
  </div>
)

export default function DailyLog() {
  const { dispatch, dailyLogs, settings, recalcPoints } = useApp()
  const { toasts, addToast, removeToast } = useToast()
  const today = todayKey()
  const existing = dailyLogs[today] || {}

  const sleepEnabled = settings?.sleepTrackerEnabled !== false
  const fitnessEnabled = settings?.fitnessTrackerEnabled !== false

  const [form, setForm] = useState({
    gymStatus: existing.gymStatus || '',
    workoutType: existing.workoutType || '',
    brushed: existing.brushed || false,
    bathed: existing.bathed || false,
    meditated: existing.meditated || false,
    wakeTime: existing.wakeTime || '',
    sleepTime: existing.sleepTime || '',
    mood: existing.mood || 0,
    notes: existing.notes || '',
    waterGlasses: existing.waterGlasses || 0,
    steps: existing.steps || '',
  })

  const WORKOUT_TYPES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body', 'HIIT', 'Yoga']

  const handleSave = () => {
    const wakeHour = form.wakeTime ? parseInt(form.wakeTime.split(':')[0]) : null
    const sleepHour = form.sleepTime ? parseInt(form.sleepTime.split(':')[0]) : null
    dispatch({
      type: 'SAVE_DAILY_LOG',
      payload: {
        date: today,
        log: {
          ...form,
          steps: parseInt(form.steps) || 0,
          wokeEarly: wakeHour !== null && wakeHour < 6,
          sleptOnTime: sleepHour !== null && sleepHour <= 23,
          sleptLate: sleepHour !== null && sleepHour >= 2,
          waterGoalMet: form.waterGlasses >= 8,
          loggedAt: new Date().toISOString(),
        },
      },
    })
    if (form.gymStatus === 'done') dispatch({ type: 'LOG_HABIT', payload: { habitId: 'habit_gym', date: today, status: 'done' } })
    if (form.meditated) dispatch({ type: 'LOG_HABIT', payload: { habitId: 'habit_meditate', date: today, status: 'done' } })
    if (form.waterGlasses >= 8) dispatch({ type: 'LOG_HABIT', payload: { habitId: 'habit_water', date: today, status: 'done' } })
    setTimeout(recalcPoints, 100)
    addToast('Day logged successfully! Points updated 🎯', 'success')
  }

  return (
    <div className="space-y-4 page-enter">
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Daily Log</h1>
          <p className="text-xs text-white/40">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        {existing.loggedAt && (
          <span className="badge-green">✓ Logged today</span>
        )}
      </div>

      {/* Gym & Workout */}
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
                  { val: 'done', label: '💪 Done', color: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' },
                  { val: 'skipped', label: '❌ Skipped', color: 'border-red-500/50 bg-red-500/15 text-red-300' },
                  { val: 'rest', label: '🛋️ Rest Day', color: 'border-yellow-500/50 bg-yellow-500/15 text-yellow-300' },
                ].map(({ val, label, color }) => (
                  <button key={val} id={`log-gym-${val}`}
                    onClick={() => setForm(f => ({ ...f, gymStatus: val }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${form.gymStatus === val ? color : 'border-white/10 bg-white/5 text-white/40'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {form.gymStatus === 'done' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="text-xs text-white/40 block mb-2">Workout Type</label>
                  <div className="flex flex-wrap gap-2">
                    {WORKOUT_TYPES.map(t => (
                      <button key={t} id={`log-workout-${t.toLowerCase()}`}
                        onClick={() => setForm(f => ({ ...f, workoutType: t }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.workoutType === t ? 'border-cyber-500/50 bg-cyber-500/20 text-cyber-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Morning Routine */}
      <Section icon={Heart} color="text-pink-400" title="Morning Routine">
        <div className="space-y-2">
          {[
            { key: 'brushed', label: 'Brushed Teeth', icon: '🦷' },
            { key: 'bathed', label: 'Bathed / Showered', icon: '🚿' },
            { key: 'meditated', label: 'Meditated', icon: '🧘' },
          ].map(({ key, label, icon }) => (
            <button key={key} id={`log-${key}`}
              onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${form[key] ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
              <span className="text-lg">{icon}</span>
              <span className="flex-1 text-sm font-medium text-white text-left">{label}</span>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${form[key] ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'}`}>
                {form[key] && <span className="text-white text-xs">✓</span>}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Sleep + Steps */}
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
                      <label className="text-xs text-white/40 mb-1 block">Wake Time</label>
                      <input id="log-wake" type="time" value={form.wakeTime}
                        onChange={e => setForm(f => ({ ...f, wakeTime: e.target.value }))}
                        className="input-cyber text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Sleep Time</label>
                      <input id="log-sleep" type="time" value={form.sleepTime}
                        onChange={e => setForm(f => ({ ...f, sleepTime: e.target.value }))}
                        className="input-cyber text-sm" />
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
                    <label className="text-xs text-white/40 mb-1 block">Steps Today</label>
                    <input id="log-steps" type="number" placeholder="e.g. 8000"
                      value={form.steps}
                      onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                      className="input-cyber text-sm" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Water */}
      <Section icon={Droplets} color="text-cyan-400" title="Water Intake">
        <div className="flex items-center gap-3 flex-wrap">
          {Array.from({ length: 10 }).map((_, i) => (
            <button key={i} id={`log-water-${i + 1}`}
              onClick={() => setForm(f => ({ ...f, waterGlasses: i + 1 }))}
              className={`w-9 h-9 rounded-xl text-base transition-all duration-150 ${i < form.waterGlasses ? 'bg-cyber-500/40 border border-cyber-500/60' : 'bg-white/5 border border-white/10 opacity-40'}`}>
              💧
            </button>
          ))}
          <span className="text-sm font-bold text-cyber-400 ml-1">{form.waterGlasses} / 8</span>
        </div>
      </Section>

      {/* Mood */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white mb-4">💭 Mood Today</h3>
        <EmojiMoodPicker value={form.mood} onChange={v => setForm(f => ({ ...f, mood: v }))} />
      </div>

      {/* Notes */}
      <Section icon={BookOpen} color="text-purple-400" title="Journal / Notes">
        <textarea id="log-notes" rows={4}
          placeholder="How was your day? Anything noteworthy..."
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className="input-cyber resize-none text-sm" />
      </Section>

      {/* Save */}
      <button id="log-save" onClick={handleSave}
        className="btn-primary w-full flex items-center justify-center gap-2 mb-4">
        <Save size={16} /> Save Daily Log
      </button>
    </div>
  )
}
