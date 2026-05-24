import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { todayKey } from '../lib/storage'
import Modal from '../components/ui/Modal'
import Toast, { useToast } from '../components/ui/Toast'
import { Plus, Flame, CheckCircle2, X, Trash2, TrendingUp } from 'lucide-react'

const HABIT_ICONS = ['🏋️','🚶','📚','🧘','💧','😴','🎯','💪','🥗','✍️','🎵','🏃','🧹','💊','🛁','☀️','🌙','🤸','🎨','🎮']
const HABIT_CATEGORIES = ['fitness', 'mind', 'health', 'productivity', 'social', 'other']

function AddHabitModal({ isOpen, onClose }) {
  const { dispatch } = useApp()
  const [form, setForm] = useState({ name: '', icon: '🎯', type: 'good', category: 'other' })

  const handleAdd = () => {
    if (!form.name.trim()) return
    const id = `habit_${Date.now()}`
    dispatch({
      type: 'ADD_HABIT',
      payload: { id, ...form, entries: {}, createdAt: new Date().toISOString() },
    })
    setForm({ name: '', icon: '🎯', type: 'good', category: 'other' })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Habit">
      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/40 block mb-1">Habit Name</label>
          <input id="habit-name" type="text" placeholder="e.g. Read 20 mins"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="input-cyber" />
        </div>

        <div>
          <label className="text-xs text-white/40 block mb-2">Pick an Icon</label>
          <div className="flex flex-wrap gap-2">
            {HABIT_ICONS.map(icon => (
              <button key={icon} id={`habit-icon-${icon}`}
                onClick={() => setForm(f => ({ ...f, icon }))}
                className={`w-10 h-10 rounded-xl text-xl transition-all ${form.icon === icon ? 'bg-cyber-500/30 border border-cyber-400' : 'bg-white/5 border border-white/10'}`}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 block mb-2">Type</label>
          <div className="flex gap-2">
            {[
              { val: 'good', label: '✅ Good Habit', color: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' },
              { val: 'bad', label: '⚠️ Bad Habit to Reduce', color: 'border-red-500/50 bg-red-500/15 text-red-300' },
            ].map(({ val, label, color }) => (
              <button key={val} id={`habit-type-${val}`}
                onClick={() => setForm(f => ({ ...f, type: val }))}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${form.type === val ? color : 'border-white/10 bg-white/5 text-white/40'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/40 block mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {HABIT_CATEGORIES.map(c => (
              <button key={c} id={`habit-cat-${c}`}
                onClick={() => setForm(f => ({ ...f, category: c }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all ${form.category === c ? 'border-cyber-400/50 bg-cyber-500/20 text-cyber-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button id="habit-add-confirm" onClick={handleAdd} className="btn-primary flex-1">Add Habit</button>
        </div>
      </div>
    </Modal>
  )
}

function HabitCard({ habit }) {
  const { dispatch, getHabitStreak } = useApp()
  const today = todayKey()
  const entry = habit.entries?.[today]
  const status = entry?.status
  const streak = getHabitStreak(habit.id)
  const isBad = habit.type === 'bad'

  const logHabit = (s) => {
    dispatch({ type: 'LOG_HABIT', payload: { habitId: habit.id, date: today, status: s } })
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
      className={`glass-card p-4 ${isBad ? 'border-red-500/20' : ''}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
          isBad ? 'bg-red-500/15' : 'bg-cyber-500/15'
        }`}>
          {habit.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{habit.name}</p>
          <div className="flex items-center gap-2">
            <span className={`text-xs capitalize ${isBad ? 'text-red-400' : 'text-cyber-400/60'}`}>
              {habit.category}
            </span>
            {streak > 0 && (
              <span className="text-xs text-orange-400 font-semibold flex items-center gap-0.5">
                <Flame size={10} /> {streak}d streak
              </span>
            )}
          </div>
        </div>
        <button onClick={deleteHabit} className="text-white/20 hover:text-red-400 transition-colors p-1">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {isBad ? (
          <>
            <button id={`habit-${habit.id}-clean`}
              onClick={() => logHabit(status === 'clean' ? null : 'clean')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${status === 'clean' ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
              ✅ Resisted
            </button>
            <button id={`habit-${habit.id}-done`}
              onClick={() => logHabit(status === 'done' ? null : 'done')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${status === 'done' ? 'border-red-500/50 bg-red-500/15 text-red-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
              ⚠️ Did it
            </button>
          </>
        ) : (
          <>
            <button id={`habit-${habit.id}-done`}
              onClick={() => logHabit(status === 'done' ? null : 'done')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${status === 'done' ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
              ✅ Done
            </button>
            <button id={`habit-${habit.id}-skip`}
              onClick={() => logHabit(status === 'skipped' ? null : 'skipped')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${status === 'skipped' ? 'border-yellow-500/50 bg-yellow-500/15 text-yellow-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
              ⏭ Skip
            </button>
            <button id={`habit-${habit.id}-fail`}
              onClick={() => logHabit(status === 'failed' ? null : 'failed')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${status === 'failed' ? 'border-red-500/50 bg-red-500/15 text-red-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
              ❌ Failed
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

export default function Habits() {
  const { habits } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [tab, setTab] = useState('good')
  const today = todayKey()

  const goodHabits = Object.values(habits).filter(h => h.type === 'good')
  const badHabits = Object.values(habits).filter(h => h.type === 'bad')

  const shown = tab === 'good' ? goodHabits : badHabits

  // Weekly completion %
  const weeklyPct = (() => {
    let done = 0, total = 0
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]
    })
    goodHabits.forEach(h => {
      days.forEach(d => {
        total++
        if (h.entries?.[d]?.status === 'done') done++
      })
    })
    return total > 0 ? Math.round((done / total) * 100) : 0
  })()

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Habit Tracker</h1>
          <p className="text-xs text-white/40">Build consistency, one day at a time</p>
        </div>
        <button id="habit-add-btn" onClick={() => setAddOpen(true)}
          className="w-9 h-9 rounded-xl bg-cyber-500/20 border border-cyber-500/30 flex items-center justify-center
                     hover:bg-cyber-500/30 transition-all active:scale-90">
          <Plus size={18} className="text-cyber-400" />
        </button>
      </div>

      {/* Weekly stat */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white flex items-center gap-2">
            <TrendingUp size={15} className="text-cyber-400" />Weekly Completion
          </span>
          <span className={`text-lg font-bold ${weeklyPct >= 70 ? 'text-emerald-400' : weeklyPct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {weeklyPct}%
          </span>
        </div>
        <div className="progress-bar">
          <motion.div className="progress-fill" initial={{ width: 0 }}
            animate={{ width: `${weeklyPct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex bg-white/5 rounded-xl p-1">
        <button id="habits-tab-good" onClick={() => setTab('good')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'good' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/30' : 'text-white/40'}`}>
          ✅ Good Habits ({goodHabits.length})
        </button>
        <button id="habits-tab-bad" onClick={() => setTab('bad')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'bad' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-white/40'}`}>
          ⚠️ To Reduce ({badHabits.length})
        </button>
      </div>

      {/* Habit list */}
      <AnimatePresence mode="popLayout">
        {shown.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card p-8 text-center">
            <p className="text-3xl mb-2">{tab === 'good' ? '🌱' : '🎯'}</p>
            <p className="text-white/60 text-sm">No {tab === 'bad' ? 'bad habits to track' : 'habits yet'}</p>
            <p className="text-white/30 text-xs mt-1">Tap + to add a habit</p>
          </motion.div>
        ) : (
          shown.map(h => <HabitCard key={h.id} habit={h} />)
        )}
      </AnimatePresence>

      <AddHabitModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
