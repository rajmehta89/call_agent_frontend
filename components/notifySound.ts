'use client'

/** Short two-note chime for new inbox activity, generated with Web Audio (no sound file).
 *  Browsers only allow audio after the person has clicked or typed on the page once; until then play() is silent. */

const MUTE_KEY = 'relaydesk_sound_muted'
let context: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Context = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Context) return null
  context = context || new Context()
  return context
}

/** Call once: the first click or key press unlocks audio for the rest of the session. */
export function unlockSoundOnFirstInteraction() {
  if (typeof window === 'undefined') return
  const unlock = () => { audio()?.resume().catch(() => {}); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

export function isSoundMuted(): boolean {
  try { return window.localStorage.getItem(MUTE_KEY) === '1' } catch { return false }
}

export function setSoundMuted(muted: boolean) {
  try { window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0') } catch { /* private mode: setting is just not remembered */ }
}

export function playChime() {
  if (isSoundMuted()) return
  const ctx = audio()
  if (!ctx || ctx.state !== 'running') return
  const now = ctx.currentTime
  ;[[880, 0], [1320, 0.12]].forEach(([frequency, offset]) => {
    const tone = ctx.createOscillator()
    const volume = ctx.createGain()
    tone.type = 'sine'
    tone.frequency.value = frequency
    volume.gain.setValueAtTime(0.0001, now + offset)
    volume.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02)
    volume.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35)
    tone.connect(volume).connect(ctx.destination)
    tone.start(now + offset)
    tone.stop(now + offset + 0.4)
  })
}
