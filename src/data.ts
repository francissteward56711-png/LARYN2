export type Language = 'en' | 'th'
export type Page = 'overview' | 'communication' | 'monitoring' | 'alerts' | 'device'
export type Sample = {
  timestamp_ms: number
  ax: number
  ay: number
  az: number
  gx: number
  gy: number
  gz: number
}
export type SwallowEvent = { time: number; duration: number; amplitude: number }
export type Phrase = { id: string; en: string; th: string; icon: string; custom?: boolean }
export type AlertEvent = {
  id: string
  kind: 'demo' | 'help'
  createdAt: number
  status: 'open' | 'acknowledged' | 'resolved'
  resolvedAt?: number
}
export const DEMO_EVENTS: SwallowEvent[] = [
  { time: 7, duration: 1.2, amplitude: 0.38 },
  { time: 16, duration: 1.1, amplitude: 0.34 },
  { time: 26, duration: 1.4, amplitude: 0.46 },
  { time: 37, duration: 1.2, amplitude: 0.39 },
  { time: 47, duration: 1.3, amplitude: 0.42 },
  { time: 55, duration: 1.0, amplitude: 0.32 },
]
export const DEFAULT_PHRASES: Phrase[] = [
  { id: 'water', en: 'I need some water', th: 'ขอน้ำหน่อย', icon: 'water' },
  { id: 'help', en: 'I need some help', th: 'ช่วยหน่อย', icon: 'hand' },
  { id: 'rest', en: 'I need to rest', th: 'ขอพักสักครู่', icon: 'rest' },
  { id: 'okay', en: 'I feel okay', th: 'ฉันรู้สึกสบายดี', icon: 'smile' },
  { id: 'thanks', en: 'Thank you', th: 'ขอบคุณ', icon: 'heart' },
  { id: 'uncomfortable', en: 'I feel uncomfortable', th: 'ฉันรู้สึกไม่สบาย', icon: 'chat' },
]
export const CSV_HEADER = 'timestamp_ms,ax,ay,az,gx,gy,gz'
export function demoSamples(): Sample[] {
  return Array.from({ length: 1201 }, (_, i) => {
    const t = i / 20
    const peak = DEMO_EVENTS.reduce((sum, event) => {
      const z = (t - event.time) / (event.duration / 5)
      return sum + event.amplitude * Math.exp((-z * z) / 2)
    }, 0)
    const base = 0.008 * Math.sin(t * 21) + 0.005 * Math.cos(t * 37)
    return {
      timestamp_ms: i * 50,
      ax: base * 0.5,
      ay: base * 0.3,
      az: 1 + base + peak,
      gx: base * 5,
      gy: peak * 3,
      gz: base * 2,
    }
  })
}
export function amplitude(sample: Sample) {
  return Math.abs(Math.hypot(sample.ax, sample.ay, sample.az) - 1)
}
export function summarize(samples: Sample[]) {
  if (samples.length < 2) return { duration: 0, rate: 0, peak: 0, count: samples.length }
  const duration = (samples.at(-1)!.timestamp_ms - samples[0].timestamp_ms) / 1000
  return {
    duration,
    rate: (samples.length - 1) / duration,
    peak: Math.max(...samples.map(amplitude)),
    count: samples.length,
  }
}
export function parseSensorCsv(csv: string): Sample[] {
  const lines = csv
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/)
  if (lines[0]?.trim() !== CSV_HEADER) throw new Error('header')
  if (lines.length < 3) throw new Error('short')
  if (lines.length > 20001) throw new Error('large')
  const samples = lines.slice(1).map((line, index) => {
    const fields = line.split(',').map((value) => value.trim())
    if (
      fields.length !== 7 ||
      fields.some((value) => value === '' || !Number.isFinite(Number(value)))
    )
      throw new Error('numeric')
    const [timestamp_ms, ax, ay, az, gx, gy, gz] = fields.map(Number)
    if (
      timestamp_ms < 0 ||
      Math.max(Math.abs(ax), Math.abs(ay), Math.abs(az)) > 16 ||
      Math.max(Math.abs(gx), Math.abs(gy), Math.abs(gz)) > 2000
    )
      throw new Error('range')
    const previous = index > 0 ? Number(lines[index].split(',')[0]) : -1
    if (timestamp_ms <= previous) throw new Error('order')
    return { timestamp_ms, ax, ay, az, gx, gy, gz }
  })
  if (summarize(samples).duration <= 0) throw new Error('order')
  return samples
}
export function toCsv(samples: Sample[]) {
  return (
    CSV_HEADER +
    '\n' +
    samples
      .map((s) =>
        [s.timestamp_ms, s.ax, s.ay, s.az, s.gx, s.gy, s.gz]
          .map((n) => Number(n.toFixed(6)))
          .join(','),
      )
      .join('\n') +
    '\n'
  )
}
export function loadPreference<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    return validate(value) ? value : fallback
  } catch {
    return fallback
  }
}
export function isPhraseList(value: unknown): value is Phrase[] {
  return (
    Array.isArray(value) &&
    value.length <= 50 &&
    value.every(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.en === 'string' &&
        typeof p.th === 'string' &&
        typeof p.icon === 'string' &&
        p.en.length <= 120 &&
        p.th.length <= 120 &&
        p.custom === true,
    )
  )
}

// IDs identify local UI items, not authentication tokens. Support HTTP LAN previews too.
export function localId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
