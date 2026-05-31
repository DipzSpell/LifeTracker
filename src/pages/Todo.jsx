import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isBefore, isToday } from 'date-fns'
import { useApp } from '../context/AppContext'
import { playVictorySound } from '../lib/sounds'
import Modal from '../components/ui/Modal'
import { Plus, Trash2, CheckCircle2, Clock, RefreshCw } from 'lucide-react'

const PRIORITIES = [
  { val: 'high', label: 'High', color: 'text-red-400 bg-red-500/15 border-red-500/30' },
  { val: 'medium', label: 'Medium', color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' },
  { val: 'low', label: 'Low', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
]

const CATEGORIES = ['Personal', 'Work', 'Health', 'Finance', 'Other']

function AddTaskModal({ isOpen, onClose }) {
  const { dispatch } = useApp()
  const [form, setForm] = useState({
    title: '', desc: '', dueDate: '', dueTime: '',
    priority: 'medium', category: 'Personal', recurring: 'none',
  })

  const handleAdd = () => {
    if (!form.title.trim()) return
    const id = `todo_${Date.now()}`
    let dueDateTime = null
    if (form.dueDate) {
      dueDateTime = form.dueTime
        ? `${form.dueDate}T${form.dueTime}`
        : `${form.dueDate}T23:59`
    }
    dispatch({
      type: 'ADD_TODO',
      payload: {
        id, title: form.title.trim(), desc: form.desc,
        dueDate: dueDateTime, priority: form.priority,
        category: form.category, recurring: form.recurring,
        status: 'pending', createdAt: new Date().toISOString(),
      },
    })
    
    // Schedule browser notification if permission granted
    if (dueDateTime && Notification.permission === 'granted') {
      const ms = new Date(dueDateTime).getTime() - Date.now()
      if (ms > 0) {
        setTimeout(() => {
          new Notification('Task Due! ⏰', { body: form.title, icon: '/icons/icon-192.png' })
        }, Math.min(ms, 2147483647))
      }
    }

    setForm({ title: '', desc: '', dueDate: '', dueTime: '', priority: 'medium', category: 'Personal', recurring: 'none' })
    onClose()
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
        id="todo-add-confirm"
        onClick={handleAdd}
        disabled={!form.title.trim()}
        className="w-1/2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Save Task
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Task" footer={footer}>
      <div>
        <label className="text-xs text-white/40 block mb-1">Task Title *</label>
        <input id="todo-title" type="text" placeholder="What needs to be done?"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="input-cyber" />
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-1">Description</label>
        <textarea id="todo-desc" rows={2} placeholder="Optional details..."
          value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
          className="input-cyber resize-none text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 block mb-1">Due Date</label>
          <input id="todo-date" type="date" value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            className="input-cyber text-sm" />
        </div>
        <div>
          <label className="text-xs text-white/40 block mb-1">Due Time</label>
          <input id="todo-time" type="time" value={form.dueTime}
            onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
            className="input-cyber text-sm" />
        </div>
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-2">Priority</label>
        <div className="flex gap-2">
          {PRIORITIES.map(p => (
            <button key={p.val} id={`todo-priority-${p.val}`}
              onClick={() => setForm(f => ({ ...f, priority: p.val }))}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.priority === p.val ? p.color : 'border-white/10 bg-white/5 text-white/40'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c} id={`todo-cat-${c.toLowerCase()}`}
              onClick={() => setForm(f => ({ ...f, category: c }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.category === c ? 'border-cyber-400/50 bg-cyber-500/20 text-cyber-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-2">Recurring</label>
        <div className="flex gap-2">
          {[{ val: 'none', label: 'Once' }, { val: 'daily', label: '📅 Daily' }, { val: 'weekly', label: '📆 Weekly' }].map(r => (
            <button key={r.val} id={`todo-recurring-${r.val}`}
              onClick={() => setForm(f => ({ ...f, recurring: r.val }))}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.recurring === r.val ? 'border-cyber-400/50 bg-cyber-500/20 text-cyber-300' : 'border-white/10 bg-white/5 text-white/40'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function TaskCard({ task }) {
  const { dispatch, settings, recalcPoints } = useApp()
  const today = format(new Date(), 'yyyy-MM-dd')
  const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), new Date()) && task.status !== 'done'
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate))

  const toggleDone = () => {
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    dispatch({
      type: 'UPDATE_TODO',
      payload: { id: task.id, status: newStatus, completedDate: newStatus === 'done' ? today : null },
    })
    if (newStatus === 'done') {
      setTimeout(recalcPoints, 100)
      if (settings?.soundEffectsEnabled !== false) {
        playVictorySound()
      }
    }
  }

  const deleteTask = () => dispatch({ type: 'DELETE_TODO', payload: task.id })

  const priorityColor = { high: 'bg-red-500', medium: 'bg-yellow-400', low: 'bg-emerald-400' }

  return (
    <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
      className={`glass-card p-4 ${task.status === 'done' ? 'opacity-60' : ''} ${isOverdue ? 'border-red-500/30' : ''}`}>
      <div className="flex items-start gap-3">
        <button id={`todo-${task.id}-toggle`} onClick={toggleDone}
          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
            task.status === 'done' ? 'border-emerald-400 bg-emerald-400' : 'border-white/30 hover:border-emerald-400'
          }`}>
          {task.status === 'done' && <CheckCircle2 size={14} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColor[task.priority]}`} />
            <p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-white/40' : 'text-white'}`}>
              {task.title}
            </p>
            {task.recurring !== 'none' && (
              <RefreshCw size={10} className="text-cyber-400/60 flex-shrink-0" />
            )}
          </div>
          {task.desc && <p className="text-xs text-white/40 mb-1 truncate">{task.desc}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            {task.dueDate && (
              <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : isDueToday ? 'text-yellow-400' : 'text-white/40'}`}>
                <Clock size={10} />
                {isOverdue ? 'Overdue — ' : ''}{format(new Date(task.dueDate), 'MMM d, h:mm a')}
              </span>
            )}
            <span className={`badge text-[10px] ${
              task.category === 'Work' ? 'badge-cyan' : task.category === 'Health' ? 'badge-green' : 'badge-purple'
            }`}>{task.category}</span>
          </div>
        </div>

        <button onClick={deleteTask} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0 p-1">
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}

export default function Todo() {
  const { todos } = useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [filter, setFilter] = useState('all')

  const requestNotifPerms = async () => {
    if ('Notification' in window) {
      await Notification.requestPermission()
    }
  }

  const filtered = todos.filter(t => {
    if (filter === 'pending') return t.status === 'pending'
    if (filter === 'done') return t.status === 'done'
    if (filter === 'today') {
      return t.dueDate && isToday(new Date(t.dueDate)) && t.status !== 'done'
    }
    return true
  }).sort((a, b) => {
    const pOrd = { high: 0, medium: 1, low: 2 }
    return (pOrd[a.priority] || 2) - (pOrd[b.priority] || 2)
  })

  const pendingCount = todos.filter(t => t.status === 'pending').length
  const doneCount = todos.filter(t => t.status === 'done').length

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Tasks</h1>
          <p className="text-xs text-white/40">{pendingCount} pending · {doneCount} done</p>
        </div>
        <div className="flex gap-2">
          <button id="todo-notif-btn" onClick={requestNotifPerms}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:border-white/20 transition-all" title="Enable notifications">
            <Clock size={15} className="text-white/50" />
          </button>
          <button id="todo-add-btn" onClick={() => setAddOpen(true)}
            className="w-9 h-9 rounded-xl bg-cyber-500/20 border border-cyber-500/30 flex items-center justify-center hover:bg-cyber-500/30 transition-all active:scale-90">
            <Plus size={18} className="text-cyber-400" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {[
          { val: 'all', label: 'All' },
          { val: 'today', label: '📅 Today' },
          { val: 'pending', label: 'Pending' },
          { val: 'done', label: '✅ Done' },
        ].map(f => (
          <button key={f.val} id={`todo-filter-${f.val}`}
            onClick={() => setFilter(f.val)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f.val ? 'bg-cyber-500/30 text-cyber-300 border border-cyber-500/30' : 'text-white/40'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card p-10 text-center">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-white/60 text-sm">No tasks here</p>
          </motion.div>
        ) : (
          filtered.map(t => <TaskCard key={t.id} task={t} />)
        )}
      </AnimatePresence>

      <AddTaskModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
