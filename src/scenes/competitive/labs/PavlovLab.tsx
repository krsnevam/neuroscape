import { useRef, useState } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, drawAxes, makePlot, useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { associatorOutput, hebbMax, hebbStep } from '../../../engine/associative'
import { clamp, ease, legend, lerp, text } from './kit'

type Kind = 'both' | 'sight' | 'smell' | 'none'
const KINDS: Record<Kind, { p0: number; p: number; label: string; color: string }> = {
  both: { p0: 1, p: 1, label: 'coffee served in the tumbler', color: '#34d399' },
  sight: { p0: 0, p: 1, label: 'empty tumbler only', color: '#38bdf8' },
  smell: { p0: 1, p: 0, label: 'smell only', color: '#fbbf24' },
  none: { p0: 0, p: 0, label: 'nothing', color: '#64748b' },
}
const W0 = 1
const B = -0.5
const KEEP = 200

interface Trial {
  kind: Kind
  n: number
  a: number
  before: number
  w: number
}

interface Sim {
  w: number
  shownW: number
  trials: Trial[]
  count: number
  /** time the latest trial was presented, for the pulse animation */
  at: number
  autoAt: number
  autoIdx: number
  glow: number
}

function runTrial(sim: Sim, kind: Kind, alpha: number, gamma: number) {
  const k = KINDS[kind]
  const { n, a } = associatorOutput(W0, k.p0, sim.w, k.p, B)
  const before = sim.w
  // Clamp so a runaway weight stays a finite number we can still draw
  sim.w = Math.min(1e6, hebbStep(sim.w, a, k.p, alpha, gamma))
  sim.trials.push({ kind, n, a, before, w: sim.w })
  if (sim.trials.length > KEEP) sim.trials.shift()
  sim.count++
  sim.at = performance.now() / 1000
}

/** Start with Hagan's three trials already on the chart, so the first view shows learning. */
function seeded(): Sim {
  const sim: Sim = { w: 0, shownW: 0, trials: [], count: 0, at: 0, autoAt: 0, autoIdx: 0, glow: 0 }
  for (const k of ['sight', 'both', 'sight'] as Kind[]) runTrial(sim, k, 1, 0)
  sim.shownW = 0
  return sim
}

export default function PavlovLab() {
  const [alpha, setAlpha] = useState(1)
  const [decay, setDecay] = useState(false)
  const [gamma, setGamma] = useState(0.1)
  const [auto, setAuto] = useState<'off' | 'college' | 'holiday'>('off')
  const simRef = useRef<Sim | null>(null)
  if (!simRef.current) simRef.current = seeded()
  const sim = simRef.current
  useTicker(200)
  const g = decay ? gamma : 0
  const present = (kind: Kind) => runTrial(sim, kind, alpha, g)

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    if (auto !== 'off' && t - sim.autoAt > 0.28) {
      sim.autoAt = t
      present(auto === 'holiday' ? 'none' : sim.autoIdx++ % 2 === 0 ? 'both' : 'sight')
    }
    sim.shownW = lerp(sim.shownW, sim.w, ease(dt, 7))
    const last = sim.trials[sim.trials.length - 1]
    const age = last ? t - sim.at : 99
    const lit = clamp(1 - (age - 0.9) / 0.6, 0, 1)
    const k = last ? KINDS[last.kind] : KINDS.none
    sim.glow = lerp(sim.glow, last && last.a && age < 1.6 ? 1 : 0, ease(dt, 6))

    // ---- Top: the network ----
    const topH = Math.max(150, h * 0.42)
    const sx = Math.max(58, w * 0.16)
    const nx = w * 0.6
    const ox = Math.min(w - 44, w * 0.88)
    const y1 = topH * 0.3
    const y2 = topH * 0.74
    const ny = (y1 + y2) / 2
    const wire = (y: number, weight: number, on: boolean, color: string, lbl: string, up: boolean) => {
      ctx.strokeStyle = on ? color : 'rgba(148,163,184,0.45)'
      ctx.lineWidth = clamp(1 + weight * 1.6, 1, 14)
      ctx.globalAlpha = weight > 0.01 ? 1 : 0.5
      if (weight <= 0.01) ctx.setLineDash([4, 5])
      ctx.beginPath()
      ctx.moveTo(sx + 26, y)
      ctx.lineTo(nx - 26, ny)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      const mx = (sx + nx) / 2
      const my = (y + ny) / 2
      text(ctx, lbl, mx, my + (up ? -13 : 15), { color: on ? color : '#94a3b8', align: 'center' })
      if (on && age < 0.5) {
        const u = age / 0.5
        dot(ctx, lerp(sx + 26, nx - 26, u), lerp(y, ny, u), 5, '#f8fafc')
      }
    }
    wire(y1, W0, k.p0 === 1 && lit > 0, '#fbbf24', `w⁰ = ${W0} (fixed)`, true)
    wire(y2, sim.shownW, k.p === 1 && lit > 0, '#38bdf8', `w = ${sim.shownW.toFixed(2)} (learned)`, false)

    // Stimulus 1: a cup of filter coffee with steam
    const on0 = k.p0 === 1 ? lit : 0
    ctx.fillStyle = `rgba(251,191,36,${0.12 + on0 * 0.3})`
    ctx.beginPath()
    ctx.arc(sx, y1, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#92400e'
    ctx.fillRect(sx - 9, y1 - 2, 18, 13)
    ctx.fillStyle = '#d6a15c'
    ctx.fillRect(sx - 9, y1 - 2, 18, 3)
    ctx.strokeStyle = `rgba(253,230,138,${0.35 + on0 * 0.65})`
    ctx.lineWidth = 1.5
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      for (let s = 0; s <= 10; s++) {
        const yy = y1 - 5 - s * 1.5
        const xx = sx + i * 6 + Math.sin(t * 3 + s * 0.7 + i) * 2
        if (s === 0) ctx.moveTo(xx, yy)
        else ctx.lineTo(xx, yy)
      }
      ctx.stroke()
    }
    text(ctx, `smell p⁰ = ${last ? k.p0 : 0}`, sx, y1 + 34, { color: '#fbbf24', align: 'center' })
    // Stimulus 2: the steel tumbler
    const on1 = k.p === 1 ? lit : 0
    ctx.fillStyle = `rgba(56,189,248,${0.12 + on1 * 0.3})`
    ctx.beginPath()
    ctx.arc(sx, y2, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#cbd5e1'
    ctx.beginPath()
    ctx.moveTo(sx - 10, y2 - 11)
    ctx.lineTo(sx + 10, y2 - 11)
    ctx.lineTo(sx + 7, y2 + 11)
    ctx.lineTo(sx - 7, y2 + 11)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#64748b'
    ctx.fillRect(sx - 12, y2 - 13, 24, 3)
    text(ctx, `sight p = ${last ? k.p : 0}`, sx, y2 + 34, { color: '#38bdf8', align: 'center' })

    // Neuron
    ctx.fillStyle = `rgba(251,146,60,${0.15 + sim.glow * 0.55})`
    ctx.strokeStyle = sim.glow > 0.3 ? '#fb923c' : '#64748b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(nx, ny, 26 + sim.glow * 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    text(ctx, 'Σ', nx, ny - 7, { color: '#f8fafc', size: 15, align: 'center' })
    text(ctx, last ? `n=${last.n.toFixed(1)}` : 'n', nx, ny + 9, { color: '#e2e8f0', size: 10, align: 'center' })
    text(ctx, `b = ${B}`, nx, ny - 40, { align: 'center' })
    // Output
    ctx.strokeStyle = sim.glow > 0.3 ? '#fb923c' : 'rgba(148,163,184,0.45)'
    ctx.lineWidth = 2 + sim.glow * 2
    ctx.beginPath()
    ctx.moveTo(nx + 30, ny)
    ctx.lineTo(ox - 16, ny)
    ctx.stroke()
    // Drops: the mouth waters
    for (let i = 0; i < 3; i++) {
      const fall = sim.glow > 0.05 ? ((t * 1.4 + i / 3) % 1) * 14 : 0
      ctx.fillStyle = `rgba(125,211,252,${0.2 + sim.glow * 0.8})`
      ctx.beginPath()
      ctx.arc(ox - 8 + i * 8, ny - 4 + fall, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    text(ctx, `a = ${last ? last.a : 0}`, ox, ny - 22, { color: sim.glow > 0.3 ? '#fdba74' : '#94a3b8', align: 'center', bold: true })
    text(ctx, last && last.a ? 'mouth waters' : 'no response', ox, ny + 28, { color: '#94a3b8', align: 'center', size: 10 })

    // ---- Bottom: the weight over trials ----
    const first = sim.count - sim.trials.length
    const xMax = Math.max(20, sim.count)
    const xMin = Math.max(0, xMax - KEEP)
    let yMax = 2
    for (const tr of sim.trials) yMax = Math.max(yMax, tr.w * 1.15)
    const limit = hebbMax(alpha, g)
    if (Number.isFinite(limit)) yMax = Math.max(yMax, limit * 1.15)
    const pl = makePlot(w, h, [xMin, xMax], [0, yMax], { t: topH + 26, b: 46 })
    const nice = (m: number) => {
      const raw = m / 4
      const p10 = 10 ** Math.floor(Math.log10(raw))
      const s = [1, 2, 5, 10].find((v) => v * p10 >= raw)! * p10
      return Array.from({ length: Math.floor(m / s) + 1 }, (_, i) => +(i * s).toPrecision(6))
    }
    drawAxes(ctx, pl, {
      xTicks: nice(xMax - xMin).map((v) => v + xMin),
      yTicks: nice(yMax),
      xLabel: 'trial q',
      yLabel: 'weight w on the sight of the tumbler',
    })
    const hline = (y: number, color: string, lbl: string) => {
      if (y > yMax) return
      ctx.strokeStyle = color
      ctx.setLineDash([6, 5])
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(pl.left, pl.Y(y))
      ctx.lineTo(pl.right, pl.Y(y))
      ctx.stroke()
      ctx.setLineDash([])
      text(ctx, lbl, pl.right - 4, pl.Y(y) - 8, { color, align: 'right', size: 10 })
    }
    hline(0.5, '#fb923c', 'above 0.5 the tumbler alone is enough')
    if (Number.isFinite(limit)) hline(limit, '#34d399', `limit α/γ = ${limit.toFixed(1)}`)
    if (sim.w >= 1e6) text(ctx, 'weight has left the chart', pl.left + 8, pl.top + 24, { color: '#fb7185' })
    ctx.strokeStyle = '#7dd3fc'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pl.X(Math.max(xMin, first)), pl.Y(sim.trials[0]?.before ?? 0))
    sim.trials.forEach((tr, i) => {
      const isLast = i === sim.trials.length - 1
      const grow = isLast ? clamp(age / 0.3, 0, 1) : 1
      ctx.lineTo(pl.X(first + i + grow), pl.Y(lerp(tr.before, tr.w, grow)))
    })
    ctx.stroke()
    const dense = sim.trials.length > 70
    sim.trials.forEach((tr, i) => {
      const x = pl.X(first + i + 1)
      if (x < pl.left) return
      ctx.fillStyle = KINDS[tr.kind].color
      ctx.fillRect(x - (dense ? 1 : 3), pl.bottom + 18, dense ? 2 : 6, 6)
      if (!dense && i < sim.trials.length - 1) dot(ctx, x, pl.Y(tr.w), tr.a ? 4 : 3, tr.a ? '#fb923c' : '#475569')
    })
    if (last) dot(ctx, pl.X(sim.count), pl.Y(sim.shownW), 5 + Math.sin(t * 5), '#f8fafc')
    legend(
      ctx,
      [
        { color: KINDS.both.color, label: 'coffee + tumbler' },
        { color: KINDS.sight.color, label: 'tumbler only' },
        { color: KINDS.smell.color, label: 'smell only' },
        { color: KINDS.none.color, label: 'nothing' },
        { color: '#fb923c', label: 'dot: neuron fired' },
      ],
      pl.left,
      pl.bottom + 34,
      w - 6,
    )
  }

  const last = sim.trials[sim.trials.length - 1]
  const limit = hebbMax(alpha, g)
  const alone = associatorOutput(W0, 0, sim.w, 1, B).a === 1
  const happening = !last ? (
    <p>No trials yet. Tap a stimulus. The weight w on the sight of the tumbler starts at 0, so the tumbler alone does nothing.</p>
  ) : (
    <>
      <p>
        Trial {sim.count}: {KINDS[last.kind].label}. n = {W0}·{KINDS[last.kind].p0} + {last.before.toFixed(2)}·{KINDS[last.kind].p} − 0.5 ={' '}
        {last.n.toFixed(2)}, so a = {last.a} ({last.a ? 'the mouth waters' : 'no response'}).
      </p>
      <p>
        Δw = α·a·p{g > 0 ? ' − γ·w' : ''} = {alpha}·{last.a}·{KINDS[last.kind].p}
        {g > 0 ? ` − ${g}·${last.before.toFixed(2)}` : ''} = {(last.w - last.before).toFixed(2)}. Now w = {last.w.toFixed(2)}.{' '}
        {last.a && KINDS[last.kind].p
          ? 'Input and output were active together, so the link grew.'
          : g > 0 && last.before > 0
            ? 'Nothing fired together, so only the decay acted and the link faded.'
            : 'The weight did not grow, because the Hebb rule needs input and output active together.'}
      </p>
      <p>
        {alone ? 'The sight of the tumbler alone now triggers the response.' : 'The sight of the tumbler alone is not enough yet.'}{' '}
        {g > 0 ? `With decay the weight can never pass α/γ = ${limit.toFixed(1)}.` : 'With no decay nothing stops w from growing.'}
      </p>
    </>
  )

  return (
    <LabShell
      labId="pavlov"
      happening={happening}
      actions={{
        break: {
          label: 'Serve coffee every day, no decay',
          run: () => {
            setDecay(false)
            setAuto('college')
          },
        },
        fix: {
          label: 'Switch decay on (γ = 0.1)',
          run: () => {
            setDecay(true)
            setGamma(0.1)
            setAuto('college')
          },
        },
      }}
      panel={
        <>
          <Group title="Present a stimulus (one trial per tap)">
            <div className="grid grid-cols-2 gap-2">
              <Btn tone="go" onClick={() => { setAuto('off'); present('both') }}>Coffee in the tumbler</Btn>
              <Btn onClick={() => { setAuto('off'); present('sight') }}>Empty tumbler only</Btn>
              <Btn onClick={() => { setAuto('off'); present('smell') }}>Smell only</Btn>
              <Btn onClick={() => { setAuto('off'); present('none') }}>Nothing</Btn>
            </div>
            <Seg
              label="Or let the days run by themselves"
              value={auto}
              onChange={setAuto}
              options={[
                { value: 'off', label: 'Paused' },
                { value: 'college', label: 'College days' },
                { value: 'holiday', label: 'Holidays (nothing)' },
              ]}
            />
            <Btn
              onClick={() => {
                setAuto('off')
                Object.assign(sim, { w: 0, trials: [], count: 0, autoIdx: 0 })
              }}
            >
              Forget everything (w = 0)
            </Btn>
          </Group>
          <Group title="The learning rule">
            <Slider label="Learning rate α" value={alpha} min={0.1} max={1} step={0.1} onChange={setAlpha} fmt={(v) => v.toFixed(1)} />
            <Toggle
              label="Hebb rule with decay"
              hint="Every trial the weight also loses a share γ of itself"
              value={decay}
              onChange={setDecay}
            />
            {decay && <Slider label="Decay rate γ" value={gamma} min={0.02} max={0.5} step={0.02} onChange={setGamma} fmt={(v) => v.toFixed(2)} />}
          </Group>
          <Group title="Readings">
            <Stats>
              <Stat label="Trials" value={sim.count} />
              <Stat label="Weight w" value={sim.w >= 1e6 ? 'off the chart' : sim.w.toFixed(2)} tone={sim.w > 20 ? 'bad' : 'plain'} />
              <Stat label="Limit α/γ" value={Number.isFinite(limit) ? limit.toFixed(1) : 'none'} tone={Number.isFinite(limit) ? 'good' : 'warn'} />
              <Stat label="Tumbler alone" value={alone ? 'responds' : 'no response'} tone={alone ? 'good' : 'plain'} />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas2D draw={onDraw} />
    </LabShell>
  )
}
