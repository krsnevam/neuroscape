import { useCallback, useMemo, useRef, useState, type PointerEvent } from 'react'
import Canvas2D, { dot, drawAxes, makePlot, useTicker, type Plot } from '../../ui/lab/Canvas2D'
import { Btn, Slider, Stat, Stats } from '../../ui/lab/controls'
import { CLASS_COLORS, drawPlane, NEURON_COLORS, type View } from './draw'
import {
  CLASSES,
  cloneNet,
  costCurve,
  createTrainer,
  describeParam,
  encode,
  evaluate,
  forward,
  getParam,
  HIDDEN,
  randomNet,
  setParam,
  slopeOf,
  trainEpoch,
  type Net,
  type ParamRef,
  type Sample,
  type Trainer,
} from './sim'

const f2 = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2))
const RANGE: [number, number] = [-6, 6]
const VALUES = Array.from({ length: 61 }, (_, i) => RANGE[0] + (i / 60) * (RANGE[1] - RANGE[0]))
const POS = '#2dd4bf'
const NEG = '#fb7185'
const AMBER = '#fbbf24'
const sameRef = (a: ParamRef, b: ParamRef) => JSON.stringify(a) === JSON.stringify(b)

interface Wire {
  ref: ParamRef
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * The weight workshop: one weight at a time. The middle plot is the average cost over the whole
 * log as that single weight is varied; the map shows what the network would answer everywhere.
 * Drag the weight by hand, then let training take the same downhill steps.
 */
export default function WeightLab({ data, trained, tutor, onNext }: { data: Sample[]; trained: Net; tutor: boolean; onNext: () => void }) {
  const netRef = useRef<Net>(cloneNet(trained))
  const trainer = useRef<Trainer | null>(null)
  const [sel, setSel] = useState<ParamRef>({ kind: 'W1', j: 0, i: 1 })
  const [mode, setMode] = useState<'idle' | 'one' | 'all'>('idle')
  const [tasks, setTasks] = useState({ broke: false, rolled: false, trained: false })
  const [fromRandom, setFromRandom] = useState(false)
  const [, bump] = useState(0)
  const redraw = useCallback(() => bump((n) => n + 1), [])
  useTicker(mode === 'idle' ? 100000 : 150)
  const live = useRef({ mode, sel, fromRandom })
  live.current = { mode, sel, fromRandom }
  const wires = useRef<Wire[]>([])
  const curvePlot = useRef<Plot | null>(null)
  const dragging = useRef(false)
  const steps = useRef(0)

  const net = netRef.current
  const value = getParam(net, sel)
  const score = evaluate(net, data)
  const slope = slopeOf(net, data, sel)
  const right = Math.round(score.acc * data.length)
  const sample = useMemo<[number, number]>(() => [5, 82], [])

  const mark = useCallback(
    (patch: Partial<typeof tasks>) => setTasks((t) => ({ ...t, ...patch })),
    [],
  )
  const change = (v: number) => {
    setMode('idle')
    setParam(net, sel, Math.max(RANGE[0], Math.min(RANGE[1], v)))
    if (evaluate(net, data).acc < 0.7) mark({ broke: true })
    redraw()
  }

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const n = netRef.current
    const L = live.current
    // training, a few steps every frame
    if (L.mode === 'one') {
      for (let k = 0; k < 2; k++) {
        const g = slopeOf(n, data, L.sel)
        setParam(n, L.sel, Math.max(RANGE[0], Math.min(RANGE[1], getParam(n, L.sel) - 1.5 * g)))
        steps.current++
        if (Math.abs(g) < 0.004 || steps.current > 500) {
          setMode('idle')
          if (L.fromRandom) mark({ rolled: true })
          break
        }
      }
    } else if (L.mode === 'all' && trainer.current) {
      for (let k = 0; k < 5; k++) trainEpoch(trainer.current, data)
      if (trainer.current.epoch >= 1500) setMode('idle')
      if (evaluate(n, data).acc >= 0.9 && L.fromRandom) mark({ trained: true })
    }

    const wide = w >= 900
    const pad = 10
    const A = wide ? { x: pad, y: 30, w: w * 0.3 - pad, h: h - 40 } : { x: pad, y: 30, w: w - 2 * pad, h: h * 0.3 - 30 }
    const B = wide ? { x: w * 0.3 + pad, y: 30, w: w * 0.36 - pad, h: h - 40 } : { x: pad, y: h * 0.3 + 26, w: w - 2 * pad, h: h * 0.34 - 30 }
    const C = wide ? { x: w * 0.66 + pad, y: 30, w: w * 0.34 - 2 * pad, h: h - 40 } : { x: pad, y: h * 0.64 + 26, w: w - 2 * pad, h: h * 0.36 - 32 }
    const head = (s: string, x: number, y: number) => {
      ctx.font = '600 12px system-ui, sans-serif'
      ctx.fillStyle = '#e2e8f0'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(s, x, y)
    }
    const small = (s: string, x: number, y: number, color = '#94a3b8', align: CanvasTextAlign = 'left', bold = false) => {
      ctx.font = `${bold ? '600 ' : ''}11px ui-monospace, monospace`
      ctx.fillStyle = color
      ctx.textAlign = align
      ctx.textBaseline = 'middle'
      ctx.fillText(s, x, y)
    }

    // ---- A: the network, every wire can be tapped
    head('1. Tap any wire or bias', A.x, A.y - 14)
    const xin = A.x + A.w * 0.14
    const xh = A.x + A.w * 0.5
    const xo = A.x + A.w * 0.8
    const top = A.y + 30
    const span = A.h - 70
    const inY = (i: number) => top + span / 2 + (i - 0.5) * span * 0.4
    const hidY = (j: number) => top + ((j + 0.5) / HIDDEN) * span
    const outY = (k: number) => top + ((k + 0.5) / 3) * span
    const r = Math.max(10, Math.min(17, span / 14))
    const list: Wire[] = []
    for (let j = 0; j < HIDDEN; j++) for (let i = 0; i < 2; i++) list.push({ ref: { kind: 'W1', j, i }, x1: xin + r, y1: inY(i), x2: xh - r, y2: hidY(j) })
    for (let k = 0; k < 3; k++) for (let j = 0; j < HIDDEN; j++) list.push({ ref: { kind: 'W2', k, j }, x1: xh + r, y1: hidY(j), x2: xo - r, y2: outY(k) })
    // biases are short stubs above their neurons
    for (let j = 0; j < HIDDEN; j++) list.push({ ref: { kind: 'b1', j }, x1: xh, y1: hidY(j) - r - 16, x2: xh, y2: hidY(j) - r })
    for (let k = 0; k < 3; k++) list.push({ ref: { kind: 'b2', k }, x1: xo, y1: outY(k) - r - 16, x2: xo, y2: outY(k) - r })
    wires.current = list
    for (const wr of list) {
      const v = getParam(n, wr.ref)
      const on = sameRef(wr.ref, L.sel)
      if (on) {
        ctx.strokeStyle = 'rgba(248,250,252,0.9)'
        ctx.lineWidth = 9 + Math.sin(t * 5) * 1.5
        ctx.beginPath()
        ctx.moveTo(wr.x1, wr.y1)
        ctx.lineTo(wr.x2, wr.y2)
        ctx.stroke()
      }
      ctx.strokeStyle = v >= 0 ? POS : NEG
      ctx.globalAlpha = on ? 1 : 0.5
      ctx.lineWidth = 1 + 4 * Math.min(1, Math.abs(v) / 3)
      ctx.beginPath()
      ctx.moveTo(wr.x1, wr.y1)
      ctx.lineTo(wr.x2, wr.y2)
      ctx.stroke()
      ctx.globalAlpha = 1
      if (wr.ref.kind === 'b1' || wr.ref.kind === 'b2') dot(ctx, wr.x1, wr.y1, 4, v >= 0 ? POS : NEG)
      if (on) small(f2(v), (wr.x1 + wr.x2) / 2 + 8, (wr.y1 + wr.y2) / 2 - 12, '#f8fafc', 'left', true)
    }
    const pass = forward(n, encode(sample))
    const nodeAt = (x: number, y: number, ring: string, s: string) => {
      dot(ctx, x, y, r, '#0f172a')
      ctx.strokeStyle = ring
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.stroke()
      small(s, x, y + 0.5, '#f8fafc', 'center')
    }
    nodeAt(xin, inY(0), '#94a3b8', 'p₁')
    nodeAt(xin, inY(1), '#94a3b8', 'p₂')
    small('vibration', xin, inY(0) + r + 10, '#94a3b8', 'center')
    small('temperature', xin, inY(1) + r + 10, '#94a3b8', 'center')
    for (let j = 0; j < HIDDEN; j++) nodeAt(xh, hidY(j), NEURON_COLORS[j], String(j + 1))
    for (let k = 0; k < 3; k++) {
      nodeAt(xo, outY(k), CLASS_COLORS[k], `${Math.round(pass.a2[k] * 100)}`)
      small(CLASSES[k], xo + r + 5, outY(k), CLASS_COLORS[k], 'left', true)
    }
    small('teal: positive · rose: negative · thick: large', A.x, A.y + A.h - 8)

    // ---- B: the cost valley of the chosen weight
    head('2. Its cost valley: drag the marker', B.x, B.y - 14)
    const costs = costCurve(n, data, L.sel, VALUES)
    const now = evaluate(n, data).loss
    const maxC = Math.max(1.2, Math.min(4, Math.max(...costs) * 1.08))
    const pl = makePlot(w, h, RANGE, [0, maxC], { l: B.x + 40, r: w - (B.x + B.w) + 12, t: B.y + 8, b: h - (B.y + B.h) + 46 })
    curvePlot.current = pl
    drawAxes(ctx, pl, { xTicks: [-6, -3, 0, 3, 6], yTicks: [0, 0.5, 1, 1.5, 2, 3, 4].filter((v) => v <= maxC), xLabel: 'value of this one weight', yLabel: 'average cost over the 180 readings' })
    ctx.save()
    ctx.beginPath()
    ctx.rect(pl.left, pl.top, pl.right - pl.left, pl.bottom - pl.top)
    ctx.clip()
    // fill under the curve so it reads as a valley
    ctx.beginPath()
    ctx.moveTo(pl.X(VALUES[0]), pl.bottom)
    VALUES.forEach((v, i) => ctx.lineTo(pl.X(v), pl.Y(Math.min(maxC, costs[i]))))
    ctx.lineTo(pl.X(VALUES[VALUES.length - 1]), pl.bottom)
    ctx.fillStyle = 'rgba(251,191,36,0.10)'
    ctx.fill()
    ctx.beginPath()
    VALUES.forEach((v, i) => (i ? ctx.lineTo(pl.X(v), pl.Y(Math.min(maxC, costs[i]))) : ctx.moveTo(pl.X(v), pl.Y(Math.min(maxC, costs[i])))))
    ctx.strokeStyle = AMBER
    ctx.lineWidth = 3
    ctx.stroke()
    const wv = getParam(n, L.sel)
    const g = slopeOf(n, data, L.sel)
    const mx = pl.X(wv)
    const my = pl.Y(Math.min(maxC, now))
    // the slope under the marker
    const pxPerW = (pl.right - pl.left) / (RANGE[1] - RANGE[0])
    const pxPerC = (pl.bottom - pl.top) / maxC
    const dxs = 46
    ctx.strokeStyle = 'rgba(248,250,252,0.7)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(mx - dxs, my + ((g * dxs) / pxPerW) * pxPerC)
    ctx.lineTo(mx + dxs, my - ((g * dxs) / pxPerW) * pxPerC)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
    // downhill arrow
    if (Math.abs(g) > 0.004) {
      const dir = g > 0 ? -1 : 1
      const ax = mx + dir * (22 + Math.abs(Math.sin(t * 3)) * 8)
      ctx.strokeStyle = '#4ade80'
      ctx.fillStyle = '#4ade80'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(mx + dir * 14, my - 22)
      ctx.lineTo(ax + dir * 14, my - 22)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(ax + dir * 24, my - 22)
      ctx.lineTo(ax + dir * 12, my - 29)
      ctx.lineTo(ax + dir * 12, my - 15)
      ctx.fill()
      small('downhill', mx + dir * 44, my - 38, '#4ade80', 'center', true)
    } else small('flat here: this weight has nowhere better to go', mx, my - 26, '#4ade80', 'center', true)
    dot(ctx, mx, my, 11, 'rgba(248,250,252,0.25)')
    dot(ctx, mx, my, 7, '#f8fafc')
    small(`weight ${f2(wv)}   cost ${f2(now)}   slope ${f2(g)}`, pl.left, pl.bottom + 34, '#e2e8f0', 'left', true)

    // ---- C: what the network would answer everywhere
    head('3. What changes: the map of answers', C.x, C.y - 14)
    const focus = L.sel.kind === 'W1' || L.sel.kind === 'b1' ? L.sel.j : -1
    const view: View = { stage: 6, net: n, pass, reading: sample, target: 1, focus: Math.max(0, focus), data, sure: 0.6, history: [], flash: null, training: false, t }
    drawPlane(ctx, w, h, { x: C.x, y: C.y, w: C.w, h: C.h - 30 }, view, { lines: focus >= 0 ? [focus] : [], regions: true })
    const sc = evaluate(n, data)
    small(`${Math.round(sc.acc * data.length)} of ${data.length} logged motors in the right bay`, C.x, C.y + C.h - 10, sc.acc > 0.9 ? '#4ade80' : sc.acc > 0.7 ? AMBER : '#f87171', 'left', true)
  }

  const pick = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pl = curvePlot.current
    if (pl && x >= pl.left - 8 && x <= pl.right + 8 && y >= pl.top - 8 && y <= pl.bottom + 8) {
      if (e.type === 'pointerdown') dragging.current = true
      if (dragging.current) change(pl.ix(Math.max(pl.left, Math.min(pl.right, x))))
      return
    }
    if (e.type !== 'pointerdown') return
    let best: Wire | null = null
    let bestD = 14
    for (const wr of wires.current) {
      const dx = wr.x2 - wr.x1
      const dy = wr.y2 - wr.y1
      const k = Math.max(0, Math.min(1, ((x - wr.x1) * dx + (y - wr.y1) * dy) / (dx * dx + dy * dy)))
      const d = Math.hypot(x - (wr.x1 + k * dx), y - (wr.y1 + k * dy))
      if (d < bestD) {
        bestD = d
        best = wr
      }
    }
    if (best) {
      setMode('idle')
      setSel(best.ref)
    }
  }

  const scramble = () => {
    setMode('idle')
    netRef.current = randomNet(7)
    trainer.current = null
    setFromRandom(true)
    redraw()
  }
  const restore = () => {
    setMode('idle')
    netRef.current = cloneNet(trained)
    trainer.current = null
    setFromRandom(false)
    redraw()
  }
  const stars = Number(tasks.broke) + Number(tasks.rolled) + Number(tasks.trained)
  const downhill = slope > 0 ? 'smaller' : 'larger'
  const check = (ok: boolean) => <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${ok ? 'bg-emerald-400 text-slate-950' : 'border border-white/25 text-slate-500'}`}>{ok ? '✓' : ''}</span>

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <main className="relative h-[760px] shrink-0 overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
        <Canvas2D
          draw={draw}
          onPointerDown={pick}
          onPointerMove={(e) => dragging.current && pick(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
          className="touch-pan-y"
          aria-label="Left: the network with tappable wires. Middle: the cost for every value of the chosen weight. Right: the map of the network's answers."
        />
      </main>

      <aside className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-slate-950/70 px-4 py-3 lg:w-[360px] lg:overflow-y-auto lg:border-l lg:border-t-0">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">The weight workshop</div>
          <h2 className="text-base font-semibold leading-snug text-white">One weight, three questions</h2>
        </div>

        <div className="rounded-md border border-teal-400/25 bg-teal-400/[0.07] p-2.5 text-[13px] leading-snug text-slate-200">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-teal-300">The weight in your hand</div>
          <p>
            This is <b className="text-white">{describeParam(sel)}</b>. Its value is <b className="font-mono text-white">{f2(value)}</b>.
          </p>
          <div className="mt-2">
            <Slider label="Change it" value={value} min={RANGE[0]} max={RANGE[1]} step={0.05} onChange={change} fmt={f2} />
          </div>
        </div>

        <div className="flex flex-col gap-2 text-[13px] leading-snug text-slate-300">
          <p>
            <b className="text-white">What is a weight?</b> One number on one wire. The signal passing along the wire is multiplied by it. Positive passes the signal on, negative turns it against, zero cuts the wire.
          </p>
          <p>
            <b className="text-white">What happens if you change it?</b> Three things at once, all on screen: the boundaries on the map shift, some logged motors move to a different bay, and the average cost goes up or down. The amber valley is that cost for every value this weight could take.
          </p>
          <p>
            <b className="text-white">How does it get its value?</b> Nobody chooses it. Training cannot see the whole valley. It only measures the slope under the marker, here <b className="font-mono text-white">{f2(slope)}</b>, which says the cost falls if this weight gets <b className="text-white">{downhill}</b>. It moves the weight a small step that way and measures again. Every weight does this at the same time, thousands of times.
          </p>
          <p className="text-xs text-slate-400">
            The slope is the average, over all 180 readings, of (blame at the neuron this wire feeds) × (signal the wire carried). That is backpropagation, for one weight.
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">Let training do it</div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => change(value - 1.5 * slope)}>One step downhill</Btn>
            <Btn tone="go" onClick={() => ((steps.current = 0), setMode(mode === 'one' ? 'idle' : 'one'))}>
              {mode === 'one' ? 'Stop' : 'Roll this weight to the bottom'}
            </Btn>
            <Btn
              tone="go"
              onClick={() => {
                if (mode === 'all') return setMode('idle')
                trainer.current = createTrainer(netRef.current)
                setMode('all')
              }}
            >
              {mode === 'all' ? 'Stop' : 'Roll all 27 at once (train)'}
            </Btn>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn tone="warn" onClick={scramble}>
              Start from random weights
            </Btn>
            <Btn onClick={restore}>Put back the trained weights</Btn>
          </div>
        </div>

        <Stats>
          <Stat label="Motors in the right bay" value={`${right} of ${data.length}`} tone={score.acc > 0.9 ? 'good' : score.acc > 0.7 ? 'warn' : 'bad'} />
          <Stat label="Average cost" value={f2(score.loss)} />
        </Stats>

        <div className="flex flex-col gap-2 rounded-md border border-amber-400/30 bg-amber-400/[0.06] p-2.5 text-[13px] leading-snug text-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300">Three things to do</span>
            <span className="text-lg leading-none tracking-widest text-amber-300">
              {'★'.repeat(stars)}
              <span className="text-slate-600">{'★'.repeat(3 - stars)}</span>
            </span>
          </div>
          <div className="flex gap-2">
            {check(tasks.broke)}
            <span>Break it: drag one weight until fewer than 70% of the motors are right. One number can do that.</span>
          </div>
          <div className="flex gap-2">
            {check(tasks.rolled)}
            <span>Press "Start from random weights", pick a wire, and roll that one weight to the bottom of its valley. Then tap another wire: its valley has changed.</span>
          </div>
          <div className="flex gap-2">
            {check(tasks.trained)}
            <span>From random weights, roll all 27 at once until at least 90% are right. Watch the valley under your wire reshape as the others move.</span>
          </div>
          {stars === 3 && (
            <Btn tone="go" onClick={onNext}>
              Next level →
            </Btn>
          )}
        </div>

        {tutor && (
          <div className="flex flex-col gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-[13px] leading-snug">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300">Tutor notes · about 10 min</div>
            <p className="text-amber-50">
              <b>Say:</b> A trained weight is not a setting somebody chose. Start from random, and every weight slides downhill on its own valley. But the valleys are not fixed: move one weight and every other valley changes shape. That is why training takes many small steps for all weights together, and never one big step for each.
            </p>
            <p className="text-amber-50">
              <b>Ask the class:</b> Roll one weight to the bottom of its valley. Is the network now trained? Why is the cost still high? What would happen if we rolled each weight to the bottom in turn, once?
            </p>
            <p className="text-amber-50">
              <b>Listen for:</b> "Each weight has a correct value." <b>Correct it:</b> The best value for one weight depends on all the others. Train twice from different random starts and the weights differ, yet both networks work.
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
