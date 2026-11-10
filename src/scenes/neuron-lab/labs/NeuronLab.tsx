import { useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { drawAxes, drawCurve, makePlot } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats } from '../../../ui/lab/controls'
import { neuron, transferFns, transferNames, type TransferName } from '../../../engine'
import { arrowHead, clamp, ease, glow, lerp, line, num, pointerXY, roundRect, signColor, text } from '../draw'

const inputs = [
  { name: 'cloud cover', short: 'clouds' },
  { name: 'humidity', short: 'humidity' },
  { name: 'forecast rain chance', short: 'forecast' },
]
const SUB = ['₁', '₂', '₃']
const defaults = { p: [0.8, 0.6, 0.7], w: [2, 1, 3], b: -3 }
const COLOR = '#e879f9'

/** The output level above which we read the answer as "yes": the middle of the function's range. */
const yesLevel = (f: TransferName) => (f === 'hardlim' || f === 'logsig' || f === 'satlin' || f === 'poslin' ? 0.5 : 0)
const yRange = (f: TransferName): [number, number] =>
  f === 'purelin' ? [-6, 6] : f === 'poslin' ? [-1, 6] : f === 'hardlim' || f === 'logsig' || f === 'satlin' ? [-0.4, 1.4] : [-1.4, 1.4]

type Handle = { kind: 'p' | 'w'; i: number } | { kind: 'b' }
interface Hit {
  x: number
  y: number
  r: number
  h: Handle
}

export default function NeuronLab() {
  const [mode, setMode] = useState<'single' | 'multi'>('multi')
  const [p, setP] = useState(defaults.p)
  const [w, setW] = useState(defaults.w)
  const [b, setB] = useState(defaults.b)
  const [fn, setFn] = useState<TransferName>('logsig')
  const hits = useRef<Hit[]>([])
  const drag = useRef<{ h: Handle; y: number; v: number } | null>(null)
  const shown = useRef({ n: 0, a: 0 })

  const R = mode === 'single' ? 1 : 3
  const pv = p.slice(0, R)
  const wv = w.slice(0, R)
  const { n, a } = neuron(wv, pv, b, fn)
  const f = transferFns[fn]
  const yes = a > yesLevel(fn)
  const setAt = (arr: number[], i: number, v: number) => arr.map((x, k) => (k === i ? v : x))

  const onDraw = (ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number) => {
    const s = shown.current
    s.n = lerp(s.n, n, ease(dt, 9))
    s.a = f.f(s.n)
    const narrow = W < 620
    const dh = H * (narrow ? 0.56 : 0.6)
    hits.current = []

    // ── The neuron ──────────────────────────────────────────────
    const inX = W * (narrow ? 0.13 : 0.12)
    const cx = W * (narrow ? 0.5 : 0.47)
    const cy = dh * 0.52
    const rad = clamp(Math.min(dh * 0.2, W * 0.09), 24, 70)
    const fx = W * (narrow ? 0.72 : 0.68)
    const ox = W * (narrow ? 0.9 : 0.87)
    const inR = narrow ? 13 : 19
    const ys = R === 1 ? [cy] : [cy - dh * 0.27, cy, cy + dh * 0.27]

    // Dendrites: input lines, thickness = |w|, colour = sign of w
    for (let i = 0; i < R; i++) {
      const y = ys[i]
      const wi = wv[i]
      const zero = Math.abs(wi) < 1e-9
      const col = zero ? '#475569' : signColor(wi)
      const c1x = lerp(inX, cx, 0.45)
      const ex = cx - rad * Math.cos(Math.atan2(y - cy, cx - inX) * 0.8)
      const ey = cy + (y - cy) * 0.28
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(inX + inR, y)
      ctx.bezierCurveTo(c1x, y, c1x, ey, ex, ey)
      ctx.strokeStyle = col
      ctx.globalAlpha = zero ? 0.8 : 0.75
      ctx.lineWidth = zero ? 1 : 1.5 + Math.abs(wi) * 2.6
      if (zero) ctx.setLineDash([4, 5])
      ctx.stroke()
      ctx.restore()
      // Pulses carry w·p along the dendrite
      const signal = Math.abs(wi * pv[i])
      if (signal > 0.02) {
        for (let k = 0; k < 3; k++) {
          const u = (t * 0.55 + k / 3 + i * 0.13) % 1
          const q = 1 - u
          const bx = q * q * q * (inX + inR) + 3 * q * q * u * c1x + 3 * q * u * u * c1x + u * u * u * ex
          const by = q * q * q * y + 3 * q * q * u * y + 3 * q * u * u * ey + u * u * u * ey
          glow(ctx, bx, by, 5 + Math.min(9, signal * 3.5), '#ffffff', 0.85)
        }
      }
      // Weight handle
      const hx = lerp(inX, cx, narrow ? 0.42 : 0.4)
      const hy = lerp(y, ey, 0.42)
      roundRect(ctx, hx - 31, hy - 11, 62, 22, 6)
      ctx.fillStyle = 'rgba(2,6,23,0.9)'
      ctx.fill()
      ctx.strokeStyle = col
      ctx.lineWidth = 1.2
      ctx.stroke()
      text(ctx, `w${R === 1 ? '' : SUB[i]} = ${num(wi, 1)}`, hx, hy + 4, { color: zero ? '#94a3b8' : '#f8fafc', size: 11, align: 'center' })
      if (!narrow)
        text(ctx, zero ? 'weight 0: ignored' : `w·p = ${num(wi * pv[i])}`, hx, hy + 25, {
          color: zero ? '#fbbf24' : '#94a3b8',
          size: 10,
          align: 'center',
        })
      hits.current.push({ x: hx, y: hy, r: 30, h: { kind: 'w', i } })

      // Input node
      glow(ctx, inX, y, inR * 2.2, '#fde68a', 0.15 + 0.5 * pv[i])
      ctx.beginPath()
      ctx.arc(inX, y, inR, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(253,230,138,${(0.15 + 0.75 * pv[i]).toFixed(2)})`
      ctx.fill()
      ctx.strokeStyle = '#fde68a'
      ctx.lineWidth = 1.5
      ctx.stroke()
      text(ctx, pv[i].toFixed(2), inX, y + 4, { color: pv[i] > 0.55 ? '#0f172a' : '#f8fafc', size: narrow ? 9 : 11, align: 'center', bold: true })
      text(ctx, `p${R === 1 ? '' : SUB[i]} ${narrow ? inputs[i].short : inputs[i].name}`, Math.max(4, inX - inR), y - inR - 6, {
        color: '#fde68a',
        size: 10,
      })
      hits.current.push({ x: inX, y, r: inR + 8, h: { kind: 'p', i } })
    }

    // Bias, entering the cell body from above with a constant input of 1
    const by = Math.max(22, cy - rad - dh * 0.2)
    line(ctx, cx, by + 12, cx, cy - rad, signColor(b), 1.5 + Math.min(4, Math.abs(b)) * 0.9)
    roundRect(ctx, cx - 36, by - 11, 72, 22, 6)
    ctx.fillStyle = 'rgba(2,6,23,0.9)'
    ctx.fill()
    ctx.strokeStyle = signColor(b)
    ctx.lineWidth = 1.2
    ctx.stroke()
    text(ctx, `b = ${num(b, 1)}`, cx, by + 4, { color: '#f8fafc', size: 11, align: 'center' })
    text(ctx, 'bias (input fixed at 1)', cx + 42, by + 4, { color: '#94a3b8', size: 10, maxWidth: W - cx - 46 })
    hits.current.push({ x: cx, y: by, r: 30, h: { kind: 'b' } })

    // Cell body: the summer
    const level = clamp(Math.abs(s.a) / (fn === 'purelin' || fn === 'poslin' ? 3 : 1), 0, 1)
    const breathe = 1 + Math.sin(t * 2.4) * 0.03
    glow(ctx, cx, cy, rad * (1.7 + level * 0.9) * breathe, COLOR, 0.25 + 0.5 * level)
    ctx.beginPath()
    ctx.arc(cx, cy, rad * breathe, 0, Math.PI * 2)
    const g = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, 2, cx, cy, rad)
    g.addColorStop(0, `rgba(250,232,255,${(0.35 + 0.6 * level).toFixed(2)})`)
    g.addColorStop(1, 'rgba(134,25,143,0.85)')
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = '#f5d0fe'
    ctx.lineWidth = 2
    ctx.stroke()
    text(ctx, 'Σ', cx, cy - rad * 0.2, { color: '#fdf4ff', size: rad * 0.55, align: 'center', bold: true, sans: true })
    text(ctx, `n = ${num(s.n)}`, cx, cy + rad * 0.45, { color: '#fdf4ff', size: clamp(rad * 0.3, 10, 15), align: 'center', bold: true })

    // Axon → transfer function box → output
    const fb = clamp(rad * 0.75, 20, 40)
    line(ctx, cx + rad, cy, fx - fb, cy, '#f5d0fe', 3)
    line(ctx, fx + fb, cy, ox - inR - 6, cy, '#f5d0fe', 3)
    arrowHead(ctx, ox - inR - 2, cy, 0, 9, '#f5d0fe')
    const u = (t * 0.7) % 1
    glow(ctx, lerp(cx + rad, ox - inR, u), cy, 6 + level * 8, '#ffffff', 0.4 + 0.5 * level)
    roundRect(ctx, fx - fb, cy - fb, fb * 2, fb * 2, 7)
    ctx.fillStyle = '#0f172a'
    ctx.fill()
    ctx.strokeStyle = COLOR
    ctx.lineWidth = 1.5
    ctx.stroke()
    const yr = yRange(fn)
    ctx.beginPath()
    for (let k = 0; k <= 40; k++) {
      const xn = -4 + (8 * k) / 40
      const px = fx - fb + 4 + ((fb * 2 - 8) * k) / 40
      const py = cy + fb - 4 - ((clamp(f.f(xn), yr[0], yr[1]) - yr[0]) / (yr[1] - yr[0])) * (fb * 2 - 8)
      if (k) ctx.lineTo(px, py)
      else ctx.moveTo(px, py)
    }
    ctx.strokeStyle = '#f5d0fe'
    ctx.lineWidth = 1.6
    ctx.stroke()
    text(ctx, `f = ${fn}`, fx, cy - fb - 6, { color: COLOR, size: 10, align: 'center' })

    const on = clamp((s.a - yr[0]) / (yr[1] - yr[0]), 0, 1)
    glow(ctx, ox, cy, inR * 2.6, yes ? '#34d399' : '#64748b', 0.2 + 0.5 * on)
    ctx.beginPath()
    ctx.arc(ox, cy, inR + 3, 0, Math.PI * 2)
    ctx.fillStyle = yes ? 'rgba(52,211,153,0.85)' : 'rgba(51,65,85,0.9)'
    ctx.fill()
    ctx.strokeStyle = yes ? '#a7f3d0' : '#94a3b8'
    ctx.lineWidth = 1.5
    ctx.stroke()
    text(ctx, num(s.a), ox, cy + 4, { color: yes ? '#022c22' : '#f8fafc', size: narrow ? 9 : 11, align: 'center', bold: true })
    text(ctx, 'a = f(n)', ox, cy - inR - 10, { color: '#e2e8f0', size: 10, align: 'center' })
    // Umbrella
    const uy = cy + inR + (narrow ? 26 : 34)
    const ur = narrow ? 13 : 17
    ctx.save()
    ctx.globalAlpha = yes ? 1 : 0.3
    ctx.beginPath()
    ctx.arc(ox, uy, ur, Math.PI, 0)
    ctx.closePath()
    ctx.fillStyle = yes ? '#34d399' : '#94a3b8'
    ctx.fill()
    line(ctx, ox, uy, ox, uy + ur * 0.9, yes ? '#a7f3d0' : '#94a3b8', 2)
    ctx.restore()
    text(ctx, yes ? 'take it' : 'leave it', ox, uy + ur + 14, { color: yes ? '#6ee7b7' : '#94a3b8', size: 10, align: 'center', bold: true })

    // Biology ↔ model
    const bioY = Math.min(dh - 30, cy + Math.max(rad + 26, dh * 0.27 + inR + 16))
    const bio = (label: string, model: string, x: number) => {
      text(ctx, label, x, bioY, { color: '#f0abfc', size: 10, align: 'center', bold: true, sans: true })
      if (!narrow) text(ctx, model, x, bioY + 13, { color: '#94a3b8', size: 10, align: 'center', sans: true })
    }
    bio('dendrites', 'inputs p, weighted by synapses w', lerp(inX, cx, 0.4))
    bio('cell body', 'adds everything: n = Wp + b', cx)
    bio('axon', 'carries the output a = f(n)', lerp(fx, ox, narrow ? 0.1 : 0.4))

    // The sum written out with the live numbers
    const terms = pv.map((v, i) => `(${num(wv[i], 1)})(${v.toFixed(2)})`).join(' + ')
    text(ctx, `n = ${terms} + (${num(b, 1)}) = ${num(n)}     a = ${fn}(${num(n)}) = ${num(a, 3)}`, W / 2, dh - 6, {
      color: '#e2e8f0',
      size: 12,
      align: 'center',
      maxWidth: W - 16,
    })

    // ── The transfer function with the operating point ──────────
    const pl = makePlot(W, H, [-6, 6], yr, { t: dh + 16, b: 30, l: 40 })
    drawAxes(ctx, pl, {
      xTicks: [-6, -4, -2, 0, 2, 4, 6],
      yTicks: fn === 'purelin' ? [-6, -3, 0, 3, 6] : fn === 'poslin' ? [0, 2, 4, 6] : yr[0] < -1 ? [-1, 0, 1] : [0, 0.5, 1],
      xLabel: 'net input n',
      yLabel: `output a = ${fn}(n):  ${f.equation}`,
    })
    line(ctx, pl.X(0), pl.top, pl.X(0), pl.bottom, 'rgba(148,163,184,0.35)')
    line(ctx, pl.left, pl.Y(yesLevel(fn)), pl.right, pl.Y(yesLevel(fn)), 'rgba(52,211,153,0.45)', 1, [5, 5])
    text(ctx, 'above this line: yes', pl.right - 4, pl.Y(yesLevel(fn)) - 4, { color: '#6ee7b7', size: 10, align: 'right' })
    const stepFn = fn === 'hardlim' || fn === 'hardlims'
    if (stepFn) {
      // Draw the jump at n = 0 as two flat pieces so the step is not shown as a slope
      drawCurve(ctx, pl, f.f, { color: COLOR, width: 3, glow: true, to: -1e-6 })
      drawCurve(ctx, pl, f.f, { color: COLOR, width: 3, glow: true, from: 0 })
      line(ctx, pl.X(0), pl.Y(f.f(-1)), pl.X(0), pl.Y(f.f(1)), 'rgba(232,121,249,0.4)', 1, [3, 3])
    } else drawCurve(ctx, pl, f.f, { color: COLOR, width: 3, glow: true })
    const off = Math.abs(s.n) > 6
    const dn = clamp(s.n, -6, 6)
    const da = clamp(f.f(dn), yr[0], yr[1])
    line(ctx, pl.X(dn), pl.bottom, pl.X(dn), pl.Y(da), 'rgba(248,250,252,0.5)', 1, [3, 4])
    line(ctx, pl.left, pl.Y(da), pl.X(dn), pl.Y(da), 'rgba(248,250,252,0.5)', 1, [3, 4])
    glow(ctx, pl.X(dn), pl.Y(da), 18, '#ffffff', 0.5)
    ctx.beginPath()
    ctx.arc(pl.X(dn), pl.Y(da), 6 + Math.sin(t * 5), 0, Math.PI * 2)
    ctx.fillStyle = '#f8fafc'
    ctx.fill()
    const lbl = off ? `off the chart: n = ${num(n, 1)}, a = ${num(a)}` : `n = ${num(s.n)}, a = ${num(s.a)}`
    const right = pl.X(dn) < (pl.left + pl.right) / 2
    text(ctx, lbl, pl.X(dn) + (right ? 12 : -12), clamp(pl.Y(da) - 10, pl.top + 26, pl.bottom - 6), {
      color: '#f8fafc',
      size: 11,
      align: right ? 'left' : 'right',
      bold: true,
    })
  }

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = pointerXY(e)
    const hit = hits.current.find((h) => Math.hypot(x - h.x, y - h.y) <= h.r)
    if (!hit) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const v = hit.h.kind === 'b' ? b : hit.h.kind === 'p' ? p[hit.h.i] : w[hit.h.i]
    drag.current = { h: hit.h, y, v }
  }
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    if (!d) return
    const dy = d.y - pointerXY(e).y
    if (d.h.kind === 'p') setP(setAt(p, d.h.i, clamp(Math.round((d.v + dy / 140) * 100) / 100, 0, 1)))
    else if (d.h.kind === 'w') setW(setAt(w, d.h.i, clamp(Math.round((d.v + dy / 28) * 10) / 10, -4, 4)))
    else setB(clamp(Math.round((d.v + dy / 20) * 10) / 10, -10, 10))
  }

  const zeroIdx = wv.findIndex((x) => Math.abs(x) < 1e-9)
  const maxIn = wv.reduce((s, x) => s + Math.max(0, x), 0)
  const minIn = wv.reduce((s, x) => s + Math.min(0, x), 0)
  const alwaysYes = transferFns[fn].f(minIn + b) > yesLevel(fn)
  const alwaysNo = !(transferFns[fn].f(maxIn + b) > yesLevel(fn))
  return (
    <LabShell
      labId="neuron"
      actions={{
        break: {
          label: 'Forecast weight 0, bias +8',
          run: () => {
            setMode('multi')
            setW([2, 1, 0])
            setB(8)
          },
        },
        fix: {
          label: 'Restore sensible weights and bias',
          run: () => {
            setW(defaults.w)
            setB(defaults.b)
          },
        },
      }}
      happening={
        <>
          <p>
            The cell body adds {R === 1 ? 'w·p' : `${R} weighted inputs`} and the bias: n = {num(n)}. The {f.label.toLowerCase()}{' '}
            function turns that into a = {num(a, 3)}, which reads as <b>{yes ? 'take the umbrella' : 'leave the umbrella'}</b>{' '}
            (yes means a above {yesLevel(fn)}).
          </p>
          {zeroIdx >= 0 && (
            <p>
              w{R === 1 ? '' : SUB[zeroIdx]} = 0, so {inputs[zeroIdx].name} is multiplied by zero. Move that input: n does not change.
            </p>
          )}
          {alwaysYes ? (
            <p>
              The bias {num(b, 1)} is larger than anything the inputs can take away (at most {num(-minIn, 1)}), so the answer is yes for
              every input.
            </p>
          ) : alwaysNo ? (
            <p>
              Even with every input at 1 the weights add only {num(maxIn, 1)}, not enough to overcome the bias {num(b, 1)}. The answer is
              always no.
            </p>
          ) : (
            <p>
              The neuron switches to yes when the weighted inputs add up to more than {num(-b, 1)}: the bias sets that bar.
            </p>
          )}
        </>
      }
      panel={
        <>
          <Group title="Neuron type">
            <Seg
              value={mode}
              onChange={setMode}
              options={[
                { value: 'single', label: 'Single input: a = f(wp + b)' },
                { value: 'multi', label: 'Three inputs: a = f(Wp + b)' },
              ]}
            />
          </Group>
          <Group title="Inputs p (0 = none, 1 = full)">
            {pv.map((v, i) => (
              <Slider key={i} label={`p${R === 1 ? '' : SUB[i]} ${inputs[i].name}`} value={v} min={0} max={1} step={0.01} onChange={(x) => setP(setAt(p, i, x))} fmt={(x) => x.toFixed(2)} />
            ))}
          </Group>
          <Group title="Weights w and bias b">
            {wv.map((v, i) => (
              <Slider key={i} label={`w${R === 1 ? '' : SUB[i]} trust in ${inputs[i].short}`} value={v} min={-4} max={4} step={0.1} onChange={(x) => setW(setAt(w, i, x))} fmt={(x) => num(x, 1)} />
            ))}
            <Slider label="b bias" value={b} min={-10} max={10} step={0.1} onChange={setB} fmt={(x) => num(x, 1)} />
          </Group>
          <Group title="Transfer function f">
            <Seg value={fn} onChange={setFn} options={transferNames.map((name) => ({ value: name, label: name }))} />
            <p className="text-[11px] leading-snug text-slate-400">
              <b className="text-slate-200">{f.label}.</b> <span className="font-mono">{f.equation}</span>
            </p>
            <Stats>
              <Stat label="Net input n" value={num(n, 3)} />
              <Stat label="Output a" value={num(a, 3)} tone={yes ? 'good' : 'plain'} />
            </Stats>
            <Btn
              onClick={() => {
                setP(defaults.p)
                setW(defaults.w)
                setB(defaults.b)
              }}
            >
              Reset the neuron
            </Btn>
          </Group>
        </>
      }
    >
      <Canvas2D
        draw={onDraw}
        className="touch-none"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      />
      <div className="pointer-events-none absolute right-2 top-2 rounded-md bg-slate-950/70 px-2 py-1 text-[10px] text-slate-400">
        Drag a yellow input, a weight box or the bias box up and down
      </div>
    </LabShell>
  )
}
