/**
 * Journal.jsx — Daily Journal page (design-system restyle).
 *
 * Presentation only — all logic unchanged:
 *  - Five form sections (Top 3, Work, Gym, Mood, Tomorrow) + Trading Journal link card
 *  - Character counters under every textarea / input
 *  - Auto-save draft to localStorage every 10 s (with fade-in "Draft saved" indicator)
 *  - Save Entry button with loading + success states
 *  - Success + error toasts
 *  - Past Entries section — last 7 days, collapsible glass-card rows, mood emoji badge
 *
 * Section accent coding (per design system): Top 3 = lime, Dev Notes = cyan,
 * Gym = cyan, Mood = violet, Tomorrow = lime.
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

/* ── Design-system palette (mirrors src/styles/theme.css) ──────────────────── */
const LIME = '#A3E635'
const CYAN = '#22D3EE'
const VIOLET = '#A78BFA'
const CORAL = '#F87171'
const MONO = "'JetBrains Mono', ui-monospace, monospace"

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
   SECTION CARD wrapper — glass-card with accent-tinted icon chip
───────────────────────────────────────────────────────────────────────────── */
function Section({ icon: Icon, label, accent, children }) {
  return (
    <div className="glass-card" style={{ padding: '0.9rem 1rem' }}>
      <div className="flex items-center gap-2" style={{ marginBottom: '0.65rem' }}>
        <div style={{ padding: 6, borderRadius: 8, background: `${accent}1A`, display: 'flex' }}>
          <Icon size={13} style={{ color: accent }} />
        </div>
        <span className="section-label">{label}</span>
      </div>
      {children}
    </div>
  )
}

/* Character counter — 11px mono, muted; cyan near limit, coral over */
function CharCount({ current, max }) {
  const pct     = current / max
  const nearMax = pct > 0.85
  const over    = current > max
  return (
    <p style={{
      textAlign: 'right',
      fontSize: 11,
      marginTop: 4,
      fontFamily: MONO,
      color: over ? CORAL : nearMax ? CYAN : 'var(--text-muted)',
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
            fontSize: 11,
            color: 'rgba(163,230,53,0.85)',
            fontFamily: MONO,
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
   PAST ENTRY CARD — collapsible glass-card row
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
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
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
            fontSize: 11,
            fontWeight: 700,
            fontFamily: MONO,
            color: CYAN,
            flexShrink: 0,
          }}>
            {dateLabel}
          </span>

          {/* First "top thing" preview */}
          {firstTop && (
            <>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>·</span>
              <span style={{
                fontSize: 11.5,
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: MONO,
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
          <span style={{ color: 'var(--text-muted)' }}>
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
              borderTop: '1px solid var(--border-subtle)',
              padding: '0.75rem 0.9rem',
              background: 'rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: 11.5,
              fontFamily: MONO,
              color: 'var(--text-secondary)',
            }}>
              {/* Top 3 */}
              {entry.top_things?.some(t => t?.trim()) && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: `${LIME}bb`, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>
                    Top things today
                  </p>
                  {entry.top_things.filter(t => t?.trim()).map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, lineHeight: 1.5 }}>
                      <span style={{ color: LIME, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              )}

              {entry.work_notes?.trim() && (
                <Field label="Work & Dev" color={CYAN}>{entry.work_notes}</Field>
              )}
              {entry.trading_notes?.trim() && (
                <Field label="Trading" color={CYAN}>{entry.trading_notes}</Field>
              )}
              {entry.gym_notes?.trim() && (
                <Field label="Gym & Training" color={CYAN}>{entry.gym_notes}</Field>
              )}
              {entry.mood_notes?.trim() && (
                <Field label="Mood & Mindset" color={VIOLET}>{entry.mood_notes}</Field>
              )}
              {entry.tomorrow_focus?.trim() && (
                <Field label="Tomorrow's Focus" color={LIME}>{entry.tomorrow_focus}</Field>
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
        fontSize: 10, fontWeight: 700, color: `${color}aa`,
        textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3,
      }}>
        {label}
      </p>
      <p style={{
        paddingLeft: 8,
        borderLeft: `2px solid ${color}33`,
        color: 'var(--text-secondary)',
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
        <Loader2 className="animate-spin" size={30} style={{ color: CYAN }} />
        <p style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: MONO }}>
          Loading journal...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 page-enter">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            <BookOpen size={18} style={{ color: CYAN }} />
            Daily Journal
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 4 }}>
            Log your achievements, work, and metrics.
          </p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: '5px 10px',
          fontSize: 11.5, color: 'var(--text-secondary)',
          fontFamily: MONO,
        }}>
          <Calendar size={12} style={{ color: CYAN }} />
          {format(new Date(), 'EEEE, MMM d, yyyy')}
          {isEditMode && (
            <span style={{ fontSize: 10, color: LIME, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: 4 }}>
              · Edit
            </span>
          )}
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────── */}
      <form onSubmit={handleSave}>
        {/* Form title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: MONO, margin: 0 }}>
            {isEditMode ? "✏️  Today's Log Entry" : "📝  Create Today's Entry"}
          </h2>
          <DraftBadge savedAt={draftSavedAt} />
        </div>

        {/* 2-col grid on desktop, 1-col on mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Top 3 Things — lime */}
            <Section icon={Target} label="Top 3 Things Today" accent={LIME}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {form.topThings.map((val, i) => (
                  <div key={i}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        position: 'absolute', left: 11, fontSize: 11.5,
                        fontFamily: MONO, color: 'var(--text-muted)',
                        pointerEvents: 'none',
                      }}>
                        {i + 1}.
                      </span>
                      <input
                        type="text"
                        placeholder={`Thing #${i + 1}...`}
                        maxLength={LIMITS.topThing}
                        value={val}
                        onChange={e => updateTopThing(i, e.target.value)}
                        className="glass-input"
                        style={{ paddingLeft: '1.8rem' }}
                      />
                    </div>
                    <CharCount current={val.length} max={LIMITS.topThing} />
                  </div>
                ))}
              </div>
            </Section>

            {/* Work / Dev Notes — cyan */}
            <Section icon={Code2} label="Work / Dev Notes" accent={CYAN}>
              <textarea
                rows={4}
                placeholder="What did you build, fix, or learn today?"
                maxLength={LIMITS.work}
                value={form.work}
                onChange={e => setForm(p => ({ ...p, work: e.target.value }))}
                className="glass-input resize-none"
              />
              <CharCount current={form.work.length} max={LIMITS.work} />
            </Section>

            {/* Trading Journal Link Card */}
            <div
              onClick={() => navigate('/trading-journal')}
              className="glass-card"
              style={{
                padding: '0.8rem 1rem',
                cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)'; e.currentTarget.style.background = 'rgba(34,211,238,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 7, borderRadius: 9, background: 'rgba(34,211,238,0.12)', display: 'flex' }}>
                  <LineChart size={14} style={{ color: CYAN }} />
                </div>
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: MONO }}>
                    📈 Trading Journal
                  </p>
                  <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: '2px 0 0', fontFamily: MONO }}>
                    Log today's F&O trades →
                  </p>
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(34,211,238,0.6)', fontFamily: MONO, flexShrink: 0 }}>open →</span>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Gym & Training — cyan */}
            <Section icon={Dumbbell} label="Gym & Training" accent={CYAN}>
              <input
                type="text"
                placeholder="Workout split, sets, reps, energy level..."
                maxLength={LIMITS.gym}
                value={form.gym}
                onChange={e => setForm(p => ({ ...p, gym: e.target.value }))}
                className="glass-input"
              />
              <CharCount current={form.gym.length} max={LIMITS.gym} />
            </Section>

            {/* Mood & Mindset — violet */}
            <Section icon={Smile} label="Mood & Mindset" accent={VIOLET}>
              <textarea
                rows={4}
                placeholder="How did you feel? Any mental blocks or breakthroughs?"
                maxLength={LIMITS.mood}
                value={form.mood}
                onChange={e => setForm(p => ({ ...p, mood: e.target.value }))}
                className="glass-input resize-none"
              />
              <CharCount current={form.mood.length} max={LIMITS.mood} />
            </Section>

            {/* Tomorrow's Focus — lime */}
            <Section icon={Plus} label="Tomorrow's Focus" accent={LIME}>
              <input
                type="text"
                placeholder="The single most important objective for tomorrow"
                maxLength={LIMITS.tomorrow}
                value={form.tomorrow}
                onChange={e => setForm(p => ({ ...p, tomorrow: e.target.value }))}
                className="glass-input"
              />
              <CharCount current={form.tomorrow.length} max={LIMITS.tomorrow} />
            </Section>
          </div>
        </div>

        {/* ── SAVE BUTTON ── */}
        <div style={{ marginTop: '1rem' }}>
          <button
            type="submit"
            id="journal-save-btn"
            disabled={isEmpty || saving}
            className="glass-btn glass-btn-accent w-full"
            style={{ height: 46, fontWeight: 700, fontSize: 14, position: 'relative' }}
          >
            <span style={{
              display: 'flex', alignItems: 'center', gap: 7,
              opacity: saving ? 0 : 1, transition: 'opacity 0.15s',
            }}>
              {justSaved
                ? <><CheckCircle size={16} style={{ color: LIME }} /> Saved!</>
                : <><Save size={15} /> {isEditMode ? 'Update Entry' : 'Save Entry'}</>
              }
            </span>
            {saving && (
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={17} className="animate-spin" style={{ color: CYAN }} />
              </span>
            )}
          </button>

          {/* Hint text */}
          {!isEmpty && !isEditMode && (
            <p style={{ textAlign: 'center', marginTop: 6, fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>
              Auto-drafts saved locally · Won't count as submitted until you press Save
            </p>
          )}
        </div>
      </form>

      {/* ── PAST ENTRIES ────────────────────────────────────────── */}
      <div>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h3 className="section-label" style={{ margin: 0 }}>
            Past Entries ({pastEntries.length})
          </h3>
          {pastEntries.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>
              Last 7 days
            </span>
          )}
        </div>

        {pastEntries.length === 0 ? (
          /* Empty state */
          <div className="glass-card" style={{
            borderStyle: 'dashed',
            padding: '2.5rem 1rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>📖</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
              No past entries yet
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
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
