/**
 * Logo.jsx — renders the brand mark from /logo.png (the blue "open book LN
 * + leaf" artwork). Previously an inline theme-recoloring SVG; replaced
 * because the brand now has a fixed logo image instead of a generated badge.
 */
export default function Logo({ size = 32, className = '', style = {} }) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain', ...style }}
      alt="LifeNotebook logo"
    />
  )
}