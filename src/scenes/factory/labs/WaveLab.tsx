import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, useTicker } from '../../../ui/lab/Canvas2D'
import { Group, Seg, Slider, Stat, Stats } from '../../../ui/lab/controls'
import { autocorr, createNetwork, lmStep, output, paramCount, type Sample } from '../../../engine'

const RATE = 15 // samples per second
const PAST = 120 // samples of history on screen (8 s)
const AHEAD = 30 // samples of forecast drawn (2 s)
const H = 15 // "one second ahead"
const LAGS = 12

type Source = 'demo' | 'finger' | 'tilt'
/** Errors this small are rounding noise; their correlation means nothing. */
const quiet = (e: number[]) => e.every((v) => Math.abs(v) < 0.002)
const demo = (t: number) => 0.55 * Math.sin(2 * Math.PI * 0.5 * t) + 0.3 * Math.sin(2 * Math.PI * t + 1)

export default function WaveLab() {
  const [source, setSource] = useState<Source>('demo')
  const [D, setD] = useState(6)
  const [show, setShow] = useState<'one' | 'second'>('second')
  const [message, setMessage] = useState('')
  const input = useRef({ finger: 0, tilt: 0, gotTilt: false })
  useTicker(300)

  const sim = useMemo(() => {
    const net = createNetwork(D, [8, 1], ['tansig', 'purelin'], { seed: 6 + D })
    // Start with a few seconds of the demo wave so there is something to learn from at once
    const y = Array.from({ length: PAST }, (_, i) => demo(i / RATE))
    return {
      net,
      lm: { mu: 0.01 },
      y,
      pred1: [] as number[],
      predH: [] as number[],
      ghost: [] as number[],
      errs: [] as number[],
      time: PAST / RATE,
      acc: 0,
      value: y[y.length - 1],
    }
  }, [D])

  useEffect(() => {
    if (source !== 'tilt') return
    input.current.gotTilt = false
    setMessage('')
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta === null) return
      input.current.gotTilt = true
      input.current.tilt = Math.max(-1, Math.min(1, e.beta / 45))
    }
    const ask = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
    if (ask) ask().catch(() => {})
    window.addEventListener('deviceorientation', onTilt)
    const id = setTimeout(() => {
      if (!input.current.gotTilt) setMessage('No tilt sensor found on this device. Use your finger instead.')
    }, 1800)
    return () => {
      window.removeEventListener('deviceorientation', onTilt)
      clearTimeout(id)
    }
  }, [source])

  const window1 = (j: number) => Array.from({ length: D }, (_, d) => sim.y[j - 1 - d])

  const sample = () => {
    sim.time += 1 / RATE
    const t = sim.time
    const target =
      source === 'demo'
        ? demo(t)
        : source === 'finger'
          ? input.current.finger
          : input.current.tilt
    sim.value += (target - sim.value) * (source === 'demo' ? 1 : 0.45)
    sim.y.push(sim.value)
    const k = sim.y.length - 1
    if (Number.isFinite(sim.pred1[k])) {
      sim.errs.push(sim.value - sim.pred1[k])
      if (sim.errs.length > 120) sim.errs.shift()
    }
    if (k <= D + 2) return
    // Train on 60 windows spread over the last 12 seconds (series-parallel: measured values as inputs)
    if (k % 2 === 0) {
      const span = Math.min(k - D, 180)
      const batch: Sample[] = Array.from({ length: 60 }, (_, i) => {
        const j = k - Math.floor((i / 60) * span)
        return { p: window1(j), t: [sim.y[j]] }
      })
      lmStep(sim.net, batch, sim.lm)
    }
    // One step ahead, then closed loop: feed predictions back in as if they were measurements
    const w = window1(k + 1)
    sim.ghost = []
    for (let s = 0; s < AHEAD; s++) {
      const v = Math.max(-2, Math.min(2, output(sim.net, w)[0]))
      sim.ghost.push(v)
      w.pop()
      w.unshift(v)
    }
    sim.pred1[k + 1] = sim.ghost[0]
    sim.predH[k + H] = sim.ghost[H - 1]
    if (sim.y.length > 900) {
      sim.y.splice(0, 400)
      sim.pred1.splice(0, 400)
      sim.predH.splice(0, 400)
    }
  }

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, _t: number, dt: number) => {
    sim.acc += dt
    while (sim.acc >= 1 / RATE) {
      sim.acc -= 1 / RATE
      sample()
    }
    const k = sim.y.length - 1
    const step = (w * 0.78) / PAST
    const nowX = w * 0.78
    const X = (i: number) => nowX + (i - k) * step
    const Y = (v: number) => h / 2 - v * (h * 0.36)
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.lineWidth = 1
    for (const v of [-1, 0, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, Y(v))
      ctx.lineTo(w, Y(v))
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(250,204,21,0.05)'
    ctx.fillRect(nowX, 0, w - nowX, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.beginPath()
    ctx.moveTo(nowX, 0)
    ctx.lineTo(nowX, h)
    ctx.stroke()
    ctx.font = '11px ui-monospace, monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'right'
    ctx.fillText('what happened', nowX - 8, 16)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#fbbf24'
    ctx.fillText('forecast', nowX + 8, 16)

    const trace = (arr: number[], color: string, width: number) => {
      ctx.beginPath()
      let pen = false
      for (let i = Math.max(0, k - PAST); i <= k; i++) {
        const v = arr[i]
        if (!Number.isFinite(v)) {
          pen = false
          continue
        }
        if (pen) ctx.lineTo(X(i), Y(v))
        else ctx.moveTo(X(i), Y(v))
        pen = true
      }
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineJoin = 'round'
      ctx.stroke()
    }
    trace(show === 'one' ? sim.pred1 : sim.predH, show === 'one' ? '#34d399' : '#f59e0b', 2)
    trace(sim.y, '#f8fafc', 2.5)
    // Forecast running ahead of now
    for (let s = 0; s < sim.ghost.length; s++) {
      ctx.fillStyle = `rgba(251,191,36,${0.95 - (s / AHEAD) * 0.8})`
      ctx.beginPath()
      ctx.arc(X(k + 1 + s), Y(sim.ghost[s]), 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
    if (k >= 0) dot(ctx, nowX, Y(sim.y[k]), 7, '#f8fafc')

    // Error autocorrelation inset
    const r = quiet(sim.errs) ? [] : autocorr(sim.errs, LAGS)
    const bw = 9
    const ix = 14
    const iy = h - 16
    const ih = 46
    ctx.fillStyle = 'rgba(2,6,23,0.8)'
    ctx.fillRect(ix - 6, iy - ih * 2 - 22, LAGS * (bw + 3) + 14, ih * 2 + 34)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px ui-monospace, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('error autocorrelation', ix, iy - ih * 2 - 8)
    const mid = iy - ih
    const bound = sim.errs.length ? 2 / Math.sqrt(sim.errs.length) : 1
    ctx.strokeStyle = 'rgba(248,113,113,0.7)'
    ctx.setLineDash([3, 3])
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(ix, mid - s * bound * ih)
      ctx.lineTo(ix + LAGS * (bw + 3), mid - s * bound * ih)
      ctx.stroke()
    }
    ctx.setLineDash([])
    for (let lag = 1; lag <= LAGS; lag++) {
      const v = Math.max(-1, Math.min(1, r[lag] || 0))
      ctx.fillStyle = Math.abs(v) > bound ? '#f87171' : '#34d399'
      ctx.fillRect(ix + (lag - 1) * (bw + 3), v >= 0 ? mid - v * ih : mid, bw, Math.abs(v) * ih)
    }
  }

  const follow = (e: PointerEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    input.current.finger = Math.max(-1.2, Math.min(1.2, (box.height / 2 - (e.clientY - box.top)) / (box.height * 0.36)))
  }

  const rms = (pred: number[]) => {
    const k = sim.y.length - 1
    let s = 0
    let n = 0
    for (let i = Math.max(0, k - 75); i <= k; i++)
      if (Number.isFinite(pred[i])) {
        s += (sim.y[i] - pred[i]) ** 2
        n++
      }
    return n ? Math.sqrt(s / n) : NaN
  }
  const r = quiet(sim.errs) ? [] : autocorr(sim.errs, LAGS)
  const bound = sim.errs.length ? 2 / Math.sqrt(sim.errs.length) : 1
  const outside = r.slice(1).filter((v) => Math.abs(v) > bound).length
  const e1 = rms(sim.pred1)
  const eH = rms(sim.predH)

  return (
    <LabShell
      labId="wave"
      actions={{
        break: { label: 'Use only 1 delay', run: () => setD(1) },
        fix: { label: 'Use 8 delays', run: () => setD(8) },
      }}
      panel={
        <>
          <Group title="The signal">
            <Seg
              value={source}
              onChange={setSource}
              options={[
                { value: 'demo', label: 'Demo wave' },
                { value: 'finger', label: 'My finger' },
                { value: 'tilt', label: 'Phone tilt' },
              ]}
            />
            {source === 'finger' && <p className="text-[11px] text-slate-500">Move up and down over the chart, in a rhythm.</p>}
            {source === 'tilt' && <p className="text-[11px] text-slate-500">Rock the phone gently towards you and away.</p>}
            {message && <p className="text-xs text-amber-300">{message}</p>}
          </Group>
          <Group title="The network">
            <Slider
              label="Delays in the tapped delay line"
              value={D}
              min={1}
              max={12}
              onChange={setD}
              fmt={(v) => `${v} · ${v}-8-1 · ${paramCount(sim.net)} parameters`}
            />
            <Seg
              label="Compare with what happened"
              value={show}
              onChange={setShow}
              options={[
                { value: 'one', label: 'One step ahead' },
                { value: 'second', label: 'One second ahead' },
              ]}
            />
          </Group>
          <Group title="How good is the forecast?">
            <Stats>
              <Stat label="One-step error" value={Number.isFinite(e1) ? e1.toFixed(3) : '—'} />
              <Stat label="One-second error" value={Number.isFinite(eH) ? eH.toFixed(3) : '—'} tone={eH > 0.25 ? 'bad' : 'plain'} />
              <Stat label="Lags outside limits" value={`${outside} of ${LAGS}`} tone={outside > 2 ? 'bad' : 'good'} />
              <Stat label="Closed-loop steps" value={H} />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas2D
        draw={onDraw}
        onPointerMove={follow}
        onPointerDown={(e) => {
          follow(e)
          if (source === 'demo') setSource('finger')
        }}
        className="cursor-ns-resize"
      />
    </LabShell>
  )
}
