import { useMemo, useRef, useState } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, drawAxes, drawCurve, makePlot, useTicker, type Plot } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { gauss, rng, type Vec } from '../../../engine'
import { competitiveStep, createCompetitiveLayer, type CompetitiveLayer } from '../../../engine/competitive'
import { leastSquares, rbfHidden, rbfSolveOutput } from '../../../engine/rbf'
import { NEURON_COLORS, clamp, ease, lerp, pointerXY, text } from './kit'

type Mode = 'fit' | 'classify'
const RHO = 1e-3
const bump = (h: number, mu: number, sd: number) => Math.exp(-((h - mu) ** 2) / (2 * sd * sd))
/** Hostel power demand in kW at hour h: geysers in the morning, fans after lunch, everything at night. */
const demand = (h: number) => 22 + 30 * bump(h, 7.5, 1.5) + 12 * bump(h, 13.5, 2) + 46 * bump(h, 20.5, 2.1)
const fmtHour = (h: number) => {
  const m = Math.round((((h % 24) + 24) % 24) * 60)
  const hh = Math.floor(m / 60) % 24
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return m % 60 ? `${h12}:${String(m % 60).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}` : `${h12} ${hh < 12 ? 'am' : 'pm'}`
}

/** Meter readings. The warden logs more of them around the two peaks. */
const READINGS: { h: number; kw: number }[] = (() => {
  const rand = rng(5)
  return Array.from({ length: 44 }, (_, i) => {
    const h = i % 3 === 0 ? clamp(7.5 + gauss(rand) * 1.8, 0.2, 23.8) : i % 3 === 1 ? clamp(20.5 + gauss(rand) * 2.2, 0.2, 23.8) : rand() * 24
    return { h, kw: demand(h) + gauss(rand) * 2.5 }
  })
})()
const FIT_P = READINGS.map((r) => [r.h])
const FIT_T = READINGS.map((r) => r.kw)

/** Phone signal on a hostel floor: strong near the router in the middle, weak in a ring around it. */
const SIGNAL: { p: Vec; t: number }[] = (() => {
  const rand = rng(23)
  const out: { p: Vec; t: number }[] = []
  for (let i = 0; i < 50; i++) out.push({ p: [gauss(rand) * 0.17, gauss(rand) * 0.17], t: 1 })
  for (let i = 0; i < 80; i++) {
    const a = rand() * Math.PI * 2
    const r = 0.66 + rand() * 0.26
    out.push({ p: [Math.cos(a) * r, Math.sin(a) * r], t: -1 })
  }
  return out
})()
const CLS_P = SIGNAL.map((s) => s.p)
const CLS_T = SIGNAL.map((s) => s.t)
/** The best a single straight line can do on the signal data, by least squares on [x, y, 1]. */
const LINE_ACC = (() => {
  const x = leastSquares(CLS_P.map((p) => [p[0], p[1], 1]), CLS_T)
  return SIGNAL.filter((s) => Math.sign(x[0] * s.p[0] + x[1] * s.p[1] + x[2]) === s.t).length / SIGNAL.length
})()

interface Model {
  centres: Vec[]
  w2: number[]
  b2: number
  shown: number[]
  shownB: number
}
interface Sim {
  fit: Model
  cls: Model
  cluster: number
  layer: CompetitiveLayer | null
  drag: number
  picked: number
  pl: Plot | null
  shade: HTMLCanvasElement | null
  frame: number
}
const model = (centres: Vec[]): Model => ({
  centres,
  w2: centres.map(() => 0),
  b2: 0,
  shown: centres.map(() => 0),
  shownB: 0,
})
const N = 44

export default function RbfHillsLab() {
  const [mode, setMode] = useState<Mode>('fit')
  const [S, setS] = useState(6)
  const [spread, setSpread] = useState(3)
  const [spreadC, setSpreadC] = useState(0.45)
  const [auto, setAuto] = useState(true)
  const [version, setVersion] = useState(0)
  const dragging = useRef(false)
  useTicker(250)

  const sim = useMemo<Sim>(() => {
    const rand = rng(version * 3 + S)
    return {
      fit: model(Array.from({ length: S }, (_, i) => [((i + 0.5) * 24) / S])),
      cls: model(Array.from({ length: S }, () => SIGNAL[Math.floor(rand() * SIGNAL.length)].p.slice())),
      cluster: 0,
      layer: null,
      drag: -1,
      picked: 0,
      pl: null,
      shade: null,
      frame: 0,
    }
  }, [S, version])

  const m = sim[mode === 'fit' ? 'fit' : 'cls']
  const P = mode === 'fit' ? FIT_P : CLS_P
  const T = mode === 'fit' ? FIT_T : CLS_T
  const b1 = new Array<number>(S).fill(1 / (mode === 'fit' ? spread : spreadC))
  const out = (mm: { w2: number[]; b2: number }, p: Vec) => {
    const a1 = rbfHidden(m.centres, b1, p)
    let s = mm.b2
    for (let i = 0; i < a1.length; i++) s += mm.w2[i] * a1[i]
    return s
  }
  const solveNow = () => Object.assign(m, rbfSolveOutput(m.centres, b1, P, T, RHO))
  /** Inputs scaled to 0…1 so one clustering routine serves both modes. */
  const toUnit = (p: Vec) => (mode === 'fit' ? [p[0] / 24] : [(p[0] + 1) / 2, (p[1] + 1) / 2])
  const fromUnit = (u: Vec) => (mode === 'fit' ? [u[0] * 24] : [u[0] * 2 - 1, u[1] * 2 - 1])

  const step = (dt: number) => {
    sim.frame++
    if (sim.cluster > 0 && sim.layer) {
      // Stage 1: the Kohonen rule from the competition station, on the inputs only
      const al = 0.02 + 0.2 * (sim.cluster / 90)
      for (let k = 0; k < 8; k++)
        competitiveStep(sim.layer, toUnit(P[Math.floor(Math.random() * P.length)]), al, { strength: 0.5 })
      m.centres = sim.layer.w.map(fromUnit)
      sim.cluster--
    }
    if (auto) solveNow()
    const k = ease(dt, 7)
    m.shown = m.w2.map((v, i) => lerp(m.shown[i] ?? 0, v, k))
    m.shownB = lerp(m.shownB, m.b2, k)
  }

  const drawFit = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    step(dt)
    const pl = makePlot(w, h, [0, 24], [-25, 115], { b: 58 })
    sim.pl = pl
    drawAxes(ctx, pl, {
      xTicks: [0, 4, 8, 12, 16, 20, 24],
      yTicks: [0, 25, 50, 75, 100],
      xFmt: fmtHour,
      yLabel: 'power demand, kW',
    })
    drawCurve(ctx, pl, demand, { color: 'rgba(148,163,184,0.3)', width: 7 })
    const shownModel = { w2: m.shown, b2: m.shownB }
    const big = Math.max(...m.shown.map(Math.abs)) > 400
    // Each hill is one hidden neuron times its output weight
    ctx.save()
    ctx.beginPath()
    ctx.rect(pl.left, pl.top, pl.right - pl.left, pl.bottom - pl.top)
    ctx.clip()
    m.centres.forEach((c, i) => {
      const color = NEURON_COLORS[i % NEURON_COLORS.length]
      ctx.beginPath()
      ctx.moveTo(pl.left, pl.Y(0))
      for (let s = 0; s <= 120; s++) {
        const x = (24 * s) / 120
        ctx.lineTo(pl.X(x), clamp(pl.Y(m.shown[i] * Math.exp(-(((x - c[0]) * b1[i]) ** 2))), -50, h + 50))
      }
      ctx.lineTo(pl.right, pl.Y(0))
      ctx.closePath()
      ctx.globalAlpha = sim.picked === i ? 0.42 : 0.2
      ctx.fillStyle = color
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = color
      ctx.lineWidth = sim.picked === i ? 2 : 1
      ctx.stroke()
    })
    ctx.restore()
    // The bias lifts the whole sum
    ctx.strokeStyle = 'rgba(226,232,240,0.5)'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    const by = clamp(pl.Y(m.shownB), pl.top, pl.bottom)
    ctx.moveTo(pl.left, by)
    ctx.lineTo(pl.right, by)
    ctx.stroke()
    ctx.setLineDash([])
    text(ctx, `bias b² = ${m.shownB.toFixed(0)} kW`, pl.right - 4, by - 8, { align: 'right', size: 10, color: '#cbd5e1' })
    drawCurve(ctx, pl, (x) => out(shownModel, [x]), { color: '#f5f3ff', width: 3, glow: true })
    for (const r of READINGS) dot(ctx, pl.X(r.h), pl.Y(r.kw), 3.5, '#fb923c')
    // Handles: one triangle per centre, with the spread of the picked hill
    m.centres.forEach((c, i) => {
      const x = pl.X(c[0])
      const y = pl.bottom + 20
      const r = sim.picked === i ? 9 : 7
      ctx.beginPath()
      ctx.moveTo(x, y - r)
      ctx.lineTo(x + r, y + r * 0.8)
      ctx.lineTo(x - r, y + r * 0.8)
      ctx.closePath()
      ctx.fillStyle = NEURON_COLORS[i % NEURON_COLORS.length]
      ctx.fill()
      if (sim.picked === i) {
        ctx.strokeStyle = '#f8fafc'
        ctx.lineWidth = 1.5
        ctx.stroke()
        const peak = clamp(pl.Y(m.shown[i]), pl.top + 14, pl.bottom - 4)
        ctx.beginPath()
        ctx.moveTo(pl.X(c[0] - spread), peak)
        ctx.lineTo(pl.X(c[0] + spread), peak)
        ctx.stroke()
        text(ctx, `hill ${i + 1}: w² = ${m.shown[i].toFixed(0)}, spread ±${spread.toFixed(1)} h`, clamp(x, pl.left + 90, pl.right - 90), peak - 9, {
          align: 'center',
          size: 10,
          color: '#f8fafc',
        })
      }
    })
    if (big) text(ctx, 'the hills have left the chart: huge weights that cancel each other', pl.left + 8, pl.top + 26, { color: '#fb7185', size: 10 })
    text(ctx, '▲ drag a centre   ● reading   thick grey: real demand   white: sum of hills + bias', pl.left, h - 9, { size: 10, color: '#64748b' })
    void t
  }

  const drawCls = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    step(dt)
    const side = Math.max(120, Math.min(w - 70, h - 70))
    const padL = (w - side) / 2 + 14
    const pl = makePlot(w, h, [-1.1, 1.1], [-1.1, 1.1], { l: padL, r: w - padL - side, t: 14, b: h - 14 - side })
    sim.pl = pl
    if (!sim.shade) {
      sim.shade = document.createElement('canvas')
      sim.shade.width = N
      sim.shade.height = N
    }
    if (sim.frame % 3 === 0) {
      const sctx = sim.shade.getContext('2d')!
      const img = sctx.createImageData(N, N)
      const shownModel = { w2: m.shown, b2: m.shownB }
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const v = out(shownModel, [-1.1 + (2.2 * (i + 0.5)) / N, 1.1 - (2.2 * (j + 0.5)) / N])
          const o = (j * N + i) * 4
          const pos = v >= 0
          img.data[o] = pos ? 52 : 251
          img.data[o + 1] = pos ? 211 : 113
          img.data[o + 2] = pos ? 153 : 133
          img.data[o + 3] = 20 + Math.min(1, Math.abs(v)) * 70
        }
      sctx.putImageData(img, 0, 0)
    }
    ctx.drawImage(sim.shade, pl.left, pl.top, pl.right - pl.left, pl.bottom - pl.top)
    drawAxes(ctx, pl, {
      xTicks: [-1, -0.5, 0, 0.5, 1],
      yTicks: [-1, -0.5, 0, 0.5, 1],
      xFmt: (v) => `${v * 10}`,
      yFmt: (v) => `${v * 10}`,
      xLabel: 'metres east of the router',
      yLabel: 'metres north',
    })
    for (const s of SIGNAL) dot(ctx, pl.X(s.p[0]), pl.Y(s.p[1]), 3.2, s.t > 0 ? '#34d399' : '#fb7185')
    const scale = (pl.right - pl.left) / 2.2
    m.centres.forEach((c, i) => {
      const color = NEURON_COLORS[i % NEURON_COLORS.length]
      const x = pl.X(c[0])
      const y = pl.Y(c[1])
      ctx.strokeStyle = color
      ctx.lineWidth = sim.picked === i ? 2.5 : 1.3
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.arc(x, y, spreadC * scale, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      dot(ctx, x, y, sim.picked === i ? 8 : 6, color)
      text(ctx, `${m.shown[i] >= 0 ? '+' : '−'}${Math.abs(m.shown[i]).toFixed(1)}`, x, y - 14, { align: 'center', size: 10, color: '#f8fafc' })
    })
    text(ctx, 'green: strong signal   red: weak   circles: centres (drag), radius = spread, number = w²', w / 2, h - 9, { align: 'center', size: 10, color: '#64748b' })
    void t
  }

  // Readouts
  const rms = (f: (p: Vec) => number, Ps: Vec[], Ts: number[]) => Math.sqrt(Ps.reduce((s, p, q) => s + (f(p) - Ts[q]) ** 2, 0) / Ps.length)
  const errAt = mode === 'fit' ? rms((p) => out(m, p), FIT_P, FIT_T) : 0
  const grid = Array.from({ length: 97 }, (_, i) => [i / 4])
  const errBetween = mode === 'fit' ? rms((p) => out(m, p), grid, grid.map((p) => demand(p[0]))) : 0
  const acc = mode === 'classify' ? SIGNAL.filter((s) => (out(m, s.p) >= 0 ? 1 : -1) === s.t).length / SIGNAL.length : 0
  const R = mode === 'fit' ? 1 : 2
  const params = S * R + S + S + 1
  const Q = P.length
  const lsOps = Q * (S + 1) ** 2 + (S + 1) ** 3
  const gap = 24 / S
  const maxW = Math.max(0, ...m.w2.map(Math.abs))
  const pk = clamp(sim.picked, 0, S - 1)

  const happening =
    mode === 'fit' ? (
      <>
        <p>
          {S} hills, each about ±{spread.toFixed(1)} h wide. Hill {pk + 1} is centred at {fmtHour(m.centres[pk][0])} and is multiplied by w² ={' '}
          {m.w2[pk].toFixed(0)}. The white curve is all the hills added up, plus the bias {m.b2.toFixed(0)} kW.
        </p>
        <p>
          {sim.cluster > 0
            ? 'Stage 1 is running: each reading pulls its nearest centre toward itself (Kohonen rule). No targets are used.'
            : auto
              ? `The output layer is solved again on every change: one least-squares solve, about ${lsOps.toLocaleString()} multiplications, no iterations.`
              : 'The output weights are frozen. Move a centre and the sum goes wrong until you solve stage 2 again.'}
        </p>
        <p>
          The curve misses the readings by {errAt.toFixed(1)} kW and the real demand between them by {errBetween.toFixed(1)} kW.{' '}
          {spread < 0.4 * gap
            ? `The hills are much narrower than the ${gap.toFixed(1)} h gap between centres. Between hills every a¹ is near 0, so the output drops back to the bias.`
            : spread > 2.2 * gap
              ? `The hills are much wider than the ${gap.toFixed(1)} h gap between centres, so neighbours look alike. The fit needs large weights that cancel (largest ${maxW.toFixed(0)}) and loses sharp detail.`
              : 'Neighbouring hills overlap, so the sum stays smooth between centres.'}
        </p>
      </>
    ) : (
      <>
        <p>
          The same network, now with two inputs: a position on the floor. Each circle is a hill seen from above. The output is positive (green) where
          hills with positive w² dominate.
        </p>
        <p>
          It gets {Math.round(acc * 100)}% of the {SIGNAL.length} spots right with {S} {S === 1 ? 'centre' : 'centres'}. The best single straight line gets{' '}
          {Math.round(LINE_ACC * 100)}%, because no line can fence in a blob that is surrounded.
        </p>
        <p>
          {acc > 0.97
            ? 'One hill on the blob with a positive weight is enough to carve out a closed region. A sigmoid layer would need several lines to do that.'
            : 'Try moving a centre onto the green blob, adding centres, or changing the spread.'}
        </p>
      </>
    )

  const pick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pl = sim.pl
    if (!pl) return -1
    const { x, y } = pointerXY(e)
    let best = -1
    let bd = 34
    m.centres.forEach((c, i) => {
      const d = mode === 'fit' ? Math.abs(pl.X(c[0]) - x) : Math.hypot(pl.X(c[0]) - x, pl.Y(c[1]) - y)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    return best
  }
  const moveTo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pl = sim.pl
    if (!pl || sim.drag < 0) return
    const { x, y } = pointerXY(e)
    m.centres[sim.drag] = mode === 'fit' ? [clamp(pl.ix(x), 0, 24)] : [clamp(pl.ix(x), -1.1, 1.1), clamp(pl.iy(y), -1.1, 1.1)]
  }
  const scatter = () => {
    const rand = rng(Math.floor(performance.now()))
    m.centres = m.centres.map(() => (mode === 'fit' ? [rand() * 9] : [0.4 + rand() * 0.6, -1 + rand() * 0.7]))
    setAuto(false)
  }
  const cluster = () => {
    sim.layer = createCompetitiveLayer(m.centres.map(toUnit))
    sim.cluster = 90
  }

  return (
    <LabShell
      labId="rbf-hills"
      happening={happening}
      actions={{
        break: {
          label: 'Make the hills very narrow (±0.4 h)',
          run: () => {
            setMode('fit')
            setAuto(true)
            setSpread(0.4)
          },
        },
        fix: {
          label: 'Spread = gap between centres',
          run: () => {
            setMode('fit')
            setAuto(true)
            setSpread(Math.round(gap * 10) / 10)
          },
        },
      }}
      panel={
        <>
          <Group title="The job">
            <Seg
              value={mode}
              onChange={setMode}
              options={[
                { value: 'fit', label: 'Fit the demand curve' },
                { value: 'classify', label: 'Classify signal spots' },
              ]}
            />
            <Slider label="Hidden neurons S (hills)" value={S} min={1} max={12} onChange={setS} fmt={(v) => `${v} · ${v * R + v + v + 1} parameters`} />
            {mode === 'fit' ? (
              <Slider label="Spread of every hill (1 / b¹)" value={spread} min={0.2} max={12} step={0.1} onChange={setSpread} fmt={(v) => `±${v.toFixed(1)} h`} />
            ) : (
              <Slider label="Spread of every hill (1 / b¹)" value={spreadC} min={0.05} max={1.5} step={0.05} onChange={setSpreadC} fmt={(v) => `${(v * 10).toFixed(1)} m`} />
            )}
          </Group>
          <Group title="Two-stage training">
            <div className="flex flex-wrap gap-2">
              <Btn tone="warn" onClick={scatter}>Scatter the centres badly</Btn>
              <Btn tone="go" onClick={cluster}>Stage 1: cluster the centres</Btn>
              <Btn tone="go" onClick={solveNow}>Stage 2: solve W², b²</Btn>
              <Btn onClick={() => { setAuto(true); setVersion((v) => v + 1) }}>Reset</Btn>
            </div>
            <Toggle
              label="Keep solving the output layer live"
              hint="Off: W² and b² stay frozen until you press Stage 2"
              value={auto}
              onChange={setAuto}
            />
          </Group>
          <Group title="Readings">
            <Stats>
              {mode === 'fit' ? (
                <>
                  <Stat label="Error at readings" value={`${errAt.toFixed(1)} kW`} tone={errAt < 4 ? 'good' : 'plain'} />
                  <Stat label="Error between them" value={`${errBetween.toFixed(1)} kW`} tone={errBetween > 8 ? 'bad' : errBetween < 4 ? 'good' : 'warn'} />
                </>
              ) : (
                <>
                  <Stat label="Correct spots" value={`${Math.round(acc * 100)}%`} tone={acc > 0.95 ? 'good' : 'warn'} />
                  <Stat label="Best straight line" value={`${Math.round(LINE_ACC * 100)}%`} />
                </>
              )}
              <Stat label="Largest |w²|" value={maxW > 1e5 ? 'huge' : maxW.toFixed(mode === 'fit' ? 0 : 1)} tone={maxW > 400 ? 'warn' : 'plain'} />
              <Stat label="Least-squares work" value={`≈ ${lsOps.toLocaleString()}`} />
            </Stats>
            <p className="text-[11px] text-slate-500">
              Parameters: {S} × {R} centre values + {S} biases + {S} output weights + 1 output bias = {params}.
            </p>
          </Group>
        </>
      }
    >
      <Canvas2D
        draw={mode === 'fit' ? drawFit : drawCls}
        className="touch-none"
        onPointerDown={(e) => {
          const i = pick(e)
          if (i < 0) return
          dragging.current = true
          sim.drag = i
          sim.picked = i
          e.currentTarget.setPointerCapture(e.pointerId)
          moveTo(e)
        }}
        onPointerMove={(e) => dragging.current && moveTo(e)}
        onPointerUp={() => { dragging.current = false; sim.drag = -1 }}
        onPointerCancel={() => { dragging.current = false; sim.drag = -1 }}
      />
    </LabShell>
  )
}
