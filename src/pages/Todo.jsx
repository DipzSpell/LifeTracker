/**
 * Todo.jsx — Tasks page (design-system restyle).
 *
 * Logic preserved: ADD/UPDATE/DELETE_TODO dispatches, recalcPoints, victory
 * sound, browser notifications, filters, priority sort.
 * Priority colors: high = coral (--danger), medium = amber (--warning), low = lime (--success).
 * Done state: muted + strikethrough.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isBefore, isToday } from 'date-fns'
import { useApp } from '../context/AppContext'
import { playVictorySound } from '../lib/sounds'
import Modal from '../components/ui/Modal'
import { Plus, Trash2, Check, Clock, RefreshCw } from 'lucide-react'

/* CSS-var strings, not hex, so they re-resolve live on theme switch.
   AMBER now maps to the design system's --warning token (medium priority =
   caution, the exact semantic --warning exists for) instead of its own
   hardcoded literal. */
const CYAN = 'var(--accent)'
const LIME = 'var(--success)'
const CORAL = 'var(--danger)'
const AMBER = 'var(--warning)'
const MONO = "'JetBrains Mono', ui-monospace, monospace"

const PRIORITY_COLOR = { high: CORAL, medium: AMBER, low: LIME }
const PRIORITY_POINTS = { high: 20, medium: 10, low: 5 }

const PRIORITIES = [
  { val: 'high', label: 'High ⚡' },
  { val: 'medium', label: 'Medium' },
  { val: 'low', label: 'Low' },
]

const CATEGORIES = ['Personal', 'Work', 'Health', 'Finance', 'Other']

/* Small tint pill used for category + priority badges */
function Pill({ color, children, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, fontWeight: 700, fontFamily: MONO,
      padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
      background: `color-mix(in srgb, ${color} 12%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 27%, transparent)`,
      ...style,
    }}>
      {children}
    </span>
  )
}

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
        className="glass-btn w-1/2"
        style={{ padding: '0.65rem 1rem', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}
      >
        Cancel
      </button>
      <button
        id="todo-add-confirm"
        onClick={handleAdd}
        disabled={!form.title.trim()}
        className="glass-btn glass-btn-accent w-1/2"
        style={{ padding: '0.65rem 1rem', fontSize: 13, fontWeight: 700 }}
      >
        Save Task
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Task" footer={footer}>
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Task Title *</label>
        <input id="todo-title" type="text" placeholder="What needs to be done?"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="glass-input" />
      </div>
      <div>
        <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Description</label>
        <textarea id="todo-desc" rows={2} placeholder="Optional details..."
          value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
          className="glass-input resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Due Date</label>
          <input id="todo-date" type="date" value={form.dueDate}
            onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            className="glass-input" />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Due Time</label>
          <input id="todo-time" type="time" value={form.dueTime}
            onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
            className="glass-input" />
        </div>
      </div>
      <div>
        <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Priority Level</label>
        <div className="flex gap-2">
          {PRIORITIES.map(p => {
            const color = PRIORITY_COLOR[p.val]
            const active = form.priority === p.val
            return (
              <button key={p.val} id={`todo-priority-${p.val}`}
                onClick={() => setForm(f => ({ ...f, priority: p.val }))}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={active
                  ? { border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 12%, transparent)`, color }
                  : { border: '1px solid var(--border-subtle)', background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
                {p.label}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button key={c} id={`todo-cat-${c.toLowerCase()}`}
              onClick={() => setForm(f => ({ ...f, category: c }))}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={form.category === c
                ? { border: '1px solid rgb(var(--accent-rgb)/0.5)', background: 'rgb(var(--accent-rgb)/0.12)', color: CYAN }
                : { border: '1px solid var(--border-subtle)', background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs block mb-2" style={{ color: 'var(--text-muted)' }}>Recurring</label>
        <div className="flex gap-2">
          {[{ val: 'none', label: 'Once' }, { val: 'daily', label: '📅 Daily' }, { val: 'weekly', label: '📆 Weekly' }].map(r => (
            <button key={r.val} id={`todo-recurring-${r.val}`}
              onClick={() => setForm(f => ({ ...f, recurring: r.val }))}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
              style={form.recurring === r.val
                ? { border: '1px solid rgb(var(--accent-rgb)/0.5)', background: 'rgb(var(--accent-rgb)/0.12)', color: CYAN }
                : { border: '1px solid var(--border-subtle)', background: 'var(--bg-glass)', color: 'var(--text-muted)' }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function TaskCard({ task }) {
  const { dispatch, settings, recalcPoints, notify } = useApp()
  const today = format(new Date(), 'yyyy-MM-dd')
  const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), new Date()) && task.status !== 'done'
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate))
  const done = task.status === 'done'
  const priColor = PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.low

  const toggleDone = () => {
    const newStatus = done ? 'pending' : 'done'
    dispatch({
      type: 'UPDATE_TODO',
      payload: { id: task.id, status: newStatus, completedDate: newStatus === 'done' ? today : null },
    })
    setTimeout(recalcPoints, 100)
    if (newStatus === 'done') {
      if (settings?.soundEffectsEnabled !== false) playVictorySound()
      const pts = PRIORITY_POINTS[task.priority] || 5
      notify(`Task Mastered! ⚡`, `+${pts} pts earned for “${task.title}”`, 'points')
    }
  }

  const deleteTask = () => dispatch({ type: 'DELETE_TODO', payload: task.id })

  return (
    <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
      className="glass-card p-4"
      style={{
        ...(done ? { opacity: 0.55 } : {}),
        ...(isOverdue ? { borderColor: 'rgb(var(--danger-rgb)/0.35)' } : {}),
      }}>
      <div className="flex items-start gap-3">
        {/* Check circle */}
        <button id={`todo-${task.id}-toggle`} onClick={toggleDone}
          className="flex-shrink-0 mt-0.5 flex items-center justify-center transition-all active:scale-90"
          style={{
            width: 24, height: 24, borderRadius: '50%',
            border: done ? `1.5px solid ${LIME}` : '1.5px solid var(--border-glass)',
            background: done ? 'rgb(var(--success-rgb)/0.15)' : 'transparent',
            cursor: 'pointer',
          }}>
          {done && <Check size={13} style={{ color: LIME }} strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Priority dot */}
            <div className="flex-shrink-0" style={{
              width: 8, height: 8, borderRadius: '50%',
              background: priColor,
              boxShadow: task.priority === 'high' ? `0 0 8px color-mix(in srgb, ${priColor} 60%, transparent)` : 'none',
            }} />
            <p className="text-sm font-semibold" style={done
              ? { textDecoration: 'line-through', color: 'var(--text-muted)', margin: 0 }
              : { color: 'var(--text-primary)', margin: 0 }}>
              {task.title}
            </p>
            {task.recurring !== 'none' && (
              <RefreshCw size={10} style={{ color: `color-mix(in srgb, ${CYAN} 60%, transparent)` }} className="flex-shrink-0" />
            )}
          </div>
          {task.desc && <p className="text-xs mb-1 truncate" style={{ color: 'var(--text-muted)' }}>{task.desc}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            {task.dueDate && (
              <span className="flex items-center gap-1 text-xs" style={{
                color: isOverdue ? CORAL : isDueToday ? AMBER : 'var(--text-muted)',
                fontFamily: MONO,
              }}>
                <Clock size={10} />
                {isOverdue ? 'Overdue — ' : ''}{format(new Date(task.dueDate), 'MMM d, h:mm a')}
              </span>
            )}
            <Pill color={CYAN}>{task.category}</Pill>
            <Pill color={priColor}>
              {task.priority === 'high' ? '🔥' : task.priority === 'medium' ? '⚡' : '·'}
              {task.priority}
              <span style={{ opacity: 0.6, fontWeight: 400 }}>+{PRIORITY_POINTS[task.priority] || 5}pts</span>
            </Pill>
          </div>
        </div>

        <button onClick={deleteTask} className="transition-colors flex-shrink-0 p-1"
          style={{ color: 'var(--text-muted)', opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.color = CORAL; e.currentTarget.style.opacity = 1 }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.opacity = 0.5 }}>
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
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Tasks</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: MONO }}>{pendingCount} pending · {doneCount} done</p>
        </div>
        <div className="flex gap-2">
          <button id="todo-notif-btn" onClick={requestNotifPerms}
            className="glass-btn" title="Enable notifications"
            style={{ width: 36, height: 36, minHeight: 36, padding: 0 }}>
            <Clock size={15} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button id="todo-add-btn" onClick={() => setAddOpen(true)}
            className="glass-btn glass-btn-accent"
            style={{ width: 36, height: 36, minHeight: 36, padding: 0 }}>
            <Plus size={18} style={{ color: CYAN }} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-glass)' }}>
        {[
          { val: 'all', label: 'All' },
          { val: 'today', label: '📅 Today' },
          { val: 'pending', label: 'Pending' },
          { val: 'done', label: '✅ Done' },
        ].map(f => (
          <button key={f.val} id={`todo-filter-${f.val}`}
            onClick={() => setFilter(f.val)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={filter === f.val
              ? { background: 'rgb(var(--accent-rgb)/0.15)', color: CYAN, border: '1px solid rgb(var(--accent-rgb)/0.35)' }
              : { color: 'var(--text-muted)', border: '1px solid transparent', background: 'none' }}>
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
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No tasks here</p>
          </motion.div>
        ) : (
          filtered.map(t => <TaskCard key={t.id} task={t} />)
        )}
      </AnimatePresence>

      <AddTaskModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
