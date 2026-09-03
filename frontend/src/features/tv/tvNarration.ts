export type TvNarrationTurn = {
  ticketNumber: string
  status: string
  chairNumber?: number
}

export type TvAnnouncementDelta = {
  currentKeys: Set<string>
  newTurns: TvNarrationTurn[]
}

const defaultVolume = 0.85
const testTurn: TvNarrationTurn = { ticketNumber: 'A-123', status: 'Called', chairNumber: 4 }

type WebkitWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

export function clampTvVolume(value: number): number {
  if (!Number.isFinite(value)) return defaultVolume
  return Math.min(1, Math.max(0, value))
}

export function buildTvAnnouncement(turn: TvNarrationTurn): string | null {
  const ticketNumber = turn.ticketNumber.trim()
  if (turn.status !== 'Called' || !ticketNumber || !Number.isInteger(turn.chairNumber) || (turn.chairNumber ?? 0) <= 0) {
    return null
  }

  return `Turno: ${ticketNumber}, pasar a Silla: ${turn.chairNumber}.`
}

export function tvAnnouncementKey(turn: TvNarrationTurn): string | null {
  if (!buildTvAnnouncement(turn)) return null
  return `${turn.ticketNumber.trim()}|${turn.chairNumber}`
}

export function collectNewCalledTurns(
  previousKeys: ReadonlySet<string> | null,
  turns: readonly TvNarrationTurn[],
): TvAnnouncementDelta {
  const currentKeys = new Set<string>()
  const eligibleTurns: Array<{ key: string; turn: TvNarrationTurn }> = []

  for (const turn of turns) {
    const key = tvAnnouncementKey(turn)
    if (!key) continue
    currentKeys.add(key)
    eligibleTurns.push({ key, turn })
  }

  if (previousKeys === null) {
    return { currentKeys, newTurns: [] }
  }

  return {
    currentKeys,
    newTurns: eligibleTurns.filter(({ key }) => !previousKeys.has(key)).map(({ turn }) => turn),
  }
}

function getSpanishVoice(synthesis: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = synthesis.getVoices()
  return voices.find(voice => voice.lang.toLowerCase() === 'es-do')
    ?? voices.find(voice => voice.lang.toLowerCase().startsWith('es-'))
    ?? voices.find(voice => voice.lang.toLowerCase() === 'es')
}

async function playCallChime(volume: number): Promise<void> {
  if (typeof window === 'undefined') return
  const AudioContextConstructor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
  if (!AudioContextConstructor) return

  let context: AudioContext | null = null
  try {
    context = new AudioContextConstructor()
    if (context.state === 'suspended') await context.resume()

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const now = context.currentTime
    const normalizedVolume = clampTvVolume(volume)

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, now)
    oscillator.frequency.setValueAtTime(1174.66, now + 0.16)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, normalizedVolume * 0.16), now + 0.02)
    gain.gain.setValueAtTime(Math.max(0.0001, normalizedVolume * 0.16), now + 0.26)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.38)

    await new Promise(resolve => window.setTimeout(resolve, 400))
  } catch {
    // Some TV browsers block Web Audio until a user gesture. Voice narration can still continue.
  } finally {
    if (context && context.state !== 'closed') {
      try { await context.close() } catch { /* no-op */ }
    }
  }
}

function speakAnnouncement(text: string, volume: number, generationIsCurrent: () => boolean): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return Promise.resolve()
  }

  return new Promise(resolve => {
    if (!generationIsCurrent()) {
      resolve()
      return
    }

    const synthesis = window.speechSynthesis
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = getSpanishVoice(synthesis)
    utterance.lang = voice?.lang ?? 'es-DO'
    if (voice) utterance.voice = voice
    utterance.rate = 0.92
    utterance.pitch = 1
    utterance.volume = clampTvVolume(volume)
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    synthesis.speak(utterance)
  })
}

export class TvNarrator {
  private queue: Promise<void> = Promise.resolve()
  private generation = 0

  announce(turns: readonly TvNarrationTurn[], volume: number): void {
    for (const turn of turns) {
      const text = buildTvAnnouncement(turn)
      if (!text) continue
      this.enqueue(text, volume)
    }
  }

  test(volume: number): void {
    const text = buildTvAnnouncement(testTurn)
    if (text) this.enqueue(text, volume)
  }

  cancel(): void {
    this.generation += 1
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    this.queue = Promise.resolve()
  }

  private enqueue(text: string, volume: number): void {
    const generation = this.generation
    this.queue = this.queue
      .then(async () => {
        if (generation !== this.generation) return
        await playCallChime(volume)
        if (generation !== this.generation) return
        await speakAnnouncement(text, volume, () => generation === this.generation)
      })
      .catch(() => undefined)
  }
}
