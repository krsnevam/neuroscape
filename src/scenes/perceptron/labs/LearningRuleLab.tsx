import { useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { drawAxes, useTicker, type Plot } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { rng, shuffle } from '../../../engine'
import { countErrors, perceptronStep, trainPerceptron, type Perceptron } from '../../../engine/perceptron'
import { arrow, clamp, drawBoundary, ease, lerp, nearest, num, pointerPos, sgn, shadeSide, squarePlot, tag, vec, Scene } from './kit'

interface Pt {
  p: [number, number]
  t: 0 | 1
}
type SetId = 'sms' | 'book'

interface DataSet {
  pts: Pt[]
  w0: [number, number]
  b0: number
  useBias: boolean
  range: [number, number]
  ticks: number[]
  xLabel: string
  yLabel: string
  one: string
  zero: string
  thing: string
}

const sets: Record<SetId, DataSet> = {
  // Each dot is one sender: [average links per SMS, average words in CAPITALS per SMS]
  sms: {
    pts: (
      [
        [3, 4, 1], [0.5, 1, 0], [4, 3, 1], [1, 0.5, 0], [4.5, 5, 1], [1.5, 2, 0], [3.5, 5.5, 1], [0.5, 2.5, 0],
        [5, 4, 1], [2, 1, 0], [2.5, 5, 1], [1, 3, 0], [5.5, 2.5, 1], [2.5, 0.5, 0], [4, 4.5, 1], [2, 2.5, 0],
      ] as [number, number, 0 | 1][]
    ).map(([a, c, t]) => ({ p: [a, c], t })),
    w0: [1, -0.8],
    b0: 0,
    useBias: true,
    range: [-1.5, 7],
    ticks: [0, 2, 4, 6],
    xLabel: 'links per SMS (p₁)',
    yLabel: 'words in CAPITALS per SMS (p₂)',
    one: 'spam',
    zero: 'genuine',
    thing: 'Sender',
  },
  // The three-point test problem from the textbook chapter on the perceptron rule (no bias)
  book: {
    pts: [
      { p: [1, 2], t: 1 },
      { p: [-1, 2], t: 0 },
      { p: [0, -1], t: 0 },
    ],
    w0: [1, -0.8],
    b0: 0,
    useBias: false,
    range: [-2.6, 3.6],
    ticks: [-2, -1, 0, 1, 2, 3],
    xLabel: 'p₁',
    yLabel: 'p₂',
    one: 'class t = 1',
    zero: 'class t = 0',
    thing: 'Point',
  },
}

interface Anim {
  t0: number
  dur: number
  idx: number
  n: number
  a: number
  e: number
  W0: [number, number]
  b0: number
  W1: [number, number]
  b1: number
  alpha: number
}

function makeSim(id: SetId) {
  const d = sets[id]
  return {
    id,
    net: { W: [[...d.w0]], b: [d.b0] } as Perceptron,
    pts: d.pts.map((s) => ({ p: [...s.p] as [number, number], t: s.t })),
    order: d.pts.map((_, i) => i),
    pos: 0,
    presented: 0,
    updates: 0,
    clean: 0,
    anim: null as Anim | null,
    last: null as Anim | null,
    log: [] as string[],
    rand: rng(5),
    nudged: -1,
    nudgeGap: 0,
  }
}

const ONE = '#fb923c'
const ZERO = '#38bdf8'
const WCOL = '#f472b6'

export default function LearningRuleLab() {
  const [setId, setSetId] = useState<SetId>('sms')
  const [auto, setAuto] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [alpha, setAlpha] = useState(1)
  const [mixed, setMixed] = useState(false)
  const simRef = useRef(makeSim('sms'))
  const plot = useRef<Plot | null>(null)
  const dragging = useRef(-1)
  const wait = useRef(0)
  useTicker(150)
  const sim = simRef.current
  const data = sets[sim.id]

  const samples = () => sim.pts.map((s) => ({ p: s.p, t: [s.t] }))
  const wrong = countErrors(sim.net, samples())
  const converged = sim.clean >= sim.pts.length && wrong === 0
  const W = sim.net.W[0]
  const b = sim.net.b[0]
  const wLen = Math.hypot(W[0], W[1])
  const gaps = sim.pts.map((s) => (wLen > 0 ? Math.abs(W[0] * s.p[0] + W[1] * s.p[1] + b) / wLen : 0))
  const closest = gaps.indexOf(Math.min(...gaps))

  const reset = (id: SetId = sim.id) => {
    simRef.current = makeSim(id)
    setSetId(id)
  }

  const present = () => {
    const s = simRef.current
    const idx = s.order[s.pos]
    s.pos++
    if (s.pos >= s.order.length) {
      s.pos = 0
      if (mixed) s.order = shuffle(s.order, s.rand)
    }
    const pt = s.pts[idx]
    const W0: [number, number] = [s.net.W[0][0], s.net.W[0][1]]
    const b0 = s.net.b[0]
    const r = perceptronStep(s.net, { p: pt.p, t: [pt.t] }, alpha, sets[s.id].useBias)
    s.presented++
    if (r.changed) {
      s.updates++
      s.clean = 0
    } else s.clean++
    const a: Anim = {
      t0: performance.now() / 1000,
      dur: (r.changed ? 1.7 : 0.7) / speed,
      idx,
      n: r.n[0],
      a: r.a[0],
      e: r.e[0],
      W0,
      b0,
      W1: [s.net.W[0][0], s.net.W[0][1]],
      b1: s.net.b[0],
      alpha,
    }
    s.anim = a
    s.last = a
    if (r.changed)
      s.log = [
        `${s.updates}. p = ${vec(pt.p, 1)}, e = ${sgn(a.e, 0)}: w = ${vec(a.W1, 1)}${sets[s.id].useBias ? `, b = ${num(a.b1, 1)}` : ''}`,
        ...s.log,
      ].slice(0, 5)
  }

  const onDraw = (ctx: CanvasRenderingContext2D, cw: number, ch: number, t: number, dt: number) => {
    const s = simRef.current
    const d = sets[s.id]
    let an = s.anim
    if (an && t - an.t0 > an.dur) {
      s.anim = null
      an = null
      wait.current = 0.25 / speed
    }
    const isDone = s.clean >= s.pts.length
    if (!an && auto && !isDone && dragging.current < 0) {
      wait.current -= dt
      if (wait.current <= 0) present()
      an = s.anim
    }
    const ph = an ? clamp((t - an.t0) / an.dur, 0, 1) : 1
    const swing = an ? ease((ph - 0.62) / 0.38) : 1
    const dw = an ? [lerp(an.W0[0], an.W1[0], swing), lerp(an.W0[1], an.W1[1], swing)] : s.net.W[0]
    const db = an ? lerp(an.b0, an.b1, swing) : s.net.b[0]

    const pl = squarePlot(cw, ch, d.range, d.range)
    plot.current = pl
    shadeSide(ctx, pl, dw, db, 'rgba(251,146,60,0.09)')
    drawAxes(ctx, pl, { xTicks: d.ticks, yTicks: d.ticks, xLabel: d.xLabel, yLabel: d.yLabel })
    // Axis lines through the origin: w is drawn from there
    ctx.strokeStyle = 'rgba(148,163,184,0.45)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pl.X(0), pl.top)
    ctx.lineTo(pl.X(0), pl.bottom)
    ctx.moveTo(pl.left, pl.Y(0))
    ctx.lineTo(pl.right, pl.Y(0))
    ctx.stroke()
    drawBoundary(ctx, pl, dw, db, { color: '#f8fafc', width: 2.5, glow: true })

    s.pts.forEach((pt, i) => {
      const x = pl.X(pt.p[0])
      const y = pl.Y(pt.p[1])
      ctx.fillStyle = pt.t === 1 ? ONE : ZERO
      ctx.beginPath()
      if (pt.t === 1) ctx.arc(x, y, 6, 0, Math.PI * 2)
      else ctx.rect(x - 5.2, y - 5.2, 10.4, 10.4)
      ctx.fill()
      const a = dw[0] * pt.p[0] + dw[1] * pt.p[1] + db >= 0 ? 1 : 0
      if (a !== pt.t) {
        ctx.beginPath()
        ctx.arc(x, y, 10.5 + 1.2 * Math.sin(t * 6 + i), 0, Math.PI * 2)
        ctx.strokeStyle = '#fb7185'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      if (i === s.nudged) tag(ctx, 'nudged', x + 12, y + 14, '#fda4af', 'left', pl)
    })

    const ox = pl.X(0)
    const oy = pl.Y(0)
    if (an) {
      const pt = s.pts[an.idx]
      const x = pl.X(pt.p[0])
      const y = pl.Y(pt.p[1])
      // The presented sample pulses, and its vector p is drawn from the origin
      const pulse = 13 + 5 * Math.abs(Math.sin((t - an.t0) * 7 * speed))
      ctx.beginPath()
      ctx.arc(x, y, pulse, 0, Math.PI * 2)
      ctx.strokeStyle = an.e === 0 ? '#34d399' : '#f8fafc'
      ctx.lineWidth = 2.5
      ctx.stroke()
      arrow(ctx, ox, oy, x, y, 'rgba(248,250,252,0.75)', 1.6, [5, 4])
      tag(ctx, 'p', (ox + x) / 2 + 8, (oy + y) / 2 - 8, '#f8fafc', 'left', pl)
      if (an.e !== 0) {
        // e·p is carried to the tip of the old w and added there
        const grow = ease((ph - 0.22) / 0.36)
        const col = an.e > 0 ? '#34d399' : '#fb7185'
        const wx = pl.X(an.W0[0])
        const wy = pl.Y(an.W0[1])
        const ex = pl.X(an.W0[0] + an.alpha * an.e * pt.p[0] * grow)
        const ey = pl.Y(an.W0[1] + an.alpha * an.e * pt.p[1] * grow)
        ctx.save()
        ctx.beginPath()
        ctx.rect(pl.left, pl.top, pl.right - pl.left, pl.bottom - pl.top)
        ctx.clip()
        arrow(ctx, ox, oy, wx, wy, 'rgba(244,114,182,0.35)', 2.5)
        if (grow > 0) arrow(ctx, wx, wy, ex, ey, col, 2.5)
        ctx.restore()
        if (grow > 0.3) tag(ctx, an.e > 0 ? '+ p' : '− p', (wx + ex) / 2 + 8, (wy + ey) / 2 + 12, col, 'left', pl)
      }
      const head =
        an.e === 0
          ? `t = ${pt.t}, a = ${an.a}: e = 0, leave w alone`
          : an.e > 0
            ? `t = 1, a = 0: e = +1, add p to w`
            : `t = 0, a = 1: e = −1, subtract p from w`
      tag(ctx, head, (pl.left + pl.right) / 2, pl.top + 30, an.e === 0 ? '#6ee7b7' : an.e > 0 ? '#6ee7b7' : '#fda4af', 'center', pl)
    } else if (isDone) {
      tag(ctx, `one full pass with e = 0 every time: training has stopped`, (pl.left + pl.right) / 2, pl.top + 30, '#6ee7b7', 'center', pl)
    }

    // w from the origin
    const wx = pl.X(dw[0])
    const wy = pl.Y(dw[1])
    ctx.save()
    ctx.beginPath()
    ctx.rect(pl.left, pl.top, pl.right - pl.left, pl.bottom - pl.top)
    ctx.clip()
    arrow(ctx, ox, oy, wx, wy, WCOL, 3.5)
    ctx.restore()
    tag(ctx, `w = ${vec(dw, 1)}`, clamp(wx, pl.left, pl.right) + 10, clamp(wy, pl.top, pl.bottom) - 10, '#f9a8d4', 'left', pl)
  }

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const pl = plot.current
    if (!pl) return
    const [x, y] = pointerPos(e)
    const i = nearest(sim.pts.map((s) => [pl.X(s.p[0]), pl.Y(s.p[1])]), x, y)
    if (i < 0) return
    dragging.current = i
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const pl = plot.current
    const i = dragging.current
    if (i < 0 || !pl) return
    const [x, y] = pointerPos(e)
    const lo = data.range[0] + 0.3
    const hi = data.range[1] - 0.3
    sim.pts[i].p = [Math.round(clamp(pl.ix(x), lo, hi) * 10) / 10, Math.round(clamp(pl.iy(y), lo, hi) * 10) / 10]
    sim.clean = 0
    sim.anim = null
    sim.nudged = -1
  }
  const onUp = () => (dragging.current = -1)

  /** Break: finish training, then push the sender nearest the line just across it. */
  const nudge = () => {
    const s = simRef.current
    s.anim = null
    trainPerceptron(s.net, samples(), 500, alpha, data.useBias)
    const w = s.net.W[0]
    const m = Math.hypot(w[0], w[1])
    if (m === 0) return
    let k = 0
    let best = Infinity
    s.pts.forEach((pt, i) => {
      const g = Math.abs(w[0] * pt.p[0] + w[1] * pt.p[1] + s.net.b[0]) / m
      if (g < best) {
        best = g
        k = i
      }
    })
    const pt = s.pts[k]
    const side = pt.t === 1 ? -1 : 1 // step towards the other class
    const step = best + 0.15
    pt.p = [pt.p[0] + (side * step * w[0]) / m, pt.p[1] + (side * step * w[1]) / m]
    s.nudged = k
    s.nudgeGap = best
    s.clean = 0
    s.last = null
    setAuto(false)
  }

  const last = sim.last
  const lastPt = last ? sim.pts[last.idx] : null
  return (
    <LabShell
      labId="learning-rule"
      actions={{
        break: { label: 'Finish training, then nudge the closest sender', run: nudge },
        fix: { label: 'Run the rule again', run: () => setAuto(true) },
      }}
      happening={
        <>
          {last && lastPt ? (
            <p>
              {data.thing} {last.idx + 1} was shown: p = {vec(lastPt.p, 1)}, target t = {lastPt.t} ({lastPt.t ? data.one : data.zero}). The neuron
              got n = {sgn(last.n)}, so a = {last.a} and e = t − a = {sgn(last.e, 0)}.{' '}
              {last.e === 0
                ? 'It was already correct, so nothing moved.'
                : `The rule ${last.e > 0 ? 'added p to' : 'subtracted p from'} w: ${vec(last.W0, 1)} became ${vec(last.W1, 1)}${
                    data.useBias ? `, and b went from ${num(last.b0, 1)} to ${num(last.b1, 1)}` : ''
                  }. The line swung ${last.e > 0 ? 'to take this point in' : 'to push this point out'}.`}
            </p>
          ) : (
            <p>
              {sim.nudged >= 0
                ? `${data.thing} ${sim.nudged + 1} was moved a tiny step and is now on the wrong side. The line had stopped only ${sim.nudgeGap.toFixed(2)} away from it, so a step of ${(sim.nudgeGap + 0.15).toFixed(2)} was enough.`
                : 'Press Next sample. One sender is shown to the neuron at a time, and only a mistake changes the weights.'}
            </p>
          )}
          <p>
            {sim.presented} shown so far, {sim.updates} of them changed the weights.{' '}
            {converged
              ? `All ${sim.pts.length} are correct, so e is always 0 and learning has stopped. The closest one is only ${gaps[closest].toFixed(2)} from the line: correct, but just barely.`
              : `${wrong} of ${sim.pts.length} are on the wrong side now.`}
          </p>
        </>
      }
      panel={
        <>
          <Group title="Teach one sample at a time">
            <div className="flex flex-wrap gap-1.5">
              <Btn tone="go" onClick={present} disabled={converged}>Next sample</Btn>
              <Btn onClick={() => reset()}>Start again</Btn>
            </div>
            <Toggle label="Auto-play" hint="Keeps presenting samples until a full pass has no mistakes" value={auto} onChange={setAuto} />
            <Slider label="Animation speed" value={speed} min={0.5} max={4} step={0.5} onChange={setSpeed} fmt={(v) => `${v}×`} />
            <Slider label="Step size α (the textbook rule uses 1)" value={alpha} min={0.1} max={2} step={0.1} onChange={setAlpha} fmt={(v) => v.toFixed(1)} />
            <Toggle label="Shuffle the order each pass" value={mixed} onChange={setMixed} />
            <Seg
              label="Data"
              value={setId}
              onChange={(v) => reset(v)}
              options={[
                { value: 'sms', label: 'SMS senders' },
                { value: 'book', label: 'Textbook 3 points, no bias' },
              ]}
            />
            <p className="text-[11px] leading-snug text-slate-500">Drag any point on the map to move it. The rule carries on from the weights it has.</p>
          </Group>
          <Group title="The neuron now">
            <Stats>
              <Stat label="w" value={vec(W, 1)} />
              <Stat label="b" value={data.useBias ? num(b, 1) : '0 (no bias)'} />
              <Stat label="Weight changes" value={sim.updates} />
              <Stat label="Wrong now" value={`${wrong} / ${sim.pts.length}`} tone={wrong ? 'bad' : 'good'} />
              <Stat label="Closest to line" value={wLen > 0 ? gaps[closest].toFixed(2) : 'no line'} tone={converged && gaps[closest] < 0.3 ? 'warn' : 'plain'} />
              <Stat label="Passes without change" value={converged ? 'stopped' : 'not yet'} tone={converged ? 'good' : 'plain'} />
            </Stats>
          </Group>
          <Group title="Last weight changes">
            {sim.log.length === 0 ? (
              <p className="text-[11px] text-slate-500">None yet.</p>
            ) : (
              <ol className="flex flex-col gap-0.5 font-mono text-[11px] leading-snug text-slate-300">
                {sim.log.map((l, i) => (
                  <li key={l} className={i === 0 ? 'text-amber-200' : ''}>{l}</li>
                ))}
              </ol>
            )}
          </Group>
        </>
      }
    >
      <Scene
        legend={[
          { mark: 'dot', color: ONE, label: `${data.one} (t = 1)` },
          { mark: 'square', color: ZERO, label: `${data.zero} (t = 0)` },
          { mark: 'fill', color: ONE, label: 'shaded side: perceptron says a = 1' },
          { mark: 'arrow', color: WCOL, label: 'w, drawn from the origin' },
          { mark: 'dash', color: '#f8fafc', label: 'p, the sample being shown' },
          { mark: 'ring', color: '#fb7185', label: 'on the wrong side now' },
        ]}
      >
        <Canvas2D
          draw={onDraw}
          className="touch-none cursor-grab"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      </Scene>
    </LabShell>
  )
}
