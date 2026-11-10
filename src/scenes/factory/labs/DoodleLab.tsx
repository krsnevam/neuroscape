import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { createNetwork, createTrainer, output, paramCount, rng, type Sample } from '../../../engine'

type Pt = { x: number; y: number }
type Stroke = Pt[]
interface Example {
  strokes: Stroke[]
  cls: number
  mine: boolean
}

const classes = [
  { label: 'Circle', glyph: '○', color: '#38bdf8' },
  { label: 'Cross', glyph: '✕', color: '#fb7185' },
  { label: 'Tick', glyph: '✓', color: '#4ade80' },
]

/**
 * Feature extraction: the drawing becomes an 8 × 8 grid of 0s and 1s (64 inputs).
 * With `pre` on, the drawing is first centred and scaled to fill the grid.
 */
function rasterise(strokes: Stroke[], pre: boolean): number[] {
  const grid = new Array<number>(64).fill(0)
  const pts = strokes.flat()
  if (pts.length === 0) return grid
  let map = (p: Pt) => p
  if (pre) {
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const x0 = Math.min(...xs)
    const x1 = Math.max(...xs)
    const y0 = Math.min(...ys)
    const y1 = Math.max(...ys)
    const k = 0.84 / Math.max(x1 - x0, y1 - y0, 0.04)
    map = (p) => ({ x: 0.5 + (p.x - (x0 + x1) / 2) * k, y: 0.5 + (p.y - (y0 + y1) / 2) * k })
  }
  const mark = (p: Pt) => {
    const i = Math.floor(p.x * 8)
    const j = Math.floor(p.y * 8)
    if (i >= 0 && i < 8 && j >= 0 && j < 8) grid[j * 8 + i] = 1
  }
  for (const s of strokes) {
    const m = s.map(map)
    if (m.length === 1) mark(m[0])
    for (let i = 1; i < m.length; i++) {
      const steps = Math.ceil(Math.hypot(m[i].x - m[i - 1].x, m[i].y - m[i - 1].y) * 40) + 1
      for (let k = 0; k <= steps; k++)
        mark({ x: m[i - 1].x + ((m[i].x - m[i - 1].x) * k) / steps, y: m[i - 1].y + ((m[i].y - m[i - 1].y) * k) / steps })
    }
  }
  return grid
}

/** Starter examples so the station works before anyone has drawn anything. */
function starters(): Example[] {
  const rand = rng(8)
  const j = () => (rand() - 0.5) * 0.03
  const out: Example[] = []
  for (let n = 0; n < 7; n++) {
    const cx = 0.3 + rand() * 0.4
    const cy = 0.3 + rand() * 0.4
    const s = 0.12 + rand() * 0.14
    const circle = Array.from({ length: 26 }, (_, i) => ({
      x: cx + Math.cos((i / 25) * Math.PI * 2) * s * (0.85 + rand() * 0.3) + j(),
      y: cy + Math.sin((i / 25) * Math.PI * 2) * s + j(),
    }))
    out.push({ strokes: [circle], cls: 0, mine: false })
    out.push({
      strokes: [
        [{ x: cx - s + j(), y: cy - s + j() }, { x: cx + s + j(), y: cy + s + j() }],
        [{ x: cx + s + j(), y: cy - s + j() }, { x: cx - s + j(), y: cy + s + j() }],
      ],
      cls: 1,
      mine: false,
    })
    out.push({
      strokes: [[
        { x: cx - s + j(), y: cy + j() },
        { x: cx - 0.35 * s + j(), y: cy + 0.7 * s + j() },
        { x: cx + s + j(), y: cy - 0.9 * s + j() },
      ]],
      cls: 2,
      mine: false,
    })
  }
  return out
}

function Thumb({ grid, color }: { grid: number[]; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 8, 8)
    ctx.fillStyle = color
    grid.forEach((v, k) => v && ctx.fillRect(k % 8, Math.floor(k / 8), 1, 1))
  }, [grid, color])
  return <canvas ref={ref} width={8} height={8} className="h-7 w-7 rounded-sm bg-white/5" style={{ imageRendering: 'pixelated' }} />
}

export default function DoodleLab() {
  const [examples, setExamples] = useState<Example[]>(starters)
  const [pre, setPre] = useState(true)
  const [tally, setTally] = useState({ right: 0, total: 0 })
  const drawing = useRef<Stroke[]>([])
  const active = useRef(false)
  const [, bump] = useState(0)
  useTicker(150)

  const sim = useMemo(() => {
    const net = createNetwork(64, [10, 3], ['tansig', 'purelin'], { seed: 3, range: 0.3 })
    const grids = examples.map((e) => rasterise(e.strokes, pre))
    const data: Sample[] = examples.map((e, i) => ({ p: grids[i], t: classes.map((_, c) => (c === e.cls ? 1 : 0)) }))
    return { net, trainer: createTrainer(net), data, grids, its: 0, loss: 1 }
  }, [examples, pre])

  const seen = rasterise(drawing.current, pre)
  const empty = drawing.current.length === 0
  const probs = empty ? [0, 0, 0] : output(sim.net, seen, 'softmax')
  const guess = probs.indexOf(Math.max(...probs))

  const point = (e: PointerEvent<HTMLCanvasElement>): Pt => {
    const box = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height }
  }
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    active.current = true
    drawing.current = [...drawing.current, [point(e)]]
  }
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!active.current) return
    drawing.current[drawing.current.length - 1].push(point(e))
  }
  const up = () => {
    active.current = false
    bump((v) => v + 1)
  }
  const clear = () => {
    drawing.current = []
    bump((v) => v + 1)
  }
  const teach = (cls: number) => {
    if (empty) return
    setTally((t) => ({ right: t.right + (guess === cls ? 1 : 0), total: t.total + 1 }))
    setExamples((ex) => [...ex, { strokes: drawing.current, cls, mine: true }])
    drawing.current = []
  }

  const drawPad = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (sim.data.length && sim.its < 4000) {
      for (let k = 0; k < 8; k++) sim.loss = sim.trainer.step(sim.data, { alpha: 0.1, gamma: 0.9, loss: 'softmax' })
      sim.its += 8
    }
    ctx.strokeStyle = 'rgba(148,163,184,0.12)'
    ctx.lineWidth = 1
    for (let i = 1; i < 8; i++) {
      ctx.beginPath()
      ctx.moveTo((i * w) / 8, 0)
      ctx.lineTo((i * w) / 8, h)
      ctx.moveTo(0, (i * h) / 8)
      ctx.lineTo(w, (i * h) / 8)
      ctx.stroke()
    }
    if (empty) {
      ctx.fillStyle = '#64748b'
      ctx.font = '14px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Draw a circle, a cross or a tick', w / 2, h / 2)
    }
    ctx.strokeStyle = '#f8fafc'
    ctx.lineWidth = Math.max(4, w / 40)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const s of drawing.current) {
      ctx.beginPath()
      s.forEach((p, i) => (i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h)))
      if (s.length === 1) ctx.lineTo(s[0].x * w + 0.1, s[0].y * h)
      ctx.stroke()
    }
  }

  const drawSeen = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    seen.forEach((v, k) => {
      ctx.fillStyle = v ? classes[guess]?.color ?? '#f8fafc' : 'rgba(148,163,184,0.1)'
      ctx.fillRect((k % 8) * (w / 8) + 1, Math.floor(k / 8) * (h / 8) + 1, w / 8 - 2, h / 8 - 2)
    })
  }

  const mine = examples.filter((e) => e.mine).length
  return (
    <LabShell
      labId="doodle"
      happening={
        <>
          {empty ? (
            <p>
              Waiting for a drawing. The network has learned from {examples.length} examples; its training loss is {sim.loss.toFixed(3)}.
            </p>
          ) : (
            <>
              <p>
                Your strokes became {seen.filter(Boolean).length} lit cells out of 64. Those 64 numbers are all the network sees.
              </p>
              <p>
                Softmax turns its three outputs into probabilities that add to 100%: {classes.map((c, i) => `${c.label} ${(probs[i] * 100).toFixed(0)}%`).join(', ')}.
              </p>
            </>
          )}
          <p>
            {pre
              ? 'Preprocessing is on: every drawing is centred and scaled first, so where and how big you draw does not matter.'
              : 'Preprocessing is off: the drawing is used exactly where you drew it, so the same shape in a new place lights different cells.'}
          </p>
        </>
      }
      actions={{
        break: { label: 'Switch preprocessing off', run: () => setPre(false) },
        fix: { label: 'Centre and scale again', run: () => setPre(true) },
      }}
      panel={
        <>
          <Group title="Preprocessing">
            <Toggle
              label="Centre and scale the drawing"
              hint="Before it is turned into 64 inputs"
              value={pre}
              onChange={setPre}
            />
          </Group>
          <Group title="How it is doing">
            <Stats>
              <Stat label="Examples" value={`${examples.length} (${mine} yours)`} />
              <Stat
                label="Your new drawings"
                value={tally.total ? `${tally.right} of ${tally.total}` : 'teach it one'}
                tone={tally.total && tally.right / tally.total < 0.6 ? 'bad' : 'plain'}
              />
              <Stat label="Training loss" value={sim.loss.toFixed(3)} />
              <Stat label="Network" value={`64-10-3 · ${paramCount(sim.net)}`} />
            </Stats>
            <Btn onClick={() => { setExamples(starters()); setTally({ right: 0, total: 0 }) }}>Forget my examples</Btn>
          </Group>
          <Group title="Training examples, as the network sees them">
            {classes.map((c, ci) => (
              <div key={c.label} className="flex flex-wrap items-center gap-1">
                <span className="w-5 text-center text-base" style={{ color: c.color }}>{c.glyph}</span>
                {examples.map((e, i) => (e.cls === ci ? <Thumb key={i} grid={sim.grids[i] ?? []} color={c.color} /> : null))}
              </div>
            ))}
          </Group>
        </>
      }
    >
      <div className="flex h-full flex-col items-center justify-center gap-3 overflow-y-auto p-3">
        <div className="flex w-full max-w-xl items-stretch justify-center gap-3">
          <div className="aspect-square min-w-0 flex-1 overflow-hidden rounded-lg border border-white/15 bg-slate-900" style={{ maxWidth: 'min(340px, 42vh)' }}>
            <Canvas2D draw={drawPad} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="cursor-crosshair" />
          </div>
          <div className="flex w-36 shrink-0 flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">What the network sees</span>
            <div className="aspect-square w-24 overflow-hidden rounded-md border border-white/10 bg-slate-900">
              <Canvas2D draw={drawSeen} />
            </div>
            <div className="flex flex-col gap-1.5">
              {classes.map((c, i) => (
                <div key={c.label} className="flex items-center gap-1.5 text-xs">
                  <span className="w-4 text-center" style={{ color: c.color }}>{c.glyph}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-sm bg-white/10">
                    <div className="h-full transition-[width] duration-150" style={{ width: `${probs[i] * 100}%`, background: c.color }} />
                  </div>
                  <span className="w-8 text-right font-mono text-slate-300">{(probs[i] * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
            {!empty && (
              <div className="text-xs text-slate-300">
                It thinks: <b style={{ color: classes[guess].color }}>{classes[guess].label}</b>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-slate-400">It was a</span>
          {classes.map((c, i) => (
            <Btn key={c.label} onClick={() => teach(i)} disabled={empty}>
              <span style={{ color: c.color }}>{c.glyph}</span> {c.label}
            </Btn>
          ))}
          <Btn onClick={clear} disabled={empty}>Clear</Btn>
        </div>
      </div>
    </LabShell>
  )
}
