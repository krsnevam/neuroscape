import { useRef, useState } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats } from '../../../ui/lab/controls'
import { hebbDecayVec, instarOutput, instarStep, outstarOutput, outstarStep } from '../../../engine/associative'
import { rng } from '../../../engine'
import { arrow, clamp, ease, lerp, pointerXY, text } from './kit'

// ---- Instar: recognise a ringtone from two normalised sound readings ----
const W0 = 2
const B = -0.9
const CALLERS = { anu: { name: 'Anu', deg: 55 }, mum: { name: 'Mum', deg: 140 }, unknown: { name: 'Unknown number', deg: 325 } }
type Caller = keyof typeof CALLERS
const unit = (deg: number) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)]
const len = (v: number[]) => Math.hypot(v[0], v[1])
const jitter = rng(31)

interface Ring {
  p: number[]
  p0: number
  n: number
  a: number
  before: number[]
  after: number[]
  at: number
}

// ---- Outstar: recall a 7 × 7 face from one cue ----
const face = (rows: string[]) => rows.join('').split('').map((c) => (c === '#' ? 1 : -1))
const FACES = {
  anu: face(['.#####.', '#.....#', '#.#.#.#', '#.....#', '#.#.#.#', '#..#..#', '.#####.']),
  ravi: face(['#######', '#.....#', '###.###', '#.....#', '#.....#', '#.###.#', '.#####.']),
}
type FaceId = keyof typeof FACES
const BLANK = new Array<number>(49).fill(0)
const match = (a: number[], f: number[]) => a.reduce((s, v, i) => s + v * f[i], 0) / 49

interface Recall {
  seen: FaceId | null
  cue: number
  at: number
  moved: number
}

interface Sim {
  w: number[]
  shownW: number[]
  ring: Ring | null
  queue: { deg: number; p0: number }[]
  queueAt: number
  rings: number
  wOut: number[]
  shownOut: number[]
  shownA: number[]
  a: number[]
  recall: Recall | null
  recalls: number
  outSeeded: boolean
  geo: { cx: number; cy: number; R: number }
}

const fresh = (): Sim => ({
  w: [0, 0],
  shownW: [0, 0],
  ring: null,
  queue: [
    { deg: 55, p0: 1 },
    { deg: 55, p0: 1 },
  ],
  queueAt: 0,
  rings: 0,
  wOut: BLANK.slice(),
  shownOut: BLANK.slice(),
  shownA: BLANK.slice(),
  a: BLANK.slice(),
  recall: null,
  recalls: 0,
  outSeeded: false,
  geo: { cx: 0, cy: 0, R: 1 },
})

export default function InstarOutstarLab() {
  const [mode, setMode] = useState<'instar' | 'outstar'>('instar')
  const [alpha, setAlpha] = useState(0.4)
  const [rule, setRule] = useState<'instar' | 'hebb'>('instar')
  const [deg, setDeg] = useState(CALLERS.anu.deg)
  const simRef = useRef<Sim | null>(null)
  if (!simRef.current) simRef.current = fresh()
  const sim = simRef.current
  const live = useRef({ alpha, rule })
  live.current = { alpha, rule }
  const dragging = useRef(false)
  useTicker(200)

  const ringOnce = (d: number, p0: number) => {
    const p = unit(d + (jitter() - 0.5) * 6)
    const before = sim.w.slice()
    const { n, a } = instarOutput(W0, p0, before, p, B)
    const { alpha: al, rule: ru } = live.current
    sim.w = ru === 'instar' ? instarStep(before, p, a, al) : hebbDecayVec(before, p, a, al, al)
    sim.ring = { p, p0, n, a, before, after: sim.w.slice(), at: performance.now() / 1000 }
    sim.rings++
  }

  const recallOnce = (seen: FaceId | null, cue: number) => {
    const a = outstarOutput(seen ? FACES[seen] : BLANK, sim.wOut, cue)
    const next = outstarStep(sim.wOut, a, cue, live.current.alpha)
    const moved = Math.sqrt(next.reduce((s, v, i) => s + (v - sim.wOut[i]) ** 2, 0) / 49)
    sim.wOut = next
    sim.a = a
    sim.recall = { seen, cue, at: performance.now() / 1000, moved }
    sim.recalls++
  }

  const drawInstar = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    if (sim.queue.length && t - sim.queueAt > 0.55) {
      sim.queueAt = t
      const q = sim.queue.shift()!
      ringOnce(q.deg, q.p0)
    }
    const k = ease(dt, 6)
    sim.shownW = [lerp(sim.shownW[0], sim.w[0], k), lerp(sim.shownW[1], sim.w[1], k)]
    const R = Math.max(60, Math.min(w * 0.36, h * 0.36))
    const cx = w / 2
    const cy = h * 0.54
    sim.geo = { cx, cy, R }
    const P = (v: number[]) => [cx + v[0] * R, cy - v[1] * R] as const
    const ring = sim.ring
    const age = ring ? t - ring.at : 99

    // Axes and the circle of normalised vectors
    ctx.strokeStyle = 'rgba(148,163,184,0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx - R * 1.2, cy)
    ctx.lineTo(cx + R * 1.2, cy)
    ctx.moveTo(cx, cy - R * 1.2)
    ctx.lineTo(cx, cy + R * 1.2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(148,163,184,0.45)'
    ctx.setLineDash([3, 5])
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    text(ctx, 'bass p₁ →', cx + R * 1.2, cy + 12, { align: 'right', size: 10 })
    text(ctx, '↑ treble p₂', cx + 6, cy - R * 1.2 + 4, { size: 10 })
    text(ctx, 'circle of length-1 vectors', cx - R * 0.72, cy + R * 0.86, { size: 10, align: 'center', color: '#64748b' })

    // Recognition wedge: inputs that fire the neuron with no help from p⁰
    const wl = len(sim.shownW)
    if (wl > -B) {
      const half = Math.acos(clamp(-B / wl, -1, 1))
      const dir = Math.atan2(sim.shownW[1], sim.shownW[0])
      ctx.fillStyle = 'rgba(52,211,153,0.16)'
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, R * 1.08, -(dir + half), -(dir - half))
      ctx.closePath()
      ctx.fill()
      text(ctx, 'fires alone in this wedge', cx + Math.cos(dir) * R * 1.16, cy - Math.sin(dir) * R * 1.16 - 12, {
        color: '#6ee7b7',
        size: 10,
        align: Math.cos(dir) > 0.3 ? 'left' : Math.cos(dir) < -0.3 ? 'right' : 'center',
      })
    }
    // Callers on the circle
    for (const c of Object.values(CALLERS)) {
      const [x, y] = P(unit(c.deg))
      dot(ctx, x, y, 4, '#64748b')
      const u = unit(c.deg)
      text(ctx, c.name, x + u[0] * 10, y - u[1] * 12, { size: 10, align: u[0] > 0.2 ? 'left' : u[0] < -0.2 ? 'right' : 'center', color: '#cbd5e1' })
    }
    // Input p: the tone about to ring (dragged), and the one that just rang
    const pNow = unit(deg)
    const [px, py] = P(pNow)
    arrow(ctx, cx, cy, px, py, 'rgba(251,191,36,0.9)', 2.5)
    dot(ctx, px, py, 7 + Math.sin(t * 4), 'rgba(251,191,36,0.35)')
    text(ctx, 'p', px + pNow[0] * 14 - 4, py - pNow[1] * 14 + 12, { color: '#fbbf24', bold: true, size: 13 })
    if (ring && age < 1.2) {
      const [rx, ry] = P(ring.p)
      ctx.strokeStyle = `rgba(251,191,36,${1 - age / 1.2})`
      ctx.lineWidth = 2
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(rx, ry, 8 + ((age * 40 + i * 12) % 36), 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    // The gap p − w and the step Δw
    const [wx, wy] = P(sim.shownW)
    if (ring && age < 2.5) {
      const [bx, by] = P(ring.before)
      const [rx, ry] = P(ring.p)
      ctx.strokeStyle = 'rgba(148,163,184,0.6)'
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(rx, ry)
      ctx.stroke()
      ctx.setLineDash([])
      const [ax, ay] = P(ring.after)
      if (Math.hypot(ax - bx, ay - by) > 3) {
        arrow(ctx, bx, by, ax, ay, '#34d399', 3)
        text(ctx, rule === 'instar' ? 'Δw = α a (p − w)' : 'Δw = α a p − γ w', (ax + bx) / 2 + 10, (ay + by) / 2 + 14, { color: '#6ee7b7', size: 10 })
      }
    }
    // Weight vector w
    arrow(ctx, cx, cy, wx, wy, '#818cf8', 4)
    text(ctx, 'w', wx - 16, wy - 4, { color: '#a5b4fc', bold: true, size: 13 })
    if (wl < 0.04) text(ctx, 'w = 0: nothing learned yet', cx, cy + 16, { color: '#a5b4fc', align: 'center', size: 10 })

    // Phone: is the name showing?
    const showing = ring && ring.p0 === 1 && age < 1.6
    const fx = 14
    const fy = 12
    ctx.fillStyle = '#0f172a'
    ctx.strokeStyle = showing ? '#fbbf24' : '#475569'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(fx + (showing ? Math.sin(t * 40) * 1.5 : 0), fy, 44, 70, 6)
    ctx.fill()
    ctx.stroke()
    text(ctx, showing ? 'Anu' : '', fx + 22, fy + 28, { color: '#fde68a', align: 'center', bold: true })
    text(ctx, showing ? 'calling' : 'dark', fx + 22, fy + 44, { color: showing ? '#fde68a' : '#475569', align: 'center', size: 9 })
    text(ctx, `name on screen p⁰ = ${ring && age < 1.6 ? ring.p0 : 0}`, fx, fy + 82, { size: 10 })
    // Output lamp
    const on = ring && ring.a === 1 && age < 1.6
    const lx = w - 40
    dot(ctx, lx, 40, 20, on ? 'rgba(52,211,153,0.9)' : 'rgba(71,85,105,0.5)')
    text(ctx, `a=${ring && age < 1.6 ? ring.a : 0}`, lx, 40, { color: on ? '#022c22' : '#cbd5e1', align: 'center', bold: true })
    text(ctx, on ? '"It is Anu"' : 'neuron silent', w - 12, 72, { align: 'right', size: 10, color: on ? '#6ee7b7' : '#94a3b8' })
    text(ctx, 'drag p around the circle', cx, h - 12, { align: 'center', size: 10, color: '#64748b' })
  }

  const drawOutstar = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    // Start alive: the first view of this half already shows one learning trial
    if (!sim.outSeeded) {
      sim.outSeeded = true
      recallOnce('anu', 1)
    }
    const k = ease(dt, 5)
    for (let i = 0; i < 49; i++) {
      sim.shownOut[i] = lerp(sim.shownOut[i], sim.wOut[i], k)
      sim.shownA[i] = lerp(sim.shownA[i], sim.a[i], k)
    }
    const rec = sim.recall
    const age = rec ? t - rec.at : 99
    const fade = clamp(1 - (age - 2.2) / 0.8, 0, 1)
    const g = Math.max(70, Math.min((w - 70) / 3.3, h * 0.44))
    const gap = (w - 3 * g) / 4
    const gy = h * 0.5 - g / 2 + 14
    const xs = [gap, gap * 2 + g, gap * 3 + g * 2]
    const grid = (x: number, vals: number[], strength: number, tint: [number, number, number]) => {
      const c = g / 7
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(x - 3, gy - 3, g + 6, g + 6)
      for (let i = 0; i < 49; i++) {
        const v = clamp((vals[i] * strength + 1) / 2, 0, 1)
        ctx.fillStyle = `rgb(${Math.round(lerp(22, tint[0], v))},${Math.round(lerp(30, tint[1], v))},${Math.round(lerp(48, tint[2], v))})`
        ctx.fillRect(x + (i % 7) * c + 0.5, gy + Math.floor(i / 7) * c + 0.5, c - 1, c - 1)
      }
    }
    const seen = rec?.seen ? FACES[rec.seen] : BLANK
    grid(xs[0], seen, fade, [251, 191, 36])
    grid(xs[1], sim.shownOut, 1, [129, 140, 248])
    grid(xs[2], sim.shownA, 1, [248, 250, 252])
    const small = w < 520
    text(ctx, small ? 'eyes see p⁰' : 'what the eyes see  p⁰', xs[0] + g / 2, gy + g + 16, { align: 'center', color: '#fbbf24', size: 10 })
    text(ctx, small ? 'weights w' : 'weights w leaving the cue', xs[1] + g / 2, gy + g + 16, { align: 'center', color: '#a5b4fc', size: 10 })
    text(ctx, small ? 'in mind a' : 'picture in mind  a', xs[2] + g / 2, gy + g + 16, { align: 'center', color: '#f8fafc', size: 10 })
    text(ctx, rec?.seen && fade > 0 ? (rec.seen === 'anu' ? 'Anu' : 'Ravi') : 'eyes closed', xs[0] + g / 2, gy + g + 30, { align: 'center', size: 10 })
    text(ctx, '+', xs[0] + g + gap / 2, gy + g / 2, { align: 'center', size: 18, color: '#e2e8f0' })
    text(ctx, '→', xs[1] + g + gap / 2, gy + g / 2 - 8, { align: 'center', size: 16, color: '#e2e8f0' })
    text(ctx, 'satlins', xs[1] + g + gap / 2, gy + g / 2 + 10, { align: 'center', size: 9 })
    // The cue above the weights
    const cueOn = rec && rec.cue === 1 ? fade : 0
    const qx = xs[1] + g / 2
    const qy = Math.max(30, gy - 48)
    ctx.strokeStyle = `rgba(165,180,252,${0.25 + cueOn * 0.75})`
    ctx.lineWidth = 1
    for (let i = 0; i < 7; i++) {
      ctx.beginPath()
      ctx.moveTo(qx, qy + 16)
      ctx.lineTo(xs[1] + (i + 0.5) * (g / 7), gy - 4)
      ctx.stroke()
    }
    dot(ctx, qx, qy, 17 + (cueOn > 0.5 ? Math.sin(t * 10) * 1.5 : 0), `rgba(129,140,248,${0.25 + cueOn * 0.75})`)
    text(ctx, `p=${rec && fade > 0 ? rec.cue : 0}`, qx, qy, { align: 'center', color: '#f8fafc', bold: true })
    text(ctx, small ? "cue: Anu's tone" : "cue: the instar says \"Anu's tone\"", qx, qy - 26, { align: 'center', size: 10, color: '#a5b4fc' })
    text(ctx, 'a = satlins(p⁰ + w p)      Δw = α (a − w) p', w / 2, h - 14, { align: 'center', size: 10, color: '#64748b' })
  }

  const wl = len(sim.w)
  const pNow = unit(deg)
  const wp = sim.w[0] * pNow[0] + sim.w[1] * pNow[1]
  const ring = sim.ring
  const rec = sim.recall
  const mAnu = match(sim.wOut, FACES.anu)
  const mRavi = match(sim.wOut, FACES.ravi)
  const happening =
    mode === 'instar' ? (
      !ring ? (
        <p>The weight vector w is at 0. Ring Anu's tone with her name on the screen to start learning.</p>
      ) : (
        <>
          <p>
            The phone rang with p = [{ring.p[0].toFixed(2)}, {ring.p[1].toFixed(2)}] and p⁰ = {ring.p0}. n = {W0}·{ring.p0} + wᵀp − 0.9 ={' '}
            {ring.n.toFixed(2)}, so a = {ring.a}.
          </p>
          <p>
            {ring.a
              ? `The neuron was active, so w moved α = ${alpha} of the way toward p: from [${ring.before.map((v) => v.toFixed(2)).join(', ')}] to [${ring.after.map((v) => v.toFixed(2)).join(', ')}].`
              : rule === 'instar'
                ? 'The neuron stayed silent, so the instar rule changed nothing: Δw = α·0·(p − w) = 0.'
                : `The neuron stayed silent, but the decay still acted: w shrank by γ = ${alpha} of its length, to ${len(ring.after).toFixed(2)}.`}
          </p>
          <p>
            {wl > -B
              ? `w has length ${wl.toFixed(2)}. Any tone inside the green wedge now fires the neuron without the name.`
              : `w has length ${wl.toFixed(2)}, below 0.9, so no tone can fire the neuron without the name on screen.`}
          </p>
        </>
      )
    ) : !rec ? (
      <p>The weights leaving the cue are all 0, so hearing the tone brings nothing to mind. Let the tone ring while you see Anu.</p>
    ) : (
      <>
        <p>
          {rec.cue ? 'The tone rang (p = 1)' : 'No tone (p = 0)'} and the eyes saw {rec.seen ? (rec.seen === 'anu' ? "Anu's face" : "Ravi's face") : 'nothing (p⁰ = 0)'}.
          The picture in mind is a = satlins(p⁰ + w·p).
        </p>
        <p>
          {rec.cue
            ? rec.moved > 0.005
              ? `The cue was active, so every weight moved α = ${alpha} of the way toward a.`
              : 'The cue was active, but a already equals w, so nothing changed.'
            : 'The cue was silent, so the outstar rule changed nothing: Δw = α (a − w)·0 = 0.'}{' '}
          The weights now match Anu's face {Math.round(Math.max(0, mAnu) * 100)}% and Ravi's {Math.round(Math.max(0, mRavi) * 100)}%.
        </p>
      </>
    )

  const teach = () => {
    sim.w = unit(CALLERS.anu.deg)
    sim.queue = Array.from({ length: 12 }, (_, i) => ({ deg: i % 2 ? CALLERS.mum.deg : CALLERS.unknown.deg, p0: 0 }))
    setMode('instar')
    setAlpha(0.2)
  }

  return (
    <LabShell
      labId="instar-outstar"
      happening={happening}
      actions={{
        break: { label: 'Hebb with decay, 12 calls from others', run: () => { setRule('hebb'); teach() } },
        fix: { label: 'Instar rule, the same 12 calls', run: () => { setRule('instar'); teach() } },
      }}
      panel={
        <>
          <Group title="Which half of the story?">
            <Seg
              value={mode}
              onChange={setMode}
              options={[
                { value: 'instar', label: 'Recognise (instar)' },
                { value: 'outstar', label: 'Recall (outstar)' },
              ]}
            />
            <Slider label="Learning rate α" value={alpha} min={0.1} max={1} step={0.1} onChange={setAlpha} fmt={(v) => v.toFixed(1)} />
          </Group>
          {mode === 'instar' ? (
            <>
              <Group title="Ring the phone (one trial per tap)">
                <Seg
                  label="Whose tone is p? Or drag p on the circle"
                  value={(Object.keys(CALLERS) as Caller[]).find((c) => CALLERS[c].deg === deg) ?? ('' as Caller)}
                  onChange={(c) => setDeg(CALLERS[c].deg)}
                  options={(Object.keys(CALLERS) as Caller[]).map((c) => ({ value: c, label: CALLERS[c].name }))}
                />
                <div className="flex flex-wrap gap-2">
                  <Btn tone="go" onClick={() => ringOnce(deg, 1)}>Ring, Anu's name on screen (p⁰ = 1)</Btn>
                  <Btn onClick={() => ringOnce(deg, 0)}>Ring, screen face down (p⁰ = 0)</Btn>
                  <Btn onClick={() => Object.assign(sim, { w: [0, 0], ring: null, queue: [], rings: 0 })}>Forget (w = 0)</Btn>
                </div>
                <Seg
                  label="Learning rule"
                  value={rule}
                  onChange={setRule}
                  options={[
                    { value: 'instar', label: 'Instar' },
                    { value: 'hebb', label: 'Hebb with decay (γ = α)' },
                  ]}
                />
              </Group>
              <Group title="Readings">
                <Stats>
                  <Stat label="Length of w" value={wl.toFixed(2)} tone={wl > -B ? 'good' : 'plain'} />
                  <Stat label="wᵀp for this tone" value={wp.toFixed(2)} />
                  <Stat label="Fires without name" value={wp + B >= 0 ? 'yes' : 'no'} tone={wp + B >= 0 ? 'good' : 'plain'} />
                  <Stat label="Rings so far" value={sim.rings} />
                </Stats>
              </Group>
            </>
          ) : (
            <>
              <Group title="What happens (one trial per tap)">
                <div className="flex flex-wrap gap-2">
                  <Btn tone="go" onClick={() => recallOnce('anu', 1)}>Tone rings and you see Anu</Btn>
                  <Btn onClick={() => recallOnce(null, 1)}>Tone rings, eyes closed</Btn>
                  <Btn onClick={() => recallOnce('anu', 0)}>You see Anu, no tone</Btn>
                  <Btn tone="warn" onClick={() => recallOnce('ravi', 1)}>Tone rings but you see Ravi</Btn>
                  <Btn onClick={() => Object.assign(sim, { wOut: BLANK.slice(), a: BLANK.slice(), recall: null, recalls: 0 })}>Forget (w = 0)</Btn>
                </div>
              </Group>
              <Group title="Readings">
                <Stats>
                  <Stat label="Weights match Anu" value={`${Math.round(Math.max(0, mAnu) * 100)}%`} tone={mAnu > 0.8 ? 'good' : 'plain'} />
                  <Stat label="Weights match Ravi" value={`${Math.round(Math.max(0, mRavi) * 100)}%`} />
                  <Stat label="Trials" value={sim.recalls} />
                  <Stat label="Last change in w" value={rec ? rec.moved.toFixed(3) : '0'} />
                </Stats>
              </Group>
            </>
          )}
        </>
      }
    >
      <Canvas2D
        draw={mode === 'instar' ? drawInstar : drawOutstar}
        className={mode === 'instar' ? 'cursor-grab touch-none' : ''}
        onPointerDown={(e) => {
          if (mode !== 'instar') return
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          const { x, y } = pointerXY(e)
          setDeg(Math.round(((Math.atan2(sim.geo.cy - y, x - sim.geo.cx) * 180) / Math.PI + 360) % 360))
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return
          const { x, y } = pointerXY(e)
          setDeg(Math.round(((Math.atan2(sim.geo.cy - y, x - sim.geo.cx) * 180) / Math.PI + 360) % 360))
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      />
    </LabShell>
  )
}
