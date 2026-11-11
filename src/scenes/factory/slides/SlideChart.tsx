/** A small SVG chart for lecture slides: line, bar (grouped columns) and scatter. */
export interface ChartOp {
  t: 'chart'
  kind: 'line' | 'bar' | 'scatter'
  x: number
  y: number
  w: number
  h: number
  labels?: string[]
  xs?: number[]
  series: { name: string; values: number[] }[]
  colors?: string[]
  xTitle?: string
  yTitle?: string
  every?: number
  min?: number
  max?: number
}

const DEFAULT_COLORS = ['0C9C9C', 'E9A23B', 'D4455C', '6657D9']
const FONT = "Calibri, Carlito, 'Segoe UI', system-ui, sans-serif"

/** Tick positions that land on round numbers. */
function niceTicks(lo: number, hi: number, target = 6) {
  const span = hi - lo || 1
  const raw = span / target
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= target + 1) ?? mag * 10
  const first = Math.floor(lo / step) * step
  const ticks: number[] = []
  for (let v = first; v < hi + step * 0.999; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return ticks
}

export default function SlideChart({ op, u }: { op: ChartOp; u: number }) {
  // work in a fixed 100-units-per-inch space so text sizes stay proportional
  const W = op.w * 100
  const H = op.h * 100
  const colors = (op.colors ?? DEFAULT_COLORS).map((c) => `#${c}`)
  const legend = op.series.length > 1
  const pad = { l: 62, r: 16, t: 14, b: (op.xTitle ? 58 : 36) + (legend ? 30 : 0) }
  const pw = W - pad.l - pad.r
  const ph = H - pad.t - pad.b

  const all = op.series.flatMap((s) => s.values).filter((v) => Number.isFinite(v))
  const hi = op.max ?? Math.max(...all)
  const lo = op.min ?? Math.min(0, ...all)
  const yt = niceTicks(lo, hi)
  const y0 = op.min ?? yt[0]
  const y1 = op.max ?? yt[yt.length - 1]
  const Y = (v: number) => pad.t + ph - ((Math.min(Math.max(v, y0 - (y1 - y0)), y1 + (y1 - y0)) - y0) / (y1 - y0)) * ph

  const n = op.labels?.length ?? 0
  let X: (i: number) => number
  let xTicks: { x: number; label: string }[]
  if (op.kind === 'scatter') {
    const xs = op.xs ?? []
    const xt = niceTicks(Math.min(0, ...xs), Math.max(...xs))
    const a = xt[0]
    const b = xt[xt.length - 1]
    X = (i) => pad.l + ((xs[i] - a) / (b - a)) * pw
    xTicks = xt.map((v) => ({ x: pad.l + ((v - a) / (b - a)) * pw, label: String(v) }))
  } else if (op.kind === 'bar') {
    X = (i) => pad.l + ((i + 0.5) / n) * pw
    xTicks = (op.labels ?? []).map((label, i) => ({ x: X(i), label }))
  } else {
    X = (i) => pad.l + (n > 1 ? (i / (n - 1)) * pw : pw / 2)
    const every = op.every ?? Math.ceil(n / 8)
    xTicks = (op.labels ?? []).map((label, i) => ({ x: X(i), label })).filter((_, i) => i % every === 0)
  }
  const clip = `clip-${Math.round(op.x * 1000)}-${Math.round(op.y * 1000)}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', left: op.x * u, top: op.y * u, width: op.w * u, height: op.h * u, fontFamily: FONT }}
      role="img"
      aria-label={`Chart: ${op.series.map((s) => s.name).join(', ')}`}
    >
      <defs>
        <clipPath id={clip}>
          <rect x={pad.l} y={pad.t} width={pw} height={ph} />
        </clipPath>
      </defs>
      {yt.filter((v) => v >= y0 && v <= y1).map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={pad.l + pw} y1={Y(v)} y2={Y(v)} stroke="#DDE1EC" strokeWidth={1} />
          <text x={pad.l - 8} y={Y(v) + 4} textAnchor="end" fontSize={13} fill="#5B6380">
            {v}
          </text>
        </g>
      ))}
      <line x1={pad.l} x2={pad.l + pw} y1={Y(Math.max(y0, Math.min(0, y1)))} y2={Y(Math.max(y0, Math.min(0, y1)))} stroke="#9AA1B8" strokeWidth={1.2} />
      {xTicks.map((t, i) => (
        <text key={i} x={t.x} y={pad.t + ph + 18} textAnchor="middle" fontSize={13} fill="#5B6380">
          {t.label}
        </text>
      ))}
      {op.xTitle && (
        <text x={pad.l + pw / 2} y={pad.t + ph + 42} textAnchor="middle" fontSize={14} fill="#5B6380">
          {op.xTitle}
        </text>
      )}
      {op.yTitle && (
        <text transform={`translate(16 ${pad.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize={14} fill="#5B6380">
          {op.yTitle}
        </text>
      )}
      <g clipPath={`url(#${clip})`}>
        {op.series.map((s, k) => {
          const c = colors[k % colors.length]
          if (op.kind === 'scatter') return s.values.map((v, i) => <circle key={`${k}-${i}`} cx={X(i)} cy={Y(v)} r={4.5} fill={c} />)
          if (op.kind === 'bar') {
            const group = (pw / n) * 0.62
            const bw = group / op.series.length
            return s.values.map((v, i) => {
              const top = Math.min(Y(v), Y(0))
              return <rect key={`${k}-${i}`} x={X(i) - group / 2 + k * bw} y={top} width={bw - 1} height={Math.abs(Y(v) - Y(0))} fill={c} />
            })
          }
          return <polyline key={k} points={s.values.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke={c} strokeWidth={3} strokeLinejoin="round" />
        })}
      </g>
      {legend && (
        <g fontSize={14} fill="#1B2140">
          {(() => {
            const widths = op.series.map((s) => 30 + s.name.length * 7.2 + 18)
            const total = widths.reduce((a, b) => a + b, 0)
            let x = Math.max(4, (W - total) / 2)
            return op.series.map((s, k) => {
              const g = (
                <g key={k} transform={`translate(${x} ${H - 14})`}>
                  {op.kind === 'line' ? (
                    <line x1={0} x2={22} y1={-5} y2={-5} stroke={colors[k % colors.length]} strokeWidth={3} />
                  ) : (
                    <rect x={6} y={-11} width={11} height={11} fill={colors[k % colors.length]} />
                  )}
                  <text x={28} y={0}>
                    {s.name}
                  </text>
                </g>
              )
              x += widths[k]
              return g
            })
          })()}
        </g>
      )}
    </svg>
  )
}
