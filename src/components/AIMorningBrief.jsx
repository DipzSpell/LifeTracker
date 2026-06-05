import { useEffect, useCallback, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { Sparkles, RefreshCw, Brain } from 'lucide-react'

// ─── Insight Matrix ───────────────────────────────────────────────────────────
//
// Generates a richly-contextual response object based on:
//   mood      – yesterday's mood index (1–10, 0 = not logged)
//   habitsPct – % of good habits completed yesterday (0–100)
//   notes     – any "Any Notes?" snippet from the daily log
//   pendingHigh / pendingMedium – pending todo priorities
//   sleepHours – hours slept last night (0 = unknown)
//   steps     – steps logged yesterday
//
// Returns: { title, body, aura, auraColor, emoji, tag }

const VARIANTS = {
  // ── HIGH mood + HIGH habits ──────────────────────────────────────────────
  glowing: [
    {
      title: 'Peak Mode Unlocked 🔥',
    body: (ctx) =>
        `Yesterday was a ${ctx.mood}/10 focus day${ctx.habitsPct >= 80 ? ` with ${Math.round(ctx.habitsPct)}% habit completion` : ''}. Your current Aura is glowing. Today's focus: ${ctx.nextMission}`,
      tag: 'Glowing Aura',
    },
    {
      title: 'Momentum is Everything ⚡',
      body: (ctx) =>
        `You crushed it — ${ctx.mood}/10 vibe and ${Math.round(ctx.habitsPct)}% habits done. That energy compounds. ${ctx.nextMission} Don't waste the streak.`,
      tag: 'On Fire',
    },
    {
      title: 'You Are That Person ✨',
      body: (ctx) =>
        `${ctx.mood}/10 mood, habits locked in${ctx.steps >= 8000 ? ', steps hit' : ''}. The version of you that shows up every day is building something real. ${ctx.nextMission}`,
      tag: 'Locked In',
    },
  ],

  // ── HIGH mood + LOW habits ───────────────────────────────────────────────
  moodHighHabitsLow: [
    {
      title: 'Good Vibes, Missed Reps 🌤️',
      body: (ctx) =>
        `You felt great yesterday (${ctx.mood}/10) but habits slipped a bit. No shame — channel that mood energy into structure today. ${ctx.nextMission}`,
      tag: 'Rebalancing',
    },
    {
      title: 'Vibe ≠ Volume 💡',
      body: (ctx) =>
        `High mood energy (${ctx.mood}/10) — brilliant. But habits at ${Math.round(ctx.habitsPct)}% means there's untapped potential. Pair your vibe with your discipline today. ${ctx.nextMission}`,
      tag: 'Calibrating',
    },
  ],

  // ── LOW mood + HIGH habits ───────────────────────────────────────────────
  moodLowHabitsHigh: [
    {
      title: 'Showed Up Anyway 💪',
      body: (ctx) =>
        `Yesterday felt heavy (${ctx.mood}/10), but you completed ${Math.round(ctx.habitsPct)}% of your habits anyway. That's grit. Today, be gentle but keep the structure. ${ctx.nextMission}`,
      tag: 'Resilient',
    },
    {
      title: 'The Quiet Warrior 🧘',
      body: (ctx) =>
        `Low mood (${ctx.mood}/10) didn't stop you from showing up — ${Math.round(ctx.habitsPct)}% habits done. You're building identity, not just motivation. ${ctx.nextMission}`,
      tag: 'Identity Builder',
    },
  ],

  // ── LOW mood + LOW habits ────────────────────────────────────────────────
  reset: [
    {
      title: 'Fresh Slate, Fresh Energy 🌱',
      body: () =>
        `Hey, yesterday felt a bit heavy — and that's okay. Today is a full reset. Take a deep breath, log a glass of water, and tackle just one small task. Small wins cascade. ⚡`,
      tag: 'Recovery Mode',
    },
    {
      title: 'The Comeback Story Starts Today 🔄',
      body: (ctx) =>
        `Not every day is a 10/10. Yesterday was ${ctx.mood > 0 ? `a ${ctx.mood}/10` : 'a quiet one'}. But every sunrise is a reset button. Just do one thing differently. ${ctx.nextMission}`,
      tag: 'Resetting',
    },
    {
      title: 'Give Yourself Grace 🤍',
      body: () =>
        `Some days are for recovering, not performing. Yesterday was one of those. Be kind to yourself, hydrate, and ease back in. The streak isn't lost — it's paused.`,
      tag: 'Self-Care Mode',
    },
  ],

  // ── NOTES present ────────────────────────────────────────────────────────
  withNotes: [
    {
      title: 'You Took Note of That 📓',
      body: (ctx) =>
        `You left a reflection yesterday: "${ctx.noteSnippet}". Intention is the first step to transformation. ${ctx.nextMission}`,
      tag: 'Reflective',
    },
    {
      title: 'Words Have Power 🖊️',
      body: (ctx) =>
        `Yesterday you wrote: "${ctx.noteSnippet}". That self-awareness is rare. Keep channeling it. ${ctx.nextMission}`,
      tag: 'Self-Aware',
    },
  ],

  // ── DEFAULT / BALANCED ───────────────────────────────────────────────────
  balanced: [
    {
      title: 'Steady Flow, Keep Going 🌊',
      body: (ctx) =>
        `Yesterday had a quiet rhythm. Not every day needs to be explosive — consistency is the real superpower. ${ctx.nextMission}`,
      tag: 'Consistent',
    },
    {
      title: 'Building in the Background 🏗️',
      body: () =>
        `No log from yesterday? No problem — today is your canvas. Pick one habit, one task, one win. That's how the best days start.`,
      tag: 'Starting Fresh',
    },
  ],
}

// ─── Aura map ─────────────────────────────────────────────────────────────────
function resolveAura(mood, habitsPct, steps, sleepHours) {
  if (mood >= 8 && habitsPct >= 75) {
    return { aura: '🌟 Glowing Aura', auraColor: 'from-yellow-400 via-amber-400 to-orange-500' }
  }
  if (steps >= 10000 || (steps >= 8000 && habitsPct >= 70)) {
    return { aura: '⚡ Energetic Aura', auraColor: 'from-orange-500 via-red-500 to-pink-500' }
  }
  if (mood >= 7 && habitsPct >= 60) {
    return { aura: '🧘 Mindful Aura', auraColor: 'from-purple-400 via-indigo-400 to-blue-500' }
  }
  if (sleepHours >= 8.5) {
    return { aura: '💤 Restorative Aura', auraColor: 'from-blue-400 via-cyan-400 to-indigo-500' }
  }
  if (mood > 0 && mood <= 4) {
    return { aura: '🌧️ Reflective Aura', auraColor: 'from-slate-500 via-zinc-400 to-slate-600' }
  }
  if (habitsPct >= 70) {
    return { aura: '🌱 Resilient Aura', auraColor: 'from-emerald-400 via-teal-400 to-cyan-500' }
  }
  return { aura: '✨ Balanced Aura', auraColor: 'from-cyan-400 to-emerald-400' }
}

// ─── Next mission helper ──────────────────────────────────────────────────────
function buildNextMission(pendingHigh, pendingMedium, habitsPct) {
  if (pendingHigh.length > 0) {
    return `Today's mission: Tackle "${pendingHigh[0].title}" (High priority)! 🎯`
  }
  if (pendingMedium.length > 0) {
    return `Today's mission: Work on "${pendingMedium[0].title}".`
  }
  if (habitsPct < 50 && habitsPct > 0) {
    return "Today's mission: Focus on completing your daily habits."
  }
  return "Today's vibe: focus on self-care and easy wins. 🌟"
}

// ─── Pick variant (deterministic-random per day) ──────────────────────────────
function pickVariant(pool, seed) {
  return pool[seed % pool.length]
}

// ─── Core generator ───────────────────────────────────────────────────────────
export function generateDailyInsight(yesterdayLog, yesterdayFitness, goodHabits, yesterdayKey, pendingHigh, pendingMedium) {
  const mood = yesterdayLog?.mood || 0
  const steps = yesterdayFitness?.steps || yesterdayLog?.steps || 0
  const rawNotes = yesterdayLog?.notes || ''
  const noteSnippet = rawNotes.length > 60 ? rawNotes.slice(0, 57) + '…' : rawNotes

  // Habits %
  const yDone = goodHabits.filter(h => h.entries?.[yesterdayKey]?.status === 'done').length
  const habitsPct = goodHabits.length ? (yDone / goodHabits.length) * 100 : 0

  // Sleep hours
  let sleepHours = 0
  if (yesterdayLog?.sleepTime && yesterdayLog?.wakeTime) {
    try {
      const [sH, sM] = yesterdayLog.sleepTime.split(':').map(Number)
      const [wH, wM] = yesterdayLog.wakeTime.split(':').map(Number)
      if (!isNaN(sH) && !isNaN(wH)) {
        let diff = (wH * 60 + wM) - (sH * 60 + sM)
        if (diff < 0) diff += 24 * 60
        sleepHours = diff / 60
      }
    } catch { /* ignore */ }
  }

  // Seed for deterministic-per-day randomness: sum of char codes in yesterdayKey
  const seed = yesterdayKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)

  const nextMission = buildNextMission(pendingHigh, pendingMedium, habitsPct)
  const { aura, auraColor } = resolveAura(mood, habitsPct, steps, sleepHours)

  const ctx = {
    mood, steps, habitsPct, sleepHours, noteSnippet, nextMission,
  }

  // Choose variant pool based on context
  let pool
  if (noteSnippet && Math.random() < 0.4) {
    pool = VARIANTS.withNotes
  } else if (mood >= 7 && habitsPct >= 65) {
    pool = VARIANTS.glowing
  } else if (mood >= 7 && habitsPct < 50) {
    pool = VARIANTS.moodHighHabitsLow
  } else if (mood > 0 && mood <= 5 && habitsPct >= 65) {
    pool = VARIANTS.moodLowHabitsHigh
  } else if ((mood > 0 && mood <= 5) || (habitsPct < 40 && goodHabits.length > 0)) {
    pool = VARIANTS.reset
  } else {
    pool = VARIANTS.balanced
  }

  const variant = pickVariant(pool, seed)
  const bodyText = variant.body(ctx)

  return { title: variant.title, body: bodyText, aura, auraColor, tag: variant.tag }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AIMorningBrief({ insight, onRefresh, isRefreshing }) {
  const controls = useAnimation()
  const hasAnimatedIn = useRef(false)

  // Entry animation on mount
  useEffect(() => {
    if (!hasAnimatedIn.current) {
      hasAnimatedIn.current = true
    }
  }, [])

  // Framer Motion 360° spin on refresh
  const handleRefresh = useCallback(async () => {
    await controls.start({
      rotate: 360,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    })
    controls.set({ rotate: 0 })
    onRefresh?.()
  }, [controls, onRefresh])

  if (!insight) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      // Animated gradient border that maps to CSS --primary / --accent tokens
      className="aura-card shadow-lg"
      aria-label="AI Morning Brief"
    >
      {/* Inner card: uses bg-card + backdrop-blur so it works across all themes */}
      <div className="relative bg-card/96 backdrop-blur-xl rounded-[1.15rem] overflow-hidden">

        {/* Subtle grid / scanline texture overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 3px)',
            backgroundSize: '100% 6px',
          }}
        />

        {/* Ambient glow blob */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20 blur-2xl"
          style={{ background: 'var(--primary)' }}
        />

        {/* ── Header row ── */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {/* Sparkle icon */}
            <span className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(var(--color-cyber-500) / 0.15)' }}>
              <Sparkles size={14} className="text-cyber-400" />
            </span>

            {/* Heading + sub-label */}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-cyber-400 leading-none">
                AI Daily Insight
              </p>
              <p className="text-xs font-semibold text-white/70 leading-tight truncate mt-0.5">
                {insight.title}
              </p>
            </div>

            {/* Aura badge */}
            <span
              className={`hidden sm:inline-flex flex-shrink-0 text-[9px] px-2 py-0.5 rounded-full font-bold bg-gradient-to-r ${insight.auraColor} text-navy-950 leading-none`}
            >
              {insight.aura}
            </span>
          </div>

          {/* Refresh button */}
          <button
            id="ai-brief-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                       bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/15
                       transition-all duration-200 active:scale-90 disabled:opacity-40"
            title="Refresh AI Insight"
            aria-label="Refresh insight"
          >
            <motion.div animate={controls}>
              <RefreshCw size={12} className="text-white/50 hover:text-white transition-colors" />
            </motion.div>
          </button>
        </div>

        {/* Mobile aura badge */}
        <div className="sm:hidden px-4 pb-1">
          <span
            className={`inline-flex text-[9px] px-2 py-0.5 rounded-full font-bold bg-gradient-to-r ${insight.auraColor} text-navy-950 leading-none`}
          >
            {insight.aura}
          </span>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/6" />

        {/* ── Body ── */}
        <div className="px-4 pt-3 pb-4">
          {/* Tag pill */}
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider
                           px-2 py-0.5 rounded-full border mb-2
                           bg-white/5 border-white/10 text-white/50">
            <Brain size={8} />
            {insight.tag}
          </span>

          {/* Insight body text */}
          <motion.p
            key={insight.body}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-xs leading-relaxed font-medium text-white/85"
          >
            {insight.body}
          </motion.p>
        </div>

        {/* Bottom shimmer accent line */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-[2px] opacity-40"
          style={{
            background: `linear-gradient(90deg, transparent, var(--primary), var(--accent), transparent)`,
          }}
        />
      </div>
    </motion.div>
  )
}
