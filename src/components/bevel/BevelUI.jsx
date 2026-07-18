/**
 * BevelUI.jsx — Shared design-system primitives for the dark premium
 * "Bevel mobile app" redesign (Whoop/Bevel-app style, not the light
 * marketing-site look).
 *
 * The signature pieces — ProgressRing, StatCard, InfoCard — live in their
 * own files; this module holds the smaller shared primitives (cards,
 * pills, labels) plus the color palette, and re-exports the signature
 * components so existing imports (e.g. HealthSync.jsx) keep working as
 * more pages adopt this palette.
 */
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import ProgressRingImpl from './ProgressRing'
import StatCardImpl from './StatCard'
import InfoCardImpl from './InfoCard'

export const BEVEL = {
  bgStart: '#0D1220',
  bgEnd:   '#131A2E',
  card:    '#1A2138',
  cardAlt: '#212A45',
  text:    '#FFFFFF',
  muted:   '#8A93B2',
  green:   '#22C55E',
  orange:  '#F97316',
  blue:    '#3B82F6',
  purple:  '#A855F7',
  red:     '#FF6B5B', // coral — "danger" accent
}

export const ProgressRing = ProgressRingImpl
export const StatCard = StatCardImpl
export const InfoCard = InfoCardImpl

/* ── Full-bleed dark navy background, painted behind page content ─────── */
export function BevelBackground() {
  return <div className="bevel-bg-fill" aria-hidden="true" />
}

/* ── Elevated dark card ─────────────────────────────────────────────────── */
const MotionDiv = motion.div
const MotionButton = motion.button

export function BevelCard({ children, className = '', style = {}, onClick, as = 'div', interactive = false }) {
  const Comp = as === 'button' ? MotionButton : MotionDiv
  return (
    <Comp
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`glass-panel ${interactive || onClick ? 'glass-panel-interactive' : ''} ${className}`}
      style={style}
    >
      {children}
    </Comp>
  )
}

/* ── Small-caps section label ──────────────────────────────────────────── */
export function BevelLabel({ children, style = {} }) {
  return (
    <p style={{
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: BEVEL.muted,
      margin: 0,
      ...style,
    }}>
      {children}
    </p>
  )
}

/* ── Trend arrow (▲ green / ▼ red) ──────────────────────────────────────── */
export function TrendArrow({ value, suffix = '' }) {
  if (value === undefined || value === null || value === 0) return null
  const up = value > 0
  const Icon = up ? TrendingUp : TrendingDown
  const color = up ? BEVEL.green : BEVEL.red
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color, fontSize: 12, fontWeight: 700 }}>
      <Icon size={12} />
      {Math.abs(value)}{suffix}
    </span>
  )
}

/**
 * MetricRing — backward-compatible alias of ProgressRing for pages not
 * yet migrated to the new prop names (`sublabel` instead of `label`).
 */
export function MetricRing({ sublabel, ...rest }) {
  return <ProgressRingImpl {...rest} label={sublabel} />
}

/* ── Metric card: icon + big number + label + optional ring/trend ──────── */
export function MetricTile({ icon: Icon, iconColor = BEVEL.green, value, label, trend, ring }) {
  return (
    <BevelCard style={{ padding: '1rem' }}>
      <div className="flex items-start justify-between mb-2">
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 34, height: 34, borderRadius: 12, background: `${iconColor}1F` }}
        >
          {Icon && <Icon size={17} style={{ color: iconColor }} />}
        </div>
        {ring}
      </div>
      <p style={{ fontSize: 30, fontWeight: 700, color: BEVEL.text, lineHeight: 1.1, margin: 0 }}>
        {value}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <BevelLabel>{label}</BevelLabel>
        <TrendArrow value={trend} />
      </div>
    </BevelCard>
  )
}

/* ── Pill-shaped filter tabs — active = white bg / dark text ────────────── */
export function PillTabs({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      {tabs.map(tab => {
        const isActive = tab === active
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className="flex-shrink-0 transition-all duration-150 active:scale-95"
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              border: isActive ? 'none' : '1px solid var(--bevel-border)',
              background: isActive ? '#fff' : 'rgba(255,255,255,0.05)',
              color: isActive ? '#0D1220' : BEVEL.muted,
            }}
          >
            {tab}
          </button>
        )
      })}
    </div>
  )
}

/* ── Pill action button (Quick Actions row) — glass chrome + accent tint ── */
export function BevelPill({ icon, label, onClick, color = BEVEL.green, id }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="glass-btn flex-shrink-0 touch-manipulation"
      style={{
        padding: '0.6rem 1.1rem',
        background: `${color}14`,
        borderColor: `${color}40`,
      }}
    >
      <span
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 22, height: 22, borderRadius: 8, background: `${color}2A`, color, fontSize: 13 }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: BEVEL.text, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

/* ── Horizontal bar slider (nutrient-bar style) ─────────────────────────── */
export function StatBar({ label, value, max = 100, color = BEVEL.green, unit = '' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ fontSize: 12.5, fontWeight: 600, color: BEVEL.text }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>
          {value}{unit} <span style={{ color: BEVEL.muted, fontWeight: 500 }}>/ {max}{unit}</span>
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 999, background: color }}
        />
      </div>
    </div>
  )
}

/* ── Dot-matrix intensity cell grid (macro/heatmap style) ───────────────── */
export function DotMatrix({ cells, colorFor, size = 14, gap = 5, cols = 10, onCellHover, onCellLeave }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
      {cells.map((cell, i) => (
        <div
          key={cell.key ?? i}
          onMouseEnter={(e) => onCellHover?.(cell, e)}
          onMouseLeave={onCellLeave}
          style={{
            aspectRatio: '1',
            width: size,
            height: size,
            borderRadius: 4,
            background: colorFor(cell),
            cursor: onCellHover ? 'pointer' : 'default',
            transition: 'transform 0.15s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.25)' }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        />
      ))}
    </div>
  )
}

/* ── Priority / status dot ──────────────────────────────────────────────── */
export function Dot({ color, size = 8 }) {
  return <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />
}