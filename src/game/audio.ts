type SoundKind = 'tap' | 'error' | 'success' | 'upgrade'
export type KitchenAudioSlotId = 'left' | 'right'
export type CustomerReactionKind = 'happy' | 'disappointed' | 'impatient'

interface SizzleLoop {
  oscillator: OscillatorNode
  gain: GainNode
}

interface ActiveTone {
  oscillator: OscillatorNode
  gain: GainNode
}

let audioContext: AudioContext | null = null
let kitchenAudioEnabled = true
let effectLevel = 1
const sizzleLoops = new Map<KitchenAudioSlotId, SizzleLoop>()
const activeTones = new Set<ActiveTone>()

function getAudioContext() {
  const AudioContextClass = window.AudioContext
  if (!AudioContextClass) return null
  audioContext ??= new AudioContextClass()
  return audioContext
}

function tone(context: AudioContext, frequency: number, start: number, duration: number, volume = 0.04) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(volume * effectLevel, start)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.000001, 0.001 * effectLevel), start + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  const activeTone = { oscillator, gain }
  activeTones.add(activeTone)
  oscillator.onended = () => {
    activeTones.delete(activeTone)
    try {
      oscillator.disconnect()
      gain.disconnect()
    } catch {
      // Nodes may already be disconnected during scene teardown.
    }
  }
  oscillator.start(start)
  oscillator.stop(start + duration)
}

export function setKitchenAudioEnabled(enabled: boolean) {
  kitchenAudioEnabled = enabled
  if (!enabled) stopAllKitchenAudio()
}

export function setAudioEffectLevel(level: number) {
  effectLevel = Math.min(1, Math.max(0, Number.isFinite(level) ? level : 1))
}

export function startSizzle(slotId: KitchenAudioSlotId) {
  if (!kitchenAudioEnabled || sizzleLoops.has(slotId)) return
  try {
    const context = getAudioContext()
    if (!context) return
    if (context.state === 'suspended') void context.resume()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(slotId === 'left' ? 92 : 101, context.currentTime)
    gain.gain.setValueAtTime(0.008 * effectLevel, context.currentTime)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    sizzleLoops.set(slotId, { oscillator, gain })
  } catch {
    // Audio feedback is optional and must never interrupt gameplay.
  }
}

export function stopSizzle(slotId: KitchenAudioSlotId) {
  const loop = sizzleLoops.get(slotId)
  if (!loop) return
  sizzleLoops.delete(slotId)
  try {
    loop.gain.disconnect()
    loop.oscillator.stop()
    loop.oscillator.disconnect()
  } catch {
    // The browser may already have stopped a node during page teardown.
  }
}

export function stopAllKitchenAudio() {
  stopSizzle('left')
  stopSizzle('right')
  for (const activeTone of [...activeTones]) {
    activeTones.delete(activeTone)
    activeTone.oscillator.onended = null
    try {
      activeTone.gain.gain.cancelScheduledValues(audioContext?.currentTime ?? 0)
      activeTone.oscillator.stop()
      activeTone.oscillator.disconnect()
      activeTone.gain.disconnect()
    } catch {
      // A tone may have ended between the registry snapshot and cleanup.
    }
  }
}

function playSlotTone(slotId: KitchenAudioSlotId, frequencies: number[], duration: number, volume: number) {
  if (!kitchenAudioEnabled) return
  try {
    const context = getAudioContext()
    if (!context) return
    if (context.state === 'suspended') void context.resume()
    const offset = slotId === 'left' ? -12 : 12
    frequencies.forEach((frequency, index) => tone(context, frequency + offset, context.currentTime + (index * 0.08), duration, volume))
  } catch {
    // Audio feedback is optional and must never interrupt gameplay.
  }
}

export function playReadyCue(slotId: KitchenAudioSlotId) {
  playSlotTone(slotId, [520, 720], 0.13, 0.028)
}

export function playBurnWarning(slotId: KitchenAudioSlotId) {
  playSlotTone(slotId, [190, 145, 115], 0.18, 0.042)
}

export function playCustomerReaction(kind: CustomerReactionKind) {
  if (!kitchenAudioEnabled) return
  try {
    const context = getAudioContext()
    if (!context) return
    if (context.state === 'suspended') void context.resume()
    const now = context.currentTime
    if (kind === 'happy') {
      tone(context, 560, now, 0.12, 0.035)
      tone(context, 840, now + 0.1, 0.18, 0.032)
    } else if (kind === 'disappointed') {
      tone(context, 230, now, 0.16, 0.035)
      tone(context, 170, now + 0.1, 0.2, 0.03)
    } else {
      tone(context, 310, now, 0.08, 0.026)
      tone(context, 310, now + 0.12, 0.08, 0.026)
    }
  } catch {
    // Audio feedback is optional and must never interrupt gameplay.
  }
}

export function playSound(kind: SoundKind, enabled: boolean) {
  if (!enabled) return
  try {
    const context = getAudioContext()
    if (!context) return
    if (context.state === 'suspended') void context.resume()
    const now = context.currentTime

    if (kind === 'tap') tone(context, 260, now, 0.08, 0.035)
    if (kind === 'error') tone(context, 125, now, 0.16, 0.045)
    if (kind === 'success') {
      tone(context, 440, now, 0.12, 0.04)
      tone(context, 660, now + 0.1, 0.16, 0.045)
      tone(context, 880, now + 0.2, 0.2, 0.035)
    }
    if (kind === 'upgrade') {
      tone(context, 520, now, 0.12, 0.04)
      tone(context, 780, now + 0.12, 0.2, 0.04)
    }
  } catch {
    // Audio feedback is optional and must never interrupt gameplay.
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Vibration is optional.
  }
}
