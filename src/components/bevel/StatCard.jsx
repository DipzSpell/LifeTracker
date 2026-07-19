/**
 * StatCard.jsx — Bevel-style 2x2 stat-grid card.
 *
 * Matches the "Awake / REM / Core / Deep" sleep-stage card pattern: a
 * muted label up top, a big bold value, a colored percentage underneath,
 * and a small ring in the corner echoing that percentage.
 */
import { motion } from 'framer-motion'
import ProgressRing from './ProgressRing'
import { TrendingUp, TrendingDown } from 'lucide-react'

const COLOR_HEX = {
  green:  'var(--success)',
  blue:   'var(--accent)',
  orange: 'var(--warning)',
  red:    'var(--danger)',
  purple: 'var(--special)',
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  pct,
  color = 'green',
  pctLabel,
  trend,
  ringSize = 38,
  onClick,
}) {
  const hex = COLOR_HEX[color] || color

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      onClick={onClick}
      className={`glass-panel ${onClick ? 'glass-panel-interactive' : ''}`}
      style={{ padding: '1.1rem' }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={13} style={{ color: 'var(--text-muted)' }} />}
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
        </div>
        <ProgressRing pct={pct ?? 0} size={ringSize} stroke={4} from={hex} to={hex} mini />
      </div>

      <p style={{ fontSize: 27, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.1 }}>
        {value}
      </p>

      <div className="flex items-center gap-2 mt-1.5">
        {pct !== undefined && (
          <span style={{ fontSize: 13, fontWeight: 700, color: hex }}>
            {pctLabel !== undefined ? pctLabel : `${Math.round(pct)}%`}
          </span>
        )}
        {trend !== undefined && trend !== null && trend !== 0 && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11.5, fontWeight: 700,
            color: trend > 0 ? 'var(--success)' : 'var(--danger)',
          }}>
            {trend > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}
          </span>
        )}
      </div>
    </motion.div>
  )
}