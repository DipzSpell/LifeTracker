import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import EmojiMoodPicker from './ui/EmojiMoodPicker'
import { useApp } from '../context/AppContext'
import { todayKey } from '../lib/storage'
import { playVictorySound } from '../lib/sounds'
import Toast, { useToast } from './ui/Toast'
import { CheckCircle2, Clock, Droplets, BookOpen } from 'lucide-react'

// This is a standalone modal for the Quick Log flow
export default function QuickLogModal({ isOpen, onClose }) {
  const { dispatch, dailyLogs, settings, recalcPoints } = useApp()
  const today = todayKey()
  const existing = dailyLogs[today] || {}

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast()

  const [form, setForm] = useState({
    gymStatus: '',
    brushed: false,
    bathed: false,
    meditated: false,
    wakeTime: '',
    sleepTime: '',
    mood: 0,
    notes: '',
    waterGlasses: 0,
  })

  useEffect(() => {
    if (isOpen) {
      setForm({
        gymStatus: existing.gymStatus || '',
        brushed: existing.brushed || false,
        bathed: existing.bathed || false,
        meditated: existing.meditated || false,
        wakeTime: existing.wakeTime || '',
        sleepTime: existing.sleepTime || '',
        mood: existing.mood || 0,
        notes: existing.notes || '',
        waterGlasses: existing.waterGlasses || 0,
      })
    }
  }, [
    isOpen,
    existing.gymStatus,
    existing.brushed,
    existing.bathed,
    existing.meditated,
    existing.wakeTime,
    existing.sleepTime,
    existing.mood,
    existing.notes,
    existing.waterGlasses
  ])

  const handleSave = () => {
    try {
      const wakeHour = form.wakeTime ? parseInt(form.wakeTime.split(':')[0]) : null
      const sleepHour = form.sleepTime ? parseInt(form.sleepTime.split(':')[0]) : null

      dispatch({
        type: 'SAVE_DAILY_LOG',
        payload: {
          date: today,
          log: {
            ...form,
            wokeEarly: wakeHour !== null && wakeHour < 6,
            sleptOnTime: sleepHour !== null && sleepHour <= 23,
            sleptLate: sleepHour !== null && sleepHour >= 2,
            waterGoalMet: form.waterGlasses >= 8,
            loggedAt: new Date().toISOString(),
          },
        },
      })

      // Also update habit entries
      if (form.gymStatus === 'done') {
        dispatch({ type: 'LOG_HABIT', payload: { habitId: 'habit_gym', date: today, status: 'done' } })
      }
      if (form.meditated) {
        dispatch({ type: 'LOG_HABIT', payload: { habitId: 'habit_meditate', date: today, status: 'done' } })
      }
      if (form.waterGlasses >= 8) {
        dispatch({ type: 'LOG_HABIT', payload: { habitId: 'habit_water', date: today, status: 'done' } })
      }

      setTimeout(recalcPoints, 100)
      if (settings?.soundEffectsEnabled !== false) {
        playVictorySound()
      }

      addToast("Log saved successfully! ⚡", "success")

      setTimeout(() => {
        onClose()
      }, 800)
    } catch (err) {
      console.error(err)
      addToast(err.message || "Failed to save log", "error")
    }
  }

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 px-4 rounded-xl transition-all"
      >
        Cancel
      </button>
      <button
        id="quicklog-save-button"
        onClick={handleSave}
        className="w-1/2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] text-center flex items-center justify-center gap-2"
      >
        Log Today's Vibe ⚡
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚡ Quick Log — Today" footer={footer}>
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="space-y-5 pb-4">
        {/* Gym */}
        <section>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Gym Today?</p>
          <div className="flex gap-2">
            {[
              { val: 'done', label: '💪 Yes!', color: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' },
              { val: 'skipped', label: '❌ Skipped', color: 'border-red-500/50 bg-red-500/15 text-red-300' },
              { val: 'rest', label: '🛋️ Rest Day', color: 'border-yellow-500/50 bg-yellow-500/15 text-yellow-300' },
            ].map(({ val, label, color }) => (
              <button
                key={val}
                id={`quicklog-gym-${val}`}
                onClick={() => setForm(f => ({ ...f, gymStatus: val }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                  form.gymStatus === val ? color : 'border-white/10 bg-white/5 text-white/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Morning Routine Toggles */}
        <section>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Morning Routine</p>
          <div className="space-y-2">
            {[
              { key: 'brushed', label: 'Brushed Teeth', icon: '🦷' },
              { key: 'bathed', label: 'Bathed / Showered', icon: '🚿' },
              { key: 'meditated', label: 'Meditated', icon: '🧘' },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                id={`quicklog-${key}`}
                onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
                  form[key]
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <span className="text-lg">{icon}</span>
                <span className="flex-1 text-sm font-medium text-white text-left">{label}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  form[key] ? 'border-emerald-400 bg-emerald-400' : 'border-white/20'
                }`}>
                  {form[key] && <CheckCircle2 size={14} className="text-white" />}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Sleep + Steps */}
        <section>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
            <Clock size={12} className="inline mr-1" />Sleep Schedule
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Wake Time</label>
              <input
                id="quicklog-wake"
                type="time"
                value={form.wakeTime}
                onChange={e => setForm(f => ({ ...f, wakeTime: e.target.value }))}
                className="input-cyber text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Sleep Time</label>
              <input
                id="quicklog-sleep"
                type="time"
                value={form.sleepTime}
                onChange={e => setForm(f => ({ ...f, sleepTime: e.target.value }))}
                className="input-cyber text-sm"
              />
            </div>
          </div>
        </section>

        {/* Water Intake */}
        <section>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
            <Droplets size={12} className="inline mr-1 text-cyber-400" />Water Intake
          </p>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 flex-1 flex-wrap">
              {Array.from({ length: 10 }).map((_, i) => (
                <button
                  key={i}
                  id={`quicklog-water-${i + 1}`}
                  onClick={() => setForm(f => ({ ...f, waterGlasses: i + 1 }))}
                  className={`w-8 h-8 rounded-lg text-sm transition-all duration-150 ${
                    i < form.waterGlasses
                      ? 'bg-cyber-500/40 text-cyber-300 border border-cyber-500/50'
                      : 'bg-white/5 text-white/20 border border-white/10'
                  }`}
                >
                  💧
                </button>
              ))}
            </div>
            <span className="text-sm font-bold text-cyber-400">{form.waterGlasses}</span>
          </div>
        </section>

        {/* Mood */}
        <section>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">How's Your Mood?</p>
          <EmojiMoodPicker value={form.mood} onChange={v => setForm(f => ({ ...f, mood: v }))} />
        </section>

        {/* Notes */}
        <section>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
            <BookOpen size={12} className="inline mr-1" />Any Notes?
          </p>
          <textarea
            id="quicklog-notes"
            placeholder="How was your day? Any thoughts..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
            className="input-cyber resize-none text-sm"
          />
        </section>
      </div>
    </Modal>
  )
}
