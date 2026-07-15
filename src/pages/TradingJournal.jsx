/**
 * TradingJournal.jsx — F&O Options Trading Journal for NSE
 *
 * Sections:
 *  A) Summary Stats Bar — Monthly P&L, Win Rate, Trade Count, Best/Worst
 *  B) Quick Add Trade Form — collapsible, with options-aware fields
 *  C) Trades Table/List — filterable, sortable, expandable rows, close trade
 *  D) Analytics — Cumulative P&L chart, Win/Loss pie, Strategy/Symbol bar charts
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import {
  TrendingUp, TrendingDown, Plus, ChevronDown, ChevronUp,
  Loader2, X, Trash2, CheckCircle,
  Activity, Target, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Toast, { useToast } from '../components/ui/Toast'

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const SAGE  = '#87a68c'
const SKY   = '#7db8d8'
const CORAL = '#e87c6e'
const AMBER = '#d4a847'

const SEGMENTS    = ['Options', 'Futures', 'Equity']
const STATUSES     = ['Open', 'Closed', 'Stopped Out']
const STRATEGY_TAGS = ['Breakout', 'Reversal', 'Scalp', 'Swing', 'Positional', 'Hedging', 'Other']

// Standard NSE F&O lot sizes (approximate — user can override quantity)
const LOT_SIZES = {
  NIFTY: 75, BANKNIFTY: 30, FINNIFTY: 65, MIDCPNIFTY: 75,
  RELIANCE: 250, TCS: 150, INFY: 300, HDFCBANK: 550, ICICIBANK: 700,
  SBIN: 1500, WIPRO: 1500, TATAMOTORS: 1425, ITC: 3200,
  BAJFINANCE: 125, KOTAKBANK: 400, AXISBANK: 625, LT: 225,
  ADANIENT: 625, HINDUNILVR: 300, MARUTI: 100,
}

const SYMBOL_SUGGESTIONS = [
  'NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY',
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
  const formatted = abs >= 1_00_000
    ? `₹${(abs / 1_00_000).toFixed(2)}L`
    : abs >= 1000
    ? `₹${(abs / 1000).toFixed(1)}K`
    : `₹${abs.toFixed(2)}`
  return n < 0 ? `-${formatted}` : formatted
}
const pct = (n) => (n === null || n === undefined || isNaN(n)) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

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
  lot_size:       '',
  quantity:       '',
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
    <label style={{
      fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.09em', color: 'rgba(255,255,255,0.38)',
      fontFamily: 'ui-monospace, monospace', display: 'block', marginBottom: 5,
    }}>
      {children}
    </label>
  )
}

function Input({ style = {}, ...props }) {
  return (
    <input
      className="input-cyber text-xs"
      style={{ height: 36, fontFamily: 'ui-monospace, monospace', ...style }}
      {...props}
    />
  )
}

function Select({ children, style = {}, ...props }) {
  return (
    <select
      className="input-cyber text-xs"
      style={{
        height: 36, fontFamily: 'ui-monospace, monospace',
        background: 'rgba(255,255,255,0.05)',
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  )
}

function StatCard({ label, value, sub, color = '#fff', icon: Icon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: '0.85rem 1rem',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', fontFamily: 'ui-monospace, monospace' }}>
          {label}
        </span>
        {Icon && <Icon size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />}
      </div>
      <p style={{ fontSize: '1.1rem', fontWeight: 700, color, fontFamily: 'ui-monospace, monospace', margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.28)', fontFamily: 'ui-monospace, monospace', margin: 0 }}>{sub}</p>}
    </div>
  )
}

function Badge({ children, color = 'rgba(255,255,255,0.15)', textColor = '#fff', style = {} }) {
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 700, fontFamily: 'ui-monospace, monospace',
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
          background: '#0f1829', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10, marginTop: 4, overflow: 'hidden',
        }}>
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={() => { onChange(s); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 12px', fontSize: '0.75rem',
                fontFamily: 'ui-monospace, monospace',
                color: 'rgba(255,255,255,0.75)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.target.style.background = 'none'}
            >
              {s}
              {LOT_SIZES[s] && (
                <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
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
   SEGMENTED CONTROL (Long / Short toggle)
───────────────────────────────────────────────────────────────────────────── */
function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{
      display: 'flex', background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: 3, gap: 3,
    }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, padding: '6px 10px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: '0.72rem', fontWeight: 700,
              fontFamily: 'ui-monospace, monospace',
              transition: 'all 0.15s',
              background: active ? opt.bg : 'transparent',
              color: active ? opt.color : 'rgba(255,255,255,0.3)',
              boxShadow: active ? `0 2px 8px ${opt.bg}66` : 'none',
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
      border: '1px solid rgba(255,255,255,0.1)', padding: '0.85rem',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', margin: 0, fontFamily: 'ui-monospace, monospace' }}>
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
          background: preview.pnl >= 0 ? `${SAGE}22` : `${CORAL}22`,
          border: `1px solid ${preview.pnl >= 0 ? SAGE : CORAL}44`,
          fontSize: '0.72rem', fontFamily: 'ui-monospace, monospace',
          color: preview.pnl >= 0 ? SAGE : CORAL,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Estimated P&L:</span>
          <span style={{ fontWeight: 700 }}>{fmt(preview.pnl)} ({pct(preview.pnl_percent)})</span>
        </div>
      )}

      <div>
        <Label>Exit Reason</Label>
        <textarea rows={2} placeholder="Why did you exit?" value={exitReason} onChange={e => setExitReason(e.target.value)}
          className="input-cyber text-xs resize-none" style={{ fontFamily: 'ui-monospace, monospace', width: '100%' }} />
      </div>
      <div>
        <Label>Lessons Learned</Label>
        <textarea rows={2} placeholder="What did you learn?" value={lessons} onChange={e => setLessons(e.target.value)}
          className="input-cyber text-xs resize-none" style={{ fontFamily: 'ui-monospace, monospace', width: '100%' }} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onClose}
          style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={!exitPrice || saving}
          style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${SAGE}, ${SKY})`, color: '#0B1121', cursor: !exitPrice ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 700, opacity: !exitPrice ? 0.5 : 1 }}>
          {saving ? '...' : 'Confirm Close'}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   TRADE ROW
───────────────────────────────────────────────────────────────────────────── */
function TradeRow({ trade, onDelete, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [showClose, setShowClose] = useState(false)

  const pnlColor = !trade.exit_price ? 'rgba(255,255,255,0.4)' : trade.pnl >= 0 ? SAGE : CORAL
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
    <div style={{
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, overflow: 'hidden',
      background: 'rgba(255,255,255,0.02)',
      marginBottom: 6,
    }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0.6rem 0.85rem', cursor: 'pointer',
          flexWrap: 'wrap',
        }}
      >
        {/* Date */}
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'ui-monospace, monospace', flexShrink: 0, minWidth: 42 }}>
          {dateLabel}
        </span>

        {/* Symbol + type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', fontFamily: 'ui-monospace, monospace' }}>
            {trade.symbol}
          </span>
          {trade.segment === 'Options' && trade.option_type && (
            <Badge
              color={trade.option_type === 'CE' ? `${SAGE}22` : `${CORAL}22`}
              textColor={trade.option_type === 'CE' ? SAGE : CORAL}
              style={{ border: `1px solid ${trade.option_type === 'CE' ? SAGE : CORAL}44` }}
            >
              {trade.option_type}
            </Badge>
          )}
          {trade.strike_price && (
            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'ui-monospace, monospace' }}>
              {trade.strike_price}
            </span>
          )}
        </div>

        {/* Trade type badge */}
        <Badge
          color={trade.trade_type === 'Long' ? `${SAGE}22` : `${CORAL}22`}
          textColor={trade.trade_type === 'Long' ? SAGE : CORAL}
          style={{ border: `1px solid ${trade.trade_type === 'Long' ? SAGE : CORAL}44` }}
        >
          {trade.trade_type === 'Long' ? '↑ Long' : '↓ Short'}
        </Badge>

        {/* Entry → Exit */}
        <span style={{ fontSize: '0.68rem', fontFamily: 'ui-monospace, monospace', color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
          ₹{trade.entry_price}
          {trade.exit_price ? ` → ₹${trade.exit_price}` : ''}
        </span>

        {/* P&L */}
        <span style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: pnlColor, flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
          {trade.exit_price ? fmt(trade.pnl) : '—'}
        </span>

        {/* Status badge */}
        <Badge
          color={trade.status === 'Open' ? `${AMBER}22` : trade.status === 'Closed' ? `${SAGE}22` : `${CORAL}22`}
          textColor={trade.status === 'Open' ? AMBER : trade.status === 'Closed' ? SAGE : CORAL}
        >
          {trade.status}
        </Badge>

        {/* Expand chevron */}
        <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
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
              borderTop: '1px solid rgba(255,255,255,0.06)',
              padding: '0.75rem 0.85rem',
              background: 'rgba(0,0,0,0.15)',
              fontSize: '0.72rem', fontFamily: 'ui-monospace, monospace',
              color: 'rgba(255,255,255,0.65)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginBottom: 10 }}>
                <DetailField label="Segment" value={trade.segment} />
                <DetailField label="Lot Size" value={trade.lot_size} />
                <DetailField label="Quantity" value={trade.quantity} />
                {trade.expiry_date && <DetailField label="Expiry" value={trade.expiry_date} />}
                {trade.stop_loss && <DetailField label="SL" value={`₹${trade.stop_loss}`} />}
                {trade.target && <DetailField label="Target" value={`₹${trade.target}`} />}
                {trade.strategy_tag && <DetailField label="Strategy" value={trade.strategy_tag} />}
                {trade.pnl_percent !== 0 && <DetailField label="P&L %" value={pct(trade.pnl_percent)} color={trade.pnl >= 0 ? SAGE : CORAL} />}
              </div>

              {trade.entry_reason && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: '0.58rem', color: `${AMBER}99`, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>Entry Reason</p>
                  <p style={{ paddingLeft: 8, borderLeft: `2px solid ${AMBER}33`, lineHeight: 1.5, margin: 0 }}>{trade.entry_reason}</p>
                </div>
              )}
              {trade.exit_reason && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: '0.58rem', color: `${SKY}99`, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>Exit Reason</p>
                  <p style={{ paddingLeft: 8, borderLeft: `2px solid ${SKY}33`, lineHeight: 1.5, margin: 0 }}>{trade.exit_reason}</p>
                </div>
              )}
              {trade.lessons_learned && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: '0.58rem', color: `${SAGE}99`, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>Lessons Learned</p>
                  <p style={{ paddingLeft: 8, borderLeft: `2px solid ${SAGE}33`, lineHeight: 1.5, margin: 0 }}>{trade.lessons_learned}</p>
                </div>
              )}

              {/* Actions row */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {!isClosed && (
                  <button type="button" onClick={e => { e.stopPropagation(); setShowClose(s => !s) }}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: `1px solid ${SAGE}55`,
                      background: `${SAGE}22`, color: SAGE, cursor: 'pointer',
                      fontSize: '0.72rem', fontWeight: 700, fontFamily: 'ui-monospace, monospace',
                    }}>
                    <CheckCircle size={11} style={{ display: 'inline', marginRight: 4 }} />
                    Close Trade
                  </button>
                )}
                <button type="button" onClick={e => { e.stopPropagation(); onDelete(trade.id) }}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: `1px solid ${CORAL}44`,
                    background: `${CORAL}15`, color: CORAL, cursor: 'pointer',
                    fontSize: '0.72rem', fontWeight: 700, fontFamily: 'ui-monospace, monospace',
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
      <p style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: '0.72rem', fontWeight: 600, color: color || 'rgba(255,255,255,0.75)', margin: 0 }}>{value}</p>
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
      background: 'rgba(11,17,33,0.96)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10, padding: '0.55rem 0.85rem',
      fontSize: '0.7rem', fontFamily: 'ui-monospace, monospace',
      color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
    }}>
      <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#fff' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color || '#fff' }}>
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
  const [filterStrategy, setFilterStrategy] = useState('All')
  const [sortBy,         setSortBy]         = useState('date_desc')

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

  // ── Auto lot size when symbol changes ─────────────────────────────────────
  useEffect(() => {
    const ls = LOT_SIZES[form.symbol] || 1
    const lots = form.lot_size ? parseInt(form.lot_size) : 1
    setForm(p => ({ ...p, lot_size: ls, quantity: ls * lots }))
  }, [form.symbol]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update quantity when lot_size or lots change ───────────────────────────
  const handleLotsChange = (lots) => {
    const ls = LOT_SIZES[form.symbol] || parseInt(form.lot_size) || 1
    setForm(p => ({ ...p, quantity: ls * parseInt(lots || 1) }))
  }

  // ── Add trade ──────────────────────────────────────────────────────────────
  const handleAddTrade = async (e) => {
    e.preventDefault()
    if (!form.symbol.trim() || !form.entry_price) {
      addToast('Symbol and Entry Price are required.', 'error'); return
    }
    setSaving(true)
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
      lot_size:     parseInt(form.lot_size) || 1,
      quantity:     parseInt(form.quantity) || 1,
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
    if (filterStrategy !== 'All') t = t.filter(x => x.strategy_tag === filterStrategy)
    if (sortBy === 'date_desc')   t.sort((a,b) => b.trade_date.localeCompare(a.trade_date))
    if (sortBy === 'date_asc')    t.sort((a,b) => a.trade_date.localeCompare(b.trade_date))
    if (sortBy === 'pnl_desc')    t.sort((a,b) => (b.pnl||0) - (a.pnl||0))
    if (sortBy === 'pnl_asc')     t.sort((a,b) => (a.pnl||0) - (b.pnl||0))
    return t
  }, [trades, filterSymbol, filterStatus, filterStrategy, sortBy])

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
    return { totalPnl, winRate, count: thisMonth.length, best, worst }
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
      { name: 'Win', value: wins,      fill: SAGE  },
      { name: 'Loss', value: losses,   fill: CORAL },
      { name: 'BE', value: breakeven,  fill: AMBER },
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
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} style={{ color: SAGE }} />
            Trading Journal
          </h1>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'ui-monospace, monospace', marginTop: 4 }}>
            NSE F&O Options & Futures trade log
          </p>
        </div>
        <motion.button
          onClick={() => setFormOpen(o => !o)}
          whileTap={{ scale: 0.96 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${SAGE}, ${SKY})`,
            color: '#0B1121', fontWeight: 700, fontSize: '0.8rem',
            fontFamily: 'ui-monospace, monospace',
            boxShadow: `0 4px 16px ${SAGE}44`,
          }}
        >
          <Plus size={14} />
          Add Trade
        </motion.button>
      </div>

      {/* ── A) SUMMARY STATS ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        <StatCard
          label="Monthly P&L"
          value={fmt(monthlyStats.totalPnl)}
          sub={`${trades.filter(t => t.status !== 'Open').length} closed trades`}
          color={monthlyStats.totalPnl >= 0 ? SAGE : CORAL}
          icon={monthlyStats.totalPnl >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="Win Rate"
          value={`${monthlyStats.winRate.toFixed(1)}%`}
          sub="This month"
          color={monthlyStats.winRate >= 50 ? SAGE : CORAL}
          icon={Target}
        />
        <StatCard
          label="Total Trades"
          value={monthlyStats.count}
          sub="This month"
          color={SKY}
          icon={Activity}
        />
        <StatCard
          label="Best / Worst"
          value={fmt(monthlyStats.best)}
          sub={`Worst: ${fmt(monthlyStats.worst)}`}
          color={AMBER}
          icon={Zap}
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
            <form onSubmit={handleAddTrade} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 18, padding: '1.1rem 1.2rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)', margin: 0, fontFamily: 'ui-monospace, monospace' }}>
                  New Trade
                </h3>
                <button type="button" onClick={() => setFormOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>

              {/* ROW 1: Date, Symbol, Segment */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 10 }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 10, padding: '0.75rem', background: `${SAGE}11`, borderRadius: 10, border: `1px solid ${SAGE}22` }}>
                  <div>
                    <Label>Option Type</Label>
                    <SegmentedControl
                      options={[
                        { value: 'CE', label: 'CE', bg: `${SAGE}44`, color: SAGE },
                        { value: 'PE', label: 'PE', bg: `${CORAL}44`, color: CORAL },
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
                      <option value="">-- Select --</option>
                      {nextExpiries.map(d => <option key={d} value={d}>{format(parseISO(d), 'dd MMM yyyy')}</option>)}
                    </Select>
                  </div>
                </div>
              )}

              {/* Futures expiry */}
              {form.segment === 'Futures' && (
                <div style={{ marginBottom: 10 }}>
                  <Label>Expiry Date</Label>
                  <Select value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} style={{ width: '100%', maxWidth: 200 }}>
                    <option value="">-- Select --</option>
                    {nextExpiries.map(d => <option key={d} value={d}>{format(parseISO(d), 'dd MMM yyyy')}</option>)}
                  </Select>
                </div>
              )}

              {/* ROW 2: Trade type, Entry, Lot size, Qty */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 10 }}>
                <div style={{ gridColumn: '1 / span 1' }}>
                  <Label>Trade Direction *</Label>
                  <SegmentedControl
                    options={[
                      { value: 'Long',  label: '↑ Long',  bg: `${SAGE}55`,  color: SAGE  },
                      { value: 'Short', label: '↓ Short', bg: `${CORAL}55`, color: CORAL },
                    ]}
                    value={form.trade_type}
                    onChange={v => setForm(p => ({ ...p, trade_type: v }))}
                  />
                </div>
                <div>
                  <Label>Entry Price *</Label>
                  <Input type="number" step="0.05" placeholder="₹" value={form.entry_price} onChange={e => setForm(p => ({ ...p, entry_price: e.target.value }))} style={{ width: '100%' }} />
                </div>
                <div>
                  <Label>Lots</Label>
                  <Input type="number" min="1" placeholder="1" value={form.lot_size} onChange={e => { setForm(p => ({ ...p, lot_size: e.target.value })); handleLotsChange(e.target.value) }} style={{ width: '100%' }} />
                </div>
                <div>
                  <Label>Quantity (auto)</Label>
                  <Input type="number" placeholder="Qty" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} style={{ width: '100%' }} />
                </div>
              </div>

              {/* ROW 3: SL, Target, Strategy */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 10 }}>
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
                    <option value="">-- None --</option>
                    {STRATEGY_TAGS.map(s => <option key={s}>{s}</option>)}
                  </Select>
                </div>
              </div>

              {/* Entry reason */}
              <div style={{ marginBottom: '1rem' }}>
                <Label>Entry Reason</Label>
                <textarea rows={2} placeholder="Why did you take this trade? Setup, confluence..." value={form.entry_reason} onChange={e => setForm(p => ({ ...p, entry_reason: e.target.value }))}
                  className="input-cyber text-xs resize-none" style={{ fontFamily: 'ui-monospace, monospace', width: '100%' }} />
              </div>

              {/* Submit */}
              <motion.button type="submit" disabled={saving || !form.symbol || !form.entry_price} whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%', height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${SAGE}, ${SKY})`,
                  color: '#0B1121', fontWeight: 700, fontSize: '0.85rem',
                  fontFamily: 'ui-monospace, monospace',
                  opacity: (!form.symbol || !form.entry_price) ? 0.45 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <><Plus size={14} /> Add Trade</>}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── C) TRADES TABLE ──────────────────────────────────────── */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '1rem 1.1rem' }}>
        {/* Table header + filters */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: '0.85rem' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', fontFamily: 'ui-monospace, monospace', margin: 0, flex: 1 }}>
            Trades ({filteredTrades.length})
          </p>
          <Input type="text" placeholder="Symbol filter" value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)} style={{ width: 110, height: 30, fontSize: '0.68rem' }} />
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ height: 30, fontSize: '0.68rem', width: 110 }}>
            <option value="All">All Status</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </Select>
          <Select value={filterStrategy} onChange={e => setFilterStrategy(e.target.value)} style={{ height: 30, fontSize: '0.68rem', width: 110 }}>
            <option value="All">All Strategy</option>
            {STRATEGY_TAGS.map(s => <option key={s}>{s}</option>)}
          </Select>
          <Select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: 30, fontSize: '0.68rem', width: 110 }}>
            <option value="date_desc">Date ↓</option>
            <option value="date_asc">Date ↑</option>
            <option value="pnl_desc">P&L ↓</option>
            <option value="pnl_asc">P&L ↑</option>
          </Select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.05)', animation: 'dash-pulse 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        ) : filteredTrades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📊</div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              {trades.length === 0 ? 'No trades logged yet' : 'No trades match your filters'}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.22)', marginTop: 6 }}>
              {trades.length === 0 ? 'Click "Add Trade" above to log your first trade!' : 'Try clearing your filters.'}
            </p>
            {trades.length === 0 && (
              <button onClick={() => setFormOpen(true)}
                style={{ marginTop: 14, padding: '8px 20px', borderRadius: 10, border: `1px solid ${SAGE}55`, background: `${SAGE}22`, color: SAGE, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>
                + Add First Trade
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
          <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.28)', fontFamily: 'ui-monospace, monospace', margin: 0 }}>
            Analytics
          </p>

          {/* Cumulative P&L chart */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1rem' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: 'ui-monospace, monospace', marginBottom: 10 }}>Cumulative P&L</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={analyticsData.cumulativePnl}>
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={SAGE} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={SAGE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={55} />
                <Tooltip content={<ChartTooltip />} formatter={v => [fmt(v), 'Cum. P&L']} />
                <Area type="monotone" dataKey="cumPnl" name="Cum. P&L" stroke={SAGE} strokeWidth={2.5} fill="url(#cumGrad)" dot={false} activeDot={{ r: 4, fill: SAGE }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Win/Loss pie + Strategy bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {/* Win/Loss Pie */}
            {analyticsData.winLoss.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: 'ui-monospace, monospace', marginBottom: 8 }}>Win / Loss</p>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={analyticsData.winLoss} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                      {analyticsData.winLoss.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend formatter={(v) => <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'ui-monospace, monospace' }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* P&L by Strategy */}
            {analyticsData.byStrategy.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: 'ui-monospace, monospace', marginBottom: 8 }}>P&L by Strategy</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={analyticsData.byStrategy} barSize={18}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 8, fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={48} />
                    <Tooltip content={<ChartTooltip />} formatter={(v) => [fmt(v), 'P&L']} />
                    <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                      {analyticsData.byStrategy.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? SAGE : CORAL} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* P&L by Symbol */}
            {analyticsData.bySymbol.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '1rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', fontFamily: 'ui-monospace, monospace', marginBottom: 8 }}>P&L by Symbol</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={analyticsData.bySymbol} barSize={18}>
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 8, fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={48} />
                    <Tooltip content={<ChartTooltip />} formatter={(v) => [fmt(v), 'P&L']} />
                    <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                      {analyticsData.bySymbol.map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? SKY : CORAL} />
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
