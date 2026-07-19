import { useState } from 'react'
import { motion } from 'framer-motion'
import { format, differenceInDays } from 'date-fns'
import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Modal from '../components/ui/Modal'
import EmojiMoodPicker from '../components/ui/EmojiMoodPicker'
import { Heart, Lock, Plus, Calendar, BookOpen, Trash2 } from 'lucide-react'

const CORRECT_PIN = '0000' // Default PIN — changeable in settings

function PinLock({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handleDigit = (d) => {
    if (pin.length < 4) {
      const newPin = pin + d
      setPin(newPin)
      if (newPin.length === 4) {
        if (newPin === CORRECT_PIN) {
          onUnlock()
        } else {
          setError(true)
          setTimeout(() => { setPin(''); setError(false) }, 700)
        }
      }
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-6">
        <div className="w-16 h-16 rounded-2xl bg-red-400/15 border border-red-400/30 mx-auto mb-3
                        flex items-center justify-center shadow-lg">
          <Lock size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-display font-bold text-white">Private Space</h2>
        <p className="text-sm text-white/40 mt-1">Enter your 4-digit PIN</p>
        <p className="text-xs text-white/20 mt-1">Default PIN: 0000</p>
      </motion.div>

      {/* PIN dots */}
      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map(i => (
          <motion.div key={i}
            animate={error ? { x: [0, -6, 6, -6, 6, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < pin.length
                ? (error ? 'bg-red-500 border-red-500' : 'bg-cyan-400 border-cyan-400')
                : 'bg-transparent border-white/30'
            }`} />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-56">
        {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d, i) => (
          <button key={i} onClick={() => d === '⌫' ? setPin(p => p.slice(0, -1)) : d !== '' && handleDigit(String(d))}
            disabled={d === ''}
            className={`h-14 rounded-2xl text-lg font-bold transition-all active:scale-90 ${
              d === '' ? 'invisible' :
              d === '⌫' ? 'bg-white/10 text-white/60 hover:bg-white/15' :
              'bg-white/8 text-white border border-white/10 hover:bg-white/15'
            }`}>
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}

function AddEntryModal({ isOpen, onClose }) {
  const { dispatch } = useApp()
  const [form, setForm] = useState({ title: '', body: '', mood: 0, date: format(new Date(), 'yyyy-MM-dd') })

  const handleSave = () => {
    if (!form.body.trim() && !form.title.trim()) return
    dispatch({
      type: 'ADD_LOVE_ENTRY',
      payload: { id: Date.now().toString(), ...form, createdAt: new Date().toISOString() },
    })
    setForm({ title: '', body: '', mood: 0, date: format(new Date(), 'yyyy-MM-dd') })
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
        id="love-add-entry-confirm"
        onClick={handleSave}
        disabled={!form.body.trim() && !form.title.trim()}
        className="glass-btn glass-btn-accent w-1/2" style={{ padding: '0.65rem 1rem', fontSize: 13, fontWeight: 700 }}
      >
        Save Entry
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💕 New Journal Entry" footer={footer}>
      <div>
        <label className="text-xs text-white/40 block mb-1">Date</label>
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="glass-input text-sm" />
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-1">Title (optional)</label>
        <input type="text" placeholder="e.g. A wonderful evening"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="glass-input text-sm" />
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-1">Journal</label>
        <textarea rows={5} placeholder="Write your thoughts..."
          value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          className="glass-input resize-none text-sm" />
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-2">Relationship Mood</label>
        <EmojiMoodPicker value={form.mood} onChange={v => setForm(f => ({ ...f, mood: v }))} />
      </div>
    </Modal>
  )
}

function AddSpecialDateModal({ isOpen, onClose }) {
  const { dispatch } = useApp()
  const [form, setForm] = useState({ label: '', date: '', emoji: '💍' })
  const EMOJIS = ['💍','🎂','💕','🌹','✈️','🎉','💏','🌙','⭐','🏠']

  const handleSave = () => {
    if (!form.label || !form.date) return
    dispatch({
      type: 'ADD_SPECIAL_DATE',
      payload: { id: Date.now().toString(), ...form },
    })
    setForm({ label: '', date: '', emoji: '💍' })
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
        id="love-add-date-confirm"
        onClick={handleSave}
        disabled={!form.label.trim() || !form.date}
        className="glass-btn glass-btn-accent w-1/2" style={{ padding: '0.65rem 1rem', fontSize: 13, fontWeight: 700 }}
      >
        Add Special Date
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Special Date" footer={footer}>
      <div>
        <label className="text-xs text-white/40 block mb-2">Pick an Emoji</label>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map(e => (
            <button key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
              className={`w-10 h-10 rounded-xl text-xl transition-all ${form.emoji === e ? 'bg-red-400/30 border border-red-400' : 'bg-white/5 border border-white/10'}`}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-1">Date Name</label>
        <input type="text" placeholder="e.g. Anniversary"
          value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          className="glass-input text-sm" />
      </div>
      <div>
        <label className="text-xs text-white/40 block mb-1">Date</label>
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="glass-input text-sm" />
      </div>
    </Modal>
  )
}

export default function LoveTracker() {
  const { loveTracker, settings, dispatch } = useApp()
  const [unlocked, setUnlocked] = useState(false)
  const [addEntry, setAddEntry] = useState(false)
  const [addDate, setAddDate] = useState(false)
  const [tab, setTab] = useState('journal')

  if (settings?.loveTrackerEnabled === false) {
    return <Navigate to="/dashboard" replace />
  }

  if (!unlocked) return <PinLock onUnlock={() => setUnlocked(true)} />

  const daysUntil = (dateStr) => {
    const now = new Date()
    const target = new Date(dateStr)
    target.setFullYear(now.getFullYear())
    if (target < now) target.setFullYear(now.getFullYear() + 1)
    return differenceInDays(target, now)
  }

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <Heart size={18} className="text-red-400" fill="currentColor" />Love Tracker
          </h1>
          <p className="text-xs text-white/40">Your private space 🔐</p>
        </div>
        <button onClick={() => tab === 'journal' ? setAddEntry(true) : setAddDate(true)}
          className="w-9 h-9 rounded-xl bg-red-400/20 border border-red-400/30 flex items-center justify-center hover:bg-red-400/30 transition-all active:scale-90">
          <Plus size={18} className="text-red-400" />
        </button>
      </div>

      {/* Tab toggle */}
      <div className="flex bg-white/5 rounded-xl p-1">
        {[
          { val: 'journal', label: '📔 Journal', icon: BookOpen },
          { val: 'dates', label: '📅 Special Dates', icon: Calendar },
        ].map(t => (
          <button key={t.val} id={`love-tab-${t.val}`} onClick={() => setTab(t.val)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.val ? 'bg-red-400/25 text-pink-300 border border-red-400/30' : 'text-white/40'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Journal Entries */}
      {tab === 'journal' && (
        <div className="space-y-3">
          {loveTracker.entries.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <p className="text-4xl mb-2">💕</p>
              <p className="text-white/60 text-sm">No journal entries yet</p>
              <p className="text-white/30 text-xs mt-1">Tap + to add your first entry</p>
            </div>
          ) : (
            loveTracker.entries.map(entry => (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 border-red-400/20">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-red-400/60">{format(new Date(entry.date), 'MMMM d, yyyy')}</p>
                    {entry.title && <p className="text-sm font-bold text-white mt-0.5">{entry.title}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.mood > 0 && (
                      <span className="text-xl">
                        {['','😭','😢','😟','😐','🙂','😊','😄','😁','🤩','🥳'][entry.mood]}
                      </span>
                    )}
                    <button onClick={() => dispatch({ type: 'DELETE_LOVE_ENTRY', payload: entry.id })}
                    className="text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{entry.body}</p>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Special Dates */}
      {tab === 'dates' && (
        <div className="space-y-3">
          {loveTracker.specialDates.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <p className="text-4xl mb-2">📅</p>
              <p className="text-white/60 text-sm">No special dates added yet</p>
            </div>
          ) : (
            loveTracker.specialDates.map(d => {
              const days = daysUntil(d.date)
              return (
                <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 border-red-400/20 flex items-center gap-4">
                  <span className="text-3xl">{d.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{d.label}</p>
                    <p className="text-xs text-white/40">{format(new Date(d.date), 'MMM d')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-400">{days}d</p>
                    <p className="text-[10px] text-white/30">away</p>
                  </div>
                  <button onClick={() => dispatch({ type: 'DELETE_SPECIAL_DATE', payload: d.id })}
                    className="text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              )
            })
          )}
        </div>
      )}

      <AddEntryModal isOpen={addEntry} onClose={() => setAddEntry(false)} />
      <AddSpecialDateModal isOpen={addDate} onClose={() => setAddDate(false)} />
    </div>
  )
}
