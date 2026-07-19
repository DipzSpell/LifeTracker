/**
 * Logo.jsx — inline SVG replacement for the old /logo.png raster.
 *
 * The badge fill is a gradient built from var(--accent) → var(--accent-glow),
 * so the logo itself re-colors on every theme switch instead of staying a
 * fixed blue PNG. The "LN" glyph + leaf accent stay white/near-white on
 * purpose — they sit on a solid accent-colored chip, so white is the one
 * color guaranteed to stay legible across every theme's accent hue.
 */
export default function Logo({ size = 32, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      style={style}
      role="img"
      aria-label="LifeTracker logo"
    >
      <defs>
        <linearGradient id="lt-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-glow)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lt-logo-grad)" />
      <text
        x="14.5" y="21.5"
        textAnchor="middle"
        fontFamily="'JetBrains Mono', ui-monospace, monospace"
        fontWeight="800"
        fontSize="14"
        letterSpacing="-0.5"
        fill="#fff"
      >
        LN
      </text>
      <path
        d="M22.2 7.6c1.9 1 2.5 3.3 1.3 5.1-1.2 1.9-3.6 2.3-5.3 1 .3-2.7 1.6-5 4-6.1z"
        fill="#fff"
        opacity="0.92"
      />
    </svg>
  )
}