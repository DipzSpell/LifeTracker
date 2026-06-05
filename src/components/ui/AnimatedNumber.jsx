/**
 * AnimatedNumber — Odometer / slot-machine style animated number counter.
 *
 * When the `value` prop changes, the displayed number rapidly "rolls" from
 * the previous value to the new value, giving a satisfying ticker effect.
 *
 * Props:
 *   value      {number}  — the target number to display
 *   duration   {number}  — animation duration in ms (default 700)
 *   className  {string}  — class for the outer span
 *   formatter  {fn}      — optional fn(n) => string for display (default toLocaleString)
 *
 * Algorithm: uses requestAnimationFrame for butter-smooth easing. The easing
 * curve is easeOutExpo so it decelerates into the final value naturally,
 * matching a real odometer's feel.
 */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export default function AnimatedNumber({
  value,
  duration = 700,
  className = '',
  formatter = (n) => Math.round(n).toLocaleString(),
}) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const prevRef = useRef(value)
  const rafRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    const from = prevRef.current
    const to = value

    // No animation needed if value hasn't changed
    if (from === to) return

    // Cancel any in-progress animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    setIsAnimating(true)
    startTimeRef.current = null
    prevRef.current = to

    function tick(timestamp) {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutExpo(progress)
      const current = from + (to - from) * eased

      setDisplayValue(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplayValue(to)
        setIsAnimating(false)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return (
    <span className={`inline-block tabular-nums ${className}`}>
      <AnimatePresence mode="popLayout">
        {isAnimating && (
          <motion.span
            key="animating"
            initial={{ y: 0, opacity: 1 }}
            exit={{ y: -4, opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="inline-block"
          >
            {formatter(displayValue)}
          </motion.span>
        )}
        {!isAnimating && (
          <motion.span
            key="static"
            initial={{ y: 4, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="inline-block"
          >
            {formatter(value)}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
