/**
 * ProgressRing.jsx — Bevel/Whoop-style thick circular progress ring.
 *
 * The signature component of the dark premium design system: a thick,
 * rounded-cap stroke with a gradient fill (green for recovery/completion,
 * blue for sleep, orange-red for strain/intensity), a big bold percentage
 * centered inside, and a small muted label underneath.
 *
 * Also doubles as a "mini ring" (small corner indicator, e.g. the
 * Awake/REM/Core/Deep stat-card corners) by passing `mini` + a small size.
 *
 * Optional `glow` (soft blurred halo behind the ring) and `gradientText`
 * (center number painted with the same gradient as the stroke) are for
 * hero-sized rings — skip both on small/mini rings, they'd just look noisy.
 */
import { motion } from 'framer-motion'

// Named fallback gradients for callers that pass `gradient="green"` instead
// of explicit `from`/`to` — still hardcoded hex, not yet theme-reactive.
// Dashboard always passes from/to explicitly so this doesn't affect it;
// callers still using named gradients are in scope for the next migration pass.
export const RING_GRADIENTS = {
  green:  ['#22C55E', '#A3E635'],
  teal:   ['#34C759', '#5AC8FA'],
  blue:   ['#2563EB', '#7DD3FC'],
  orange: ['#FACC15', '#F97316'],
  red:    ['#F97316', '#EF4444'],
  purple: ['#A855F7', '#E9D5FF'],
}

export default function ProgressRing({
  pct = 0,
  size = 160,
  stroke = 14,
  gradient = 'green',
  from,
  to,
  trackColor = 'var(--border-subtle)',
  center,
  label,
  zeroLabel,
  mini = false,
  animate = true,
  glow = false,
  gradientText = false,
}) {
  const [gFrom, gTo] = from && to ? [from, to] : (RING_GRADIENTS[gradient] || RING_GRADIENTS.green)
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(Math.max(pct, 0), 100) / 100 * circ
  const gid = `pring-${gFrom.replace('#', '')}-${gTo.replace('#', '')}-${size}-${stroke}`

  const centerFontSize = size >= 140 ? 40 : size >= 90 ? 26 : size >= 50 ? 16 : 11
  const labelFontSize = size >= 140 ? 14 : size >= 90 ? 11 : 9
  const effectiveLabel = pct === 0 && zeroLabel ? zeroLabel : label

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size, flexShrink: 0 }}>
      {glow && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: '-18%',
            borderRadius: '50%',
            background: `radial-gradient(closest-side, ${gFrom}40, transparent 72%)`,
            filter: 'blur(22px)',
            pointerEvents: 'none',
          }}
        />
      )}
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'relative' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gFrom} />
            <stop offset="100%" stopColor={gTo} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        {animate ? (
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        ) : (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - dash}
          />
        )}
      </svg>
      {!mini && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-2" style={{ textAlign: 'center' }}>
          <span
            style={{
              fontSize: centerFontSize, fontWeight: 700, lineHeight: 1,
              ...(gradientText
                ? {
                    backgroundImage: `linear-gradient(90deg, ${gFrom}, ${gTo})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }
                : { color: 'var(--text-primary)' }),
            }}
          >
            {center !== undefined ? center : `${Math.round(pct)}%`}
          </span>
          {effectiveLabel && (
            <span style={{ fontSize: labelFontSize, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>
              {effectiveLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}