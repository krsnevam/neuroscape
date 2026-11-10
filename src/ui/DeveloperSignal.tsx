import { useEffect, useRef, useState } from 'react'

const LINKS = {
  a: {
    label: 'LinkedIn',
    handle: 'subramanya-navada',
    href: 'https://www.linkedin.com/in/subramanya-navada-b27018194/',
    color: '#38bdf8',
  },
  b: {
    label: 'Instagram',
    handle: '@navada_subramanya',
    href: 'https://www.instagram.com/navada_subramanya/',
    color: '#f472b6',
  },
} as const
type Branch = keyof typeof LINKS

const DENDRITES = [
  'M 14 104 C 46 78, 66 128, 104 104',
  'M 22 46 C 56 52, 76 84, 108 94',
  'M 24 166 C 58 160, 76 126, 108 116',
]
const AXON: Record<Branch, string> = {
  a: 'M 158 105 L 232 105 C 266 105, 284 54, 330 52',
  b: 'M 158 105 L 232 105 C 266 105, 284 156, 330 158',
}
const MAX_PULSES = 14
const TRACE = 180 // samples, 60 per second

interface Pulse {
  kind: 'in' | Branch
  path: number
  s: number
  speed: number
}

/** Membrane potential in mV, t seconds after the neuron fired: a fast spike, a dip below rest, then recovery. */
function spike(t: number) {
  if (t < 0 || t > 0.6) return 0
  if (t < 0.04) return (t / 0.04) * 110
  if (t < 0.12) return 110 - ((t - 0.04) / 0.08) * 125
  return -15 * Math.exp(-(t - 0.12) / 0.15)
}

/**
 * "Meet the developer": a small neuron. Signals arrive on the dendrites, the cell body fires,
 * and an action potential runs down the axon to one of two synapses, which are the links.
 */
export default function DeveloperSignal() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200 backdrop-blur hover:bg-white/10"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
        </span>
        Developer
      </button>
      {open && <SignalDialog onClose={() => setOpen(false)} />}
    </>
  )
}

function SignalDialog({ onClose }: { onClose: () => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null)
  const dendrites = useRef<(SVGPathElement | null)[]>([])
  const axons = useRef<Record<Branch, SVGPathElement | null>>({ a: null, b: null })
  const dots = useRef<(SVGCircleElement | null)[]>([])
  const soma = useRef<SVGCircleElement>(null)
  const terminals = useRef<Record<Branch, SVGCircleElement | null>>({ a: null, b: null })
  const trace = useRef<SVGPolylineElement>(null)
  const sim = useRef({
    pulses: [] as Pulse[],
    fires: [] as number[],
    samples: new Array<number>(TRACE).fill(-70),
    glow: 0,
    term: { a: 0, b: 0 },
    target: null as Branch | null,
    next: 'a' as Branch,
    lastInput: -1,
    acc: 0,
    queue: [] as { at: number; branch: Branch }[],
  })
  const [fired, setFired] = useState(0)

  useEffect(() => {
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const S = sim.current
    const fire = (now: number, branch: Branch) => {
      S.fires.push(now)
      S.glow = 1
      if (S.pulses.length < MAX_PULSES) S.pulses.push({ kind: branch, path: 0, s: 0, speed: 0.75 })
    }
    if (still) {
      // Draw a single resting frame: one spike on the trace, no motion
      const pts = S.samples.map((_, i) => -70 + spike((i - 60) / 60))
      trace.current?.setAttribute('points', pts.map((v, i) => `${(i / (TRACE - 1)) * 400},${55 - ((v + 85) / 135) * 50}`).join(' '))
      return
    }
    let raf = 0
    let last = performance.now()
    const frame = (nowMs: number) => {
      const now = nowMs / 1000
      const dt = Math.min(0.05, (nowMs - last) / 1000)
      last = nowMs
      // Spontaneous input every 1.7 s
      if (now - S.lastInput > 1.7) {
        S.lastInput = now
        if (S.pulses.length < MAX_PULSES)
          S.pulses.push({ kind: 'in', path: Math.floor(Math.random() * DENDRITES.length), s: 0, speed: 0.9 })
      }
      // Bursts queued by the links
      S.queue = S.queue.filter((q) => {
        if (q.at > now) return true
        fire(now, q.branch)
        return false
      })
      // Move pulses
      S.pulses = S.pulses.filter((p) => {
        p.s += p.speed * dt
        if (p.s < 1) return true
        if (p.kind === 'in') {
          const branch = S.target ?? S.next
          if (!S.target) S.next = S.next === 'a' ? 'b' : 'a'
          fire(now, branch)
        } else S.term[p.kind] = 1
        return false
      })
      // Draw pulses
      dots.current.forEach((el, i) => {
        if (!el) return
        const p = S.pulses[i]
        const path = p ? (p.kind === 'in' ? dendrites.current[p.path] : axons.current[p.kind]) : null
        if (!p || !path) {
          el.setAttribute('opacity', '0')
          return
        }
        const pt = path.getPointAtLength(p.s * path.getTotalLength())
        el.setAttribute('cx', String(pt.x))
        el.setAttribute('cy', String(pt.y))
        el.setAttribute('opacity', '1')
        el.setAttribute('r', p.kind === 'in' ? '4' : '5.5')
      })
      // Glows decay
      S.glow = Math.max(0, S.glow - dt * 2.5)
      soma.current?.setAttribute('opacity', String(0.25 + 0.75 * S.glow))
      for (const b of ['a', 'b'] as Branch[]) {
        S.term[b] = Math.max(0, S.term[b] - dt * 1.8)
        terminals.current[b]?.setAttribute('r', String(14 + 10 * S.term[b]))
        terminals.current[b]?.setAttribute('opacity', String(0.15 + 0.6 * S.term[b]))
      }
      // Membrane trace, sampled at 60 Hz
      S.acc += dt
      while (S.acc >= 1 / 60) {
        S.acc -= 1 / 60
        S.fires = S.fires.filter((f) => now - f < 0.6)
        const v = -70 + S.fires.reduce((sum, f) => sum + spike(now - f), 0)
        S.samples.push(Math.min(45, v))
        S.samples.shift()
      }
      trace.current?.setAttribute(
        'points',
        S.samples.map((v, i) => `${((i / (TRACE - 1)) * 400).toFixed(1)},${(55 - ((v + 85) / 135) * 50).toFixed(1)}`).join(' '),
      )
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const aim = (b: Branch | null) => {
    sim.current.target = b
  }
  const burst = (b: Branch) => {
    const now = performance.now() / 1000
    sim.current.queue.push(...[0, 0.14, 0.28].map((d) => ({ at: now + d, branch: b })))
    setFired((n) => n + 3)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-signal-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[440px] flex-col gap-3 rounded-xl border border-white/10 bg-slate-950 p-4 shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-sky-300">Signal the developer</div>
            <h2 id="dev-signal-title" className="text-xl font-semibold leading-tight text-white">
              Subramanya Navada
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-slate-400">
              Built NeuroScape. Each link is a synapse at the end of this neuron’s axon. Point at one and the signal
              takes that branch.
            </p>
          </div>
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-white/15 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10"
          >
            Close
          </button>
        </header>

        <svg viewBox="0 0 400 210" className="w-full" role="img" aria-label="A neuron whose axon ends in two synapses, labelled LinkedIn and Instagram">
          <defs>
            <radialGradient id="dev-soma" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="55%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </radialGradient>
            <radialGradient id="dev-glow">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="dev-pulse">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="45%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>
          {DENDRITES.map((d, i) => (
            <path key={d} ref={(el) => void (dendrites.current[i] = el)} d={d} fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
          ))}
          {(['a', 'b'] as Branch[]).map((b) => (
            <path key={b} ref={(el) => void (axons.current[b] = el)} d={AXON[b]} fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
          ))}
          {[170, 196, 222].map((x) => (
            <rect key={x} x={x - 9} y={100} width={18} height={10} rx={5} fill="#1e293b" stroke="#94a3b8" strokeWidth="0.8" />
          ))}
          <circle ref={soma} cx="130" cy="105" r="46" fill="url(#dev-glow)" opacity="0.25" />
          <circle cx="130" cy="105" r="28" fill="url(#dev-soma)" stroke="#bae6fd" strokeWidth="1" />
          <text x="130" y="109" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0b1020" fontFamily="system-ui, sans-serif">
            SN
          </text>
          {(['a', 'b'] as Branch[]).map((b) => {
            const y = b === 'a' ? 52 : 158
            return (
              <g key={b}>
                <circle ref={(el) => void (terminals.current[b] = el)} cx="340" cy={y} r="14" fill={LINKS[b].color} opacity="0.15" />
                <circle cx="340" cy={y} r="8" fill={LINKS[b].color} />
                <text
                  x="340"
                  y={b === 'a' ? 28 : 192}
                  textAnchor="middle"
                  fontSize="11"
                  fill={LINKS[b].color}
                  fontFamily="ui-monospace, monospace"
                >
                  {LINKS[b].label}
                </text>
              </g>
            )
          })}
          {Array.from({ length: MAX_PULSES }, (_, i) => (
            <circle key={i} ref={(el) => void (dots.current[i] = el)} r="5" fill="url(#dev-pulse)" opacity="0" />
          ))}
          <g fontSize="9" fill="#64748b" fontFamily="ui-monospace, monospace">
            <text x="8" y="196">dendrites: you</text>
            <text x="130" y="152" textAnchor="middle">
              cell body
            </text>
            <text x="196" y="96" textAnchor="middle">
              axon
            </text>
          </g>
        </svg>

        <div className="rounded-md border border-white/10 bg-black/40 px-2 pb-1 pt-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 font-mono text-[9px] uppercase tracking-widest text-slate-500">
            <span>Membrane voltage</span>
            <span>
              rest −70 mV · {fired} spike{fired === 1 ? '' : 's'} sent by you
            </span>
          </div>
          <svg viewBox="0 0 400 60" className="h-12 w-full" preserveAspectRatio="none" aria-hidden>
            <line x1="0" x2="400" y1={55 - (15 / 135) * 50} y2={55 - (15 / 135) * 50} stroke="#334155" strokeDasharray="3 4" />
            <polyline ref={trace} fill="none" stroke="#fde68a" strokeWidth="1.6" strokeLinejoin="round" points="" />
          </svg>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['a', 'b'] as Branch[]).map((b) => (
            <a
              key={b}
              href={LINKS[b].href}
              target="_blank"
              rel="noopener noreferrer"
              onPointerEnter={() => aim(b)}
              onPointerLeave={() => aim(null)}
              onFocus={() => aim(b)}
              onBlur={() => aim(null)}
              onClick={() => burst(b)}
              className="flex flex-col rounded-lg border bg-white/5 px-3 py-2.5 transition-colors hover:bg-white/10"
              style={{ borderColor: `${LINKS[b].color}66` }}
            >
              <span className="text-sm font-semibold" style={{ color: LINKS[b].color }}>
                {LINKS[b].label} ↗
              </span>
              <span className="truncate font-mono text-[11px] text-slate-400">{LINKS[b].handle}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
