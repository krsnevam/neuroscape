import { useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { drawAxes, makePlot, useTicker, type Plot } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { angleDeg, convergenceBound, separatingLine } from '../../../engine/perceptron'
import { clamp, drawBoundary, lerp, nearest, num, pointerPos, Scene, shadeSide, squarePlot, tag, vec } from './kit'

type Wiring = 'and' | 'or' | 'xor' | 'custom'
interface Lamp {
  p: [number, number]
  t: 0 | 1
}

/** Switch A is p₁, switch B is p₂: 0 = down, 1 = up. The target is whether the light is on. */
const corners: [number, number][] = [[0, 0], [1, 0], [0, 1], [1, 1]]
const rules: Record<Exclude<Wiring, 'custom'>, (0 | 1)[]> = {
  and: [0, 0, 0, 1],
  or: [0, 1, 1, 1],
  xor: [0, 1, 1, 0],
}
const makeLamps = (w: Exclude<Wiring, 'custom'>): Lamp[] => corners.map((p, i) => ({ p: [...p] as [number, number], t: rules[w][i] }))

function makeSim(lamps: Lamp[]) {
  return {
    lamps,
    /** x = [w₁, w₂, b]. The convergence proof starts from zero. */
    x: [0, 0, 0],
    shown: [0, 0, 0],
    k: 0,
    presented: 0,
    pos: 0,
    clean: 0,
    lastIdx: -1,
    lastT: 0,
    acc: 0,
    /** after every weight change: the angle to x* (NaN when there is none) and how many lamps are wrong */
    hist: [] as { angle: number; wrong: number }[],
  }
}

const RANGE: [number, number] = [-0.9, 1.9]
const ON = '#fbbf24'
const SOL = '#34d399'

export default function XorRoomLab() {
  const [wiring, setWiring] = useState<Wiring>('and')
  const [rate, setRate] = useState(4)
  const [running, setRunning] = useState(true)
  const [showSol, setShowSol] = useState(true)
  const simRef = useRef(makeSim(makeLamps('and')))
  const plot = useRef<Plot | null>(null)
  const drag = useRef<{ i: number; x: number; y: number; moved: boolean } | null>(null)
  useTicker(150)
  const sim = simRef.current

  const sol = separatingLine(sim.lamps)
  const xStar = sol ? [sol.w[0], sol.w[1], sol.b] : null
  const bound = xStar ? convergenceBound(xStar, sim.lamps) : null
  const outOf = (x: number[], l: Lamp) => (x[0] * l.p[0] + x[1] * l.p[1] + x[2] >= 0 ? 1 : 0)
  const wrong = sim.lamps.filter((l) => outOf(sim.x, l) !== l.t).length
  const stopped = sim.clean >= sim.lamps.length && wrong === 0
  const angle = xStar ? angleDeg(sim.x, xStar) : NaN

  const restart = (lamps: Lamp[] = sim.lamps) => {
    simRef.current = makeSim(lamps)
  }
  const wire = (w: Wiring) => {
    setWiring(w)
    if (w !== 'custom') restart(makeLamps(w))
    setRunning(true)
  }

  const present = () => {
    const s = simRef.current
    const l = s.lamps[s.pos]
    s.lastIdx = s.pos
    s.lastT = performance.now() / 1000
    s.pos = (s.pos + 1) % s.lamps.length
    s.presented++
    const e = l.t - outOf(s.x, l)
    if (e === 0) {
      s.clean++
      return
    }
    // Unified rule on x = [w; b] with z = [p; 1]: x_new = x_old + e z
    s.x = [s.x[0] + e * l.p[0], s.x[1] + e * l.p[1], s.x[2] + e]
    s.k++
    s.clean = 0
    const line = separatingLine(s.lamps)
    s.hist.push({
      angle: line ? angleDeg(s.x, [line.w[0], line.w[1], line.b]) : NaN,
      wrong: s.lamps.filter((q) => outOf(s.x, q) !== q.t).length,
    })
    if (s.hist.length > 400) s.hist.splice(0, s.hist.length - 400)
  }

  const onDraw = (ctx: CanvasRenderingContext2D, cw: number, ch: number, t: number, dt: number) => {
    const s = simRef.current
    const done = s.clean >= s.lamps.length
    if (running && !done && !drag.current) {
      s.acc += dt * rate
      let guard = 0
      while (s.acc >= 1 && guard++ < 8) {
        s.acc -= 1
        if (s.clean < s.lamps.length) present()
      }
    }
    const kk = 1 - Math.exp(-dt * Math.max(8, rate * 1.5))
    s.shown = s.shown.map((v, i) => lerp(v, s.x[i], kk))
    const w = [s.shown[0], s.shown[1]]
    const b = s.shown[2]

    // Wide screens: map on the left, chart on the right. Tall screens: map on top.
    const wide = cw > ch * 1.3
    const mapW = wide ? Math.min(cw * 0.56, ch) : cw
    const mapH = wide ? ch : ch * 0.6
    const pl = squarePlot(cw, ch, RANGE, RANGE, { l: 40, r: cw - mapW + 8, t: 10, b: ch - mapH + 30 })
    plot.current = pl
    if (Math.hypot(w[0], w[1]) > 1e-3) shadeSide(ctx, pl, w, b, 'rgba(251,191,36,0.10)')
    drawAxes(ctx, pl, {
      xTicks: [0, 1],
      yTicks: [0, 1],
      xFmt: (v) => (v ? 'A up (1)' : 'A down (0)'),
      yFmt: (v) => (v ? 'up' : 'down'),
      xLabel: 'switch A (p₁)',
      yLabel: 'switch B (p₂)',
    })
    const line = separatingLine(s.lamps)
    if (line && showSol) {
      drawBoundary(ctx, pl, line.w, line.b, { color: SOL, width: 1.5, dash: [6, 5] })
      tag(ctx, 'one solution x*', pl.X(-line.b * line.w[0] - line.w[1] * 0.9), pl.Y(-line.b * line.w[1] + line.w[0] * 0.9) - 10, SOL, 'center', pl)
    }
    drawBoundary(ctx, pl, w, b, { color: '#f8fafc', width: 2.5, glow: true })
    s.lamps.forEach((l, i) => {
      const x = pl.X(l.p[0])
      const y = pl.Y(l.p[1])
      if (l.t) {
        ctx.beginPath()
        ctx.arc(x, y, 19 + 2 * Math.sin(t * 3 + i), 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(251,191,36,0.22)'
        ctx.fill()
      }
      ctx.beginPath()
      ctx.arc(x, y, 12, 0, Math.PI * 2)
      ctx.fillStyle = l.t ? ON : '#1e293b'
      ctx.fill()
      ctx.strokeStyle = l.t ? '#fde68a' : '#64748b'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = l.t ? '#0f172a' : '#94a3b8'
      ctx.font = 'bold 10px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(l.t ? 'ON' : 'off', x, y + 0.5)
      const a = w[0] * l.p[0] + w[1] * l.p[1] + b >= 0 ? 1 : 0
      if (a !== l.t) {
        ctx.beginPath()
        ctx.arc(x, y, 17 + 1.5 * Math.sin(t * 7), 0, Math.PI * 2)
        ctx.strokeStyle = '#fb7185'
        ctx.lineWidth = 2.5
        ctx.stroke()
      }
      if (i === s.lastIdx && t - s.lastT < 0.5) {
        ctx.beginPath()
        ctx.arc(x, y, 14 + (t - s.lastT) * 34, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(248,250,252,${1 - (t - s.lastT) * 2})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })
    tag(ctx, 'shaded side: perceptron says light on (a = 1)', pl.left + 6, pl.bottom - 12, '#fcd34d', 'left', pl)

    // Chart of what the updates are achieving
    const cx0 = wide ? mapW : 0
    const cy0 = wide ? 0 : mapH
    const cp = makePlot(cw, ch, [0, 1], [0, 1], { l: cx0 + 46, r: 14, t: cy0 + 44, b: 30 })
    const n = s.hist.length
    ctx.font = '11px ui-monospace, monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    if (line) {
      const bd = convergenceBound([line.w[0], line.w[1], line.b], s.lamps)
      const lim = bd ? bd.bound : 1
      // Progress against the bound
      const barW = cp.right - cp.left
      ctx.fillStyle = '#cbd5e1'
      ctx.fillText(`weight changes k = ${s.k}   proof's limit for this x*: ${lim < 1e5 ? Math.floor(lim) : 'over 100000'}`, cp.left, cy0 + 8)
      ctx.fillStyle = 'rgba(148,163,184,0.2)'
      ctx.fillRect(cp.left, cy0 + 24, barW, 7)
      ctx.fillStyle = done ? SOL : ON
      ctx.fillRect(cp.left, cy0 + 24, barW * clamp(s.k / lim, 0, 1), 7)
      const xMax = Math.max(12, n + 2)
      const c2 = makePlot(cw, ch, [0, xMax], [0, 180], { l: cx0 + 46, r: 14, t: cy0 + 44, b: 30 })
      drawAxes(ctx, c2, {
        xTicks: [0, Math.round(xMax / 2), xMax],
        yTicks: [0, 45, 90, 135, 180],
        yFmt: (v) => `${v}°`,
        xLabel: 'weight changes k',
        yLabel: 'angle between x = [w; b] and x*',
      })
      ctx.beginPath()
      ctx.moveTo(c2.X(0), c2.Y(90))
      s.hist.forEach((h, i) => ctx.lineTo(c2.X(i + 1), c2.Y(Number.isFinite(h.angle) ? h.angle : 90)))
      ctx.strokeStyle = SOL
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.stroke()
      s.hist.forEach((h, i) => {
        ctx.beginPath()
        ctx.arc(c2.X(i + 1), c2.Y(Number.isFinite(h.angle) ? h.angle : 90), 3, 0, Math.PI * 2)
        ctx.fillStyle = SOL
        ctx.fill()
      })
      if (done) tag(ctx, `stopped after ${s.k} changes`, (c2.left + c2.right) / 2, c2.top + 30, '#6ee7b7', 'center', c2)
    } else {
      ctx.fillStyle = '#fda4af'
      ctx.fillText(`weight changes k = ${s.k} and still counting`, cp.left, cy0 + 8)
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('no solution x* exists, so there is no limit', cp.left, cy0 + 24)
      const win = 60
      const from = Math.max(0, n - win)
      const c2 = makePlot(cw, ch, [from, from + win], [0, 4], { l: cx0 + 46, r: 14, t: cy0 + 44, b: 30 })
      drawAxes(ctx, c2, {
        xTicks: [from, from + win / 2, from + win],
        yTicks: [0, 1, 2, 3, 4],
        xFmt: (v) => String(Math.round(v + (s.k - n))),
        xLabel: 'weight changes k (latest 60)',
        yLabel: 'lamps wrong after each change',
      })
      ctx.beginPath()
      for (let i = from; i < n; i++) {
        const y = c2.Y(s.hist[i].wrong)
        if (i === from) ctx.moveTo(c2.X(i), y)
        else ctx.lineTo(c2.X(i), y)
        ctx.lineTo(c2.X(i + 1), y)
      }
      ctx.strokeStyle = '#fb7185'
      ctx.lineWidth = 2.5
      ctx.stroke()
      ctx.strokeStyle = 'rgba(52,211,153,0.6)'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(c2.left, c2.Y(0))
      ctx.lineTo(c2.right, c2.Y(0))
      ctx.stroke()
      ctx.setLineDash([])
      tag(ctx, 'it would have to reach 0 to stop', c2.right - 4, c2.Y(0) - 12, '#6ee7b7', 'right', c2)
    }
  }

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const pl = plot.current
    if (!pl) return
    const [x, y] = pointerPos(e)
    const i = nearest(sim.lamps.map((l) => [pl.X(l.p[0]), pl.Y(l.p[1])]), x, y, 26)
    if (i < 0) return
    drag.current = { i, x, y, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const pl = plot.current
    const d = drag.current
    if (!d || !pl) return
    const [x, y] = pointerPos(e)
    if (!d.moved && Math.hypot(x - d.x, y - d.y) < 6) return
    d.moved = true
    const lamps = sim.lamps.map((l) => ({ ...l }))
    lamps[d.i].p = [
      Math.round(clamp(pl.ix(x), RANGE[0] + 0.15, RANGE[1] - 0.15) * 20) / 20,
      Math.round(clamp(pl.iy(y), RANGE[0] + 0.15, RANGE[1] - 0.15) * 20) / 20,
    ]
    restart(lamps)
    if (wiring !== 'custom') setWiring('custom')
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) {
      // A tap flips the lamp between on and off
      const lamps = sim.lamps.map((l, i) => (i === d.i ? { ...l, t: (l.t ? 0 : 1) as 0 | 1 } : { ...l }))
      restart(lamps)
      setWiring('custom')
    }
  }

  return (
    <LabShell
      labId="xor-room"
      actions={{
        break: { label: 'Wire the corridor light (exactly one switch up)', run: () => wire('xor') },
        fix: { label: 'Rewire: light on when at least one is up', run: () => wire('or') },
      }}
      happening={
        sol && bound ? (
          <>
            <p>
              A straight line can separate the on-lamps from the off-lamps (the dashed green line is one). The proof says each mistake turns
              x = [w; b] towards such a solution x*. The angle between them is now {angle.toFixed(0)}°; it started at 90°.
            </p>
            <p>
              {stopped
                ? `Training stopped after k = ${sim.k} weight changes, inside the proof's limit of ${Math.floor(bound.bound)}.`
                : `k = ${sim.k} weight changes so far. The proof says k can never pass ${Math.floor(bound.bound)} for this x*.`}{' '}
              The limit is ‖x*‖² Π ÷ δ² with δ = {bound.delta.toFixed(2)}, the smallest clearance of any lamp. Drag an on-lamp close to an off-lamp: δ shrinks
              and the limit shoots up.
            </p>
          </>
        ) : (
          <>
            <p>
              k = {sim.k} weight changes and {wrong} of {sim.lamps.length} lamps are still wrong. Every change repairs one lamp and breaks another, so the
              white line keeps swinging.
            </p>
            <p>
              The on-lamps cannot be put on one side of any straight line here. No solution x* exists, so the convergence proof promises nothing and the
              rule will run for ever. x is now {vec(sim.x, 1)}.
            </p>
          </>
        )
      }
      panel={
        <>
          <Group title="When should the light be on?">
            <Seg
              value={wiring}
              onChange={wire}
              options={[
                { value: 'and', label: 'Both up' },
                { value: 'or', label: 'At least one up' },
                { value: 'xor', label: 'Exactly one up (corridor)' },
                ...(wiring === 'custom' ? [{ value: 'custom' as Wiring, label: 'Your own' }] : []),
              ]}
            />
            <p className="text-[11px] leading-snug text-slate-500">
              Tap a lamp to switch its target between ON and off. Drag a lamp to move it. Training restarts from zero weights each time, as in the proof.
            </p>
            <Toggle label="Run the learning rule" value={running} onChange={setRunning} />
            <Slider label="Samples shown per second" value={rate} min={1} max={40} onChange={setRate} />
            <Toggle label="Show one solution line x*" hint="Only exists when the lamps are linearly separable" value={showSol} onChange={setShowSol} />
            <Btn onClick={() => restart()}>Restart from zero weights</Btn>
          </Group>
          <Group title="The proof's numbers">
            <Stats>
              <Stat label="Weight changes k" value={sim.k} tone={stopped ? 'good' : sol ? 'plain' : 'bad'} />
              <Stat label="Limit on k" value={bound ? (bound.bound < 1e5 ? Math.floor(bound.bound) : '> 100000') : 'none'} tone={bound ? 'plain' : 'bad'} />
              <Stat label="Angle x to x*" value={xStar ? `${angle.toFixed(0)}°` : 'no x*'} />
              <Stat label="Lamps wrong" value={`${wrong} / ${sim.lamps.length}`} tone={wrong ? 'bad' : 'good'} />
              <Stat label="δ (clearance)" value={bound ? bound.delta.toFixed(3) : 'none'} />
              <Stat label="Π = max ‖z‖²" value={bound ? bound.Pi.toFixed(2) : 'none'} />
              <Stat label="w" value={`[${num(sim.x[0], 1)}, ${num(sim.x[1], 1)}]`} />
              <Stat label="b" value={num(sim.x[2], 1)} />
            </Stats>
          </Group>
        </>
      }
    >
      <Scene
        legend={[
          { mark: 'dot', color: ON, label: 'lamp should be ON (t = 1)' },
          { mark: 'ring', color: '#64748b', label: 'lamp should be off (t = 0)' },
          { mark: 'line', color: '#f8fafc', label: 'perceptron boundary now' },
          { mark: 'dash', color: SOL, label: 'a solution x* (if one exists)' },
          { mark: 'ring', color: '#fb7185', label: 'perceptron is wrong here' },
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
