import { useMemo, useRef, useState } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, drawAxes, drawCurve, makePlot, useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { createNetwork, createTrainer, gauss, lossOn, output, rng, shuffle, type Sample } from '../../../engine'

interface Trip {
  h: number
  min: number
}

const bump = (h: number, mu: number, sd: number) => Math.exp(-((h - mu) ** 2) / (2 * sd * sd))
/** Minutes to cross the junction at hour h: quiet nights, a morning peak and a worse evening peak. */
const reality = (h: number) => 4 + 27 * bump(h, 9.4, 1.4) + 38 * bump(h, 18.7, 1.9) + 6 * bump(h, 13.5, 1.6)

const population: Trip[] = (() => {
  const rand = rng(42)
  return Array.from({ length: 280 }, () => {
    const h = rand() * 24
    return { h, min: Math.max(2, reality(h) + gauss(rand) * 2.4) }
  })
})()

type Method = 'random' | 'systematic' | 'first' | 'stratified'

const toSample = (t: Trip): Sample => ({ p: [t.h / 12 - 1], t: [t.min / 25 - 1] })
const allSamples = population.map(toSample)

const fmtHour = (h: number) => {
  const hh = Math.floor(h) % 24
  const mm = Math.round((h - Math.floor(h)) * 60)
  const suffix = hh < 12 ? 'am' : 'pm'
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`
}

const inWindow = (h: number, from: number, to: number) =>
  from === to ? true : from < to ? h >= from && h < to : h >= from || h < to

export default function TrafficLab() {
  const [from, setFrom] = useState(0)
  const [to, setTo] = useState(24)
  const [method, setMethod] = useState<Method>('random')
  const [n, setN] = useState(60)
  const [trainPct, setTrainPct] = useState(70)
  const [shuffleSplit, setShuffleSplit] = useState(true)
  const [draw, setDraw] = useState(1)
  const [ask, setAsk] = useState(18)
  const cars = useRef(Array.from({ length: 22 }, (_, i) => i / 22))
  useTicker(300)

  const sets = useMemo(() => {
    const rand = rng(draw * 97 + 3)
    const cands = population.filter((t) => inWindow(t.h, from, to))
    const sorted = cands.slice().sort((a, b) => a.h - b.h)
    let picked: Trip[]
    if (method === 'random') picked = shuffle(cands, rand).slice(0, n)
    else if (method === 'first') picked = sorted.slice(0, n)
    else if (method === 'systematic') {
      const k = Math.max(1, sorted.length / n)
      picked = Array.from({ length: Math.min(n, sorted.length) }, (_, i) => sorted[Math.floor(i * k)])
    } else {
      const buckets = Array.from({ length: 8 }, (_, b) =>
        shuffle(
          cands.filter((t) => Math.floor(t.h / 3) === b),
          rand,
        ),
      ).filter((b) => b.length)
      picked = []
      for (let i = 0; picked.length < n && buckets.some((b) => b.length); i++) {
        const t = buckets[i % buckets.length].pop()
        if (t) picked.push(t)
      }
    }
    const order = shuffleSplit ? shuffle(picked, rand) : picked.slice().sort((a, b) => a.h - b.h)
    const nTrain = Math.max(2, Math.round((order.length * trainPct) / 100))
    const nVal = Math.floor((order.length - nTrain) / 2)
    return {
      train: order.slice(0, nTrain),
      val: order.slice(nTrain, nTrain + nVal),
      test: order.slice(nTrain + nVal),
    }
  }, [from, to, method, n, trainPct, shuffleSplit, draw])

  const sim = useMemo(() => {
    const net = createNetwork(1, [8, 1], ['tansig', 'purelin'], { seed: draw + 11 })
    return {
      net,
      trainer: createTrainer(net),
      train: sets.train.map(toSample),
      val: sets.val.map(toSample),
      test: sets.test.map(toSample),
      its: 0,
      born: performance.now() / 1000,
    }
  }, [sets, draw])

  const predict = (h: number) => (output(sim.net, [h / 12 - 1])[0] + 1) * 25
  const rms = (s: Sample[]) => (s.length ? Math.sqrt(lossOn(sim.net, s)) * 25 : NaN)
  const says = Math.max(0, predict(ask))
  const real = reality(ask)

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    if (sim.train.length) {
      for (let k = 0; k < 25; k++) sim.trainer.step(sim.train, { alpha: 0.08, gamma: 0.9 })
      sim.its += 25
    }
    // Road strip: cars crawl at the real speed for the hour being asked about
    const roadH = 30
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, w, roadH)
    ctx.strokeStyle = 'rgba(250,204,21,0.5)'
    ctx.setLineDash([14, 12])
    ctx.beginPath()
    ctx.moveTo(0, roadH / 2)
    ctx.lineTo(w, roadH / 2)
    ctx.stroke()
    ctx.setLineDash([])
    const count = Math.round(5 + real / 2.6)
    const speed = 2.6 / real
    cars.current.forEach((c, i) => {
      cars.current[i] = (c + speed * dt) % 1
      if (i >= count) return
      ctx.fillStyle = ['#38bdf8', '#fbbf24', '#f472b6', '#e2e8f0'][i % 4]
      ctx.fillRect(cars.current[i] * (w + 30) - 30, i % 2 ? 4 : 18, 18, 8)
    })

    const pl = makePlot(w, h, [0, 24], [0, 50], { t: roadH + 14 })
    // Survey window
    ctx.fillStyle = 'rgba(56,189,248,0.07)'
    const shade = (a: number, b: number) => ctx.fillRect(pl.X(a), pl.top, pl.X(b) - pl.X(a), pl.bottom - pl.top)
    if (from === to) shade(0, 24)
    else if (from < to) shade(from, to)
    else {
      shade(from, 24)
      shade(0, to)
    }
    drawAxes(ctx, pl, {
      xTicks: [0, 3, 6, 9, 12, 15, 18, 21, 24],
      yTicks: [0, 10, 20, 30, 40, 50],
      xFmt: fmtHour,
      yLabel: 'minutes to cross',
    })
    for (const tr of population) dot(ctx, pl.X(tr.h), pl.Y(tr.min), 2, 'rgba(148,163,184,0.28)')
    const age = t - sim.born
    const pop = (i: number) => Math.max(0, Math.min(1, (age - i * 0.008) / 0.25))
    const groups: [Trip[], string][] = [
      [sets.train, '#38bdf8'],
      [sets.val, '#fbbf24'],
      [sets.test, '#fb7185'],
    ]
    let i = 0
    for (const [set, color] of groups)
      for (const tr of set) {
        const s = pop(i++)
        if (s > 0) dot(ctx, pl.X(tr.h), pl.Y(tr.min), 4.5 * (2 - s), color)
      }
    drawCurve(ctx, pl, predict, { color: '#c4b5fd', width: 3, glow: true })
    // Ask marker
    const ax = pl.X(ask)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.moveTo(ax, pl.top)
    ctx.lineTo(ax, pl.bottom)
    ctx.stroke()
    const pulse = 6 + Math.sin(t * 5) * 1.5
    dot(ctx, ax, pl.Y(real), pulse, 'rgba(248,250,252,0.9)')
    dot(ctx, ax, pl.Y(Math.min(50, says)), pulse, '#a78bfa')
  }

  const gap = Math.abs(says - real)
  return (
    <LabShell
      labId="traffic"
      actions={{
        break: {
          label: 'Survey only at night (10 pm to 6 am)',
          run: () => {
            setFrom(22)
            setTo(6)
            setMethod('random')
            setAsk(18)
          },
        },
        fix: {
          label: 'Survey the whole day, stratified',
          run: () => {
            setFrom(0)
            setTo(24)
            setMethod('stratified')
          },
        },
      }}
      panel={
        <>
          <Group title="Which trips do we survey?">
            <Slider label="Survey from" value={from} min={0} max={24} onChange={setFrom} fmt={fmtHour} />
            <Slider label="Survey until" value={to} min={0} max={24} onChange={setTo} fmt={fmtHour} />
            <Seg
              label="Sampling method"
              value={method}
              onChange={setMethod}
              options={[
                { value: 'random', label: 'Random' },
                { value: 'stratified', label: 'Stratified' },
                { value: 'systematic', label: 'Every k-th' },
                { value: 'first', label: 'First rows' },
              ]}
            />
            <Slider label="Sample size" value={n} min={8} max={160} onChange={setN} fmt={(v) => `${v} trips`} />
            <Btn onClick={() => setDraw((d) => d + 1)}>Draw a new sample</Btn>
          </Group>
          <Group title="Split into three sets">
            <Slider
              label="Training share"
              value={trainPct}
              min={40}
              max={90}
              step={5}
              onChange={setTrainPct}
              fmt={(v) => `${v} / ${(100 - v) / 2} / ${(100 - v) / 2}`}
            />
            <Toggle
              label="Shuffle before splitting"
              hint="Off: the file stays sorted by time, so the test set is the latest hours"
              value={shuffleSplit}
              onChange={setShuffleSplit}
            />
            <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
              <span><b className="text-sky-400">●</b> train {sets.train.length}</span>
              <span><b className="text-amber-400">●</b> validation {sets.val.length}</span>
              <span><b className="text-rose-400">●</b> test {sets.test.length}</span>
            </div>
          </Group>
          <Group title="Error, in minutes">
            <Stats>
              <Stat label="Training" value={rms(sim.train).toFixed(1)} />
              <Stat label="Validation" value={rms(sim.val).toFixed(1)} />
              <Stat label="Test" value={rms(sim.test).toFixed(1)} />
              <Stat
                label="All real trips"
                value={rms(allSamples).toFixed(1)}
                tone={rms(allSamples) > 6 ? 'bad' : 'good'}
              />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas2D draw={onDraw} />
      <div className="pointer-events-none absolute left-14 right-3 top-14 flex flex-col gap-1.5 rounded-lg border border-white/10 bg-slate-950/85 p-3 sm:right-auto sm:w-72">
        <label className="pointer-events-auto flex flex-col gap-1 text-xs text-slate-300">
          <span>
            Ask the network: how long at <b className="text-white">{fmtHour(ask)}</b>?
          </span>
          <input
            type="range"
            min={0}
            max={24}
            step={0.5}
            value={ask}
            onChange={(e) => setAsk(Number(e.target.value))}
            className="h-6 w-full accent-violet-400"
          />
        </label>
        <div className="flex items-baseline justify-between gap-2 font-mono text-xs">
          <span className="text-violet-300">says {says.toFixed(0)} min</span>
          <span className="text-slate-100">really {real.toFixed(0)}</span>
          <span className={gap > 8 ? 'text-rose-400' : 'text-emerald-400'}>off by {gap.toFixed(0)}</span>
        </div>
      </div>
    </LabShell>
  )
}
