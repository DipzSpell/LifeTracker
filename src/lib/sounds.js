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
