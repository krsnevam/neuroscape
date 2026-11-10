import type { ReactNode } from 'react'

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-t border-white/10 px-4 py-3">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{title}</h3>
      {children}
    </section>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  fmt,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  fmt?: (v: number) => string
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-300">
      <span className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono text-sky-300">{fmt ? fmt(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-6 w-full accent-sky-400"
      />
    </label>
  )
}

export function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex items-center justify-between gap-3 text-left text-xs text-slate-300"
    >
      <span>
        {label}
        {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${value ? 'bg-sky-500' : 'bg-slate-600'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  )
}

export function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-slate-300">
      {label && <span>{label}</span>}
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
              value === o.value
                ? 'border-sky-400 bg-sky-400/15 text-sky-200'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Btn({
  children,
  onClick,
  tone = 'plain',
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  tone?: 'plain' | 'go' | 'warn'
  disabled?: boolean
}) {
  const tones = {
    plain: 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10',
    go: 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25',
    warn: 'border-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

export function Stat({
  label,
  value,
  tone = 'plain',
}: {
  label: string
  value: ReactNode
  tone?: 'plain' | 'good' | 'bad' | 'warn'
}) {
  const tones = { plain: 'text-slate-100', good: 'text-emerald-300', bad: 'text-rose-300', warn: 'text-amber-300' }
  return (
    <div className="flex min-w-0 flex-col rounded-md bg-white/5 px-2.5 py-1.5">
      <span className="truncate text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${tones[tone]}`}>{value}</span>
    </div>
  )
}

export function Stats({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-1.5">{children}</div>
}
