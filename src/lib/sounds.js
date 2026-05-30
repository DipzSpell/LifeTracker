/**
 * Synth UI sound effects using Web Audio API (zero network overhead, clean synth clicks).
 */
export function playClickSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()
    
    // Soft, crisp synth click
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1000, ctx.currentTime) // High pitch
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08) // Swift slide down
    
    gain.gain.setValueAtTime(0.04, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08) // Fast fade
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  } catch {
    // AudioContext might be blocked until user gesture, which is fine
  }
}

let lastVictoryTime = 0

/**
 * Play a victory sound when streaks/points/habits are updated.
 * Points to /victory.mp3 with low volume, falling back to Web Audio arpeggio.
 */
export function playVictorySound() {
  try {
    const now = Date.now()
    // 1.5 seconds debouncer to prevent intense audio overlap
    if (now - lastVictoryTime < 1500) return
    lastVictoryTime = now

    const audio = new Audio('/victory.mp3')
    audio.volume = 0.25 // explicitly low volume to keep it elegant & satisfying

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Safe fallback: if asset is missing or browser restricts it, play synthesized chord
        synthesizeVictoryChime()
      })
    }
  } catch {
    // Safe fallback to synth chime
    try {
      synthesizeVictoryChime()
    } catch {
      // Fail silently
    }
  }
}

function synthesizeVictoryChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    if (!ctx) return

    // Premium synthesized victory chime (C5 -> E5 -> G5 -> C6 arpeggio)
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

      // Clean up context after arpeggio finishes
      if (index === notes.length - 1) {
        setTimeout(() => {
          try {
            if (ctx.state !== 'closed') {
              ctx.close()
            }
          } catch {
            // Ignore close errors
          }
        }, (index * 80) + 400)
      }
    })
  } catch {
    // Fail silently
  }
}
