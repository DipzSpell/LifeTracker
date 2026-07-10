/**
 * ModuleSummaryCard.jsx — Hero "module overview" card
 *
 * Renders a prominent accent-tinted card with up to 4 sub-tiles.
 * Each sub-tile shows a label, a current/target value string, and a
 * circular ProgressRing.
 *
 * Props:
 *   title       — card heading (string)
 *   accentRgb   — RGB triplet string for the accent tint (e.g. '135 166 140')
 *   icon        — React element (Lucide icon or emoji string)
 *   tiles       — array of { label, value, pct, ringColor? }
 *   children    — optional extra content rendered below tiles
 */
import { motion } from 'framer-motion'
import ProgressRing from './ProgressRing'

export default function ModuleSummaryCard({ title, accentRgb, icon, tiles = [], children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl p-4 border border-white/8"
      style={{
        background: accentRgb
          ? `linear-gradient(135deg, rgb(${accentRgb} / 0.12), rgb(${accentRgb} / 0.06))`
          : 'rgba(255,255,255,0.04)',
        borderColor: accentRgb ? `rgb(${accentRgb} / 0.25)` : 'rgba(255,255,255,0.08)',
        boxShadow: accentRgb ? `0 4px 24px rgb(${accentRgb} / 0.08)` : undefined,
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 mb-4">
        {typeof icon === 'string'
          ? <span className="text-base leading-none">{icon}</span>
          : icon
        }
        <h2 className="text-sm font-semibold font-mono text-white/90 tracking-tight">{title}</h2>
      </div>

      {/* Sub-tiles grid */}
      {tiles.length > 0 && (
        <div className={`grid gap-2 ${tiles.length <= 2 ? 'grid-cols-2' : tiles.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {tiles.map((tile, i) => (
            <div
              key={i}
              className="summary-tile"
              style={{ borderColor: accentRgb ? `rgb(${accentRgb} / 0.15)` : undefined }}
            >
              <ProgressRing
                pct={tile.pct ?? 0}
                size={44}
                stroke={4}
                color={tile.ringColor ?? (accentRgb ? `rgb(${accentRgb})` : 'var(--primary)')}
                label={`${Math.round(tile.pct ?? 0)}%`}
              />
              <div className="text-center">
                <p className="text-xs font-bold font-mono text-white/80 leading-tight tabular-nums">
                  {tile.value}
                </p>
                <p className="text-[10px] text-white/40 mt-0.5 font-mono leading-tight">
                  {tile.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {children}
    </motion.div>
  )
}
