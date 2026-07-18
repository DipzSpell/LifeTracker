/**
 * TradingJournal.jsx — F&O Options Trading Journal for NSE (design-system UI).
 *
 * Sections:
 *  A) Summary Stats Bar — Monthly P&L, Win Rate (mini ring), Trades, Best/Worst, Avg R:R
 *  B) Quick Add Trade Form — collapsible, with options-aware fields
 *  C) Quick week strip + Trades List — filterable, sortable, expandable glass-card rows
 *  D) Analytics — Cumulative P&L chart, Win/Loss pie, Strategy/Symbol bar charts
 *
 * All data logic (Supabase CRUD, P&L calc, lot-size autofill, analytics memos)
 * is unchanged — presentation only, on src/styles/theme.css tokens.
 * Color semantics: profit/Long/CE/win = lime · loss/Short/PE = coral ·
 * open/active/info = cyan · violet only for the break-even pie slice.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import {
  TrendingUp, TrendingDown, Plus, Minus, ChevronDown, ChevronUp,
  Loader2, X, Trash2, CheckCircle,
  Activity, Zap, Search, Scale,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Toast, { useToast } from '../components/ui/Toast'
import ProgressRing from '../components/bevel/ProgressRing'
import { LOT_SIZES, DEFAULT_LOT_SIZE } from '../lib/lotSizes'

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN-SYSTEM PALETTE (mirrors src/styles/theme.css — see Dashboard.jsx)
───────────────────────────────────────────────────────────────────────────── */
const C = {
  cyan: '#22D3EE',
  lime: '#A3E635',
  violet: '#A78BFA',
  coral: '#F87171',
  elevated: '#151A23',
  borderSubtle: 'rgba(255,255,255,0.08)',
}
const MONO = "'JetBrains Mono', ui-monospace, monospace"

const SEGMENTS    = ['Options', 'Futures', 'Equity']
const STATUSES     = ['Open', 'Closed', 'Stopped Out']
const STRATEGY_TAGS = ['Breakout', 'Reversal', 'Scalp', 'Swing', 'Positional', 'Hedging', 'Other']

// Closed uses a neutral/muted tone (not lime) — the P&L number itself already
// carries the profit/loss color, so the status pill stays informational only.
const STATUS_COLOR = { 'Open': C.cyan, 'Closed': '#64748B', 'Stopped Out': C.coral }

const SYMBOL_SUGGESTIONS = [
  'NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX',
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
  'SBIN', 'WIPRO', 'TATAMOTORS', 'ITC', 'BAJFINANCE',
  'KOTAKBANK', 'AXISBANK', 'LT', 'ADANIENT',
]

// Expiry quick picks (next 4 Thursdays-ish)
function getNextExpiries() {
  const expiries = []
  const d = new Date()
  for (let i = 0; i < 60; i++) {
    d.setDate(d.getDate() + 1)
    // Thursday = day 4
    if (d.getDay() === 4) {
      expiries.push(new Date(d))
      if (expiries.length === 4) break
    }
  }
  return expiries.map(d => format(d, 'yyyy-MM-dd'))
}

/* ─────────────────────────────────────────────────────────────────────────────
   P&L CALCULATION
───────────────────────────────────────────────────────────────────────────── */
function calcPnl(trade) {
  if (!trade.exit_price || !trade.entry_price) return { pnl: 0, pnl_percent: 0 }
  const diff = trade.trade_type === 'Long'
    ? trade.exit_price - trade.entry_price
    : trade.entry_price - trade.exit_price
  const pnl = diff * (trade.quantity || 1)
  const pnl_percent = trade.entry_price > 0
    ? (diff / trade.entry_price) * 100 : 0
  return { pnl: Math.round(pnl * 100) / 100, pnl_percent: Math.round(pnl_percent * 100) / 100 }
}

/* ─────────────────────────────────────────────────────────────────────────────
   FORMATTING HELPERS
───────────────────────────────────────────────────────────────────────────── */
const fmt = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '—'
  const abs = Math.abs(n)
  const formatted = abs >= 1_00_00_000
    ? `₹${(abs / 1_00_00_000).toFixed(2)}Cr`
    : abs >= 1_00_000
    ? `₹${(abs / 1_00_000).toFixed(2)}L`
    : abs >= 1000
    ? `₹${(abs / 1000).toFixed(1)}K`
    : `₹${abs.toFixed(2)}`
  return n < 0 ? `-${formatted}` : formatted
}
// Signed variant for P&L displays — "+₹1.2K" / "-₹850"
const sfmt = (n) => (n > 0 ? `+${fmt(n)}` : fmt(n))
const pct = (n) => (n === null || n === undefined || isNaN(n)) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
const pnlColor = (n) => (n >= 0 ? C.lime : C.coral)

/* ─────────────────────────────────────────────────────────────────────────────
   EMPTY FORM STATE
───────────────────────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  trade_date:     format(new Date(), 'yyyy-MM-dd'),
  symbol:         '',
  segment:        'Options',
  option_type:    'CE',
  strike_price:   '',
  expiry_date:    '',
  trade_type:     'Long',
  entry_price:    '',
  lots:           1,                  // how many lots (user input, F&O only)
  lot_size:       DEFAULT_LOT_SIZE,   // units per lot (auto from symbol, editable)
  quantity:       '',                 // direct input for Equity ONLY — F&O qty is
                                      // always derived live as lots × lot_size
  stop_loss:      '',
  target:         '',
  strategy_tag:   '',
  entry_reason:   '',
}

/* ─────────────────────────────────────────────────────────────────────────────
   REUSABLE UI PRIMITIVES
───────────────────────────────────────────────────────────────────────────── */
function Label({ children }) {
  return (
    <label className="section-label" style={{ display: 'block', marginBottom: 5 }}>
      {children}
    </label>
  )
}

function Input({ style = {}, className = '', ...props }) {
  return (
    <input
      className={`glass-input ${className}`}
      style={{ height: 38, fontFamily: MONO, fontSize: 12.5, ...style }}
      {...props}
    />
  )
}

function Select({ children, style = {}, className = '', active = false, ...props }) {
  return (
    <select
      className={className}
      style={{
        height: 38, fontFamily: MONO, fontSize: 12.5,
        background: 'var(--bg-elevated)',
        border: `1px solid ${active ? C.cyan : 'var(--border-subtle)'}`,
        borderRadius: 10, color: 'var(--text-primary)',
        padding: '0 0.6rem',
        transition: 'border-color 0.2s',
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  )
}

function StatCard({ label, value, sub, color = 'var(--text-primary)', icon: Icon, ring }) {
  return (
    <div className="glass-card" style={{
      padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: 6,
      minWidth: 0, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="section-label" style={{ whiteSpace: 'nowrap' }}>{label}</span>
        {ring
          ? <ProgressRing pct={ring.pct} size={26} stroke={3} from={ring.color} to={ring.color} mini animate={false} trackColor={C.borderSubtle} />
          : Icon && <Icon size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      </div>
      {/* Fluid font-size (inline beats .stat-number's fixed sizes) + nowrap so
          long values like "1:12.5" or "-₹1.24L" shrink instead of overflowing */}
      <p className="stat-number" style={{
        color, margin: 0, lineHeight: 1.05,
        fontSize: 'clamp(20px, 2vw + 8px, 32px)',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </p>
      {sub && (
        <p style={{
          fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function Badge({ children, color = 'rgba(255,255,255,0.15)', textColor = 'var(--text-primary)', style = {} }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, fontFamily: MONO,
      padding: '2px 8px', borderRadius: 20,
      background: color, color: textColor,
      border: `1px solid ${color}`,
      display: 'inline-flex', alignItems: 'center', gap: 3,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SYMBOL AUTOCOMPLETE INPUT
───────────────────────────────────────────────────────────────────────────── */
function SymbolInput({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const filtered = SYMBOL_SUGGESTIONS.filter(s =>
    value && s.startsWith(value.toUpperCase()) && s !== value.toUpperCase()
  ).slice(0, 6)

  return (
    <div style={{ position: 'relative' }}>
      <Input
        type="text"
        placeholder="NIFTY, BANKNIFTY..."
        value={value}
        onChange={e => { onChange(e.target.value.toUpperCase()); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => setOpen(true)}
        style={{ width: '100%' }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: C.elevated, border: '1px solid var(--border-glass)',
          borderRadius: 10, marginTop: 4, overflow: 'hidden',
        }}>
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={() => { onChange(s); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 12px', fontSize: 12,
                fontFamily: MONO,
                color: 'var(--text-secondary)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: `1px solid ${C.borderSubtle}`,
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.target.style.background = 'none'}
            >
              {s}
              {LOT_SIZES[s] && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>
                  lot: {LOT_SIZES[s]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SEGMENTED CONTROL (Long / Short, CE / PE)
───────────────────────────────────────────────────────────────────────────── */
function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex', background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 3, gap: 3,
      height: 38,
    }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, padding: '4px 10px',
              borderRadius: 8, cursor: 'pointer',
              fontSize: 11.5, fontWeight: 700,
              fontFamily: MONO,
              transition: 'all 0.15s',
              background: active ? `${opt.color}26` : 'transparent',
              border: active ? `1px solid ${opt.color}66` : '1px solid transparent',
              color: active ? opt.color : 'var(--text-muted)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   CLOSE TRADE MINI-FORM
───────────────────────────────────────────────────────────────────────────── */
function CloseTradeForm({ trade, onClose, onSave }) {
  const [exitPrice, setExitPrice] = useState('')
  const [exitReason, setExitReason] = useState('')
  const [lessons, setLessons] = useState('')
  const [status, setStatus] = useState('Closed')
  const [saving, setSaving] = useState(false)

  const preview = useMemo(() => {
    if (!exitPrice) return null
    const t = { ...trade, exit_price: parseFloat(exitPrice) }
    return calcPnl(t)
  }, [exitPrice, trade])

  const handleSubmit = async () => {
    if (!exitPrice) return
    setSaving(true)
    const ep = parseFloat(exitPrice)
    const t = { ...trade, exit_price: ep }
    const { pnl, pnl_percent } = calcPnl(t)
    await onSave({ exit_price: ep, exit_reason: exitReason, lessons_learned: lessons, status, pnl, pnl_percent })
    setSaving(false)
  }

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)', borderRadius: 12,
      border: `1px solid ${C.borderSubtle}`, padding: '0.85rem',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', margin: 0, fontFamily: MONO }}>
        Close Trade
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <Label>Exit Price</Label>
          <Input type="number" step="0.05" placeholder="Exit price" value={exitPrice} onChange={e => setExitPrice(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%' }}>
            <option>Closed</option>
            <option>Stopped Out</option>
          </Select>
        </div>
      </div>

      {preview && (
        <div style={{
          padding: '6px 10px', borderRadius: 8,
          background: preview.pnl >= 0 ? 'rgba(163,230,53,0.12)' : 'rgba(248,113,113,0.12)',
          border: `1px solid ${pnlColor(preview.pnl)}44`,
          fontSize: 12, fontFamily: MONO,
          color: pnlColor(preview.pnl),
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Estimated P&L:</span>
          <span style={{ fontWeight: 700 }}>{sfmt(preview.pnl)} ({pct(preview.pnl_percent)})</span>
        </div>
      )}

      <div>
        <Label>Exit Reason</Label>
        <textarea rows={2} placeholder="Why did you exit?" value={exitReason} onChange={e => setExitReason(e.target.value)}
          className="glass-input resize-none" style={{ fontFamily: MONO, width: '100%' }} />
      </div>
      <div>
        <Label>Lessons Learned</Label>
        <textarea rows={2} placeholder="What did you learn?" value={lessons} onChange={e => setLessons(e.target.value)}
          className="glass-input resize-none" style={{ fontFamily: MONO, width: '100%' }} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onClose}
          className="glass-btn"
          style={{ flex: 1, padding: '8px', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={!exitPrice || saving}
          className="glass-btn glass-btn-accent"
          style={{ flex: 1, padding: '8px', fontSize: 12.5, fontWeight: 700 }}>
          {saving ? '...' : 'Confirm Close'}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   TRADE ROW — glass-card, cyan left border when open
───────────────────────────────────────────────────────────────────────────── */
function TradeRow({ trade, onDelete, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [showClose, setShowClose] = useState(false)

  const rowPnlColor = !trade.exit_price ? 'var(--text-muted)' : pnlColor(trade.pnl)
  const isClosed = trade.status !== 'Open'

  const dateLabel = (() => {
    try { return format(parseISO(trade.trade_date), 'MMM d') }
    catch { return trade.trade_date }
  })()

  const handleCloseSave = async (updates) => {
    await onUpdate(trade.id, updates)
    setShowClose(false)
  }

  return (
    <div
      className="glass-card"
      style={{
        padding: 0, overflow: 'hidden', marginBottom: 8,
        ...(isClosed ? {} : { borderLeft: `3px solid ${C.cyan}` }),
      }}
    >
      {/* Header row — stacked 2-line layout so it reads cleanly on narrow screens */}
      <div
        onClick={() => setOpen(o => !o)}
        className="touch-manipulation"
        style={{
          display: 'flex', flexDirection: 'column', gap: 6,
          padding: '0.75rem 0.85rem', cursor: 'pointer', minHeight: 44,
        }}
      >
        {/* Line 1: Symbol + segment/option badges + strike ... Long/Short pill + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: MONO, flexShrink: 0 }}>
              {trade.symbol}
            </span>
            <Badge color="rgba(255,255,255,0.07)" textColor="var(--text-secondary)">
              {trade.segment}
            </Badge>
            {trade.segment === 'Options' && trade.option_type && (
              <Badge
                color={trade.option_type === 'CE' ? 'rgba(163,230,53,0.14)' : 'rgba(248,113,113,0.14)'}
                textColor={trade.option_type === 'CE' ? C.lime : C.coral}
              >
                {trade.option_type}
              </Badge>
            )}
            {trade.strike_price && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, whiteSpace: 'nowrap' }}>
                {trade.strike_price}
              </span>
            )}
          </div>

          <Badge
            color={trade.trade_type === 'Long' ? 'rgba(163,230,53,0.14)' : 'rgba(248,113,113,0.14)'}
            textColor={trade.trade_type === 'Long' ? C.lime : C.coral}
            style={{ flexShrink: 0 }}
          >
            {trade.trade_type === 'Long' ? '↑ Long' : '↓ Short'}
          </Badge>

          <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </div>

        {/* Line 2: date · entry→exit · P&L · status — wraps gracefully, never overflows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: MONO, flexShrink: 0 }}>
            {dateLabel}
          </span>
          <span style={{ fontSize: 11, fontFamily: MONO, color: 'var(--text-secondary)', flexShrink: 0 }}>
            ₹{trade.entry_price}
            {trade.exit_price ? ` → ₹${trade.exit_price}` : ''}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: MONO, color: rowPnlColor, flexShrink: 0, marginLeft: 'auto' }}>
            {trade.exit_price ? sfmt(trade.pnl) : '—'}
          </span>
          <Badge
            color={`${STATUS_COLOR[trade.status] || C.cyan}22`}
            textColor={STATUS_COLOR[trade.status] || C.cyan}
          >
            {trade.status}
          </Badge>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              borderTop: `1px solid ${C.borderSubtle}`,
              padding: '0.75rem 0.85rem',
              background: 'rgba(0,0,0,0.15)',
              fontSize: 11.5, fontFamily: MONO,
              color: 'var(--text-secondary)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 10 }}>
                <DetailField label="Segment" value={trade.segment} />
                {trade.segment !== 'Equity' && (
                  <>
                    <DetailField label="Lot Size" value={trade.lot_size || '—'} />
                    {/* Lots not stored in DB — derived from qty ÷ lot size.
                        Guarded so legacy rows (missing/odd lot_size) can't crash. */}
                    <DetailField label="Lots" value={
                      trade.lot_size > 0 && trade.quantity > 0
                        ? Math.max(1, Math.round(trade.quantity / trade.lot_size))
                        : '—'
                    } />
                  </>
                )}
                <DetailField label="Quantity" value={trade.quantity} />
                {trade.expiry_date && <DetailField label="Expiry" value={trade.expiry_date} />}
                {trade.stop_loss && <DetailField label="SL" value={`₹${trade.stop_loss}`} color={C.coral} />}
                {trade.target && <DetailField label="Target" value={`₹${trade.target}`} color={C.lime} />}
                {trade.strategy_tag && <DetailField label="Strategy" value={trade.strategy_tag} color={C.cyan} />}
                {trade.pnl_percent !== 0 && <DetailField label="P&L %" value={pct(trade.pnl_percent)} color={pnlColor(trade.pnl)} />}
              </div>

              {trade.entry_reason && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 10, color: `${C.cyan}99`, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>Entry Reason</p>
                  <p style={{ paddingLeft: 8, borderLeft: `2px solid ${C.cyan}33`, lineHeight: 1.5, margin: 0 }}>{trade.entry_reason}</p>
                </div>
              )}
              {trade.exit_reason && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: 10, color: `${C.violet}99`, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>Exit Reason</p>
                  <p style={{ paddingLeft: 8, borderLeft: `2px solid ${C.violet}33`, lineHeight: 1.5, margin: 0 }}>{trade.exit_reason}</p>
                </div>
              )}
              {trade.lessons_learned && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 10, color: `${C.lime}99`, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>Lessons Learned</p>
                  <p style={{ paddingLeft: 8, borderLeft: `2px solid ${C.lime}33`, lineHeight: 1.5, margin: 0 }}>{trade.lessons_learned}</p>
                </div>
              )}

              {/* Actions row */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {!isClosed && (
                  <button type="button" onClick={e => { e.stopPropagation(); setShowClose(s => !s) }}
                    style={{
                      padding: '8px 14px', minHeight: 40, borderRadius: 8, border: `1px solid ${C.lime}55`,
                      background: 'rgba(163,230,53,0.12)', color: C.lime, cursor: 'pointer',
                      fontSize: 11.5, fontWeight: 700, fontFamily: MONO,
                    }}>
                    <CheckCircle size={11} style={{ display: 'inline', marginRight: 4 }} />
                    Close Trade
                  </button>
                )}
                <button type="button" onClick={e => { e.stopPropagation(); onDelete(trade.id) }}
                  style={{
                    padding: '8px 12px', minHeight: 40, borderRadius: 8, border: `1px solid ${C.coral}44`,
                    background: 'rgba(248,113,113,0.10)', color: C.coral, cursor: 'pointer',
                    fontSize: 11.5, fontWeight: 700, fontFamily: MONO,
                  }}>
                  <Trash2 size={11} style={{ display: 'inline', marginRight: 4 }} />
                  Delete
                </button>
              </div>

              {/* Close trade form */}
              <AnimatePresence>
                {showClose && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ marginTop: 10 }}>
                    <CloseTradeForm trade={trade} onClose={() => setShowClose(false)} onSave={handleCloseSave} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DetailField({ label, value, color }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: 11.5, fontWeight: 600, color: color || 'var(--text-secondary)', margin: 0 }}>{value}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM RECHARTS TOOLTIP
───────────────────────────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: C.elevated, border: `1px solid ${C.borderSubtle}`,
      borderRadius: 10, padding: '0.55rem 0.85rem',
      fontSize: 11.5, fontFamily: MONO,
      color: 'var(--text-secondary)',
    }}>
      <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color || 'var(--text-primary)' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? (p.name.includes('P&L') ? fmt(p.value) : p.value) : p.value}</strong>
        </p>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function TradingJournal() {
  const { user } = useAuth()
  const uid = user?.uid
  const { toasts, addToast, removeToast } = useToast()

  const [trades,  setTrades]  = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  // Form state
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  // Filters
  const [filterSymbol,   setFilterSymbol]   = useState('')
  const [filterStatus,   setFilterStatus]   = useState('All')
  const [filterSegment,  setFilterSegment]  = useState('All')
  const [filterStrategy, setFilterStrategy] = useState('All')
  const [sortBy,         setSortBy]         = useState('date_desc')

  const hasActiveFilters = !!filterSymbol || filterStatus !== 'All' || filterSegment !== 'All' || filterStrategy !== 'All'
  const clearFilters = () => {
    setFilterSymbol(''); setFilterStatus('All'); setFilterSegment('All'); setFilterStrategy('All')
  }

  const nextExpiries = useMemo(() => getNextExpiries(), [])

  // ── Fetch trades ───────────────────────────────────────────────────────────
  const fetchTrades = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', uid)
      .order('trade_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) { addToast(error.message, 'error'); setLoading(false); return }
    setTrades(data || [])
    setLoading(false)
  }, [uid, addToast])

  useEffect(() => { fetchTrades() }, [fetchTrades])

  // ── Auto lot size when symbol changes (mapping se) ─────────────────────────
  useEffect(() => {
    setForm(p => {
      if (p.segment === 'Equity') return p
      return { ...p, lot_size: LOT_SIZES[p.symbol] ?? DEFAULT_LOT_SIZE }
    })
  }, [form.symbol])

  // Lots / Lot Size inputs — quantity is NOT stored for F&O, it's derived
  // fresh every render below, so it can never go stale or get overwritten.
  const handleLotsChange = (rawLots) =>
    setForm(p => ({ ...p, lots: rawLots === '' ? '' : Math.max(1, parseInt(rawLots) || 1) }))

  const handleLotSizeChange = (rawLs) =>
    setForm(p => ({ ...p, lot_size: rawLs === '' ? '' : Math.max(1, parseInt(rawLs) || 1) }))

  // ── Derived F&O quantity — the single source of truth for display & submit ─
  const fnoQuantity = Math.max(1,
    (parseInt(form.lots) || 1) * (parseInt(form.lot_size) || DEFAULT_LOT_SIZE))

  // ── Add trade ──────────────────────────────────────────────────────────────
  const handleAddTrade = async (e) => {
    e.preventDefault()
    if (!form.symbol.trim() || !form.entry_price) {
      addToast('Symbol and Entry Price are required.', 'error'); return
    }
    setSaving(true)
    // Quantity: F&O = derived lots × lot_size; Equity = direct quantity input.
    const isEquity = form.segment === 'Equity'
    const lotSize = isEquity ? 1 : (parseInt(form.lot_size) || DEFAULT_LOT_SIZE)
    const quantity = isEquity ? (parseInt(form.quantity) || 1) : fnoQuantity
    const record = {
      user_id:      uid,
      trade_date:   form.trade_date,
      symbol:       form.symbol.toUpperCase(),
      segment:      form.segment,
      option_type:  form.segment === 'Options' ? form.option_type : null,
      strike_price: form.segment !== 'Equity' && form.strike_price ? parseFloat(form.strike_price) : null,
      expiry_date:  form.segment !== 'Equity' && form.expiry_date  ? form.expiry_date : null,
      trade_type:   form.trade_type,
      entry_price:  parseFloat(form.entry_price),
      exit_price:   null,
      lot_size:     lotSize,
      quantity:     quantity,
      stop_loss:    form.stop_loss ? parseFloat(form.stop_loss) : null,
      target:       form.target    ? parseFloat(form.target)    : null,
      pnl:          0,
      pnl_percent:  0,
      status:       'Open',
      strategy_tag: form.strategy_tag || null,
      entry_reason: form.entry_reason || null,
    }
    const { data, error } = await supabase.from('trades').insert(record).select().single()
    if (error) { addToast(error.message, 'error'); setSaving(false); return }
    setTrades(prev => [data, ...prev])
    setForm(EMPTY_FORM)
    setFormOpen(false)
    addToast('Trade added! 📊', 'success')
    setSaving(false)
  }

  // ── Update trade (close, edit) ─────────────────────────────────────────────
  const handleUpdate = useCallback(async (id, updates) => {
    const { data, error } = await supabase.from('trades').update(updates).eq('id', id).eq('user_id', uid).select().single()
    if (error) { addToast(error.message, 'error'); return }
    setTrades(prev => prev.map(t => t.id === id ? data : t))
    addToast('Trade updated ✓', 'success')
  }, [uid, addToast])

  // ── Delete trade ───────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this trade?')) return
    const { error } = await supabase.from('trades').delete().eq('id', id).eq('user_id', uid)
    if (error) { addToast(error.message, 'error'); return }
    setTrades(prev => prev.filter(t => t.id !== id))
    addToast('Trade deleted.', 'success')
  }, [uid, addToast])

  // ── Filter & sort ──────────────────────────────────────────────────────────
  const filteredTrades = useMemo(() => {
    let t = [...trades]
    if (filterSymbol)             t = t.filter(x => x.symbol.includes(filterSymbol.toUpperCase()))
    if (filterStatus !== 'All')   t = t.filter(x => x.status === filterStatus)
    if (filterSegment !== 'All')  t = t.filter(x => x.segment === filterSegment)
    if (filterStrategy !== 'All') t = t.filter(x => x.strategy_tag === filterStrategy)
    if (sortBy === 'date_desc')   t.sort((a,b) => b.trade_date.localeCompare(a.trade_date))
    if (sortBy === 'date_asc')    t.sort((a,b) => a.trade_date.localeCompare(b.trade_date))
    if (sortBy === 'pnl_desc')    t.sort((a,b) => (b.pnl||0) - (a.pnl||0))
    if (sortBy === 'pnl_asc')     t.sort((a,b) => (a.pnl||0) - (b.pnl||0))
    return t
  }, [trades, filterSymbol, filterStatus, filterSegment, filterStrategy, sortBy])

  // ── Monthly stats ──────────────────────────────────────────────────────────
  const monthlyStats = useMemo(() => {
    const now = new Date()
    const thisMonth = trades.filter(t => {
      try { return isWithinInterval(parseISO(t.trade_date), { start: startOfMonth(now), end: endOfMonth(now) }) }
      catch { return false }
    })
    const closed = thisMonth.filter(t => t.status !== 'Open')
    const winners = closed.filter(t => (t.pnl || 0) > 0)
    const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0)
    const winRate = closed.length ? (winners.length / closed.length) * 100 : 0
    const best = closed.length ? Math.max(...closed.map(t => t.pnl || 0)) : 0
    const worst = closed.length ? Math.min(...closed.map(t => t.pnl || 0)) : 0
    // Avg planned risk:reward — needs both target & SL on the trade
    const rrTrades = closed.filter(t =>
      t.target && t.stop_loss && t.entry_price && Math.abs(t.entry_price - t.stop_loss) > 0)
    const avgRR = rrTrades.length
      ? rrTrades.reduce((s, t) => s + Math.abs(t.target - t.entry_price) / Math.abs(t.entry_price - t.stop_loss), 0) / rrTrades.length
      : null
    return { totalPnl, winRate, count: thisMonth.length, best, worst, avgRR }
  }, [trades])

  // ── This-week quick stats ──────────────────────────────────────────────────
  const weekStats = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6); weekAgo.setHours(0, 0, 0, 0)
    const wk = trades.filter(t => { try { return parseISO(t.trade_date) >= weekAgo } catch { return false } })
    const closed = wk.filter(t => t.status !== 'Open')
    const pnl = closed.reduce((s, t) => s + (t.pnl || 0), 0)
    const wins = closed.filter(t => (t.pnl || 0) > 0).length
    const winPct = closed.length ? Math.round((wins / closed.length) * 100) : 0
    return { count: wk.length, pnl, winPct }
  }, [trades])

  // ── Analytics data ─────────────────────────────────────────────────────────
  const analyticsData = useMemo(() => {
    const closed = trades.filter(t => t.status !== 'Open').sort((a, b) => a.trade_date.localeCompare(b.trade_date))

    // Cumulative P&L
    const cumulativePnl = closed.reduce((acc, t) => {
      const cum = (acc.length ? acc[acc.length - 1].cumPnl : 0) + (t.pnl || 0)
      acc.push({ date: t.trade_date.slice(5), cumPnl: Math.round(cum * 100) / 100, pnl: t.pnl || 0 })
      return acc
    }, [])

    // Win/Loss pie
    const wins   = closed.filter(t => (t.pnl || 0) > 0).length
    const losses = closed.filter(t => (t.pnl || 0) < 0).length
    const breakeven = closed.length - wins - losses
    const winLoss = [
      { name: 'Win', value: wins,      fill: C.lime  },
      { name: 'Loss', value: losses,   fill: C.coral },
      { name: 'BE', value: breakeven,  fill: C.violet },
    ].filter(d => d.value > 0)

    // P&L by strategy
    const stratMap = {}
    closed.forEach(t => {
      const k = t.strategy_tag || 'Other'
      if (!stratMap[k]) stratMap[k] = 0
      stratMap[k] += t.pnl || 0
    })
    const byStrategy = Object.entries(stratMap)
      .map(([name, pnl]) => ({ name, pnl: Math.round(pnl * 100) / 100 }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))

    // P&L by symbol
    const symMap = {}
    closed.forEach(t => {
      if (!symMap[t.symbol]) symMap[t.symbol] = 0
      symMap[t.symbol] += t.pnl || 0
    })
    const bySymbol = Object.entries(symMap)
      .map(([name, pnl]) => ({ name, pnl: Math.round(pnl * 100) / 100 }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 8)

    return { cumulativePnl, winLoss, byStrategy, bySymbol }
  }, [trades])

  /* ── RENDER ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5 page-enter">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} style={{ color: C.cyan }} />
            Trading Journal
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 4 }}>
            NSE F&O Options & Futures trade log
          </p>
        </div>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="glass-btn glass-btn-accent touch-manipulation"
          style={{ padding: '0.6rem 1.1rem', fontSize: 13, fontWeight: 700, fontFamily: MONO }}
        >
          <Plus size={14} />
          Add Trade
        </button>
      </div>

      {/* ── A) SUMMARY STATS ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <StatCard
          label="Monthly P&L"
          value={sfmt(monthlyStats.totalPnl)}
          sub={`${trades.filter(t => t.status !== 'Open').length} closed trades`}
          color={pnlColor(monthlyStats.totalPnl)}
          icon={monthlyStats.totalPnl >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="Win Rate"
          value={`${monthlyStats.winRate.toFixed(1)}%`}
          sub="This month"
          color={monthlyStats.winRate >= 50 ? C.lime : C.coral}
          ring={{ pct: monthlyStats.winRate, color: monthlyStats.winRate >= 50 ? C.lime : C.coral }}
        />
        <StatCard
          label="Total Trades"
          value={monthlyStats.count}
          sub="This month"
          color={C.cyan}
          icon={Activity}
        />
        <StatCard
          label="Best / Worst"
          value={fmt(monthlyStats.best)}
          sub={`Worst: ${fmt(monthlyStats.worst)}`}
          color={C.cyan}
          icon={Zap}
        />
        <StatCard
          label="Avg R:R"
          value={monthlyStats.avgRR !== null ? `1:${monthlyStats.avgRR.toFixed(1)}` : '—'}
          sub={monthlyStats.avgRR !== null ? 'Planned, closed trades' : 'Needs SL + target'}
          color={C.violet}
          icon={Scale}
        />
      </div>

      {/* ── B) ADD TRADE FORM ────────────────────────────────────── */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <form onSubmit={handleAddTrade} className="glass-card" style={{ padding: '1.1rem 1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: MONO }}>
                  New Trade
                </h3>
                <button type="button" onClick={() => setFormOpen(false)}
                  className="flex items-center justify-center"
                  style={{ width: 40, height: 40, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {/* ROW 1: Date, Symbol, Segment */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" style={{ marginBottom: 10 }}>
                <div>
                  <Label>Trade Date</Label>
                  <Input type="date" value={form.trade_date} onChange={e => setForm(p => ({ ...p, trade_date: e.target.value }))} style={{ width: '100%' }} />
                </div>
                <div>
                  <Label>Symbol *</Label>
                  <SymbolInput value={form.symbol} onChange={v => setForm(p => ({ ...p, symbol: v }))} />
                </div>
                <div>
                  <Label>Segment</Label>
                  <Select value={form.segment} onChange={e => setForm(p => ({ ...p, segment: e.target.value }))} style={{ width: '100%' }}>
                    {SEGMENTS.map(s => <option key={s}>{s}</option>)}
                  </Select>
                </div>
              </div>

              {/* Options-specific fields */}
              {form.segment === 'Options' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" style={{ marginBottom: 10, padding: '0.75rem', background: 'rgba(34,211,238,0.05)', borderRadius: 10, border: '1px solid rgba(34,211,238,0.16)' }}>
                  <div>
                    <Label>Option Type</Label>
                    <SegmentedControl
                      options={[
                        { value: 'CE', label: 'CE', color: C.lime },
                        { value: 'PE', label: 'PE', color: C.coral },
                      ]}
                      value={form.option_type}
                      onChange={v => setForm(p => ({ ...p, option_type: v }))}
                    />
                  </div>
                  <div>
                    <Label>Strike Price</Label>
                    <Input type="number" placeholder="e.g. 24000" value={form.strike_price} onChange={e => setForm(p => ({ ...p, strike_price: e.target.value }))} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Select value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} style={{ width: '100%' }}>
                      <option value="">Select expiry</option>
                      {nextExpiries.map(d => <option key={d} value={d}>{format(parseISO(d), 'dd MMM yyyy')}</option>)}
                    </Select>
                  </div>
                </div>
              )}

              {/* Futures expiry */}
              {form.segment === 'Futures' && (
                <div style={{ marginBottom: 10 }}>
                  <Label>Expiry Date</Label>
                  <Select value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} className="sm:max-w-[220px]" style={{ width: '100%' }}>
                    <option value="">Select expiry</option>
                    {nextExpiries.map(d => <option key={d} value={d}>{format(parseISO(d), 'dd MMM yyyy')}</option>)}
                  </Select>
                </div>
              )}

              {/* ROW 2: Trade direction + Entry price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ marginBottom: 10 }}>
                <div>
                  <Label>Trade Direction *</Label>
                  <SegmentedControl
                    options={[
                      { value: 'Long',  label: '↑ Long',  color: C.lime  },
                      { value: 'Short', label: '↓ Short', color: C.coral },
                    ]}
                    value={form.trade_type}
                    onChange={v => setForm(p => ({ ...p, trade_type: v }))}
                  />
                </div>
                <div>
                  <Label>Entry Price *</Label>
                  <Input type="number" step="0.05" placeholder="₹" value={form.entry_price} onChange={e => setForm(p => ({ ...p, entry_price: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>

              {/* ROW 2b: Lots × Lot Size = Quantity (F&O) / direct Quantity (Equity) */}
              {form.segment === 'Equity' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" style={{ marginBottom: 10 }}>
                  <div>
                    <Label>Quantity *</Label>
                    <Input type="number" min="1" placeholder="No. of shares" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} style={{ width: '100%' }} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" style={{ marginBottom: 10 }}>
                  <div>
                    <Label>Lots</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button type="button" aria-label="Decrease lots"
                        onClick={() => handleLotsChange((parseInt(form.lots) || 1) - 1)}
                        className="glass-btn"
                        style={{ width: 38, height: 38, minHeight: 38, padding: 0, flexShrink: 0 }}>
                        <Minus size={14} />
                      </button>
                      <Input type="number" min="1" placeholder="1" value={form.lots}
                        onChange={e => handleLotsChange(e.target.value)}
                        style={{ width: '100%', textAlign: 'center' }} />
                      <button type="button" aria-label="Increase lots"
                        onClick={() => handleLotsChange((parseInt(form.lots) || 1) + 1)}
                        className="glass-btn"
                        style={{ width: 38, height: 38, minHeight: 38, padding: 0, flexShrink: 0 }}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>Lot Size</Label>
                    <Input type="number" min="1" placeholder="Units per lot" value={form.lot_size}
                      onChange={e => handleLotSizeChange(e.target.value)}
                      style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      Quantity
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                        background: 'rgba(34,211,238,0.12)', color: C.cyan, letterSpacing: '0.05em',
                      }}>
                        AUTO
                      </span>
                    </label>
                    <Input type="number" value={fnoQuantity} readOnly tabIndex={-1}
                      title="Auto-calculated: lots × lot size"
                      style={{
                        width: '100%', color: 'var(--text-secondary)',
                        background: 'rgba(255,255,255,0.03)', cursor: 'default',
                      }} />
                  </div>
                </div>
              )}

              {/* ROW 3: SL, Target, Strategy */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" style={{ marginBottom: 10 }}>
                <div>
                  <Label>Stop Loss</Label>
                  <Input type="number" step="0.05" placeholder="SL ₹" value={form.stop_loss} onChange={e => setForm(p => ({ ...p, stop_loss: e.target.value }))} style={{ width: '100%' }} />
                </div>
                <div>
                  <Label>Target</Label>
                  <Input type="number" step="0.05" placeholder="Target ₹" value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} style={{ width: '100%' }} />
                </div>
                <div>
                  <Label>Strategy Tag</Label>
                  <Select value={form.strategy_tag} onChange={e => setForm(p => ({ ...p, strategy_tag: e.target.value }))} style={{ width: '100%' }}>
                    <option value="">None</option>
                    {STRATEGY_TAGS.map(s => <option key={s}>{s}</option>)}
                  </Select>
                </div>
              </div>

              {/* Entry reason */}
              <div style={{ marginBottom: '1rem' }}>
                <Label>Entry Reason</Label>
                <textarea rows={2} placeholder="Why did you take this trade? Setup, confluence..." value={form.entry_reason} onChange={e => setForm(p => ({ ...p, entry_reason: e.target.value }))}
                  className="glass-input resize-none" style={{ fontFamily: MONO, width: '100%' }} />
              </div>

              {/* Submit */}
              <button type="submit" disabled={saving || !form.symbol || !form.entry_price}
                className="glass-btn glass-btn-accent w-full touch-manipulation"
                style={{ height: 48, fontWeight: 700, fontSize: 14, fontFamily: MONO }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={14} /> Add Trade</>}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── C) TRADES LIST ───────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '1rem 1.1rem' }}>
        {/* Quick week stats strip */}
        <p style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
          This week: {weekStats.count} trades · <span style={{ color: pnlColor(weekStats.pnl), fontWeight: 700 }}>{sfmt(weekStats.pnl)}</span> P&L · {weekStats.winPct}% win
        </p>

        {/* Header + sort */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <span className="section-label">Trades ({filteredTrades.length})</span>
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: 32, fontSize: 11, width: 'auto' }}>
            <option value="date_desc">Date ↓</option>
            <option value="date_asc">Date ↑</option>
            <option value="pnl_desc">P&L ↓</option>
            <option value="pnl_asc">P&L ↑</option>
          </Select>
        </div>

        {/* Filters — one row desktop, 2x2 grid mobile */}
        <div style={{ marginBottom: '0.85rem' }}>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <div style={{ position: 'relative' }} className="sm:flex-1 sm:min-w-[140px]">
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search symbol..."
                value={filterSymbol}
                onChange={e => setFilterSymbol(e.target.value)}
                style={{
                  width: '100%', height: 38, fontFamily: MONO, fontSize: 12,
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${filterSymbol ? C.cyan : 'var(--border-subtle)'}`,
                  borderRadius: 10, color: 'var(--text-primary)',
                  padding: '0 0.6rem 0 1.9rem',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
            <Select active={filterStatus !== 'All'} value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="sm:w-[130px]" style={{ width: '100%' }}>
              <option value="All">All Status</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Select active={filterSegment !== 'All'} value={filterSegment} onChange={e => setFilterSegment(e.target.value)} className="sm:w-[130px]" style={{ width: '100%' }}>
              <option value="All">All Segments</option>
              {SEGMENTS.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Select active={filterStrategy !== 'All'} value={filterStrategy} onChange={e => setFilterStrategy(e.target.value)} className="sm:w-[130px]" style={{ width: '100%' }}>
              <option value="All">All Strategies</option>
              {STRATEGY_TAGS.map(s => <option key={s}>{s}</option>)}
            </Select>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                marginTop: 6, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600, color: C.cyan, fontFamily: MONO, padding: '2px 0',
              }}
            >
              ✕ Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.05)', animation: 'dash-pulse 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        ) : filteredTrades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(34,211,238,0.10)',
              boxShadow: '0 0 30px var(--accent-glow)',
            }}>
              <TrendingUp size={28} style={{ color: C.cyan }} />
            </div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
              {trades.length === 0 ? 'No trades logged yet' : 'No trades match your filters'}
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
              {trades.length === 0 ? 'Click "Add Trade" above to log your first trade!' : 'Try clearing your filters.'}
            </p>
            {trades.length === 0 && (
              <button onClick={() => setFormOpen(true)}
                className="glass-btn glass-btn-accent"
                style={{ marginTop: 14, padding: '0.65rem 1.25rem', fontSize: 12.5, fontWeight: 700, fontFamily: MONO }}>
                <Plus size={14} /> Add First Trade
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredTrades.map(trade => (
              <TradeRow key={trade.id} trade={trade} onDelete={handleDelete} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>

      {/* ── D) ANALYTICS ─────────────────────────────────────────── */}
      {analyticsData.cumulativePnl.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="section-label" style={{ margin: 0 }}>Analytics</p>

          {/* Cumulative P&L chart */}
          <div className="glass-card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: MONO, marginBottom: 10 }}>Cumulative P&L</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={analyticsData.cumulativePnl}>
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={C.lime} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.lime} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 9, fontFamily: MONO }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={55} />
                <Tooltip content={<ChartTooltip />} formatter={v => [fmt(v), 'Cum. P&L']} />
                <Area type="monotone" dataKey="cumPnl" name="Cum. P&L" stroke={C.lime} strokeWidth={2.5} fill="url(#cumGrad)" dot={false} activeDot={{ r: 4, fill: C.lime }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Win/Loss pie + Strategy bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {/* Win/Loss Pie */}
            {analyticsData.winLoss.length > 0 && (
              <div className="glass-card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: MONO, marginBottom: 8 }}>Win / Loss</p>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={analyticsData.winLoss} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                      {analyticsData.winLoss.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend formatter={(v) => <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: MONO }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* P&L by Strategy */}
            {analyticsData.byStrategy.length > 0 && (
              <div className="glass-card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: MONO, marginBottom: 8 }}>P&L by Strategy</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={analyticsData.byStrategy} barSize={18}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 8, fontFamily: MONO }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={48} />
                    <Tooltip content={<ChartTooltip />} formatter={(v) => [fmt(v), 'P&L']} />
                    <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                      {analyticsData.byStrategy.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? C.lime : C.coral} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* P&L by Symbol */}
            {analyticsData.bySymbol.length > 0 && (
              <div className="glass-card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: MONO, marginBottom: 8 }}>P&L by Symbol</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={analyticsData.bySymbol} barSize={18}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 8, fontFamily: MONO }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={48} />
                    <Tooltip content={<ChartTooltip />} formatter={(v) => [fmt(v), 'P&L']} />
                    <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                      {analyticsData.bySymbol.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? C.cyan : C.coral} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom spacing */}
      <style>{`@keyframes dash-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ height: '1rem' }} />
    </div>
  )
}
