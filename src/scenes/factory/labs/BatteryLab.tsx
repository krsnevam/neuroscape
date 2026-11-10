import { useMemo, useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, drawAxes, drawCurve, makePlot, useTicker, type Plot } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import {
  cloneNetwork,
  createNetwork,
  gauss,
  lmStep,
  lossOn,
  output,
  paramCount,
  rng,
  type Network,
  type Sample,
} from '../../../engine'

interface Reading {
  h: number
  pct: number
}

/** What the battery really does: drains faster as the day goes on, flat by about 11 hours. */
const reality = (h: number) => Math.max(0, Math.min(100, 100 - 100 * (h / 11) ** 1.25 - 3 * Math.sin(1.3 * h)))
const rand = rng(31)
const measure = (h: number): Reading => ({ h, pct: Math.max(0, Math.min(100, reality(h) + gauss(rand) * 5)) })
const starter = () => Array.from({ length: 12 }, (_, i) => measure(0.3 + i * 0.52))
const decays = [0, 0.001, 0.01, 0.03, 0.1]
const toSample = (r: Reading): Sample => ({ p: [r.h / 6 - 1], t: [r.pct / 50 - 1] })

export default function BatteryLab() {
  const [readings, setReadings] = useState<Reading[]>(starter)
  const [S, setS] = useState(4)
  const [useVal, setUseVal] = useState(true)
  const [earlyStop, setEarlyStop] = useState(false)
  const [decayIdx, setDecayIdx] = useState(0)
  const [reveal, setReveal] = useState(false)
  const [version, setVersion] = useState(0)
  const plot = useRef<Plot | null>(null)
  const frame = useRef(0)
  useTicker(250)

  const sim = useMemo(() => {
    const net = createNetwork(1, [S, 1], ['tansig', 'purelin'], { seed: 50 + S + version, range: 1 })
    const train = readings.filter((_, i) => !useVal || i % 3 !== 2)
    const val = useVal ? readings.filter((_, i) => i % 3 === 2) : []
    return {
      net,
      state: { mu: 0.01 },
      train: train.map(toSample),
      val: val.map(toSample),
      valReadings: val,
      its: 0,
      history: [] as { tr: number; va: number }[],
      best: null as Network | null,
      bestVa: Infinity,
      bestAt: 0,
    }
    // Changing the weight decay restarts training so its effect is easy to compare
  }, [readings, S, useVal, version, decayIdx])

  const shown = earlyStop && sim.best ? sim.best : sim.net
  const predict = (h: number) => (output(shown, [h / 6 - 1])[0] + 1) * 50
  const rms = (net: Network, s: Sample[]) => (s.length ? Math.sqrt(lossOn(net, s)) * 50 : NaN)
  const lastH = readings.reduce((m, r) => Math.max(m, r.h), 0)

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // One Levenberg-Marquardt iteration every third frame, slow enough to watch
    if (sim.train.length >= 2 && sim.its < 300 && frame.current++ % 3 === 0) {
      lmStep(sim.net, sim.train, sim.state, 10, decays[decayIdx])
      sim.its++
      const tr = rms(sim.net, sim.train)
      const va = rms(sim.net, sim.val)
      sim.history.push({ tr, va })
      if (sim.val.length && va < sim.bestVa) {
        sim.bestVa = va
        sim.best = cloneNetwork(sim.net)
        sim.bestAt = sim.its
      }
    }
    const pl = makePlot(w, h, [0, 14], [-15, 125])
    plot.current = pl
    // Region with no readings
    ctx.fillStyle = 'rgba(250,204,21,0.06)'
    ctx.fillRect(pl.X(lastH), pl.top, pl.right - pl.X(lastH), pl.bottom - pl.top)
    ctx.fillStyle = 'rgba(250,204,21,0.6)'
    ctx.font = '11px ui-monospace, monospace'
    ctx.textAlign = 'left'
    if (pl.right - pl.X(lastH) > 120) ctx.fillText('no readings here', pl.X(lastH) + 8, pl.bottom - 10)
    drawAxes(ctx, pl, {
      xTicks: [0, 2, 4, 6, 8, 10, 12, 14],
      yTicks: [0, 25, 50, 75, 100],
      xLabel: 'hours since full charge',
      yLabel: 'battery %',
    })
    ctx.strokeStyle = 'rgba(248,113,113,0.5)'
    ctx.beginPath()
    ctx.moveTo(pl.left, pl.Y(0))
    ctx.lineTo(pl.right, pl.Y(0))
    ctx.stroke()
    if (reveal) drawCurve(ctx, pl, reality, { color: 'rgba(148,163,184,0.7)', width: 5 })
    drawCurve(ctx, pl, predict, { color: '#fde047', width: 3, glow: true })
    readings.forEach((r, i) => {
      const isVal = useVal && i % 3 === 2
      dot(ctx, pl.X(r.h), pl.Y(r.pct), 5, isVal ? '#fbbf24' : '#38bdf8')
    })
    // Error history inset
    const iw = Math.min(170, w * 0.36)
    const ih = 80
    const ix = pl.right - iw - 4
    const iy = pl.top + 4
    ctx.fillStyle = 'rgba(2,6,23,0.85)'
    ctx.fillRect(ix - 4, iy, iw + 8, ih + 18)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px ui-monospace, monospace'
    ctx.fillText('error while training', ix, iy + 12)
    const H = sim.history
    if (H.length > 1) {
      const top = Math.max(8, ...H.slice(2).map((p) => Math.max(p.tr, p.va || 0)))
      const line = (key: 'tr' | 'va', color: string) => {
        ctx.beginPath()
        H.forEach((p, i) => {
          const x = ix + (i / (H.length - 1)) * iw
          const y = iy + 18 + ih - (Math.min(top, p[key]) / top) * ih
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      line('tr', '#38bdf8')
      if (sim.val.length) {
        line('va', '#fbbf24')
        const bx = ix + Math.min(1, sim.bestAt / sim.its) * iw
        ctx.strokeStyle = '#34d399'
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(bx, iy + 18)
        ctx.lineTo(bx, iy + 18 + ih)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }
  }

  const tap = (e: PointerEvent<HTMLCanvasElement>) => {
    const pl = plot.current
    if (!pl) return
    const box = e.currentTarget.getBoundingClientRect()
    const h = pl.ix(e.clientX - box.left)
    const pct = pl.iy(e.clientY - box.top)
    if (h < 0 || h > 14 || pct < 0 || pct > 100) return
    setReadings((r) => [...r, { h, pct }])
  }

  let dies = 'not within 16 hours'
  for (let h = 0; h <= 16; h += 0.05)
    if (predict(h) <= 0) {
      dies = `${h.toFixed(1)} h`
      break
    }
  if (dies.startsWith('not') && predict(16) > predict(lastH) + 5) dies = 'never: it recharges itself'
  const tr = rms(shown, sim.train)
  const va = rms(shown, sim.val)
  const diagnosis = tr > 7 ? 'Underfitting' : sim.val.length && va > 2.2 * tr && va > 6 ? 'Overfitting' : 'Fits the readings'

  return (
    <LabShell
      labId="battery"
      actions={{
        break: {
          label: '20 neurons, no safeguards',
          run: () => {
            setS(20)
            setUseVal(true)
            setEarlyStop(false)
            setDecayIdx(0)
            setVersion((v) => v + 1)
          },
        },
        fix: { label: 'Turn on early stopping', run: () => { setUseVal(true); setEarlyStop(true) } },
      }}
      panel={
        <>
          <Group title="Your readings">
            <p className="text-[11px] text-slate-500">Tap the chart to add a reading. {readings.length} so far.</p>
            <div className="flex flex-wrap gap-2">
              <Btn tone="go" onClick={() => setReadings((r) => [...r, measure(7.5), measure(8.5), measure(9.5), measure(10.4)])}>
                Add evening readings
              </Btn>
              <Btn onClick={() => setReadings(starter())}>Morning only</Btn>
              <Btn onClick={() => setReadings([])}>Clear</Btn>
            </div>
            <Toggle label="Reveal what the battery really does" value={reveal} onChange={setReveal} />
          </Group>
          <Group title="The network">
            <Slider label="Hidden neurons" value={S} min={1} max={20} onChange={setS} fmt={(v) => `1-${v}-1 · ${paramCount(sim.net)} parameters`} />
            <Toggle
              label="Hold back a validation set"
              hint="Every third reading (amber) is not trained on"
              value={useVal}
              onChange={setUseVal}
            />
            <Toggle
              label="Early stopping"
              hint="Use the weights from the lowest validation error (green line)"
              value={earlyStop && useVal}
              onChange={(v) => { setEarlyStop(v); if (v) setUseVal(true) }}
            />
            <Slider label="Weight decay" value={decayIdx} min={0} max={4} onChange={setDecayIdx} fmt={(v) => (decays[v] ? String(decays[v]) : 'off')} />
            <Btn onClick={() => setVersion((v) => v + 1)}>Restart training</Btn>
          </Group>
          <Group title="Verdict">
            <Stats>
              <Stat label="Training error" value={`${tr.toFixed(1)} %`} />
              <Stat label="Validation error" value={sim.val.length ? `${va.toFixed(1)} %` : 'no set'} tone={diagnosis === 'Overfitting' ? 'bad' : 'plain'} />
              <Stat label="Diagnosis" value={diagnosis} tone={diagnosis === 'Fits the readings' ? 'good' : 'bad'} />
              <Stat label="LM iterations" value={sim.its} />
            </Stats>
            <Stat label="The network says your phone dies at" value={dies} tone={dies.endsWith('h') ? 'plain' : 'bad'} />
            <p className="text-[11px] text-slate-500">It really dies at about 10.9 h.</p>
          </Group>
        </>
      }
    >
      <Canvas2D draw={onDraw} onPointerDown={tap} className="cursor-crosshair" />
    </LabShell>
  )
}
