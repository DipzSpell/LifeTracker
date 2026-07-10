/**
 * Journal.jsx — Daily Journal page
 *
 * Features:
 *  - Five form sections (Top 3, Work, Gym, Mood, Tomorrow) + Trading Journal link card
 *  - Character counters under every textarea / input
 *  - Auto-save draft to localStorage every 10 s (with fade-in "Draft saved" indicator)
 *  - Save Entry button with loading + success states
 *  - Success + error toasts
 *  - Past Entries section — last 7 days, collapsible cards, mood emoji badge
 *  - Empty state for Past Entries
 */
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, isValid } from 'date-fns'
import {
  Code2, Dumbbell, Smile, Target, Plus,
  Save, ChevronDown, ChevronUp, Loader2, BookOpen,
  Calendar, CheckCircle, CloudOff, LineChart,
} from 'lucide-react'
import { useJournal } from '../hooks/useJournal'
import Toast, { useToast } from '../components/ui/Toast'
import { useNavigate } from 'react-router-dom'

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────────────────────── */
const SAGE  = '#87a68c'
const SKY   = '#7db8d8'
const CORAL = '#e87c6e'
const AMBER = '#d4a847'

/* ─────────────────────────────────────────────────────────────────────────────
   CHAR COUNT LIMITS
───────────────────────────────────────────────────────────────────────────── */
const LIMITS = {
  topThing: 120,
  work:     800,
  gym:      300,
  mood:     600,
  tomorrow: 200,
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOOD EMOJI CLASSIFIER
   Scans mood text for positive/negative keywords → returns an emoji badge
───────────────────────────────────────────────────────────────────────────── */
const POSITIVE_WORDS = ['great', 'amazing', 'excellent', 'fantastic', 'good', 'happy', 'motivated', 'energetic', 'productive', 'focused', 'confident', 'calm', 'positive', 'win', 'progress', 'breakthrough', 'love', 'best']
const NEGATIVE_WORDS = ['bad', 'terrible', 'awful', 'sad', 'tired', 'exhausted', 'anxious', 'stressed', 'frustrated', 'low', 'slow', 'fail', 'block', 'rough', 'hard', 'difficult', 'lost', 'depressed']

function getMoodEmoji(moodText) {
  if (!moodText) return null
  const lower = moodText.toLowerCase()
  let pos = 0, neg = 0
  POSITIVE_WORDS.forEach(w => { if (lower.includes(w)) pos++ })
  NEGATIVE_WORDS.forEach(w => { if (lower.includes(w)) neg++ })
  if (pos > neg)  return '😊'
  if (neg > pos)  return '😔'
  if (pos === neg && pos > 0) return '😐'
  return null
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION CARD wrapper
───────────────────────────────────────────────────────────────────────────── */
function Section({ icon: Icon, label, accentClass, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 16,
      padding: '0.85rem 1rem',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.65rem' }}>
        <div style={{
          padding: 6, borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
        }}>
          <Icon size={13} className={accentClass} />
        </div>
        <span style={{
          fontSize: '0.65rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.45)',
          fontFamily: 'ui-monospace, JetBrains Mono, monospace',
        }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

/* Character counter */
function CharCount({ current, max }) {
  const pct     = current / max
  const nearMax = pct > 0.85
  const over    = current > max
  return (
    <p style={{
      textAlign: 'right',
      fontSize: '0.6rem',
      marginTop: 4,
      fontFamily: 'ui-monospace, monospace',
      color: over ? CORAL : nearMax ? AMBER : 'rgba(255,255,255,0.22)',
      transition: 'color 0.2s',
    }}>
      {current}/{max}
    </p>
  )
}

/* "Draft saved" flash indicator */
function DraftBadge({ savedAt }) {
  const [visible, setVisible] = useState(false)
  const prev = useRef(null)

  useEffect(() => {
    if (!savedAt || savedAt === prev.current) return
    prev.current = savedAt
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 2200)
    return () => clearTimeout(t)
  }, [savedAt])

  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            fontSize: '0.62rem',
            color: 'rgba(135,166,140,0.8)',
            fontFamily: 'ui-monospace, monospace',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <CloudOff size={10} />
          Draft saved
        </motion.span>
      )}
    </AnimatePresence>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAST ENTRY CARD
───────────────────────────────────────────────────────────────────────────── */
function PastEntryCard({ entry, isOpen, onToggle }) {
  const dateLabel = (() => {
    try {
      // entry_date is YYYY-MM-DD — parseISO is safe for date-only strings
      const d = parseISO(entry.entry_date)
      return isValid(d) ? format(d, 'EEEE, MMM d') : entry.entry_date
    } catch { return entry.entry_date }
  })()

  const moodEmoji = getMoodEmoji(entry.mood_notes)
  const firstTop  = entry.top_things?.find(t => t?.trim()) || null

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.015)',
      overflow: 'hidden',
      transition: 'background 0.2s',
    }}>
      {/* Header row (always visible) */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.7rem 0.9rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {/* Date badge */}
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            fontFamily: 'ui-monospace, monospace',
            color: SKY,
            flexShrink: 0,
          }}>
            {dateLabel}
          </span>

          {/* First "top thing" preview */}
          {firstTop && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>·</span>
              <span style={{
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.45)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'ui-monospace, monospace',
              }}>
                {firstTop}
              </span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {moodEmoji && (
            <span style={{ fontSize: '1rem' }} title="Mood">{moodEmoji}</span>
          )}
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>
            {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </div>
      </button>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              padding: '0.75rem 0.9rem',
              background: 'rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: '0.72rem',
              fontFamily: 'ui-monospace, monospace',
              color: 'rgba(255,255,255,0.7)',
            }}>
              {/* Top 3 */}
              {entry.top_things?.some(t => t?.trim()) && (
                <div>
                  <p style={{ fontSize: '0.6rem', fontWeight: 700, color: `${SAGE}bb`, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>
                    Top things today
                  </p>
                  {entry.top_things.filter(t => t?.trim()).map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, lineHeight: 1.5 }}>
                      <span style={{ color: SAGE, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              )}

              {entry.work_notes?.trim() && (
                <Field label="Work & Dev" color="#60a5fa">{entry.work_notes}</Field>
              )}
              {entry.trading_notes?.trim() && (
                <Field label="Trading" color={AMBER}>{entry.trading_notes}</Field>
              )}
              {entry.gym_notes?.trim() && (
                <Field label="Gym & Training" color={CORAL}>{entry.gym_notes}</Field>
              )}
              {entry.mood_notes?.trim() && (
                <Field label="Mood & Mindset" color="#f472b6">{entry.mood_notes}</Field>
              )}
              {entry.tomorrow_focus?.trim() && (
                <Field label="Tomorrow's Focus" color={SKY}>{entry.tomorrow_focus}</Field>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({ label, color, children }) {
  return (
    <div>
      <p style={{
        fontSize: '0.58rem', fontWeight: 700, color: `${color}aa`,
        textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3,
      }}>
        {label}
      </p>
      <p style={{
        paddingLeft: 8,
        borderLeft: `2px solid ${color}33`,
        color: 'rgba(255,255,255,0.78)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        margin: 0,
      }}>
        {children}
      </p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  topThings: ['', '', ''],
  work: '',
  gym: '',
  mood: '',
  tomorrow: '',
}

export default function Journal() {
  const {
    todayEntry, history, loading, saving, error: hookError,
    saveEntry, saveDraft, loadDraft, draftSavedAt,
  } = useJournal()
  const { toasts, addToast, removeToast } = useToast()
  const navigate = useNavigate()

  const [form,          setForm]          = useState(EMPTY_FORM)
  const [expandedIndex, setExpandedIndex] = useState(null)
  const [justSaved,     setJustSaved]     = useState(false)

  // ── Initialise form: server entry > draft > empty ────────────────────────
  useEffect(() => {
    if (todayEntry) {
      // Server data wins — load it
      setForm({
        topThings: [
          todayEntry.top_things?.[0] || '',
          todayEntry.top_things?.[1] || '',
          todayEntry.top_things?.[2] || '',
        ],
        work:     todayEntry.work_notes     || '',
        gym:      todayEntry.gym_notes      || '',
        mood:     todayEntry.mood_notes     || '',
        tomorrow: todayEntry.tomorrow_focus || '',
      })
    } else {
      // No server entry yet — try to restore draft
      const draft = loadDraft()
      if (draft) setForm(draft)
    }
  }, [todayEntry]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync hook errors to toasts ────────────────────────────────────────────
  useEffect(() => {
    if (hookError) addToast(hookError, 'error')
  }, [hookError, addToast])

  // ── Auto-save draft every 10 seconds ─────────────────────────────────────
  const formRef = useRef(form)
  useEffect(() => { formRef.current = form }, [form])

  useEffect(() => {
    if (loading || todayEntry) return  // don't auto-save while loading or if already saved today
    const id = setInterval(() => {
      if (Object.values(formRef.current).some(v =>
        Array.isArray(v) ? v.some(s => s.trim()) : v.trim()
      )) {
        saveDraft(formRef.current)
      }
    }, 10_000)
    return () => clearInterval(id)
  }, [loading, todayEntry, saveDraft])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateTopThing = (i, value) =>
    setForm(prev => {
      const next = [...prev.topThings]
      next[i] = value
      return { ...prev, topThings: next }
    })

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await saveEntry(form)
      setJustSaved(true)
      addToast('Journal entry saved! ✨ +10 pts', 'success')
      setTimeout(() => setJustSaved(false), 2500)
    } catch (err) {
      addToast(err.message || 'Failed to save journal entry', 'error')
    }
  }

  const isEmpty = !form.topThings.some(t => t.trim()) &&
    !form.work.trim() &&
    !form.gym.trim()  && !form.mood.trim()    && !form.tomorrow.trim()

  const isEditMode   = !!todayEntry
  // Show last 7 history entries in past-entries section (exclude today)
  const today        = new Date().toISOString().slice(0, 10)
  const pastEntries  = history.filter(h => h.entry_date !== today).slice(0, 7)

  if (loading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Loader2 className="animate-spin text-cyber-400" size={30} />
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', fontFamily: 'ui-monospace, monospace' }}>
          Loading journal...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 page-enter">
      {/* ── Keyframe for skeleton ── */}
      <style>{`
        @keyframes jrn-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            <BookOpen size={18} style={{ color: '#22d3ee' }} />
            Daily Journal
          </h1>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'ui-monospace, monospace', marginTop: 4 }}>
            Log your achievements, work, and metrics.
          </p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 10, padding: '5px 10px',
          fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)',
          fontFamily: 'ui-monospace, monospace',
        }}>
          <Calendar size={12} style={{ color: '#22d3ee' }} />
          {format(new Date(), 'EEEE, MMM d, yyyy')}
          {isEditMode && (
            <span style={{ fontSize: '0.6rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: 4 }}>
              · Edit
            </span>
          )}
        </div>
      </div>

      {/* ── Form Card ───────────────────────────────────────────── */}
      <form onSubmit={handleSave}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20,
          padding: '1.1rem 1.2rem',
        }}>
          {/* Form title row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: 'ui-monospace, monospace', margin: 0 }}>
              {isEditMode ? "✏️  Today's Log Entry" : "📝  Create Today's Entry"}
            </h2>
            <DraftBadge savedAt={draftSavedAt} />
          </div>

          {/* 2-col grid on desktop, 1-col on mobile */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {/* ── LEFT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Top 3 Things */}
              <Section icon={Target} label="Top 3 Things Today" accentClass="text-emerald-400">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {form.topThings.map((val, i) => (
                    <div key={i}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{
                          position: 'absolute', left: 10, fontSize: '0.7rem',
                          fontFamily: 'ui-monospace, monospace', color: 'rgba(255,255,255,0.3)',
                        }}>
                          {i + 1}.
                        </span>
                        <input
                          type="text"
                          placeholder={`Thing #${i + 1}...`}
                          maxLength={LIMITS.topThing}
                          value={val}
                          onChange={e => updateTopThing(i, e.target.value)}
                          className="input-cyber text-xs"
                          style={{ paddingLeft: '1.6rem', height: 36 }}
                        />
                      </div>
                      <CharCount current={val.length} max={LIMITS.topThing} />
                    </div>
                  ))}
                </div>
              </Section>

              {/* Work / Dev Notes */}
              <Section icon={Code2} label="Work / Dev Notes" accentClass="text-blue-400">
                <textarea
                  rows={4}
                  placeholder="What did you build, fix, or learn today?"
                  maxLength={LIMITS.work}
                  value={form.work}
                  onChange={e => setForm(p => ({ ...p, work: e.target.value }))}
                  className="input-cyber text-xs resize-none"
                />
                <CharCount current={form.work.length} max={LIMITS.work} />
              </Section>

              {/* Trading Journal Link Card */}
              <div
                onClick={() => navigate('/trading-journal')}
                style={{
                  background: `linear-gradient(135deg, rgba(212,168,71,0.10), rgba(125,184,216,0.08))`,
                  border: '1px solid rgba(212,168,71,0.22)',
                  borderRadius: 16, padding: '0.8rem 1rem',
                  cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 10,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,71,0.45)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,168,71,0.16), rgba(125,184,216,0.12))' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,168,71,0.22)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212,168,71,0.10), rgba(125,184,216,0.08))' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ padding: 7, borderRadius: 9, background: 'rgba(212,168,71,0.15)', border: '1px solid rgba(212,168,71,0.25)', display: 'flex' }}>
                    <LineChart size={14} style={{ color: '#d4a847' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0, fontFamily: 'ui-monospace, monospace' }}>
                      📈 Trading Journal
                    </p>
                    <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', fontFamily: 'ui-monospace, monospace' }}>
                      Log today's F&O trades →
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '0.65rem', color: 'rgba(212,168,71,0.6)', fontFamily: 'ui-monospace, monospace', flexShrink: 0 }}>open →</span>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Gym & Training */}
              <Section icon={Dumbbell} label="Gym & Training" accentClass="text-orange-400">
                <input
                  type="text"
                  placeholder="Workout split, sets, reps, energy level..."
                  maxLength={LIMITS.gym}
                  value={form.gym}
                  onChange={e => setForm(p => ({ ...p, gym: e.target.value }))}
                  className="input-cyber text-xs"
                  style={{ height: 36 }}
                />
                <CharCount current={form.gym.length} max={LIMITS.gym} />
              </Section>

              {/* Mood & Mindset */}
              <Section icon={Smile} label="Mood & Mindset" accentClass="text-pink-400">
                <textarea
                  rows={4}
                  placeholder="How did you feel? Any mental blocks or breakthroughs?"
                  maxLength={LIMITS.mood}
                  value={form.mood}
                  onChange={e => setForm(p => ({ ...p, mood: e.target.value }))}
                  className="input-cyber text-xs resize-none"
                />
                <CharCount current={form.mood.length} max={LIMITS.mood} />
              </Section>

              {/* Tomorrow's Focus */}
              <Section icon={Plus} label="Tomorrow's Focus" accentClass="text-cyan-400">
                <input
                  type="text"
                  placeholder="The single most important objective for tomorrow"
                  maxLength={LIMITS.tomorrow}
                  value={form.tomorrow}
                  onChange={e => setForm(p => ({ ...p, tomorrow: e.target.value }))}
                  className="input-cyber text-xs"
                  style={{ height: 36 }}
                />
                <CharCount current={form.tomorrow.length} max={LIMITS.tomorrow} />
              </Section>
            </div>
          </div>

          {/* ── SAVE BUTTON ── */}
          <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <motion.button
              type="submit"
              id="journal-save-btn"
              disabled={isEmpty || saving}
              whileTap={{ scale: 0.975 }}
              whileHover={{ scale: 1.01 }}
              style={{
                width: '100%',
                height: 46,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                border: 'none',
                cursor: isEmpty || saving ? 'not-allowed' : 'pointer',
                opacity: isEmpty || saving ? 0.45 : 1,
                fontWeight: 700,
                fontSize: '0.85rem',
                color: '#0B1121',
                backgroundImage: justSaved
                  ? `linear-gradient(135deg, #34d399, #10b981)`
                  : `linear-gradient(135deg, ${SAGE}, ${SKY})`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'background-image 0.4s, opacity 0.2s',
                boxShadow: isEmpty ? 'none' : `0 4px 20px ${SAGE}44`,
              }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', gap: 7,
                opacity: saving ? 0 : 1, transition: 'opacity 0.15s',
              }}>
                {justSaved
                  ? <><CheckCircle size={16} /> Saved!</>
                  : <><Save size={15} /> {isEditMode ? 'Update Entry' : 'Save Entry'}</>
                }
              </span>
              {saving && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={17} className="animate-spin" style={{ color: '#0B1121' }} />
                </span>
              )}
            </motion.button>

            {/* Hint text */}
            {!isEmpty && !isEditMode && (
              <p style={{ textAlign: 'center', marginTop: 6, fontSize: '0.62rem', color: 'rgba(255,255,255,0.22)', fontFamily: 'ui-monospace, monospace' }}>
                Auto-drafts saved locally · Won't count as submitted until you press Save
              </p>
            )}
          </div>
        </div>
      </form>

      {/* ── PAST ENTRIES ────────────────────────────────────────── */}
      <div>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 style={{
            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)',
            fontFamily: 'ui-monospace, monospace', margin: 0,
          }}>
            Past Entries ({pastEntries.length})
          </h3>
          {pastEntries.length > 0 && (
            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'ui-monospace, monospace' }}>
              Last 7 days
            </span>
          )}
        </div>

        {pastEntries.length === 0 ? (
          /* Empty state */
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '2.5rem 1rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>📖</div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              No past entries yet
            </p>
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
              Write your first entry above — it'll appear here tomorrow!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pastEntries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                <PastEntryCard
                  entry={entry}
                  isOpen={expandedIndex === idx}
                  onToggle={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
