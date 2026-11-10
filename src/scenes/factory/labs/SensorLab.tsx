import { useEffect, useMemo, useRef, useState } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, drawAxes, drawCurve, makePlot, useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import {
  activations,
  createNetwork,
  fitMinMax,
  gauss,
  lmStep,
  normalize,
  output,
  paramCount,
  rng,
  type Sample,
} from '../../../engine'

/** 10 kΩ NTC thermistor (B = 3950) above a 10 kΩ resistor, read by a 10-bit ADC. */
const adcOf = (T: number) => {
  const R = 10000 * Math.exp(3950 * (1 / (T + 273.15) - 1 / 298.15))
  return (1023 * 10000) / (R + 10000)
}
const noise = rng(9)
const readPin = (T: number) => Math.round(adcOf(T) + gauss(noise) * 2)

interface Point {
  adc: number
  T: number
}

const sweep = (count: number): Point[] =>
  Array.from({ length: count }, (_, i) => {
    const T = 2 + (96 * i) / (count - 1)
    return { adc: readPin(T), T }
  })

export default function SensorLab() {
  const [temp, setTemp] = useState(62)
  const [points, setPoints] = useState<Point[]>(() => sweep(12))
  const [norm, setNorm] = useState(true)
  const [S, setS] = useState(4)
  const live = useRef({ adc: readPin(62), lines: [] as string[] })
  const frame = useRef(0)
  useTicker(250)

  const sim = useMemo(() => {
    const mm = fitMinMax(points.map((p) => p.adc))
    const input = (adc: number) => (norm ? normalize(adc, mm) : adc)
    const net = createNetwork(1, [S, 1], ['tansig', 'purelin'], { seed: 21 + S })
    const data: Sample[] = points.map((p) => ({ p: [input(p.adc)], t: [p.T / 50 - 1] }))
    // Straight-line calibration by least squares, for comparison
    const n = points.length
    const mx = points.reduce((s, p) => s + p.adc, 0) / Math.max(1, n)
    const my = points.reduce((s, p) => s + p.T, 0) / Math.max(1, n)
    const sxx = points.reduce((s, p) => s + (p.adc - mx) ** 2, 0)
    const slope = sxx ? points.reduce((s, p) => s + (p.adc - mx) * (p.T - my), 0) / sxx : 0
    return { net, data, input, state: { mu: 0.01 }, its: 0, mse: 1, line: (adc: number) => my + slope * (adc - mx) }
  }, [points, norm, S])

  const predict = (adc: number) => (output(sim.net, [sim.input(adc)])[0] + 1) * 50

  useEffect(() => {
    const id = setInterval(() => {
      const adc = readPin(temp)
      live.current.adc = adc
      live.current.lines = [...live.current.lines, `A0 = ${adc}`].slice(-5)
    }, 350)
    return () => clearInterval(id)
  }, [temp])

  // Error against a reference thermometer across the whole range
  const check = (f: (adc: number) => number) => {
    let s = 0
    for (let T = 0; T <= 100; T += 2) s += (f(adcOf(T)) - T) ** 2
    return Math.sqrt(s / 51)
  }
  const netErr = check(predict)
  const lineErr = check(sim.line)
  const sat = sim.data.length
    ? Array.from({ length: S }, (_, j) => {
        let m = 0
        for (const d of sim.data) m += Math.abs(activations(sim.net, d.p)[0][j])
        return m / sim.data.length
      })
    : []
  const saturated = sat.filter((v) => v > 0.97).length

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    frame.current++
    if (sim.data.length >= 2 && frame.current % 3 === 0 && sim.its < 400) {
      sim.mse = lmStep(sim.net, sim.data, sim.state)
      sim.its++
    }
    const pl = makePlot(w, h, [150, 1023], [-10, 112])
    drawAxes(ctx, pl, {
      xTicks: [200, 400, 600, 800, 1000],
      yTicks: [0, 25, 50, 75, 100],
      xLabel: 'reading on pin A0 (0 to 1023)',
      yLabel: 'temperature, °C',
    })
    // True sensor curve
    ctx.beginPath()
    for (let T = -10; T <= 112; T += 2) {
      const x = pl.X(adcOf(T))
      if (T === -10) ctx.moveTo(x, pl.Y(T))
      else ctx.lineTo(x, pl.Y(T))
    }
    ctx.strokeStyle = 'rgba(148,163,184,0.35)'
    ctx.lineWidth = 6
    ctx.stroke()
    drawCurve(ctx, pl, sim.line, { color: '#94a3b8', width: 1.5, dash: [6, 5] })
    drawCurve(ctx, pl, predict, { color: '#c4b5fd', width: 3, glow: true })
    for (const p of points) dot(ctx, pl.X(p.adc), pl.Y(p.T), 4.5, '#fb923c')
    // Live reading
    const x = pl.X(live.current.adc)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, pl.top)
    ctx.lineTo(x, pl.bottom)
    ctx.stroke()
    const pulse = 6 + Math.sin(t * 5) * 1.5
    dot(ctx, x, pl.Y(temp), pulse, 'rgba(248,250,252,0.9)')
    dot(ctx, x, pl.Y(Math.max(-10, Math.min(112, predict(live.current.adc)))), pulse, '#a78bfa')
    // Hidden neuron saturation meters
    ctx.font = '10px ui-monospace, monospace'
    ctx.fillStyle = '#64748b'
    ctx.textAlign = 'right'
    ctx.fillText('hidden neurons: average |a|', pl.right - 4, pl.bottom - 62)
    sat.forEach((v, j) => {
      const bx = pl.right - 8 - (S - j) * 12
      ctx.fillStyle = 'rgba(148,163,184,0.2)'
      ctx.fillRect(bx, pl.bottom - 54, 8, 44)
      ctx.fillStyle = v > 0.97 ? '#f87171' : '#34d399'
      ctx.fillRect(bx, pl.bottom - 10 - 44 * v, 8, 44 * v)
    })
  }

  const says = predict(live.current.adc)
  return (
    <LabShell
      labId="sensor"
      happening={
        <>
          <p>
            Pin A0 reads {live.current.adc}.{' '}
            {norm
              ? `It is scaled to ${sim.input(live.current.adc).toFixed(2)} before it enters the network, so the tansig neurons work on their sloping part.`
              : `It goes in raw, so n = w × ${live.current.adc} + b is huge and tansig is stuck at +1 or −1, where its slope is zero.`}
          </p>
          <p>
            {saturated > 0
              ? `${saturated} of ${S} hidden neurons are saturated (red bars). A saturated neuron passes no gradient back, so its weights stop learning.`
              : `Each of the ${S} hidden neurons adds one bend. Training has adjusted the ${3 * S + 1} parameters ${sim.its} times.`}
          </p>
          <p>
            Against a reference thermometer the network is off by {netErr.toFixed(2)} °C; a straight line is off by {lineErr.toFixed(2)} °C.
          </p>
        </>
      }
      actions={{
        break: { label: 'Feed raw counts (normalisation off)', run: () => setNorm(false) },
        fix: { label: 'Normalise the input', run: () => setNorm(true) },
      }}
      panel={
        <>
          <Group title="The bench">
            <Slider label="Hotplate" value={temp} min={0} max={100} onChange={setTemp} fmt={(v) => `${v} °C`} />
            <div className="flex flex-wrap gap-2">
              <Btn tone="go" onClick={() => setPoints((p) => [...p, { adc: readPin(temp), T: temp }])}>
                Record this point
              </Btn>
              <Btn onClick={() => setPoints(sweep(12))}>Sweep 12 points</Btn>
              <Btn onClick={() => setPoints([])}>Clear</Btn>
            </div>
            <p className="text-[11px] text-slate-500">{points.length} calibration points recorded</p>
          </Group>
          <Group title="The network">
            <Toggle
              label="Normalise the input to [−1, 1]"
              hint="Using the min and max of the recorded points"
              value={norm}
              onChange={setNorm}
            />
            <Slider
              label="Hidden neurons S"
              value={S}
              min={1}
              max={12}
              onChange={setS}
              fmt={(v) => `1-${v}-1 · ${paramCount(sim.net)} parameters`}
            />
          </Group>
          <Group title="Checked against a reference thermometer">
            <Stats>
              <Stat label="Network error" value={`${netErr.toFixed(2)} °C`} tone={netErr < lineErr / 10 ? 'good' : netErr > lineErr ? 'bad' : 'plain'} />
              <Stat label="Straight line" value={`${lineErr.toFixed(2)} °C`} />
              <Stat label="Saturated neurons" value={`${saturated} of ${S}`} tone={saturated ? 'bad' : 'good'} />
              <Stat label="LM iterations" value={sim.its} />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas2D draw={onDraw} />
      <div className="pointer-events-none absolute left-14 top-9 w-44 rounded-md border border-emerald-400/30 bg-black/80 p-2 font-mono text-[11px] leading-tight text-emerald-300">
        <div className="mb-1 text-[9px] uppercase tracking-widest text-emerald-500">Serial monitor · 9600 baud</div>
        {live.current.lines.map((l, i) => (
          <div key={i} className={i === live.current.lines.length - 1 ? '' : 'opacity-50'}>{l}</div>
        ))}
        <div className="mt-1 border-t border-emerald-400/20 pt-1 text-violet-300">
          network: {Number.isFinite(says) ? says.toFixed(1) : '—'} °C
        </div>
        <div className="text-slate-300">true: {temp.toFixed(1)} °C</div>
      </div>
    </LabShell>
  )
}
