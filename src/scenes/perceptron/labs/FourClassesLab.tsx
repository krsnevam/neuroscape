import { useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { drawAxes, useTicker, type Plot } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { rng } from '../../../engine'
import { perceptronOutput, perceptronStep, type Perceptron } from '../../../engine/perceptron'
import { arrow, clamp, drawBoundary, ease, lerp, nearest, num, pointerPos, Scene, sgn, squarePlot, tag } from './kit'

interface Pt {
  p: [number, number]
  c: number
}
type SetId = 'snacks' | 'book'
type Codes = 'good' | 'bad'

interface DataSet {
  names: string[]
  pts: Pt[]
  W0: number[][]
  b0: number[]
  range: [number, number]
  ticks: number[]
  xLabel: string
  yLabel: string
  rows: [string, string]
  cols: [string, string]
}

const interleave = (groups: [number, number][][]): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < groups[0].length; i++) groups.forEach((g, c) => out.push({ p: g[i], c }))
  return out
}

const sets: Record<SetId, DataSet> = {
  // A taste panel scores each snack from −5 (not at all) to +5 (very)
  snacks: {
    names: ['jalebi', 'samosa', 'chilli mango', 'idli'],
    pts: interleave([
      [[3.5, -2.5], [2, -1], [4, -0.8]],
      [[-3, 3], [-1, 2], [-0.8, 4]],
      [[3, 3.5], [1, 1.5], [3.8, 1]],
      [[-3, -3.5], [-1.2, -1], [-3.8, -0.6]],
    ]),
    W0: [[-1, 1], [1, -1]],
    b0: [2, -2],
    range: [-5.5, 5.5],
    ticks: [-4, -2, 0, 2, 4],
    xLabel: 'sweetness score p₁ (−5 to +5)',
    yLabel: 'spice score p₂ (−5 to +5)',
    rows: ['neuron 1: sweet?', 'neuron 2: spicy?'],
    cols: ['sweet', 'spice'],
  },
  // The eight-point, four-class problem from the textbook's perceptron chapter
  book: {
    names: ['class 3', 'class 2', 'class 4', 'class 1'],
    pts: [
      { p: [1, 1], c: 3 }, { p: [1, 2], c: 3 }, { p: [2, -1], c: 1 }, { p: [2, 0], c: 1 },
      { p: [-1, 2], c: 0 }, { p: [-2, 1], c: 0 }, { p: [-1, -1], c: 2 }, { p: [-2, -2], c: 2 },
    ],
    W0: [[1, 0], [0, 1]],
    b0: [1, 1],
    range: [-3.6, 3.6],
    ticks: [-3, -2, -1, 0, 1, 2, 3],
    xLabel: 'p₁',
    yLabel: 'p₂',
    rows: ['neuron 1', 'neuron 2'],
    cols: ['p₁', 'p₂'],
  },
}

/** Class index → 2-bit target. "bad" gives opposite corners the same first bit. */
const codeTable: Record<Codes, [number, number][]> = {
  good: [[1, 0], [0, 1], [1, 1], [0, 0]],
  bad: [[1, 0], [1, 1], [0, 1], [0, 0]],
}
const CLASS = ['#fbbf24', '#fb7185', '#a3e635', '#38bdf8']
const ROW = ['#f472b6', '#c4b5fd']

interface Anim {
  t0: number
  dur: number
  idx: number
  a: number[]
  e: number[]
  W0: number[][]
  b0: number[]
  W1: number[][]
  b1: number[]
}

function makeSim(id: SetId, seed = 0) {
  const d = sets[id]
  const rand = rng(seed + 3)
  const r = () => Math.round((rand() * 4 - 2) * 2) / 2
  return {
    id,
    net: (seed ? { W: [[r(), r()], [r(), r()]], b: [r(), r()] } : { W: d.W0.map((x) => [...x]), b: [...d.b0] }) as Perceptron,
    pts: d.pts.map((s) => ({ p: [...s.p] as [number, number], c: s.c })),
    pos: 0,
    presented: 0,
    rowUpdates: [0, 0],
    rowClean: [0, 0],
    anim: null as Anim | null,
    last: null as Anim | null,
  }
}

export default function FourClassesLab() {
  const [setId, setSetId] = useState<SetId>('snacks')
  const [codes, setCodes] = useState<Codes>('good')
  const [auto, setAuto] = useState(true)
  const [speed, setSpeed] = useState(1)
  const simRef = useRef(makeSim('snacks'))
  const seed = useRef(0)
  const plot = useRef<Plot | null>(null)
  const dragging = useRef(-1)
  const wait = useRef(0.6)
  useTicker(120)
  const sim = simRef.current
  const data = sets[sim.id]
  const table = codeTable[codes]
  const N = sim.pts.length

  const outs = sim.pts.map((s) => perceptronOutput(sim.net, s.p))
  const rowWrong = [0, 1].map((i) => sim.pts.filter((s, k) => outs[k][i] !== table[s.c][i]).length)
  const wrong = sim.pts.filter((s, k) => outs[k][0] !== table[s.c][0] || outs[k][1] !== table[s.c][1]).length
  const rowDone = [0, 1].map((i) => sim.rowClean[i] >= N && rowWrong[i] === 0)
  const converged = rowDone[0] && rowDone[1]

  const reset = (id: SetId = sim.id, s = 0) => {
    seed.current = s
    simRef.current = makeSim(id, s)
    wait.current = 0.5
    setSetId(id)
  }
  const changeCodes = (c: Codes) => {
    setCodes(c)
    sim.rowClean = [0, 0]
    sim.rowUpdates = [0, 0]
    sim.presented = 0
    sim.last = null
    setAuto(true)
  }

  const present = () => {
    const s = simRef.current
    const idx = s.pos
    s.pos = (s.pos + 1) % s.pts.length
    const pt = s.pts[idx]
    const W0 = s.net.W.map((r) => [...r])
    const b0 = [...s.net.b]
    const r = perceptronStep(s.net, { p: pt.p, t: table[pt.c] })
    s.presented++
    r.e.forEach((e, i) => {
      if (e !== 0) {
        s.rowUpdates[i]++
        s.rowClean[i] = 0
      } else s.rowClean[i]++
    })
    const a: Anim = {
      t0: performance.now() / 1000,
      dur: (r.changed ? 1.9 : 0.6) / speed,
      idx,
      a: r.a,
      e: r.e,
      W0,
      b0,
      W1: s.net.W.map((x) => [...x]),
      b1: [...s.net.b],
    }
    s.anim = a
    s.last = a
  }

  /** How far row i has moved from its old to its new value at animation phase ph. */
  const rowMix = (i: number, ph: number) => ease((ph - (i === 0 ? 0.28 : 0.64)) / 0.3)

  const onDraw = (ctx: CanvasRenderingContext2D, cw: number, ch: number, t: number, dt: number) => {
    const s = simRef.current
    const d = sets[s.id]
    let an = s.anim
    if (an && t - an.t0 > an.dur) {
      s.anim = null
      an = null
      wait.current = 0.2 / speed
    }
    const done = s.rowClean[0] >= s.pts.length && s.rowClean[1] >= s.pts.length
    if (!an && auto && !done && dragging.current < 0) {
      wait.current -= dt
      if (wait.current <= 0) present()
      an = s.anim
    }
    const ph = an ? clamp((t - an.t0) / an.dur, 0, 1) : 1
    const W = [0, 1].map((i) => {
      if (!an) return s.net.W[i]
      const k = rowMix(i, ph)
      return [lerp(an.W0[i][0], an.W1[i][0], k), lerp(an.W0[i][1], an.W1[i][1], k)]
    })
    const b = [0, 1].map((i) => (an ? lerp(an.b0[i], an.b1[i], rowMix(i, ph)) : s.net.b[i]))

    const pl = squarePlot(cw, ch, d.range, d.range)
    plot.current = pl
    // Colour each small cell by the class whose code the two neurons output there
    const G = 30
    const span = d.range[1] - d.range[0]
    const cell = (pl.right - pl.left) / G
    const sumX = [0, 0, 0, 0]
    const sumY = [0, 0, 0, 0]
    const cnt = [0, 0, 0, 0]
    for (let j = 0; j < G; j++)
      for (let i = 0; i < G; i++) {
        const x = d.range[0] + ((i + 0.5) / G) * span
        const y = d.range[0] + ((j + 0.5) / G) * span
        const a0 = W[0][0] * x + W[0][1] * y + b[0] >= 0 ? 1 : 0
        const a1 = W[1][0] * x + W[1][1] * y + b[1] >= 0 ? 1 : 0
        const code = a0 * 2 + a1
        const cls = table.findIndex((c) => c[0] === a0 && c[1] === a1)
        ctx.fillStyle = CLASS[cls] + '1f'
        ctx.fillRect(pl.left + i * cell, pl.bottom - (j + 1) * cell, cell + 0.5, cell + 0.5)
        sumX[code] += x
        sumY[code] += y
        cnt[code]++
      }
    drawAxes(ctx, pl, { xTicks: d.ticks, yTicks: d.ticks, xLabel: d.xLabel, yLabel: d.yLabel })
    ;[0, 1].forEach((i) => {
      drawBoundary(ctx, pl, W[i], b[i], { color: ROW[i], width: 2.5, glow: true })
      // A short arrow on each line shows that neuron's a = 1 side
      const m2 = W[i][0] ** 2 + W[i][1] ** 2
      if (m2 < 1e-9) return
      const m = Math.sqrt(m2)
      const along = i === 0 ? 0.55 : -0.55
      let cx = (-b[i] * W[i][0]) / m2 + (-W[i][1] / m) * span * along * 0.5
      let cy = (-b[i] * W[i][1]) / m2 + (W[i][0] / m) * span * along * 0.5
      cx = clamp(cx, d.range[0] + 0.8, d.range[1] - 0.8)
      cy = clamp(cy, d.range[0] + 0.8, d.range[1] - 0.8)
      // put the clamped point back on the line
      const off = (W[i][0] * cx + W[i][1] * cy + b[i]) / m2
      cx -= off * W[i][0]
      cy -= off * W[i][1]
      if (cx < d.range[0] || cx > d.range[1] || cy < d.range[0] || cy > d.range[1]) return
      const px = pl.X(cx)
      const py = pl.Y(cy)
      arrow(ctx, px, py, px + (W[i][0] / m) * 26, py - (W[i][1] / m) * 26, ROW[i], 2.5)
      tag(ctx, `₁w = row ${i + 1}`.replace('₁', i === 0 ? '₁' : '₂'), px + (W[i][0] / m) * 34, py - (W[i][1] / m) * 34, ROW[i], 'center', pl)
    })
    // Name each region with its output code
    for (let code = 0; code < 4; code++) {
      if (cnt[code] < 12) continue
      const a0 = code >> 1
      const a1 = code & 1
      const cls = table.findIndex((c) => c[0] === a0 && c[1] === a1)
      tag(ctx, `a = [${a0} ${a1}] ${d.names[cls]}`, pl.X(sumX[code] / cnt[code]), pl.Y(sumY[code] / cnt[code]), CLASS[cls], 'center', pl)
    }
    s.pts.forEach((pt, i) => {
      const x = pl.X(pt.p[0])
      const y = pl.Y(pt.p[1])
      ctx.beginPath()
      ctx.arc(x, y, 6.5, 0, Math.PI * 2)
      ctx.fillStyle = CLASS[pt.c]
      ctx.fill()
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.5
      ctx.stroke()
      const a0 = W[0][0] * pt.p[0] + W[0][1] * pt.p[1] + b[0] >= 0 ? 1 : 0
      const a1 = W[1][0] * pt.p[0] + W[1][1] * pt.p[1] + b[1] >= 0 ? 1 : 0
      if (a0 !== table[pt.c][0] || a1 !== table[pt.c][1]) {
        ctx.beginPath()
        ctx.arc(x, y, 11 + 1.2 * Math.sin(t * 6 + i), 0, Math.PI * 2)
        ctx.strokeStyle = '#f8fafc'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })
    if (an) {
      const pt = s.pts[an.idx]
      const x = pl.X(pt.p[0])
      const y = pl.Y(pt.p[1])
      ctx.beginPath()
      ctx.arc(x, y, 14 + 5 * Math.abs(Math.sin((t - an.t0) * 7 * speed)), 0, Math.PI * 2)
      ctx.strokeStyle = an.e.some((e) => e !== 0) ? '#f8fafc' : '#34d399'
      ctx.lineWidth = 2.5
      ctx.stroke()
      const tt = table[pt.c]
      tag(ctx, `t = [${tt[0]} ${tt[1]}]  a = [${an.a[0]} ${an.a[1]}]  e = [${sgn(an.e[0], 0)} ${sgn(an.e[1], 0)}]`, x, y - 28, '#f8fafc', 'center', pl)
    } else if (done) {
      tag(ctx, 'a full pass with e = [0 0] every time: both rows have stopped', (pl.left + pl.right) / 2, pl.top + 30, '#6ee7b7', 'center', pl)
    }
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
    sim.rowClean = [0, 0]
    sim.anim = null
  }
  const onUp = () => (dragging.current = -1)

  // Matrix readout: each row shows its old numbers until its turn in the animation
  const an = sim.anim
  const ph = an ? clamp((performance.now() / 1000 - an.t0) / an.dur, 0, 1) : 1
  const shown = [0, 1].map((i) => {
    const after = !an || rowMix(i, ph) > 0.5
    return { W: after ? sim.net.W[i] : an.W0[i], b: after ? sim.net.b[i] : an.b0[i], e: an ? an.e[i] : 0, live: !!an && an.e[i] !== 0 && rowMix(i, ph) > 0 && rowMix(i, ph) < 1 }
  })
  const last = sim.last
  const lastPt = last ? sim.pts[last.idx] : null
  const pairName = (bit: number, i: number) =>
    table
      .map((c, k) => (c[i] === bit ? data.names[k] : null))
      .filter(Boolean)
      .join(' and ')

  return (
    <LabShell
      labId="four-classes"
      actions={{
        break: { label: 'Give opposite corners the same first bit', run: () => changeCodes('bad') },
        fix: { label: 'Use one bit per question again', run: () => changeCodes('good') },
      }}
      happening={
        <>
          <p>
            Two neurons draw two lines. Together they cut the map into up to 2² = 4 regions, and each region has its own 2-bit output
            a = [a₁ a₂]. Row 1 of W belongs to the pink line, row 2 to the violet line.
          </p>
          {last && lastPt && (
            <p>
              Last shown: a {data.names[lastPt.c]} at p = [{num(lastPt.p[0], 1)}, {num(lastPt.p[1], 1)}], target [{table[lastPt.c].join(' ')}], output [
              {last.a.join(' ')}], so e = [{sgn(last.e[0], 0)} {sgn(last.e[1], 0)}].{' '}
              {last.e.every((e) => e === 0)
                ? 'Both bits were right, so no row changed.'
                : last.e
                    .map((e, i) => (e === 0 ? `Row ${i + 1} was right and stayed.` : `Row ${i + 1} ${e > 0 ? 'had p added' : 'had p subtracted'}.`))
                    .join(' ')}
            </p>
          )}
          <p>
            {codes === 'bad' && !rowDone[0]
              ? `Neuron 1 is now asked to put ${pairName(1, 0)} on one side and ${pairName(0, 0)} on the other. Those pairs sit on opposite corners, so no straight line can do it. Row 1 has changed ${sim.rowUpdates[0]} times and still has ${rowWrong[0]} wrong.`
              : converged
                ? `Stopped: all ${N} points give the right code after ${sim.rowUpdates[0]} changes to row 1 and ${sim.rowUpdates[1]} to row 2.`
                : `${wrong} of ${N} points give the wrong code. Row 1 has changed ${sim.rowUpdates[0]} times, row 2 ${sim.rowUpdates[1]} times.`}
          </p>
        </>
      }
      panel={
        <>
          <Group title="Train both neurons">
            <div className="flex flex-wrap gap-1.5">
              <Btn tone="go" onClick={present} disabled={converged}>Next sample</Btn>
              <Btn onClick={() => reset()}>Start again</Btn>
              <Btn onClick={() => reset(sim.id, seed.current + 1)}>Random start</Btn>
            </div>
            <Toggle label="Auto-play" hint="Stops by itself after a full pass with no mistakes" value={auto} onChange={setAuto} />
            <Slider label="Animation speed" value={speed} min={0.5} max={4} step={0.5} onChange={setSpeed} fmt={(v) => `${v}×`} />
            <Seg
              label="Output codes"
              value={codes}
              onChange={changeCodes}
              options={[
                { value: 'good', label: 'One bit per question' },
                { value: 'bad', label: 'Opposite corners share bit 1' },
              ]}
            />
            <Seg
              label="Data"
              value={setId}
              onChange={(v) => reset(v)}
              options={[
                { value: 'snacks', label: 'Canteen snacks' },
                { value: 'book', label: 'Textbook 8 points' },
              ]}
            />
            <p className="text-[11px] leading-snug text-slate-500">Drag any snack on the map. Put two kinds close together and count how many more changes it takes.</p>
          </Group>
          <Group title="Target code for each class">
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {data.names.map((n, k) => (
                <div key={n} className="flex items-center justify-between rounded-md bg-white/5 px-2 py-1.5">
                  <span style={{ color: CLASS[k] }}>{n}</span>
                  <span className="font-mono text-slate-200">[{table[k].join(' ')}]</span>
                </div>
              ))}
            </div>
          </Group>
          <Group title="Progress">
            <Stats>
              <Stat label="Samples shown" value={sim.presented} />
              <Stat label="Wrong code now" value={`${wrong} / ${N}`} tone={wrong ? 'bad' : 'good'} />
              <Stat label="Row 1 changes" value={sim.rowUpdates[0]} tone={rowDone[0] ? 'good' : 'plain'} />
              <Stat label="Row 2 changes" value={sim.rowUpdates[1]} tone={rowDone[1] ? 'good' : 'plain'} />
            </Stats>
          </Group>
        </>
      }
    >
      <Scene
        legend={[
          ...data.names.map((n, k) => ({ mark: 'dot' as const, color: CLASS[k], label: `${n} [${table[k].join(' ')}]` })),
          { mark: 'line', color: ROW[0], label: 'neuron 1 boundary' },
          { mark: 'line', color: ROW[1], label: 'neuron 2 boundary' },
          { mark: 'ring', color: '#f8fafc', label: 'wrong code now' },
          { mark: 'fill', color: '#94a3b8', label: 'tint: the class the network answers there' },
        ]}
        overlay={
          <div className="pointer-events-none absolute right-2 top-2 rounded-lg border border-white/10 bg-slate-950/85 p-2 font-mono text-[10px] leading-tight text-slate-300 sm:text-[11px]">
            <div className="mb-1 grid grid-cols-[auto_repeat(4,2.6rem)] gap-x-1 text-slate-500">
              <span className="w-10 sm:w-28">W, b</span>
              <span className="text-right">{data.cols[0]}</span>
              <span className="text-right">{data.cols[1]}</span>
              <span className="text-right">b</span>
              <span className="text-right">e</span>
            </div>
            {shown.map((r, i) => (
              <div
                key={i}
                className={`grid grid-cols-[auto_repeat(4,2.6rem)] gap-x-1 rounded px-0.5 py-0.5 transition-colors duration-200 ${r.live ? 'bg-white/20' : ''}`}
              >
                <span className="w-10 truncate sm:w-28" style={{ color: ROW[i] }}>
                  <span className="sm:hidden">row {i + 1}</span>
                  <span className="hidden sm:inline">{data.rows[i]}</span>
                </span>
                <span className="text-right text-slate-100">{num(r.W[0], 1)}</span>
                <span className="text-right text-slate-100">{num(r.W[1], 1)}</span>
                <span className="text-right text-slate-100">{num(r.b, 1)}</span>
                <span className={`text-right ${r.e > 0 ? 'text-emerald-300' : r.e < 0 ? 'text-rose-300' : 'text-slate-500'}`}>{an ? sgn(r.e, 0) : '·'}</span>
              </div>
            ))}
          </div>
        }
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
