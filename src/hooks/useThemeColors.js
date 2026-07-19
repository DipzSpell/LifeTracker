/**
 * useThemeColors.js — live design-system tokens for JS-side color consumers
 * (recharts stroke/fill, SVG gradients, inline styles) that CSS custom
 * properties can't reach.
 *
 * Reads the tokens straight off :root via getComputedStyle, so it's always
 * whatever src/styles/theme.css defines for the currently active
 * [data-theme] — no hardcoded hex, no per-component copy of the palette.
 * Re-reads whenever ThemeContext flips `data-theme` on <html> (observed via
 * MutationObserver, not a ThemeContext subscription — this hook has no
 * dependency on ThemeContext and works for any code path that changes the
 * attribute).
 *
 * Values come back as plain strings (hex or rgba) exactly as authored in
 * theme.css — safe to hand directly to recharts `stroke`/`fill`, SVG
 * `stopColor`, or inline `style` colors.
 */
import { useEffect, useState } from 'react'

const TOKENS = [
  'bg-base', 'bg-elevated', 'bg-glass',
  'border-subtle', 'border-glass',
  'accent', 'accent-glow',
  'success', 'danger', 'special', 'warning',
  'text-primary', 'text-secondary', 'text-muted',
  'chart-line', 'chart-fill-from', 'chart-fill-to',
  'heat-0', 'heat-1', 'heat-2', 'heat-3', 'heat-4',
]

function readTokens() {
  const styles = getComputedStyle(document.documentElement)
  const out = {}
  for (const token of TOKENS) {
    // camelCase key ("bg-base" -> "bgBase") for easy destructuring in JS
    const key = token.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
    out[key] = styles.getPropertyValue(`--${token}`).trim()
  }
  return out
}

export function useThemeColors() {
  const [colors, setColors] = useState(readTokens)

  useEffect(() => {
    const root = document.documentElement
    const refresh = () => setColors(readTokens())

    // Re-read whenever data-theme (or class, for the Tailwind `dark` sync)
    // changes on <html> — covers ThemeContext's setAttribute calls and the
    // initial system-preference resolution.
    const observer = new MutationObserver(muts => {
      if (muts.some(m => m.attributeName === 'data-theme' || m.attributeName === 'class')) {
        refresh()
      }
    })
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'class'] })

    return () => observer.disconnect()
  }, [])

  return colors
}

export default useThemeColors
