import { useMemo, useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats } from '../../../ui/lab/controls'
import { createNetwork, createTrainer, gauss, output, rng, type Network, type Sample } from '../../../engine'
import { clamp, num, pointerXY, text } from '../draw'

interface Mango {
  /** colour: 0 green … 1 yellow */
  c: number
  /** softness: 0 hard … 1 soft */
  s: number
  ready: boolean
}

type Crate = 'alphonso' | 'langra' | 'mixed'

const crateInfo: Record<Crate, { label: string; note: string }> = {
  alphonso: { label: 'Alphonso', note: 'Alphonso turns yellow and soft as it ripens.' },
  langra: { label: 'Langra (new variety)', note: 'Langra stays green when ripe, so only softness tells.' },
  mixed: { label: 'Mixed, with overripe', note: 'Too soft and too yellow is overripe: also not ready.' },
}

const COUNT = 90

function makeCrate(kind: Crate): Mango[] {
  const rand = rng(kind === 'alphonso' ? 7 : kind === 'langra' ? 21 : 33)
  const lim = (v: number) => clamp(v, 0.03, 0.97)
  return Array.from({ length: COUNT }, (_, i) => {
    if (kind === 'alphonso') {
      const ready = i % 2 === 0
      const m = ready ? 0.73 : 0.3
      return { c: lim(m + gauss(rand) * 0.11), s: lim(m + gauss(rand) * 0.11), ready }
    }
    if (kind === 'langra') {
      const ready = i % 2 === 0
      return { c: lim(0.1 + rand() * 0.36), s: lim((ready ? 0.74 : 0.27) + gauss(rand) * 0.1), ready }
    }
    const c = lim(rand())
    const s = lim(rand())
    return { c, s, ready: ((c - 0.56) / 0.3) ** 2 + ((s - 0.55) / 0.27) ** 2 < 1 }
  })
}

const crates: Record<Crate, Mango[]> = {
  alphonso: makeCrate('alphonso'),
  langra: makeCrate('langra'),
  mixed: makeCrate('mixed'),
}

const toP = (c: number, s: number) => [c * 2 - 1, s * 2 - 1]
const GRID = 26
const MAX_ITS = 9000

interface Learner {
  net: Network
  trainer: ReturnType<typeof createTrainer>
  /** output on a GRID×GRID lattice, refreshed every few frames */
  field: Float32Array
}

function makeLearner(net: Network): Learner {
  return { net, trainer: createTrainer(net), field: new Float32Array(GRID * GRID).fill(0.5) }
}

const mangoColor = (c: number) => {
  const k = clamp(c, 0, 1)
  return `rgb(${Math.round(70 + 180 * k)},${Math.round(150 + 50 * k)},${Math.round(60 - 30 * k)})`
}

interface Box {
  x: number
  y: number
  s: number
}

const READY = '#fbbf24'

export default function RulesLab() {
  const [crate, setCrate] = useState<Crate>('alphonso')
  const [thC, setThC] = useState(0.5)
  const [thS, setThS] = useState(0.5)
  const [run, setRun] = useState(1)
  const [probe, setProbe] = useState({ c: 0.62, s: 0.45 })
  const boxes = useRef<Box[]>([])
  const dragging = useRef(false)
  useTicker(250)

  const data = crates[crate]
  // The two learners keep their weights when the crate changes: they adapt from where they are,
  // just as a deployed model would be retrained. `run` starts them again from random weights.
  const learners = useMemo(
    () => ({
      neuron: makeLearner(createNetwork(2, [1], ['logsig'], { seed: 3 + run, range: 0.3 })),
      mlp: makeLearner(createNetwork(2, [8, 1], ['tansig', 'logsig'], { seed: 11 + run, range: 1.2 })),
      its: 0,
    }),
    [run],
  )
  const samples: Sample[] = useMemo(() => data.map((m) => ({ p: toP(m.c, m.s), t: [m.ready ? 1 : 0] })), [data])
  const itsRef = useRef({ crate, run, its: 0 })
  if (itsRef.current.crate !== crate || itsRef.current.run !== run) itsRef.current = { crate, run, its: 0 }

  const rule = (c: number, s: number) => c >= thC && s >= thS
  const neuronOut = (c: number, s: number) => output(learners.neuron.net, toP(c, s))[0]
  const mlpOut = (c: number, s: number) => output(learners.mlp.net, toP(c, s))[0]
  const verdicts = [
    (m: { c: number; s: number }) => rule(m.c, m.s),
    (m: { c: number; s: number }) => neuronOut(m.c, m.s) >= 0.5,
    (m: { c: number; s: number }) => mlpOut(m.c, m.s) >= 0.5,
  ]
  const errors = verdicts.map((v) => data.reduce((n, m) => n + (v(m) !== m.ready ? 1 : 0), 0))

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const st = itsRef.current
    if (st.its < MAX_ITS) {
      for (let k = 0; k < 12; k++) {
        learners.neuron.trainer.step(samples, { alpha: 0.6, gamma: 0.8, loss: 'xent' })
        learners.mlp.trainer.step(samples, { alpha: 0.5, gamma: 0.9, loss: 'xent' })
      }
      st.its += 12
    }
    // Refresh the decision fields
    for (const L of [learners.neuron, learners.mlp])
      for (let j = 0; j < GRID; j++)
        for (let i = 0; i < GRID; i++)
          L.field[j * GRID + i] = output(L.net, toP((i + 0.5) / GRID, (j + 0.5) / GRID))[0]

    const wide = w >= 720
    const cols = wide ? 3 : 2
    const rows = wide ? 1 : 2
    const cw = w / cols
    const ch = h / rows
    const head = 46
    const side = Math.max(60, Math.min(cw - 50, ch - head - (wide ? 72 : 40)))
    const titles = ['1. Your rule (classic AI)', '2. One neuron (machine learning)', '3. 2-8-1 network (deep learning idea)']
    const colors = ['#f472b6', '#38bdf8', '#a78bfa']
    boxes.current = []

    for (let k = 0; k < 3; k++) {
      const cx = (k % cols) * cw
      const cy = Math.floor(k / cols) * ch
      const x0 = cx + (cw - side) / 2 + 10
      const y0 = cy + head
      boxes.current.push({ x: x0, y: y0, s: side })
      const X = (c: number) => x0 + c * side
      const Y = (s: number) => y0 + (1 - s) * side
      text(ctx, titles[k], cx + cw / 2, cy + 16, { color: colors[k], size: 12, bold: true, align: 'center', maxWidth: cw - 12 })
      text(ctx, `${errors[k]} wrong of ${COUNT}`, cx + cw / 2, cy + 34, {
        color: errors[k] > 9 ? '#fb7185' : errors[k] > 3 ? '#fbbf24' : '#34d399',
        size: 13,
        bold: true,
        align: 'center',
      })

      // Plot background and the region each sorter calls "ready"
      ctx.fillStyle = 'rgba(15,23,42,0.7)'
      ctx.fillRect(x0, y0, side, side)
      if (k === 0) {
        ctx.fillStyle = 'rgba(251,191,36,0.16)'
        ctx.fillRect(X(thC), y0, side - (X(thC) - x0), Y(thS) - y0)
        ctx.strokeStyle = '#f472b6'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(X(thC), y0)
        ctx.lineTo(X(thC), y0 + side)
        ctx.moveTo(x0, Y(thS))
        ctx.lineTo(x0 + side, Y(thS))
        ctx.stroke()
        ctx.setLineDash([])
        text(ctx, `θ₁ = ${thC.toFixed(2)}`, clamp(X(thC) + 4, x0 + 2, x0 + side - 58), y0 + side - 5, { color: '#f9a8d4', size: 10 })
        text(ctx, `θ₂ = ${thS.toFixed(2)}`, x0 + 4, clamp(Y(thS) - 4, y0 + 12, y0 + side - 16), { color: '#f9a8d4', size: 10 })
      } else {
        const L = k === 1 ? learners.neuron : learners.mlp
        const cell = side / GRID
        for (let j = 0; j < GRID; j++)
          for (let i = 0; i < GRID; i++) {
            const a = L.field[j * GRID + i]
            if (a < 0.5) continue
            ctx.fillStyle = `rgba(251,191,36,${(0.06 + 0.2 * (a - 0.5) * 2).toFixed(3)})`
            ctx.fillRect(x0 + i * cell, y0 + (GRID - 1 - j) * cell, cell + 0.5, cell + 0.5)
          }
        // Boundary: cells where the output crosses 0.5
        ctx.fillStyle = colors[k]
        for (let j = 0; j < GRID; j++)
          for (let i = 0; i < GRID; i++) {
            const a = L.field[j * GRID + i] >= 0.5
            const right = i + 1 < GRID && L.field[j * GRID + i + 1] >= 0.5 !== a
            const up = j + 1 < GRID && L.field[(j + 1) * GRID + i] >= 0.5 !== a
            if (right) ctx.fillRect(x0 + (i + 1) * cell - 1.2, y0 + (GRID - 1 - j) * cell, 2.4, cell + 0.5)
            if (up) ctx.fillRect(x0 + i * cell, y0 + (GRID - 1 - j) * cell - 1.2, cell + 0.5, 2.4)
          }
      }
      ctx.strokeStyle = 'rgba(148,163,184,0.3)'
      ctx.lineWidth = 1
      ctx.strokeRect(x0, y0, side, side)

      // Mangoes
      const r = Math.max(2.6, side / 62)
      for (const m of data) {
        const wrong = verdicts[k](m) !== m.ready
        const mx = X(m.c)
        const my = Y(m.s)
        ctx.beginPath()
        ctx.ellipse(mx, my, r * 1.25, r, -0.5, 0, Math.PI * 2)
        ctx.fillStyle = mangoColor(m.c)
        ctx.fill()
        ctx.lineWidth = 1.4
        ctx.strokeStyle = m.ready ? READY : '#0f172a'
        ctx.stroke()
        if (wrong) {
          const q = r * 2.1 + Math.sin(t * 5 + mx) * 0.8
          ctx.strokeStyle = '#f43f5e'
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(mx - q, my - q)
          ctx.lineTo(mx + q, my + q)
          ctx.moveTo(mx + q, my - q)
          ctx.lineTo(mx - q, my + q)
          ctx.stroke()
        }
      }

      // Test mango
      const px = X(probe.c)
      const py = Y(probe.s)
      const says = verdicts[k](probe)
      ctx.strokeStyle = '#f8fafc'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(px, py, 7 + Math.sin(t * 4) * 1.2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(px, py, 4.5, 3.6, -0.5, 0, Math.PI * 2)
      ctx.fillStyle = mangoColor(probe.c)
      ctx.fill()
      const tag = says ? 'ready' : 'not ready'
      const tx = clamp(px + 10, x0 + 2, x0 + side - 62)
      const ty = clamp(py - 10, y0 + 12, y0 + side - 4)
      ctx.fillStyle = 'rgba(2,6,23,0.8)'
      ctx.fillRect(tx - 3, ty - 11, says ? 40 : 62, 15)
      text(ctx, tag, tx, ty, { color: says ? READY : '#e2e8f0', size: 10, bold: true })

      // Axes
      text(ctx, 'green', x0, y0 + side + 13, { size: 10, color: '#4ade80' })
      text(ctx, 'colour →', x0 + side / 2, y0 + side + 13, { size: 10, color: '#94a3b8', align: 'center' })
      text(ctx, 'yellow', x0 + side, y0 + side + 13, { size: 10, color: '#facc15', align: 'right' })
      ctx.save()
      ctx.translate(x0 - 7, y0 + side / 2)
      ctx.rotate(-Math.PI / 2)
      text(ctx, 'hard   softness →   soft', 0, 0, { size: 10, color: '#94a3b8', align: 'center' })
      ctx.restore()
    }

    // Legend, and on narrow screens a scoreboard in the fourth cell
    const lx = wide ? 12 : cw + 14
    const ly = wide ? h - 30 : ch + 26
    const legend = (x: number, y: number) => {
      ctx.beginPath()
      ctx.ellipse(x + 6, y - 4, 6, 4.8, -0.5, 0, Math.PI * 2)
      ctx.fillStyle = mangoColor(0.8)
      ctx.fill()
      ctx.strokeStyle = READY
      ctx.lineWidth = 1.6
      ctx.stroke()
      text(ctx, 'gold ring: labelled ready', x + 18, y, { size: 10 })
      ctx.beginPath()
      ctx.ellipse(x + 6, y + 12, 6, 4.8, -0.5, 0, Math.PI * 2)
      ctx.fillStyle = mangoColor(0.2)
      ctx.fill()
      ctx.strokeStyle = '#0f172a'
      ctx.stroke()
      text(ctx, 'dark ring: not ready', x + 18, y + 16, { size: 10 })
    }
    if (wide) {
      legend(lx, ly)
      text(ctx, '✕ sorted wrongly', lx + 200, ly, { size: 10, color: '#fb7185' })
      text(ctx, 'shaded area: where the sorter says "ready"', lx + 200, ly + 16, { size: 10, color: READY })
      text(ctx, '◯ test mango: tap a chart to move it', lx + 480, ly, { size: 10, color: '#f8fafc' })
      text(ctx, `training passes: ${st.its}`, lx + 480, ly + 16, { size: 10, color: '#94a3b8' })
    } else {
      text(ctx, 'Wrong answers', lx, ly - 6, { size: 11, bold: true, color: '#e2e8f0' })
      const names = ['rule', 'neuron', 'network']
      const bw = cw - 80
      for (let k = 0; k < 3; k++) {
        const by = ly + 6 + k * 20
        text(ctx, names[k], lx, by + 10, { size: 10, color: colors[k] })
        ctx.fillStyle = 'rgba(148,163,184,0.15)'
        ctx.fillRect(lx + 50, by, bw, 12)
        ctx.fillStyle = colors[k]
        ctx.fillRect(lx + 50, by, (bw * Math.min(errors[k], 45)) / 45, 12)
        text(ctx, String(errors[k]), lx + 54 + (bw * Math.min(errors[k], 45)) / 45, by + 10, { size: 10, color: '#f8fafc' })
      }
      legend(lx, ly + 86)
      text(ctx, '✕ sorted wrongly', lx, ly + 122, { size: 10, color: '#fb7185' })
      text(ctx, 'shaded: says "ready"', lx, ly + 138, { size: 10, color: READY })
      text(ctx, '◯ test mango (tap)', lx, ly + 154, { size: 10, color: '#f8fafc' })
    }
  }

  const place = (e: PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = pointerXY(e)
    for (const b of boxes.current)
      if (x >= b.x - 8 && x <= b.x + b.s + 8 && y >= b.y - 8 && y <= b.y + b.s + 8) {
        setProbe({ c: clamp((x - b.x) / b.s, 0, 1), s: clamp(1 - (y - b.y) / b.s, 0, 1) })
        return
      }
  }

  const L = learners.neuron.net.layers[0]
  const its = itsRef.current.its
  const says = verdicts.map((v) => v(probe))
  const word = (b: boolean) => (b ? 'ready' : 'not ready')
  return (
    <LabShell
      labId="rules-vs-learning"
      actions={{
        break: {
          label: 'Bring in the Langra crate',
          run: () => {
            setThC(0.5)
            setThS(0.5)
            setCrate('langra')
            setProbe({ c: 0.25, s: 0.8 })
          },
        },
        fix: {
          label: 'Open the mixed crate and retrain',
          run: () => {
            setCrate('mixed')
            setRun((r) => r + 1)
            setProbe({ c: 0.9, s: 0.93 })
          },
        },
      }}
      happening={
        <>
          <p>
            {crateInfo[crate].label} crate, {COUNT} labelled mangoes. {crateInfo[crate].note}
          </p>
          <p>
            Your rule "colour ≥ {thC.toFixed(2)} and softness ≥ {thS.toFixed(2)}" gets <b>{errors[0]}</b> wrong. It never
            changes unless you move it.
          </p>
          <p>
            After {its} training passes the neuron has drawn the line {num(L.W[0][0], 1)}·colour + {num(L.W[0][1], 1)}
            ·softness + {num(L.b[0], 1)} = 0 and gets <b>{errors[1]}</b> wrong. The network bends its boundary and gets{' '}
            <b>{errors[2]}</b> wrong{crate === 'mixed' ? ': a straight line cannot fence in the good mangoes, a curve can.' : '.'}
          </p>
        </>
      }
      panel={
        <>
          <Group title="Crate of mangoes">
            <Seg
              value={crate}
              onChange={setCrate}
              options={(Object.keys(crateInfo) as Crate[]).map((c) => ({ value: c, label: crateInfo[c].label }))}
            />
            <Btn onClick={() => setRun((r) => r + 1)}>Retrain both learners from scratch</Btn>
          </Group>
          <Group title="1. Your rule (classic AI)">
            <Slider label="Colour at least θ₁" value={thC} min={0} max={1} step={0.01} onChange={setThC} fmt={(v) => v.toFixed(2)} />
            <Slider label="Softness at least θ₂" value={thS} min={0} max={1} step={0.01} onChange={setThS} fmt={(v) => v.toFixed(2)} />
          </Group>
          <Group title="Scoreboard: wrong answers">
            <Stats>
              <Stat label="Hand rule" value={`${errors[0]} / ${COUNT}`} tone={errors[0] > 9 ? 'bad' : errors[0] > 3 ? 'warn' : 'good'} />
              <Stat label="One neuron" value={`${errors[1]} / ${COUNT}`} tone={errors[1] > 9 ? 'bad' : errors[1] > 3 ? 'warn' : 'good'} />
              <Stat label="2-8-1 network" value={`${errors[2]} / ${COUNT}`} tone={errors[2] > 9 ? 'bad' : errors[2] > 3 ? 'warn' : 'good'} />
              <Stat label="Training passes" value={its >= MAX_ITS ? `${its} (done)` : its} />
            </Stats>
            <p className="text-[11px] leading-snug text-slate-500">
              Parameters set by a person: 2 thresholds. Learned from data: 3 for the neuron, 33 for the network.
            </p>
          </Group>
          <Group title="Test mango">
            <Slider label="Colour" value={probe.c} min={0} max={1} step={0.01} onChange={(c) => setProbe((p) => ({ ...p, c }))} fmt={(v) => v.toFixed(2)} />
            <Slider label="Softness" value={probe.s} min={0} max={1} step={0.01} onChange={(s) => setProbe((p) => ({ ...p, s }))} fmt={(v) => v.toFixed(2)} />
            <Stats>
              <Stat label="Rule says" value={word(says[0])} />
              <Stat label="Neuron says" value={`${word(says[1])} (${neuronOut(probe.c, probe.s).toFixed(2)})`} />
              <Stat label="Network says" value={`${word(says[2])} (${mlpOut(probe.c, probe.s).toFixed(2)})`} />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas2D
        draw={onDraw}
        className="touch-none cursor-crosshair"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          dragging.current = true
          place(e)
        }}
        onPointerMove={(e) => dragging.current && place(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      />
    </LabShell>
  )
}
