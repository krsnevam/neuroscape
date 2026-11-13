import type { ReactNode } from 'react'

/** Shared pieces for the "friends and knobs" levels. */
export const CARD = 'rounded-xl border border-white/10 bg-slate-900/70 p-4'
export const TAG = 'mb-3 font-mono text-[11px] uppercase tracking-widest text-slate-400'
export const f1 = (v: number) => (Math.round(v * 10) / 10 === 0 ? '0' : (Math.round(v * 10) / 10).toString())

export const WIGGLE = '@keyframes wiggle{0%,100%{transform:translateX(-2px) rotate(-3deg)}50%{transform:translateX(2px) rotate(3deg)}}@keyframes spin{to{transform:rotate(360deg)}}'

/** A friend who reports one thing about the motor. */
export function Face({ kind, level, size = 64 }: { kind: 'shaky' | 'hot' | 'fan' | 'probeA' | 'probeB' | 'helper' | 'boss'; level: number; size?: number }) {
  const color = { shaky: '#38bdf8', hot: '#fb923c', fan: '#34d399', probeA: '#fb923c', probeB: '#f472b6', helper: '#a78bfa', boss: '#facc15' }[kind]
  const worried = kind !== 'fan' && level >= 6
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className="shrink-0" aria-hidden>
      <g
        className={kind === 'shaky' && level > 0 ? 'origin-center animate-[wiggle_0.3s_linear_infinite]' : ''}
        style={kind === 'shaky' ? { animationDuration: `${0.5 - level * 0.035}s`, transformOrigin: '40px 42px' } : undefined}
      >
        {kind === 'fan' && (
          <g style={{ transformOrigin: '40px 42px', animation: level > 0 ? `spin ${1.6 - level * 0.14}s linear infinite` : undefined }}>
            {[0, 120, 240].map((a) => (
              <ellipse key={a} cx="40" cy="20" rx="9" ry="20" fill="#6ee7b7" opacity="0.7" transform={`rotate(${a} 40 42)`} />
            ))}
          </g>
        )}
        <circle cx="40" cy="42" r={kind === 'boss' ? 30 : 26} fill={color} />
        {(kind === 'hot' || kind === 'probeA' || kind === 'probeB') && <path d="M40 4 C48 16 54 18 50 30 C46 22 42 24 40 14 C38 24 30 22 30 30 C24 18 34 16 40 4Z" fill="#ef4444" opacity={0.25 + level * 0.07} />}
        {kind === 'boss' && <path d="M22 18 L30 30 L40 16 L50 30 L58 18 L56 34 L24 34 Z" fill="#fef08a" stroke="#a16207" strokeWidth="1.5" />}
        <circle cx="31" cy="40" r="6" fill="#fff" />
        <circle cx="49" cy="40" r="6" fill="#fff" />
        <circle cx="32" cy="41" r="2.6" fill="#0f172a" />
        <circle cx="50" cy="41" r="2.6" fill="#0f172a" />
        <path d={worried ? 'M30 58 Q40 50 50 58' : 'M30 54 Q40 62 50 54'} stroke="#0f172a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function Bars({ n, color }: { n: number; color: string }) {
  return (
    <div className="flex gap-0.5" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="h-4 w-2.5 rounded-sm" style={{ background: i < n ? color : 'rgba(148,163,184,0.18)' }} />
      ))}
    </div>
  )
}

export function Last10({ history }: { history: boolean[] }) {
  return (
    <span className="ml-auto flex items-center gap-1" aria-label={`${history.filter(Boolean).length} of the last ${history.length} right`}>
      <span className="mr-1 text-xs text-slate-400">my last 10:</span>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`h-4 w-4 rounded-full ${i < history.length ? (history[i] ? 'bg-emerald-400' : 'bg-rose-400') : 'border border-white/20'}`} />
      ))}
    </span>
  )
}

/** A knob that can go below zero. */
export function Knob({ label, value, min, max, step = 0.1, color, onChange, note }: { label: ReactNode; value: number; min: number; max: number; step?: number; color: string; onChange: (v: number) => void; note?: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2 text-[14px] text-white">
        <span>{label}</span>
        <span className="font-mono text-xl font-bold" style={{ color: value < 0 ? '#fda4af' : color }}>
          {f1(value)}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-3 w-full" style={{ accentColor: color }} />
      {note && <span className="text-xs text-slate-400">{note}</span>}
    </label>
  )
}

/**
 * Every possible motor on one picture: probe A across, probe B up, both 0 to 10.
 * The dot's colour is the engineer's answer; the square behind it is what I would say.
 */
export function ProbeMap({
  truth,
  say,
  lines = [],
  mark,
  onPick,
}: {
  truth: (a: number, b: number) => boolean
  /** my worry for this motor, 0 (OK) to 1 (STOP) */
  say: (a: number, b: number) => number
  /** straight lines to draw: wa·A + wb·B = k */
  lines?: { wa: number; wb: number; k: number; color: string }[]
  mark?: [number, number]
  onPick?: (a: number, b: number) => void
}) {
  const S = 26
  const P = 30
  const X = (a: number) => P + a * S
  const Y = (b: number) => P + (10 - b) * S
  const size = P * 2 + 10 * S
  const segment = (l: { wa: number; wb: number; k: number }) => {
    // points where the line crosses the edges of the −0.5…10.5 square
    const lo = -0.5
    const hi = 10.5
    const pts: [number, number][] = []
    if (Math.abs(l.wb) > 1e-6) for (const a of [lo, hi]) pts.push([a, (l.k - l.wa * a) / l.wb])
    if (Math.abs(l.wa) > 1e-6) for (const b of [lo, hi]) pts.push([(l.k - l.wb * b) / l.wa, b])
    const inside = pts.filter(([a, b]) => a >= lo - 1e-6 && a <= hi + 1e-6 && b >= lo - 1e-6 && b <= hi + 1e-6)
    return inside.length >= 2 ? [inside[0], inside[inside.length - 1]] : null
  }
  let right = 0
  const cells = []
  for (let a = 0; a <= 10; a++)
    for (let b = 0; b <= 10; b++) {
      const t = truth(a, b)
      const s = say(a, b)
      if (s > 0.5 === t) right++
      cells.push(
        <g key={`${a}-${b}`} onClick={onPick ? () => onPick(a, b) : undefined} style={onPick ? { cursor: 'pointer' } : undefined}>
          <rect x={X(a) - S / 2} y={Y(b) - S / 2} width={S} height={S} fill={s > 0.5 ? '#f87171' : '#4ade80'} opacity={0.1 + 0.3 * Math.abs(s - 0.5) * 2} />
          <circle cx={X(a)} cy={Y(b)} r={5} fill={t ? '#f87171' : '#4ade80'} stroke={s > 0.5 === t ? 'none' : '#f8fafc'} strokeWidth={2} />
        </g>,
      )
    }
  return (
    <figure className="flex w-full max-w-[360px] flex-col gap-1.5">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full" role="img" aria-label={`Map of all 121 motors. ${right} are answered correctly.`}>
        <defs>
          <clipPath id="probe-map-clip">
            <rect x={P - S / 2} y={P - S / 2} width={11 * S} height={11 * S} />
          </clipPath>
        </defs>
        {cells}
        <g clipPath="url(#probe-map-clip)">
          {lines.map((l, i) => {
            const seg = segment(l)
            return seg ? <line key={i} x1={X(seg[0][0])} y1={Y(seg[0][1])} x2={X(seg[1][0])} y2={Y(seg[1][1])} stroke={l.color} strokeWidth={3.5} strokeLinecap="round" /> : null
          })}
        </g>
        {mark && <circle cx={X(mark[0])} cy={Y(mark[1])} r={10} fill="none" stroke="#f8fafc" strokeWidth={3} />}
        <text x={size / 2} y={size - 6} textAnchor="middle" fontSize="12" fill="#94a3b8">
          Probe A says 0 → 10
        </text>
        <text x={10} y={size / 2} textAnchor="middle" fontSize="12" fill="#94a3b8" transform={`rotate(-90 10 ${size / 2})`}>
          Probe B says 0 → 10
        </text>
      </svg>
      <figcaption className="text-xs leading-snug text-slate-400">
        Each dot is one possible motor. <b className="text-emerald-300">Green dot</b>: the engineer says OK. <b className="text-rose-300">Red dot</b>: STOP. The square behind is what I say. A white ring means I am wrong there.{' '}
        <b className={right >= 115 ? 'text-emerald-300' : right >= 90 ? 'text-amber-300' : 'text-rose-300'}>
          I get {right} of 121 right.
        </b>
      </figcaption>
    </figure>
  )
}
