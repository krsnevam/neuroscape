import { useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { drawAxes, type Plot } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { rng } from '../../../engine'
import { hardlim } from '../../../engine/perceptron'
import { arrow, clamp, drawBoundary, lerp, nearest, num, pointerPos, sgn, shadeSide, squarePlot, tag, vec, Scene } from './kit'

interface Student {
  att: number
  marks: number
  /** p = [attendance ÷ 10, marks ÷ 5], so both inputs run from 0 to 10 */
  p: [number, number]
  /** 1 = the college lets this student sit the exam */
  t: 0 | 1
}

/** The college's own rule, which the student has to find by moving the line. */
const collegeN = (p: number[]) => 0.6 * p[0] + 0.4 * p[1] - 6.3

const students: Student[] = (() => {
  const rand = rng(21)
  const out: Student[] = []
  while (out.length < 26) {
    const att = Math.round(42 + rand() * 56)
    const marks = Math.round(8 + rand() * 40)
    const p: [number, number] = [att / 10, marks / 5]
    const n = collegeN(p)
    if (Math.abs(n) < 0.3) continue
    out.push({ att, marks, p, t: hardlim(n) })
  }
  return out
})()

/** Screen length of W: this many axis units per unit of weight. */
const W_LEN = 2.6
const ALLOW = '#fbbf24'
const REFUSE = '#38bdf8'

export default function BoundaryLab() {
  const [w, setW] = useState<[number, number]>([1, 0.15])
  const [b, setB] = useState(-6.4)
  const [bias, setBias] = useState(true)
  const [sel, setSel] = useState(3)
  const pivot = useRef<[number, number]>([5.5, 5])
  const plot = useRef<Plot | null>(null)
  const drag = useRef<'tip' | 'base' | null>(null)
  const disp = useRef({ w: [1, 0.15], b: -6.4 })
  const mix = useRef(students.map(() => 0.5))

  const bEff = bias ? b : 0
  const m2 = w[0] * w[0] + w[1] * w[1]
  /** The point on the line where the W arrow is planted */
  const anchorOf = (ww: number[], bb: number): [number, number] => {
    if (!bias) return [0, 0]
    const mm = ww[0] * ww[0] + ww[1] * ww[1]
    if (mm < 1e-9) return pivot.current
    const k = (ww[0] * pivot.current[0] + ww[1] * pivot.current[1] + bb) / mm
    return [pivot.current[0] - k * ww[0], pivot.current[1] - k * ww[1]]
  }

  const outputs = students.map((s) => hardlim(w[0] * s.p[0] + w[1] * s.p[1] + bEff))
  const wrong = students.filter((s, i) => outputs[i] !== s.t).length
  const st = students[sel]
  const nSel = w[0] * st.p[0] + w[1] * st.p[1] + bEff

  const onDraw = (ctx: CanvasRenderingContext2D, cw: number, ch: number, t: number, dt: number) => {
    const d = disp.current
    const k = 1 - Math.exp(-dt * 14)
    d.w = [lerp(d.w[0], w[0], k), lerp(d.w[1], w[1], k)]
    d.b = lerp(d.b, bEff, k)
    const pl = squarePlot(cw, ch, [-1.2, 10.6], [-1.2, 10.6])
    plot.current = pl
    shadeSide(ctx, pl, d.w, d.b, 'rgba(251,191,36,0.09)')
    drawAxes(ctx, pl, {
      xTicks: [0, 2, 4, 6, 8, 10],
      yTicks: [0, 2, 4, 6, 8, 10],
      xFmt: (v) => `${v * 10}%`,
      yFmt: (v) => String(v * 5),
      xLabel: 'attendance  (p₁ = attendance ÷ 10)',
      yLabel: 'internal marks out of 50  (p₂ = marks ÷ 5)',
    })
    // The origin matters in this station: mark it
    ctx.strokeStyle = 'rgba(226,232,240,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pl.X(0) - 6, pl.Y(0))
    ctx.lineTo(pl.X(0) + 6, pl.Y(0))
    ctx.moveTo(pl.X(0), pl.Y(0) - 6)
    ctx.lineTo(pl.X(0), pl.Y(0) + 6)
    ctx.stroke()
    if (!bias) {
      ctx.beginPath()
      ctx.arc(pl.X(0), pl.Y(0), 9 + 2 * Math.sin(t * 5), 0, Math.PI * 2)
      ctx.strokeStyle = '#fb7185'
      ctx.lineWidth = 2
      ctx.stroke()
      tag(ctx, 'origin: the line is pinned here', pl.X(0) + 14, pl.Y(0) - 14, '#fda4af', 'left', pl)
    }

    drawBoundary(ctx, pl, d.w, d.b, { color: '#f8fafc', width: 2.5, glow: true })

    // Students: shape = what the college decided, colour = what the perceptron says
    students.forEach((s, i) => {
      const a = hardlim(d.w[0] * s.p[0] + d.w[1] * s.p[1] + d.b)
      mix.current[i] = lerp(mix.current[i], a, 1 - Math.exp(-dt * 10))
      const m = mix.current[i]
      const x = pl.X(s.p[0])
      const y = pl.Y(s.p[1])
      const r = 5.5 + 2.5 * Math.sin(Math.PI * m) // a small pop while the colour changes
      const paint = (color: string, alpha: number) => {
        ctx.globalAlpha = alpha
        ctx.fillStyle = color
        ctx.beginPath()
        if (s.t === 1) ctx.arc(x, y, r, 0, Math.PI * 2)
        else ctx.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76)
        ctx.fill()
      }
      paint(REFUSE, 1)
      paint(ALLOW, m)
      ctx.globalAlpha = 1
      if (a !== s.t) {
        ctx.beginPath()
        ctx.arc(x, y, 10.5 + 1.5 * Math.sin(t * 6 + i), 0, Math.PI * 2)
        ctx.strokeStyle = '#fb7185'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      if (i === sel) {
        ctx.beginPath()
        ctx.arc(x, y, 14, 0, Math.PI * 2)
        ctx.strokeStyle = '#f8fafc'
        ctx.lineWidth = 1.2
        ctx.setLineDash([3, 3])
        ctx.stroke()
        ctx.setLineDash([])
      }
    })

    // W, planted on the line, with the right-angle mark
    const A = anchorOf(d.w, d.b)
    const ax = pl.X(A[0])
    const ay = pl.Y(A[1])
    const tx = pl.X(A[0] + d.w[0] * W_LEN)
    const ty = pl.Y(A[1] + d.w[1] * W_LEN)
    const len = Math.hypot(tx - ax, ty - ay)
    if (len > 14) {
      const ux = (tx - ax) / len
      const uy = (ty - ay) / len
      const q = 9
      ctx.strokeStyle = 'rgba(248,250,252,0.8)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(ax + ux * q, ay + uy * q)
      ctx.lineTo(ax + ux * q - uy * q, ay + uy * q + ux * q)
      ctx.lineTo(ax - uy * q, ay + ux * q)
      ctx.stroke()
      tag(ctx, '90°', ax - uy * 24 + ux * 16 - 8, ay + ux * 24 + uy * 16, '#cbd5e1', 'left', pl)
    }
    arrow(ctx, ax, ay, tx, ty, '#f472b6', 3.5)
    // Handles
    ctx.beginPath()
    ctx.arc(tx, ty, 9 + Math.sin(t * 4), 0, Math.PI * 2)
    ctx.strokeStyle = '#f472b6'
    ctx.lineWidth = 2
    ctx.stroke()
    tag(ctx, `W = ${vec(d.w)}  drag`, tx + 14, ty - 4, '#f9a8d4', 'left', pl)
    if (bias) {
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(ax - 6, ay - 6, 12, 12)
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.5
      ctx.strokeRect(ax - 6, ay - 6, 12, 12)
      tag(ctx, `b = ${num(d.b)}  drag to slide`, ax + 12, ay + 18, '#e2e8f0', 'left', pl)
    }
    // Which side is which, written on the two sides of the line
    if (len > 14) {
      const ux = (tx - ax) / len
      const uy = (ty - ay) / len
      tag(ctx, 'a = 1 allowed', ax - uy * 70 + ux * 16, ay + ux * 70 + uy * 16, ALLOW, 'center', pl)
      tag(ctx, 'a = 0 refused', ax - uy * 70 - ux * 16, ay + ux * 70 - uy * 16, REFUSE, 'center', pl)
    }
    // Selected student's sum
    const sx = pl.X(st.p[0])
    const sy = pl.Y(st.p[1])
    tag(ctx, `n = ${sgn(d.w[0] * st.p[0] + d.w[1] * st.p[1] + d.b)}`, sx + 16, sy - 14, '#f8fafc', 'left', pl)

  }

  const tipAndBase = () => {
    const pl = plot.current
    if (!pl) return null
    const A = anchorOf(w, bEff)
    return {
      pl,
      A,
      tip: [pl.X(A[0] + w[0] * W_LEN), pl.Y(A[1] + w[1] * W_LEN)] as [number, number],
      base: [pl.X(A[0]), pl.Y(A[1])] as [number, number],
    }
  }
  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const g = tipAndBase()
    if (!g) return
    const [x, y] = pointerPos(e)
    const dTip = Math.hypot(x - g.tip[0], y - g.tip[1])
    const dBase = Math.hypot(x - g.base[0], y - g.base[1])
    if (dTip < 26 && dTip <= dBase + 6) drag.current = 'tip'
    else if (bias && dBase < 26) drag.current = 'base'
    else {
      const i = nearest(students.map((s) => [g.pl.X(s.p[0]), g.pl.Y(s.p[1])]), x, y, 20)
      if (i >= 0) setSel(i)
      return
    }
    pivot.current = g.A
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const pl = plot.current
    if (!drag.current || !pl) return
    const [x, y] = pointerPos(e)
    const px = clamp(pl.ix(x), -1, 10.4)
    const py = clamp(pl.iy(y), -1, 10.4)
    if (drag.current === 'tip') {
      const A = bias ? pivot.current : [0, 0]
      const nw: [number, number] = [clamp((px - A[0]) / W_LEN, -2, 2), clamp((py - A[1]) / W_LEN, -2, 2)]
      if (Math.hypot(nw[0], nw[1]) < 0.08) return
      setW(nw)
      if (bias) setB(clamp(-(nw[0] * A[0] + nw[1] * A[1]), -30, 30))
    } else {
      pivot.current = [px, py]
      setB(clamp(-(w[0] * px + w[1] * py), -30, 30))
    }
  }
  const onUp = () => (drag.current = null)

  const setWeight = (i: 0 | 1, v: number) => {
    const nw: [number, number] = i === 0 ? [v, w[1]] : [w[0], v]
    if (Math.hypot(nw[0], nw[1]) < 0.05) return
    setW(nw)
  }

  const verdict = (a: number) => (a === 1 ? 'allowed' : 'refused')
  return (
    <LabShell
      labId="boundary"
      actions={{
        break: { label: 'Remove the bias (b = 0)', run: () => setBias(false) },
        fix: {
          label: 'Give the bias back',
          run: () => {
            setBias(true)
            pivot.current = [5.5, 5]
          },
        },
      }}
      happening={
        <>
          <p>
            The gate adds up n = {num(w[0])}·p₁ {sgn(w[1])}·p₂ {sgn(bEff)} and opens when n is zero or more. The white line is
            every point where n is exactly 0.
          </p>
          <p>
            {bias
              ? 'The pink arrow W crosses the line at 90° and points to the allowed side. Turning W turns the line. Changing b slides it.'
              : 'With b = 0 the sum is 0 at the origin (0% attendance, 0 marks), so the line is pinned there. It can turn but it cannot slide.'}{' '}
            <b className={wrong ? 'text-rose-300' : 'text-emerald-300'}>
              {wrong === 0 ? `All ${students.length} students are on the correct side.` : `${wrong} of ${students.length} students are on the wrong side.`}
            </b>
          </p>
          <p>
            Ringed student: {st.att}% attendance, {st.marks} marks, so p = {vec(st.p, 1)} and n = {sgn(nSel)}. Perceptron:{' '}
            {verdict(hardlim(nSel))}. College: {verdict(st.t)}.
          </p>
        </>
      }
      panel={
        <>
          <Group title="The neuron: a = hardlim(Wp + b)">
            <Slider label="w₁ (weight on attendance)" value={w[0]} min={-2} max={2} step={0.05} onChange={(v) => setWeight(0, v)} fmt={(v) => num(v)} />
            <Slider label="w₂ (weight on marks)" value={w[1]} min={-2} max={2} step={0.05} onChange={(v) => setWeight(1, v)} fmt={(v) => num(v)} />
            {bias && <Slider label="b (bias)" value={clamp(b, -30, 30)} min={-30} max={30} step={0.1} onChange={setB} fmt={(v) => num(v)} />}
            <Toggle label="Use a bias" hint="Off: b is fixed at 0 and the line must pass through the origin" value={bias} onChange={setBias} />
            <div className="flex flex-wrap gap-1.5">
              <Btn onClick={() => { setW([1, 0]); setB(-7.5); pivot.current = [7.5, 5] }}>Rule: attendance ≥ 75% only</Btn>
              <Btn onClick={() => { setW([0, 1]); setB(-5); pivot.current = [5.5, 5] }}>Rule: marks ≥ 25 only</Btn>
            </div>
          </Group>
          <Group title="Scoreboard">
            <Stats>
              <Stat label="Wrong side" value={`${wrong} / ${students.length}`} tone={wrong ? 'bad' : 'good'} />
              <Stat label="Length of W" value={Math.sqrt(m2).toFixed(2)} />
              <Stat label="Line from origin" value={m2 > 0 ? (Math.abs(bEff) / Math.sqrt(m2)).toFixed(2) : '0'} />
              <Stat label="Angle W to line" value="90°" />
            </Stats>
            <p className="text-[11px] leading-snug text-slate-500">
              Line from origin is |b| ÷ ‖W‖ in axis units. Tap any student on the map to see that student's sum.
            </p>
          </Group>
        </>
      }
    >
      <Scene
        legend={[
          { mark: 'dot', color: '#94a3b8', label: 'circle: college says allowed (t = 1)' },
          { mark: 'square', color: '#94a3b8', label: 'square: college says refused (t = 0)' },
          { mark: 'dot', color: ALLOW, label: 'amber: perceptron says a = 1' },
          { mark: 'dot', color: REFUSE, label: 'blue: perceptron says a = 0' },
          { mark: 'ring', color: '#fb7185', label: 'red ring: perceptron is wrong' },
          { mark: 'arrow', color: '#f472b6', label: 'weight vector W' },
          { mark: 'line', color: '#f8fafc', label: 'decision boundary Wp + b = 0' },
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
