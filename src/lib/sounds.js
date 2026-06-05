/**
 * sounds.js — Synth UI sound effects using Web Audio API
 * All sounds are synthesised; no network requests.
 */

export function playClickSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1000, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(0.04, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  } catch {
    // AudioContext might be blocked until user gesture — that's fine
  }
}

let lastVictoryTime = 0

/**
 * Play a victory sound (habit / daily log saved).
 * Tries /victory.mp3 first, falls back to a synthesised arpeggio.
 */
export function playVictorySound() {
  try {
    const now = Date.now()
    if (now - lastVictoryTime < 1500) return
    lastVictoryTime = now

    const audio = new Audio('/victory.mp3')
    audio.volume = 0.25

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => synthesizeVictoryChime())
    }
  } catch {
    try { synthesizeVictoryChime() } catch { /* fail silently */ }
  }
}

function synthesizeVictoryChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    if (!ctx) return

    // C5 → E5 → G5 → C6 arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]
    notes.forEach((freq, index) => {
      const time = ctx.currentTime + index * 0.08
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, time)

      gain.gain.setValueAtTime(0.03, time)
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(time)
      osc.stop(time + 0.35)

      if (index === notes.length - 1) {
        setTimeout(() => {
          try { if (ctx.state !== 'closed') ctx.close() } catch { /* ignore */ }
        }, (index * 80) + 400)
      }
    })
  } catch {
    // Fail silently
  }
}

let lastLevelUpTime = 0

/**
 * playLevelUpSound — a premium, 6-note ascending fanfare used on a
 * successful save / points-award event. Richer than the victory chime.
 *
 * Tries /sounds/level-up.mp3 first (if the asset exists), then falls
 * back to a purely synthesised Web Audio fanfare.
 * The promise chain is fully guarded so it never blocks the UI.
 */
export function playLevelUpSound() {
  try {
    const now = Date.now()
    // 2-second debounce to prevent rapid re-fires on multiple clicks
    if (now - lastLevelUpTime < 2000) return
    lastLevelUpTime = now

    const audio = new Audio('/sounds/level-up.mp3')
    audio.volume = 0.3

    const p = audio.play()
    if (p !== undefined) {
      p.catch(() => synthesizeLevelUpFanfare())
    }
  } catch {
    try { synthesizeLevelUpFanfare() } catch { /* fail silently */ }
  }
}

function synthesizeLevelUpFanfare() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    // 6-note ascending major scale with chord cluster at the end
    // C5 → E5 → G5 → B5 → D6 → [G6 chord burst]
    const melody = [
      { freq: 523.25, time: 0.00, dur: 0.18, vol: 0.035, type: 'triangle' },
      { freq: 659.25, time: 0.12, dur: 0.18, vol: 0.035, type: 'triangle' },
      { freq: 783.99, time: 0.24, dur: 0.18, vol: 0.035, type: 'triangle' },
      { freq: 987.77, time: 0.36, dur: 0.18, vol: 0.035, type: 'triangle' },
      { freq: 1174.66, time: 0.48, dur: 0.18, vol: 0.03,  type: 'triangle' },
      // Final chord burst: G6 + B6 + D7
      { freq: 1567.98, time: 0.60, dur: 0.45, vol: 0.025, type: 'sine' },
      { freq: 1975.53, time: 0.60, dur: 0.45, vol: 0.020, type: 'sine' },
      { freq: 2349.32, time: 0.60, dur: 0.45, vol: 0.015, type: 'sine' },
    ]

    melody.forEach(({ freq, time, dur, vol, type }) => {
      const t = ctx.currentTime + time
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = type
      osc.frequency.setValueAtTime(freq, t)

      gain.gain.setValueAtTime(vol, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(t)
      osc.stop(t + dur + 0.05)
    })

    // Clean up context after fanfare finishes (~1.2s)
    setTimeout(() => {
      try { if (ctx.state !== 'closed') ctx.close() } catch { /* ignore */ }
    }, 1400)
  } catch {
    // Fail silently
  }
}
