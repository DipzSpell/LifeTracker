/**
 * useCelebration — fires a full-screen canvas-confetti burst.
 *
 * Usage:
 *   const { celebrate } = useCelebration()
 *   celebrate()   // default big burst
 *   celebrate({ particleCount: 60, spread: 50 })   // custom burst
 */
import { useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'

const DEFAULTS = {
  particleCount: 150,
  spread: 80,
  startVelocity: 45,
  origin: { x: 0.5, y: 0.6 },
  ticks: 200,
  gravity: 0.9,
  scalar: 1.1,
  shapes: ['circle', 'square', 'triangle', 'star', 'heart', 'spiral'],
  colors: [
    '#06b6d4', // cyber-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#a855f7', // purple-500
    '#ec4899', // pink-500
    '#facc15', // yellow-400
    '#ffffff', // white
  ],
  disableForReducedMotion: true,
}

export function useCelebration() {
  const frameRef = useRef(null)

  const celebrate = useCallback((overrides = {}) => {
    // Cancel any ongoing animation
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }

    const opts = { ...DEFAULTS, ...overrides }

    // Primary burst
    confetti(opts)

    // Second burst 250ms later from opposite side for that "fountain" effect
    const sideOpts = {
      ...opts,
      particleCount: Math.floor(opts.particleCount * 0.6),
      origin: { x: 0.3, y: 0.7 },
      angle: 60,
    }
    setTimeout(() => confetti(sideOpts), 250)

    const sideOpts2 = {
      ...opts,
      particleCount: Math.floor(opts.particleCount * 0.6),
      origin: { x: 0.7, y: 0.7 },
      angle: 120,
    }
    setTimeout(() => confetti(sideOpts2), 400)
  }, [])

  return { celebrate }
}
