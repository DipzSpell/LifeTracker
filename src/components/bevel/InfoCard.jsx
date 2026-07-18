/**
 * InfoCard.jsx — Bevel-style AI insight / info card.
 *
 * Matches the "You're well recovered" pattern: a small accent icon +
 * title on top, 2-3 lines of description, and an optional pill CTA row
 * with a trailing arrow (e.g. "View Recovery insights →").
 */
import { motion } from 'framer-motion'
import { ArrowRight, RefreshCw } from 'lucide-react'

const ACCENT_HEX = {
  green:  '#22C55E',
  blue:   '#3B82F6',
  orange: '#F97316',
  red:    '#FF6B5B',
  purple: '#A855F7',
}

export default function InfoCard({
  icon: Icon,
  title,
  description,
  accent = 'green',
  badge,
  cta,
  onCta,
  onRefresh,
  refreshing = false,
}) {
  const hex = ACCENT_HEX[accent] || accent

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="glass-panel"
      style={{ padding: '1.15rem 1.2rem' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {Icon && (
            <span className="flex items-center justify-center flex-shrink-0" style={{ width: 26, height: 26, borderRadius: 9, background: `${hex}1F` }}>
              <Icon size={14} style={{ color: hex }} />
            </span>
          )}
          <span style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{title}</span>
          {badge && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: `${hex}1F`, color: hex }}>
              {badge}
            </span>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh insight"
            className="glass-btn flex-shrink-0"
            style={{ width: 34, height: 34, minHeight: 34, padding: 0, borderRadius: 10 }}
          >
            <motion.span animate={{ rotate: refreshing ? 360 : 0 }} transition={{ duration: 0.7 }}>
              <RefreshCw size={12} style={{ color: '#8A93B2' }} />
            </motion.span>
          </button>
        )}
      </div>

      <motion.p
        key={description}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ fontSize: 13, lineHeight: 1.65, color: '#B4BBD0', margin: 0 }}
      >
        {description}
      </motion.p>

      {cta && (
        <button
          onClick={onCta}
          className="glass-btn w-full justify-between"
          style={{ marginTop: 12, padding: '0.65rem 0.9rem' }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{cta}</span>
          <ArrowRight size={14} style={{ color: '#8A93B2' }} />
        </button>
      )}
    </motion.div>
  )
}