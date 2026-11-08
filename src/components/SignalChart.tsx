import { useEffect, useRef, useState } from 'react'
import { amplitude } from '../data'
import type { Sample, SwallowEvent } from '../data'
type Props = {
  samples: Sample[]
  events?: SwallowEvent[]
  seconds: number
  cursor: number
  language: 'en' | 'th'
}
export default function SignalChart({ samples, events = [], seconds, cursor, language }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(780)
  useEffect(() => {
    const node = ref.current!
    const observer = new ResizeObserver(() => setWidth(Math.max(250, node.clientWidth)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const height = 210,
    left = 36,
    right = 16,
    top = 24,
    bottom = 30
  const ticks = width < 450 ? 3 : 6
  const start = samples[0].timestamp_ms
  const total = (samples.at(-1)!.timestamp_ms - start) / 1000
  const span = Math.min(seconds, total)
  const lower = Math.max(0, total - span)
  const visible = samples.filter((s) => (s.timestamp_ms - start) / 1000 >= lower)
  const max = Math.max(0.6, ...visible.map(amplitude)) * 1.05
  const plotWidth = width - left - right,
    plotHeight = height - top - bottom
  const x = (t: number) => left + ((t - lower) / span) * plotWidth
  const y = (a: number) => height - bottom - (a / max) * plotHeight
  const stride = Math.max(1, Math.floor(visible.length / 900))
  const points = visible.filter((_, i) => i % stride === 0 || i === visible.length - 1)
  const line = points
    .map(
      (s, i) =>
        `${i === 0 ? 'M' : 'L'}${x((s.timestamp_ms - start) / 1000).toFixed(2)},${y(amplitude(s)).toFixed(2)}`,
    )
    .join(' ')
  return (
    <svg
      ref={ref}
      className="signal-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={
        language === 'en'
          ? 'Motion amplitude over time, in g'
          : 'กราฟขนาดการเคลื่อนไหวตามเวลา หน่วย g'
      }
    >
      <defs>
        <linearGradient id="signalFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#149a84" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#149a84" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => {
        const value = (max * i) / 3
        return (
          <g key={i}>
            <line
              x1={left}
              x2={width - right}
              y1={y(value)}
              y2={y(value)}
              stroke="#e7eeea"
              strokeDasharray={i ? '4 5' : ''}
            />
            <text x={left - 12} y={y(value) + 4} textAnchor="end">
              {value.toFixed(1)}
            </text>
          </g>
        )
      })}
      {events
        .filter((e) => e.time >= lower)
        .map((e, i) => (
          <rect
            key={i}
            x={x(e.time - e.duration / 2)}
            y={top}
            width={(e.duration / span) * plotWidth}
            height={plotHeight}
            rx="3"
            fill="#b9e7d7"
            opacity="0.3"
          />
        ))}
      <path
        d={`${line} L${x(total)},${height - bottom} L${left},${height - bottom} Z`}
        fill="url(#signalFill)"
      />
      <path d={line} fill="none" stroke="#128b75" strokeWidth="2" strokeLinejoin="round" />
      {events.length > 0 && (
        <line
          x1={x(lower + (cursor / 60) * span)}
          x2={x(lower + (cursor / 60) * span)}
          y1={top}
          y2={height - bottom}
          stroke="#70b5a4"
          strokeDasharray="3 4"
        />
      )}
      {Array.from({ length: ticks + 1 }, (_, i) => (
        <text key={i} x={left + (i / ticks) * plotWidth} y={height - 8} textAnchor="middle">
          {(lower + (span * i) / ticks).toFixed(span < 6 ? 2 : 0)}s
        </text>
      ))}
      <text x="13" y="13">
        g
      </text>
    </svg>
  )
}
