import { useMemo, useState } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, drawAxes, makePlot, useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { gauss, rng, type Vec } from '../../../engine'
import { distance } from '../../../engine/competitive'
import { lvqAccuracy, lvqStep, lvqWinner, type Lvq } from '../../../engine/lvq'
import { arrow, clamp, text } from './kit'

const CLASSES = [
  { name: 'genuine', color: '#38bdf8', rgb: [56, 189, 248] },
  { name: 'spam', color: '#fb7185', rgb: [251, 113, 133] },
]
const CLUSTERS = [
  { name: 'friends', c: [0.2, 0.2], t: 0 },
  { name: 'newsletters', c: [0.5, 0.5], t: 0 },
  { name: 'promotions', c: [0.82, 0.2], t: 1 },
  { name: 'scams', c: [0.2, 0.82], t: 1 },
]
interface Mail {
  p: Vec
  t: number
}
const MAIL: Mail[] = (() => {
  const rand = rng(12)
  return Array.from({ length: 160 }, (_, i) => {
    const g = CLUSTERS[i % 4]
    return { p: [g.c[0] + gauss(rand) * 0.07, g.c[1] + gauss(rand) * 0.07].map((v) => clamp(v, 0.02, 0.98)), t: g.t }
  })
})()
/** Both genuine prototypes sit on their clusters; both spam prototypes start in the promotions corner. */
const BAD_START = [[0.2, 0.2], [0.5, 0.5], [0.82, 0.2], [0.95, 0.05]]
const N = 56

type Speed = 'slow' | 'normal' | 'fast'
interface Last {
  d: Mail
  win: number
  correct: boolean
  helper: number
  gap: number
  before: Vec
}
interface Sim {
  net: Lvq
  rand: () => number
  t: number
  frame: number
  last: Last | null
  recent: number[]
  shade: HTMLCanvasElement | null
}

export default function LvqLab() {
  const [K, setK] = useState(2)
  const [alpha, setAlpha] = useState(0.05)
  const [lvq2, setLvq2] = useState(false)
  const [bad, setBad] = useState(false)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [version, setVersion] = useState(0)
  useTicker(250)

  const sim = useMemo<Sim>(() => {
    const rand = rng(version * 5 + K * 3 + 1)
    const classOf = Array.from({ length: 2 * K }, (_, i) => (i < K ? 0 : 1))
    const w = bad && K === 2 ? BAD_START.map((v) => v.slice()) : classOf.map(() => [0.4 + rand() * 0.2, 0.4 + rand() * 0.2])
    return { net: { w, classOf }, rand, t: 0, frame: 0, last: null, recent: [], shade: null }
  }, [K, bad, version])
  const restart = () => setVersion((v) => v + 1)

  const stepOnce = () => {
    const d = MAIL[Math.floor(sim.rand() * MAIL.length)]
    const win = lvqWinner(sim.net, d.p)
    const before = sim.net.w[win].slice()
    const gap = distance(before, d.p)
    const r = lvqStep(sim.net, d.p, d.t, alpha, lvq2)
    // A prototype that keeps being pushed away could leave the picture; keep it near the map
    for (const w of sim.net.w) for (let k = 0; k < 2; k++) w[k] = clamp(w[k], -0.3, 1.3)
    sim.last = { d, win, correct: r.correct, helper: r.helper, gap, before }
    sim.recent.push(r.correct ? 1 : 0)
    if (sim.recent.length > 50) sim.recent.shift()
    sim.t++
  }

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    sim.frame++
    if (speed === 'fast') for (let k = 0; k < 8; k++) stepOnce()
    else if (sim.frame % (speed === 'slow' ? 45 : 3) === 0) stepOnce()

    const pl = makePlot(w, h, [0, 1], [0, 1], { t: 16, b: 50 })
    // Decision regions from the nearest prototype
    if (!sim.shade) {
      sim.shade = document.createElement('canvas')
      sim.shade.width = N
      sim.shade.height = N
    }
    if (sim.frame % 4 === 1) {
      const sctx = sim.shade.getContext('2d')!
      const img = sctx.createImageData(N, N)
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const c = CLASSES[sim.net.classOf[lvqWinner(sim.net, [(i + 0.5) / N, 1 - (j + 0.5) / N])]].rgb
          const o = (j * N + i) * 4
          img.data[o] = c[0]
          img.data[o + 1] = c[1]
          img.data[o + 2] = c[2]
          img.data[o + 3] = 52
        }
      sctx.putImageData(img, 0, 0)
    }
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(sim.shade, pl.left, pl.top, pl.right - pl.left, pl.bottom - pl.top)
    drawAxes(ctx, pl, {
      xTicks: [0, 0.2, 0.4, 0.6, 0.8, 1],
      yTicks: [0, 0.25, 0.5, 0.75, 1],
      xFmt: (v) => String(Math.round(v * 10)),
      yFmt: (v) => `${Math.round(v * 100)}%`,
      xLabel: 'links in the message',
      yLabel: 'share of CAPITAL letters',
    })
    for (const c of CLUSTERS) text(ctx, c.name, pl.X(c.c[0]), pl.Y(c.c[1] + 0.13), { align: 'center', size: 10, color: 'rgba(226,232,240,0.55)' })
    for (const m of MAIL) dot(ctx, pl.X(m.p[0]), pl.Y(m.p[1]), 3, CLASSES[m.t].color)

    const last = sim.last
    if (last) {
      const x = pl.X(last.d.p[0])
      const y = pl.Y(last.d.p[1])
      const wv = sim.net.w[last.win]
      const tone = last.correct ? '#34d399' : '#f87171'
      ctx.strokeStyle = 'rgba(248,250,252,0.6)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(pl.X(wv[0]), pl.Y(wv[1]))
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = '#f8fafc'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, 7 + Math.sin(t * 8), 0, Math.PI * 2)
      ctx.stroke()
      // The direction of the step, drawn longer than the real step so it can be seen
      const bx = pl.X(last.before[0])
      const by = pl.Y(last.before[1])
      const len = Math.hypot(x - bx, y - by) || 1
      const s = last.correct ? 1 : -1
      arrow(ctx, bx, by, bx + (s * (x - bx) * 26) / len, by + (s * (y - by) * 26) / len, tone, 3)
      if (last.helper >= 0) {
        const hv = sim.net.w[last.helper]
        const hx = pl.X(hv[0])
        const hy = pl.Y(hv[1])
        const hl = Math.hypot(x - hx, y - hy) || 1
        arrow(ctx, hx, hy, hx + ((x - hx) * 26) / hl, hy + ((y - hy) * 26) / hl, '#34d399', 3, [5, 4])
      }
    }
    // Prototypes: diamonds in their class colour, numbered as subclasses
    sim.net.w.forEach((wv, i) => {
      const x = clamp(pl.X(wv[0]), pl.left - 20, pl.right + 8)
      const y = clamp(pl.Y(wv[1]), pl.top - 8, pl.bottom + 14)
      const r = last?.win === i ? 12 : 10
      ctx.beginPath()
      ctx.moveTo(x, y - r)
      ctx.lineTo(x + r, y)
      ctx.lineTo(x, y + r)
      ctx.lineTo(x - r, y)
      ctx.closePath()
      ctx.fillStyle = CLASSES[sim.net.classOf[i]].color
      ctx.fill()
      ctx.strokeStyle = '#020617'
      ctx.lineWidth = 2
      ctx.stroke()
      text(ctx, String(i + 1), x, y + 0.5, { align: 'center', color: '#020617', bold: true })
    })
    text(ctx, '● message   ◆ prototype (subclass)   shading = the answer the network gives there', pl.left, h - 10, { size: 10, color: '#64748b' })
  }

  const acc = lvqAccuracy(sim.net, MAIL)
  const last = sim.last
  const S1 = 2 * K
  const happening = !last ? (
    <p>Starting. One labelled message at a time is shown to the {S1} prototypes.</p>
  ) : (
    <>
      <p>
        This message has {Math.round(last.d.p[0] * 10)} links and {Math.round(last.d.p[1] * 100)}% capitals. Its label is {CLASSES[last.d.t].name}.
        Prototype {last.win + 1} is the closest (distance {last.gap.toFixed(2)}), so it wins.
      </p>
      <p>
        W² says prototype {last.win + 1} belongs to {CLASSES[sim.net.classOf[last.win]].name}.{' '}
        {last.correct
          ? `That matches the label, so it moves α = ${alpha.toFixed(2)} of the gap toward the message (green arrow).`
          : `That is the wrong class, so it moves α = ${alpha.toFixed(2)} of the gap away from the message (red arrow).`}
        {last.helper >= 0 ? ` LVQ2 also pulls prototype ${last.helper + 1}, the closest ${CLASSES[last.d.t].name} one, toward it (dashed arrow).` : ''}
      </p>
      <p>
        The network now labels {Math.round(acc * 100)}% of the {MAIL.length} messages correctly.{' '}
        {K === 1
          ? 'With one prototype per class, each class gets one region around a single point, and that cannot cover two separate clusters.'
          : acc < 0.9
            ? 'Some cluster has no prototype of its own class nearby yet.'
            : 'Each cluster has a prototype of its own class.'}
      </p>
    </>
  )

  return (
    <LabShell
      labId="lvq"
      happening={happening}
      actions={{
        break: { label: 'One prototype per class', run: () => { setBad(false); setK(1); restart() } },
        fix: { label: 'Two subclasses per class', run: () => { setBad(false); setK(2); restart() } },
      }}
      panel={
        <>
          <Group title="The network">
            <Slider label="Subclasses per class" value={K} min={1} max={3} onChange={(v) => { setBad(false); setK(v) }} fmt={(v) => `${v} (S¹ = ${2 * v} prototypes)`} />
            <Slider label="Learning rate α" value={alpha} min={0.01} max={0.5} step={0.01} onChange={setAlpha} fmt={(v) => v.toFixed(2)} />
            <Toggle
              label="LVQ2"
              hint="When the winner is wrong, also pull the closest prototype of the right class"
              value={lvq2}
              onChange={setLvq2}
            />
            <Seg
              label="Speed"
              value={speed}
              onChange={setSpeed}
              options={[
                { value: 'slow', label: 'One by one' },
                { value: 'normal', label: 'Normal' },
                { value: 'fast', label: 'Fast' },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => { setBad(false); restart() }}>Restart near the middle</Btn>
              <Btn tone="warn" onClick={() => { setK(2); setBad(true); restart() }}>Bad start</Btn>
            </div>
            <p className="text-[11px] text-slate-500">
              Bad start: both spam prototypes begin in the promotions corner. To reach the scams one of them must cross genuine mail. Try it with LVQ2 off, then on.
            </p>
          </Group>
          <Group title="Readings">
            <Stats>
              <Stat label="Correct, all mail" value={`${Math.round(acc * 100)}%`} tone={acc > 0.95 ? 'good' : acc < 0.8 ? 'bad' : 'warn'} />
              <Stat label="Right in last 50" value={`${sim.recent.reduce((s, v) => s + v, 0)} of ${sim.recent.length}`} />
              <Stat label="Learned weights S¹ × R" value={`${S1} × 2 = ${S1 * 2}`} />
              <Stat label="Messages shown" value={sim.t} />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas2D draw={onDraw} />
      <div className="pointer-events-none absolute right-3 top-5 rounded-lg border border-white/10 bg-slate-950/85 p-2 font-mono text-[10px] text-slate-300">
        <div className="mb-1 text-[9px] uppercase tracking-widest text-slate-500">W² · subclass → class (fixed)</div>
        <div className="flex gap-1 pl-[58px] text-slate-500">
          {sim.net.classOf.map((_, i) => (
            <span key={i} className="w-4 text-center">{i + 1}</span>
          ))}
        </div>
        {CLASSES.map((c, k) => (
          <div key={c.name} className="flex items-center gap-1">
            <span className="w-[54px]" style={{ color: c.color }}>{c.name}</span>
            {sim.net.classOf.map((cls, i) => (
              <span
                key={i}
                className="grid h-4 w-4 place-items-center rounded-[3px]"
                style={{
                  background: cls === k ? c.color : 'rgba(255,255,255,0.06)',
                  color: cls === k ? '#020617' : '#64748b',
                  outline: last?.win === i && cls === k ? '2px solid #f8fafc' : 'none',
                }}
              >
                {cls === k ? 1 : 0}
              </span>
            ))}
          </div>
        ))}
      </div>
    </LabShell>
  )
}
