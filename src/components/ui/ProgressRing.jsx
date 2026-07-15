/**
 * ProgressRing.jsx — Shared circular SVG progress ring
 *
 * Extracted from DailyLog.jsx so it can be reused across all module
 * summary cards (Dashboard, Habits, Fitness, etc.).
 *
 * Props:
 *   pct    — percentage filled (0–100)
 *   size   — diameter in px (default 48)
 *   stroke — stroke width in px (default 4)
 *   color  — stroke color (CSS value, default 'var(--primary)')
 *   label  — optional string rendered in the centre
 */
import { motion } from 'framer-motion'

export default function ProgressRing({ pct = 0, size = 48, stroke = 4, color = 'var(--primary)', label }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct, 100) / 100 * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {/* Fill */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      {label !== undefined && (
        <span
          className="absolute text-[9px] font-bold font-mono leading-none"
          style={{ color, rotate: '0deg' }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
