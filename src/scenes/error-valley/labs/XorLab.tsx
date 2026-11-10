import { useMemo, useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, drawAxes, makePlot, useTicker, type Plot } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats } from '../../../ui/lab/controls'
import { cloneNetwork, createNetwork, createTrainer, gauss, lossOn, output, paramCount, rng, shuffle, type Network, type Sample } from '../../../engine'

interface Pt {
  x: number
  y: number
  on: 0 | 1
}
type Preset = 'xor' | 'ring' | 'moons' | 'mine'
type Init = 'random' | 'equal'
type Show = 'batch' | 'inc'

const presets: Record<Exclude<Preset, 'mine'>, Pt[]> = {
  xor: [
    { x: 0, y: 0, on: 0 },
    { x: 0, y: 1, on: 1 },
    { x: 1, y: 0, on: 1 },
    { x: 1, y: 1, on: 0 },
  ],
  ring: (() => {
    const r = rng(4)
    const pts: Pt[] = []
    for (let i = 0; i < 10; i++) pts.push({ x: 0.5 + gauss(r) * 0.1, y: 0.5 + gauss(r) * 0.1, on: 1 })
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2
      const d = 0.62 + r() * 0.14
      pts.push({ x: 0.5 + Math.cos(a) * d, y: 0.5 + Math.sin(a) * d, on: 0 })
    }
    return pts
  })(),
  moons: (() => {
    const r = rng(9)
    const pts: Pt[] = []
    for (let i = 0; i < 14; i++) {
      const a = (i / 13) * Math.PI
      pts.push({ x: 0.3 + Math.cos(a) * 0.55 + gauss(r) * 0.03, y: 0.45 + Math.sin(a) * 0.5 + gauss(r) * 0.03, on: 1 })
      pts.push({ x: 0.7 - Math.cos(a) * 0.55 + gauss(r) * 0.03, y: 0.6 - Math.sin(a) * 0.5 + gauss(r) * 0.03, on: 0 })
    }
    return pts
  })(),
}

/** The network sees switch positions centred on zero: q = 2p − 1. */
const toSample = (p: Pt): Sample => ({ p: [2 * p.x - 1, 2 * p.y - 1], t: [p.on] })
const LINE_COLORS = ['#f472b6', '#a78bfa', '#4ade80', '#facc15', '#22d3ee', '#fb7185', '#c084fc', '#86efac']
const RANGE: [number, number] = [-0.5, 1.5]
const G = 40

/** A loss history that thins itself out when it gets long. */
class Hist {
  data: number[] = []
  stride = 1
  private n = 0
  push(v: number) {
    if (this.n++ % this.stride === 0) this.data.push(v)
    if (this.data.length > 3000) {
      this.data = this.data.filter((_, i) => i % 2 === 0)
      this.stride *= 2
    }
  }
}

function makeNet(S: number, init: Init, seed: number): Network {
  const net = createNetwork(2, [S, 1], ['tansig', 'logsig'], { seed: seed * 13 + 2, range: 1 })
  if (init === 'equal') for (const L of net.layers) {
    L.b.fill(0.5)
    for (const row of L.W) row.fill(0.5)
  }
  return net
}

const correct = (net: Network, samples: Sample[]) => samples.filter((s) => output(net, s.p)[0] >= 0.5 === s.t[0] >= 0.5).length

export default function XorLab() {
  const [preset, setPreset] = useState<Preset>('xor')
  const [mine, setMine] = useState<Pt[]>(presets.xor)
  const [S, setS] = useState(2)
  const [init, setInit] = useState<Init>('random')
  const [alpha, setAlpha] = useState(1)
  const [show, setShow] = useState<Show>('batch')
  const [brush, setBrush] = useState<'1' | '0'>('1')
  const [seed, setSeed] = useState(1)
  const [paused, setPaused] = useState(false)
  const plotRef = useRef<Plot | null>(null)
  useTicker(250)

  const pts = preset === 'mine' ? mine : presets[preset]
  const sim = useMemo(() => {
    const batch = makeNet(S, init, seed)
    const inc = cloneNetwork(batch)
    return {
      samples: pts.map(toSample),
      batch,
      inc,
      tb: createTrainer(batch),
      ti: createTrainer(inc),
      hb: new Hist(),
      hi: new Hist(),
      epochs: 0,
      rand: rng(seed + 77),
      frame: 0,
      img: null as HTMLCanvasElement | null,
    }
  }, [pts, S, init, seed])

  const Q = sim.samples.length
  const net = show === 'batch' ? sim.batch : sim.inc
  const mseB = lossOn(sim.batch, sim.samples)
  const mseI = lossOn(sim.inc, sim.samples)
  const okB = correct(sim.batch, sim.samples)
  const okI = correct(sim.inc, sim.samples)
  const params = paramCount(net)
  // How far apart the hidden neurons are: 0 means they are copies of each other
  const L1 = net.layers[0]
  let spread = 0
  for (let i = 1; i < S; i++) spread = Math.max(spread, Math.abs(L1.W[i][0] - L1.W[0][0]), Math.abs(L1.W[i][1] - L1.W[0][1]), Math.abs(L1.b[i] - L1.b[0]))

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    if (!paused && Q > 0) {
      const epf = Math.max(1, Math.min(10, Math.round(120 / Q)))
      for (let k = 0; k < epf; k++) {
        // Batch: one update per pass, using the gradient averaged over all Q patterns
        sim.hb.push(sim.tb.step(sim.samples, { alpha }))
        // Incremental: Q updates per pass, one after each pattern, in a fresh random order
        for (const s of shuffle(sim.samples, sim.rand)) sim.hi.push(sim.ti.step([s], { alpha }))
        sim.epochs++
      }
    }
    const shown = show === 'batch' ? sim.batch : sim.inc
    const chartH = Math.max(96, Math.round(h * 0.3))
    const side = Math.min(w - 16, h - chartH - 8)
    const x0 = (w - side) / 2
    ctx.save()
    ctx.translate(x0, 0)
    const pl = makePlot(side, side, RANGE, RANGE, { l: 30, r: 6, t: 8, b: 30 })
    plotRef.current = { ...pl, ix: (px) => pl.ix(px - x0) }
    // Decision region: the output a² over the whole plane, recomputed a few times a second
    if (!sim.img) {
      sim.img = document.createElement('canvas')
      sim.img.width = G
      sim.img.height = G
    }
    if (sim.frame++ % 4 === 0) {
      const ictx = sim.img.getContext('2d')!
      const im = ictx.createImageData(G, G)
      for (let j = 0; j < G; j++)
        for (let i = 0; i < G; i++) {
          const px = RANGE[0] + ((i + 0.5) / G) * 2
          const py = RANGE[1] - ((j + 0.5) / G) * 2
          const a = output(shown, [2 * px - 1, 2 * py - 1])[0]
          const k = (j * G + i) * 4
          im.data[k] = 56 + (251 - 56) * a
          im.data[k + 1] = 189 + (146 - 189) * a
          im.data[k + 2] = 248 + (60 - 248) * a
          im.data[k + 3] = 40 + 150 * Math.abs(a - 0.5)
        }
      ictx.putImageData(im, 0, 0)
    }
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(sim.img, pl.left, pl.top, pl.right - pl.left, pl.bottom - pl.top)
    drawAxes(ctx, pl, { xTicks: [0, 1], yTicks: [0, 1], xLabel: 'switch 1 (0 = down, 1 = up) →', yLabel: 'switch 2 ↑' })
    // Each hidden neuron's line n¹ᵢ = 0
    ctx.save()
    ctx.beginPath()
    ctx.rect(pl.left, pl.top, pl.right - pl.left, pl.bottom - pl.top)
    ctx.clip()
    const H = shown.layers[0]
    H.W.forEach((wr, i) => {
      const len = Math.hypot(wr[0], wr[1])
      if (len < 1e-6) return
      // closest point of the line to the origin of q-space, then along the line
      const qx = (-H.b[i] * wr[0]) / (len * len)
      const qy = (-H.b[i] * wr[1]) / (len * len)
      const dx = (-wr[1] / len) * 6
      const dy = (wr[0] / len) * 6
      const P = (x: number, y: number): [number, number] => [pl.X((x + 1) / 2), pl.Y((y + 1) / 2)]
      const a = P(qx - dx, qy - dy)
      const b = P(qx + dx, qy + dy)
      ctx.strokeStyle = LINE_COLORS[i % 8]
      ctx.lineWidth = 2
      // identical neurons would hide each other: dash them with different offsets
      ctx.setLineDash([10, 6])
      ctx.lineDashOffset = i * 5
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.stroke()
      const c = P(qx, qy)
      ctx.setLineDash([])
      ctx.font = '10px ui-monospace, monospace'
      ctx.fillStyle = LINE_COLORS[i % 8]
      ctx.textAlign = 'left'
      ctx.fillText(`h${i + 1}`, Math.max(pl.left + 2, Math.min(pl.right - 16, c[0] + 5 + i * 14)), Math.max(pl.top + 10, Math.min(pl.bottom - 4, c[1] - 5)))
    })
    ctx.restore()
    pts.forEach((p, i) => {
      const good = output(shown, sim.samples[i].p)[0] >= 0.5 === (p.on === 1)
      const X = pl.X(p.x)
      const Y = pl.Y(p.y)
      if (!good) dot(ctx, X, Y, 9 + Math.sin(time * 6) * 1.5, 'rgba(244,63,94,0.45)')
      dot(ctx, X, Y, 6, '#0f172a')
      dot(ctx, X, Y, 4.5, p.on ? '#fb923c' : '#38bdf8')
    })
    ctx.font = '10px ui-monospace, monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#fb923c'
    ctx.fillText('● lamp ON', pl.left + 4, pl.top + 12)
    ctx.fillStyle = '#38bdf8'
    ctx.fillText('● lamp OFF', pl.left + 68, pl.top + 12)
    ctx.fillStyle = '#cbd5e1'
    ctx.fillText('- - hidden neuron lines', pl.left + 138, pl.top + 12)
    ctx.restore()

    // Loss curves
    ctx.save()
    ctx.translate(0, h - chartH)
    const n = Math.max(20, sim.epochs)
    const lp = makePlot(w, chartH, [0, n], [-4, 0], { l: 40, r: 8, t: 14, b: 20 })
    drawAxes(ctx, lp, { xTicks: [0, Math.round(n / 2), n], yTicks: [-4, -2, 0], yFmt: (v) => `1e${v}`, yLabel: 'squared error' })
    const series = (hist: Hist, perEpoch: number, color: string, width: number) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.beginPath()
      hist.data.forEach((v, i) => {
        const x = lp.X((i * hist.stride) / perEpoch)
        const y = Math.max(lp.top, Math.min(lp.bottom, lp.Y(Math.log10(Math.max(1e-4, v)))))
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
    series(sim.hi, Math.max(1, Q), 'rgba(250,204,21,0.75)', 1)
    series(sim.hb, 1, '#34d399', 2.2)
    ctx.font = '10px ui-monospace, monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#34d399'
    ctx.fillText('— batch: mean over all patterns, once per pass', w - 10, 10)
    ctx.fillStyle = '#facc15'
    ctx.fillText('— incremental: e² of each pattern as it is shown', w - 10, 22)
    ctx.fillStyle = '#64748b'
    ctx.fillText('passes through the data →', w - 10, chartH - 3)
    ctx.restore()
  }

  const tap = (e: PointerEvent<HTMLCanvasElement>) => {
    const pl = plotRef.current
    if (!pl) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = pl.ix(e.clientX - rect.left)
    const y = pl.iy(e.clientY - rect.top)
    if (x < RANGE[0] || x > RANGE[1] || y < RANGE[0] || y > RANGE[1]) return
    setMine([...pts, { x, y, on: brush === '1' ? 1 : 0 }])
    setPreset('mine')
  }

  const ok = show === 'batch' ? okB : okI
  const isXor = preset === 'xor'
  const table = isXor ? presets.xor.map((p) => `${p.x}${p.y} → ${output(net, toSample(p).p)[0].toFixed(2)}`).join(', ') : ''
  let happening
  if (Q === 0) happening = <p>No points yet. Pick ON or OFF and tap the plane to place some.</p>
  else if (init === 'equal' && S > 1 && spread < 1e-6)
    happening = (
      <>
        <p>
          All {S} hidden neurons started with the same weights (0.5). They see the same input, give the same output, receive the same sensitivity and get the same
          update, every step. Largest difference between them after {sim.epochs} passes: {spread.toFixed(6)}.
        </p>
        <p>Their dashed lines lie on top of each other, so {S} neurons do the work of one: {ok} of {Q} points right.</p>
      </>
    )
  else if (S === 1)
    happening = (
      <>
        <p>
          One hidden neuron draws one line (h1), so the lamp region can only be one side of a line. {ok} of {Q} points are right and the batch error is stuck at{' '}
          {mseB.toFixed(3)}.
        </p>
        {isXor && <p>XOR needs the band between two lines. With one line the best possible is 3 of 4.</p>}
      </>
    )
  else
    happening = (
      <>
        <p>
          Pass {sim.epochs}. Each dashed line is one hidden neuron (n¹ = 0). The output neuron adds their answers and the shaded region is where it says ON. Showing
          the {show === 'batch' ? 'batch' : 'incremental'} network: {ok} of {Q} right.
        </p>
        <p>
          Batch has made {sim.epochs} updates (error {mseB.toFixed(4)}, smooth curve). Incremental has made {sim.epochs * Q} updates, one per pattern (error{' '}
          {mseI.toFixed(4)}, jagged curve), with the same work per pattern.
        </p>
        {isXor && <p className="font-mono text-[11px] text-slate-300">switches → output: {table}</p>}
      </>
    )

  const restart = () => setSeed((s) => s + 1)
  return (
    <LabShell
      labId="xor-solved"
      happening={happening}
      actions={{
        break: {
          label: 'One hidden neuron on XOR',
          run: () => {
            setPreset('xor')
            setS(1)
            setInit('random')
            restart()
          },
        },
        fix: {
          label: 'Two hidden neurons, small random weights',
          run: () => {
            setS(2)
            setInit('random')
            setSeed(1)
          },
        },
      }}
      panel={
        <>
          <Group title="The data">
            <Seg
              value={preset}
              onChange={(v) => {
                if (v === 'mine') setMine(pts)
                setPreset(v)
              }}
              options={[
                { value: 'xor', label: 'Corridor light (XOR)' },
                { value: 'ring', label: 'Ring' },
                { value: 'moons', label: 'Two moons' },
                { value: 'mine', label: 'My points' },
              ]}
            />
            <Seg
              label="A tap on the plane adds a point that is"
              value={brush}
              onChange={setBrush}
              options={[
                { value: '1', label: 'Lamp ON' },
                { value: '0', label: 'Lamp OFF' },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Btn
                onClick={() => {
                  setMine([])
                  setPreset('mine')
                }}
              >
                Clear the points
              </Btn>
              <Btn onClick={() => setMine(pts.slice(0, -1))} disabled={preset !== 'mine' || pts.length === 0}>
                Undo last
              </Btn>
            </div>
          </Group>
          <Group title="The 2-S-1 network">
            <Slider label="Hidden neurons S" value={S} min={1} max={8} onChange={setS} fmt={(v) => `${v} (2-${v}-1)`} />
            <Seg
              label="Starting weights"
              value={init}
              onChange={setInit}
              options={[
                { value: 'random', label: 'Small random' },
                { value: 'equal', label: 'All equal (0.5)' },
              ]}
            />
            <Slider label="Learning rate α" value={alpha} min={0.05} max={3} step={0.05} onChange={setAlpha} fmt={(v) => v.toFixed(2)} />
            <div className="flex flex-wrap gap-2">
              <Btn tone="go" onClick={restart}>
                New starting weights
              </Btn>
              <Btn onClick={() => setPaused((v) => !v)}>{paused ? 'Resume' : 'Pause'}</Btn>
            </div>
            <Stats>
              <Stat label="Weights and biases" value={`${S}·3 + ${S} + 1 = ${params}`} />
              <Stat label="Multiplications / answer" value={`2·${S} + ${S} = ${3 * S}`} />
            </Stats>
          </Group>
          <Group title="Batch against incremental">
            <Seg
              label="Shade the decision region of"
              value={show}
              onChange={setShow}
              options={[
                { value: 'batch', label: 'Batch network' },
                { value: 'inc', label: 'Incremental network' },
              ]}
            />
            <Stats>
              <Stat label="Batch error" value={mseB.toFixed(4)} tone={okB === Q ? 'good' : 'plain'} />
              <Stat label="Incremental error" value={mseI.toFixed(4)} tone={okI === Q ? 'good' : 'plain'} />
              <Stat label="Batch right" value={`${okB} / ${Q}`} tone={okB === Q ? 'good' : 'warn'} />
              <Stat label="Incremental right" value={`${okI} / ${Q}`} tone={okI === Q ? 'good' : 'warn'} />
              <Stat label="Passes (epochs)" value={sim.epochs} />
              <Stat label="Updates: batch / incr." value={<span className="text-xs">{sim.epochs} / {sim.epochs * Q}</span>} />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas2D draw={draw} onPointerDown={tap} className="cursor-crosshair touch-manipulation" />
    </LabShell>
  )
}
