import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Canvas2D, { dot, drawAxes, drawCurve, makePlot, useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { factoryLabs } from '../../../data/factoryLabs'
import { useAppStore } from '../../../store/useAppStore'
import {
  buildData,
  COST_PER_RECORD,
  createRun,
  debrief,
  expertProfit,
  HOUR_BLOCKS,
  inspect,
  isBroken,
  KM_BANDS,
  liveOrders,
  paramCountFor,
  predictor,
  rushedConfig,
  SEGMENTS,
  ship,
  stars,
  type Config,
  type Finding,
  type Run,
  type Shipment,
} from './sim'
import { stages } from './stages'

const C = { train: '#38bdf8', val: '#fbbf24', test: '#fb7185', good: '#34d399', bad: '#f87171', lost: '#64748b' }
const rupees = (v: number) => `${v < 0 ? '−' : ''}₹${Math.abs(Math.round(v)).toLocaleString('en-IN')}`
const hourFmt = (h: number) => (h === 12 ? '12 pm' : h === 24 ? '12 am' : h < 12 ? `${h} am` : `${h - 12} pm`)
const ORDERS_PER_SECOND = 110

/** Screen rectangle of segment s on an hour × distance plot. */
function segRect(pl: ReturnType<typeof makePlot>, s: number) {
  const [h0, h1] = HOUR_BLOCKS[Math.floor(s / KM_BANDS.length)]
  const [k0, k1] = KM_BANDS[s % KM_BANDS.length]
  return { x: pl.X(h0), y: pl.Y(k1), w: pl.X(h1) - pl.X(h0), h: pl.Y(k0) - pl.Y(k1) }
}

/**
 * The Model Factory mission: one delivery-time model taken through every Unit V stage, then launched.
 * Students play it for a score; in tutor mode each stage shows what to say, what to ask and what to show.
 */
export default function MissionGame() {
  const [cfg, setCfg] = useState<Config>(rushedConfig)
  const [stage, setStage] = useState(0)
  const [tutor, setTutor] = useState(false)
  const [briefing, setBriefing] = useState(true)
  const [run, setRun] = useState<Run | null>(null)
  const [launch, setLaunch] = useState<{ shipment: Shipment; findings: Finding[]; at: number } | null>(null)
  const [attempt, setAttempt] = useState(1)
  const best = useAppStore((s) => s.missionBest)
  const recordMission = useAppStore((s) => s.recordMission)
  useTicker(200)

  const data = useMemo(
    () => buildData(cfg),
    // only the data and preparation choices change the data set
    [cfg.window, cfg.area, cfg.size, cfg.normalise, cfg.clean],
  )
  const trained = run !== null && run.status !== 'running'
  const insp = useMemo(() => (run && trained ? inspect(run.final, data) : null), [run, trained, data])
  const st = stages[stage]
  const blind = data.coverage.filter((c) => c === 0).length
  const params = paramCountFor(cfg.neurons)

  const patch = (p: Partial<Config>) => {
    setCfg((c) => ({ ...c, ...p }))
    setLaunch(null)
    if (Object.keys(p).some((k) => k !== 'buffer')) setRun(null)
  }
  const startTraining = () => {
    setLaunch(null)
    setRun(createRun(cfg, data))
  }
  const doLaunch = () => {
    if (!run || !insp) return
    const shipment = ship(run.final, data, cfg)
    setLaunch({ shipment, findings: debrief(cfg, data, run, insp, shipment), at: performance.now() / 1000 })
    recordMission(shipment.profit)
  }
  const goto = (i: number) => {
    if (i >= 4 && !trained) return
    setStage(i)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'ArrowRight') setStage((s) => (s < 3 || trained ? Math.min(5, s + 1) : s))
      if (e.key === 'ArrowLeft') setStage((s) => Math.max(0, s - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [trained])

  const shownOrders = launch ? Math.min(liveOrders.length, Math.floor((performance.now() / 1000 - launch.at) * ORDERS_PER_SECOND)) : 0
  const launchDone = launch !== null && shownOrders >= liveOrders.length

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    if (run?.status === 'running') run.step()
    ctx.font = '11px ui-monospace, monospace'
    if (st.id === 'data') drawData(ctx, w, h)
    else if (st.id === 'prepare') drawPrepare(ctx, w, h)
    else if (st.id === 'design') drawDesign(ctx, w, h, t)
    else if (st.id === 'train') drawTrain(ctx, w, h)
    else if (st.id === 'inspect') drawInspect(ctx, w, h)
    else drawShip(ctx, w, h)
  }

  const drawData = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const pl = makePlot(w, h, [10, 24], [0, 9])
    for (let s = 0; s < SEGMENTS; s++) {
      const r = segRect(pl, s)
      if (data.coverage[s] === 0) {
        ctx.fillStyle = 'rgba(244,63,94,0.13)'
        ctx.fillRect(r.x, r.y, r.w, r.h)
        ctx.fillStyle = 'rgba(253,164,175,0.9)'
        ctx.textAlign = 'center'
        ctx.fillText('no data', r.x + r.w / 2, r.y + r.h / 2)
      }
      ctx.strokeStyle = 'rgba(148,163,184,0.25)'
      ctx.strokeRect(r.x, r.y, r.w, r.h)
    }
    drawAxes(ctx, pl, { xTicks: [10, 12, 15, 18, 21, 24], yTicks: [0, 3, 6, 9], xFmt: hourFmt, yLabel: 'distance, km', xLabel: 'hour of the order' })
    for (const o of liveOrders) dot(ctx, pl.X(o.hour), pl.Y(o.km), 1.6, 'rgba(148,163,184,0.3)')
    const sets: [typeof data.train, string][] = [[data.train, C.train], [data.val, C.val], [data.test, C.test]]
    for (const [set, color] of sets) for (const o of set) dot(ctx, pl.X(o.hour), pl.Y(Math.min(9, o.km)), 3.4, color)
  }

  const drawPrepare = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const wl = Math.round(w * 0.56)
    const pl = cfg.normalise ? makePlot(wl, h, [-1.7, 1.7], [-1.7, 1.7]) : makePlot(wl, h, [-2, 26], [-600, 9600])
    drawAxes(ctx, pl, {
      xTicks: cfg.normalise ? [-1, 0, 1] : [0, 10, 20],
      yTicks: cfg.normalise ? [-1, 0, 1] : [0, 3000, 6000, 9000],
      xLabel: cfg.normalise ? 'input 1: hour, scaled' : 'input 1: hour',
      yLabel: cfg.normalise ? 'input 2: distance, scaled' : 'input 2: distance in metres',
    })
    ctx.fillStyle = 'rgba(52,211,153,0.16)'
    ctx.strokeStyle = C.good
    const bx = pl.X(-1)
    const by = pl.Y(1)
    const bw = Math.max(3, pl.X(1) - pl.X(-1))
    const bh = Math.max(3, pl.Y(-1) - pl.Y(1))
    ctx.fillRect(bx, by, bw, bh)
    ctx.strokeRect(bx, by, bw, bh)
    ctx.fillStyle = C.good
    ctx.textAlign = 'left'
    ctx.fillText(cfg.normalise ? 'neurons can respond in here' : '← neurons respond only in this tiny box', bx + (cfg.normalise ? 4 : bw + 6), cfg.normalise ? by - 5 : by + bh)
    for (const o of data.train) {
      const p = data.encode(o)
      dot(ctx, pl.X(p[0]), pl.Y(p[1]), 2.8, C.train)
    }
    // Delivery times strip
    ctx.save()
    ctx.translate(wl, 0)
    const top = cfg.clean ? 90 : 420
    const pr = makePlot(w - wl, h, [0, top], [0, 1], { l: 16 })
    drawAxes(ctx, pr, { xTicks: cfg.clean ? [0, 30, 60, 90] : [0, 120, 240, 360], yTicks: [], xLabel: 'logged delivery time, minutes' })
    data.train.forEach((o, i) => {
      const broken = isBroken(o)
      dot(ctx, pr.X(Math.min(top, o.minutes)), pr.Y(0.12 + ((i * 0.6180339) % 1) * 0.76), broken ? 4.5 : 2.6, broken ? C.bad : 'rgba(226,232,240,0.75)')
    })
    if (data.brokenInTrain > 0) {
      ctx.fillStyle = C.bad
      ctx.textAlign = 'right'
      ctx.fillText(`${data.brokenInTrain} broken: rider forgot to tap Delivered`, pr.right, pr.top + 12)
    }
    ctx.restore()
  }

  const drawDesign = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const S = cfg.neurons
    const cx = [w * 0.16, w * 0.5, w * 0.84]
    const top = 30
    const bottom = h - 110
    const inY = [top + (bottom - top) * 0.33, top + (bottom - top) * 0.67]
    const hidY = (i: number) => (S === 1 ? (top + bottom) / 2 : top + ((bottom - top) * i) / (S - 1))
    const outY = (top + bottom) / 2
    ctx.lineWidth = 1
    for (let i = 0; i < S; i++) {
      ctx.strokeStyle = 'rgba(148,163,184,0.35)'
      for (const y of inY) {
        ctx.beginPath()
        ctx.moveTo(cx[0], y)
        ctx.lineTo(cx[1], hidY(i))
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.moveTo(cx[1], hidY(i))
      ctx.lineTo(cx[2], outY)
      ctx.stroke()
      // a signal travelling forward
      const u = (t * 0.5 + i / S) % 1
      const a = u < 0.5 ? { x: cx[0], y: inY[i % 2] } : { x: cx[1], y: hidY(i) }
      const b = u < 0.5 ? { x: cx[1], y: hidY(i) } : { x: cx[2], y: outY }
      const v = (u % 0.5) * 2
      dot(ctx, a.x + (b.x - a.x) * v, a.y + (b.y - a.y) * v, 2.5, '#fde68a')
    }
    const r = Math.max(5, Math.min(13, (bottom - top) / (S * 2.6)))
    for (let i = 0; i < S; i++) dot(ctx, cx[1], hidY(i), r, '#a78bfa')
    inY.forEach((y) => dot(ctx, cx[0], y, 12, '#38bdf8'))
    dot(ctx, cx[2], outY, 13, '#34d399')
    ctx.fillStyle = '#cbd5e1'
    ctx.textAlign = 'center'
    ctx.fillText('hour', cx[0], inY[0] - 18)
    ctx.fillText('distance', cx[0], inY[1] + 26)
    ctx.fillText(`${S} hidden neuron${S > 1 ? 's' : ''} (tansig)`, cx[1], top - 12)
    ctx.fillText('minutes', cx[2], outY - 20)
    // parameters against training orders
    const n = data.train.length
    const bw = w - 60
    const scale = bw / Math.max(n, params, 1)
    const y0 = h - 78
    ctx.textAlign = 'left'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(`weights and biases to learn: ${params}`, 30, y0 - 4)
    ctx.fillStyle = '#a78bfa'
    ctx.fillRect(30, y0, params * scale, 12)
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(`training orders to learn them from: ${n}`, 30, y0 + 30)
    ctx.fillStyle = C.train
    ctx.fillRect(30, y0 + 34, n * scale, 12)
  }

  const drawTrain = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const split = Math.round(h * 0.6)
    const pl = makePlot(w, split, [10, 24], [0, 75], { b: 26 })
    drawAxes(ctx, pl, { xTicks: [10, 12, 15, 18, 21, 24], yTicks: [0, 25, 50, 75], xFmt: hourFmt, yLabel: 'promised minutes: 2 km (blue), 7 km (pink)' })
    const slices: [number, string][] = [[2, C.train], [7, '#f472b6']]
    for (const [km, color] of slices)
      for (const o of data.train) if (Math.abs(o.km - km) < 1) dot(ctx, pl.X(o.hour), pl.Y(Math.min(75, o.minutes)), 2.6, color)
    if (run) {
      const f = predictor(run.status === 'running' ? run.net : run.final, data)
      for (const [km, color] of slices) drawCurve(ctx, pl, (hr) => f({ hour: hr, km }), { color, width: 2.5, glow: true })
    } else {
      ctx.fillStyle = '#94a3b8'
      ctx.textAlign = 'center'
      ctx.fillText('Press "Start training" to watch the network learn', w / 2, split / 2)
    }
    ctx.save()
    ctx.translate(0, split)
    const H = run?.history ?? []
    const pe = makePlot(w, h - split, [0, Math.max(10, H.length - 1)], [0, 2], { t: 18 })
    drawAxes(ctx, pe, { xTicks: [], yTicks: [0, 1, 2], yFmt: (v) => `${10 ** v}`, yLabel: 'error in minutes: training (blue), validation (amber)', xLabel: 'training time →' })
    const line = (key: 'train' | 'val', color: string) => {
      ctx.beginPath()
      H.forEach((p, i) => {
        const y = pe.Y(Math.log10(Math.min(100, Math.max(1, p[key]))))
        if (i === 0) ctx.moveTo(pe.X(i), y)
        else ctx.lineTo(pe.X(i), y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    }
    if (H.length > 1) {
      line('train', C.train)
      line('val', C.val)
    }
    ctx.restore()
  }

  const drawInspect = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!insp) return
    const wl = Math.round(w * 0.5)
    const pl = makePlot(wl, h, [0, 75], [0, 75])
    drawAxes(ctx, pl, { xTicks: [0, 25, 50, 75], yTicks: [0, 25, 50, 75], xLabel: 'real minutes (test orders)', yLabel: 'predicted minutes' })
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(pl.X(0), pl.Y(0))
    ctx.lineTo(pl.X(75), pl.Y(75))
    ctx.stroke()
    ctx.setLineDash([])
    for (const [actual, pred] of insp.pairs) dot(ctx, pl.X(Math.min(75, actual)), pl.Y(Math.min(75, Math.max(0, pred))), 3, C.test)
    ctx.save()
    ctx.translate(wl, 0)
    const pg = makePlot(w - wl, h, [10, 24], [0, 9], { l: 34 })
    drawAxes(ctx, pg, { xTicks: [10, 15, 21], yTicks: [0, 3, 6, 9], xFmt: hourFmt, yLabel: 'error by situation, minutes' })
    for (let s = 0; s < SEGMENTS; s++) {
      const r = segRect(pg, s)
      const e = insp.segRms[s]
      const none = insp.segCount[s] === 0
      ctx.fillStyle = none ? 'rgba(100,116,139,0.35)' : e < 4 ? 'rgba(52,211,153,0.45)' : e < 8 ? 'rgba(251,191,36,0.45)' : 'rgba(248,113,113,0.5)'
      ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2)
      ctx.fillStyle = '#f8fafc'
      ctx.textAlign = 'center'
      ctx.fillText(none ? '?' : e.toFixed(0), r.x + r.w / 2, r.y + r.h / 2 + 4)
    }
    ctx.restore()
  }

  const drawShip = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!launch) {
      ctx.fillStyle = '#94a3b8'
      ctx.textAlign = 'center'
      ctx.fillText('Set the buffer, then press "Launch" to face a month of live orders', w / 2, h / 2)
      return
    }
    const wl = Math.round(w * 0.52)
    const cols = 30
    const rows = liveOrders.length / cols
    const cell = Math.min((wl - 30) / cols, (h - 60) / rows)
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'left'
    ctx.fillText('live orders: green on time · red late, refunded · grey went to a rival', 16, 20)
    for (let i = 0; i < shownOrders; i++) {
      const o = launch.shipment.outcomes[i]
      ctx.fillStyle = o === 'ontime' ? C.good : o === 'late' ? C.bad : C.lost
      const fresh = i > shownOrders - 20 ? 1.5 : 0
      ctx.fillRect(16 + (i % cols) * cell - fresh / 2, 32 + Math.floor(i / cols) * cell - fresh / 2, cell - 1.5 + fresh, cell - 1.5 + fresh)
    }
    if (!launchDone) return
    // The headline result, under the orders
    const ry = 32 + rows * cell + 34
    const n = stars(launch.shipment.profit)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('profit for the month, after data cost', 16, ry - 22)
    ctx.font = '600 28px system-ui, sans-serif'
    ctx.fillStyle = launch.shipment.profit > 0 ? '#f8fafc' : C.bad
    ctx.fillText(rupees(launch.shipment.profit), 16, ry + 8)
    const tw = ctx.measureText(rupees(launch.shipment.profit)).width
    ctx.font = '22px system-ui, sans-serif'
    ctx.fillStyle = '#fbbf24'
    ctx.fillText('★'.repeat(n), 28 + tw, ry + 6)
    ctx.fillStyle = '#334155'
    ctx.fillText('★'.repeat(3 - n), 28 + tw + ctx.measureText('★'.repeat(n)).width, ry + 6)
    ctx.font = '11px ui-monospace, monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(`a careful engineer makes ${rupees(expertProfit())}`, 16, ry + 30)
    ctx.save()
    ctx.translate(wl, 0)
    const pg = makePlot(w - wl, h, [10, 24], [0, 9], { l: 34, t: 34 })
    drawAxes(ctx, pg, { xTicks: [10, 15, 21], yTicks: [0, 3, 6, 9], xFmt: hourFmt, yLabel: '% of orders that went wrong, by situation' })
    for (let s = 0; s < SEGMENTS; s++) {
      const r = segRect(pg, s)
      const rate = launch.shipment.segOrders[s] ? launch.shipment.segBad[s] / launch.shipment.segOrders[s] : 0
      ctx.fillStyle = `rgba(248,113,113,${0.08 + rate * 0.75})`
      ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2)
      if (data.coverage[s] === 0) {
        ctx.strokeStyle = '#fde68a'
        ctx.setLineDash([4, 3])
        ctx.strokeRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6)
        ctx.setLineDash([])
      }
      ctx.fillStyle = '#f8fafc'
      ctx.textAlign = 'center'
      ctx.fillText(launch.shipment.segOrders[s] ? `${Math.round(rate * 100)}%` : '–', r.x + r.w / 2, r.y + r.h / 2 + 4)
    }
    ctx.fillStyle = '#fde68a'
    ctx.textAlign = 'left'
    ctx.fillText('dashed = no training data there', pg.left, 16)
    ctx.restore()
  }

  const verdict = !insp
    ? ''
    : !run?.final
      ? 'Training failed, so there is no model. Go back to Train.'
      : insp.train > 7
        ? `Underfitting: even on its own training orders it is off by ${insp.train.toFixed(1)} minutes.`
        : insp.test > 1.8 * insp.train && insp.test > 5
          ? `Overfitting: ${insp.train.toFixed(1)} min on training orders but ${insp.test.toFixed(1)} on test orders. It memorised.`
          : `The three errors agree, so the fit is believable where there is data.${blind ? ` But ${blind} of ${SEGMENTS} situations have no data: unknown, not safe.` : ''}`

  const shipment = launch?.shipment
  const earned = shipment ? stars(shipment.profit) : 0

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 bg-slate-950/60 px-3 py-2">
        <Link to="/world/factory" className="shrink-0 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10">
          ← Factory
        </Link>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300">The mission · attempt {attempt}</div>
          <h1 className="truncate text-base font-semibold leading-tight text-white">The Delivery Promise</h1>
        </div>
        <nav className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1 sm:justify-center" aria-label="Stages">
          {stages.map((s, i) => {
            const locked = i >= 4 && !trained
            return (
              <button
                key={s.id}
                type="button"
                disabled={locked}
                aria-current={i === stage ? 'step' : undefined}
                onClick={() => goto(i)}
                className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-35 ${
                  i === stage ? 'border-violet-400 bg-violet-400/20 text-violet-100' : 'border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {i + 1}. {s.name}
              </button>
            )
          })}
        </nav>
        <button
          type="button"
          role="switch"
          aria-checked={tutor}
          onClick={() => setTutor((v) => !v)}
          className={`ml-auto shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
            tutor ? 'border-amber-400 bg-amber-400/20 text-amber-100' : 'border-white/15 text-slate-300 hover:bg-white/10'
          }`}
        >
          Tutor mode {tutor ? 'on' : 'off'}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <Canvas2D draw={draw} />
        </main>

        <aside className="flex max-h-[52%] shrink-0 flex-col overflow-y-auto border-t border-white/10 bg-slate-950/70 lg:max-h-none lg:w-[360px] lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-3 px-4 py-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                Stage {stage + 1} of 6 · {st.syllabus}
              </div>
              <h2 className="text-lg font-semibold leading-snug text-white">{st.question}</h2>
            </div>
            <p className="text-[13px] leading-snug text-slate-300">{st.why}</p>
            <p className="rounded-md bg-white/5 px-2.5 py-2 text-xs leading-snug text-slate-400">
              <b className="text-slate-200">Reading the picture.</b> {st.picture}
            </p>
            {tutor && (
              <div className="flex flex-col gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-[13px] leading-snug">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300">Tutor notes</div>
                <p className="text-amber-50">
                  <b>Say:</b> {st.tutor.say}
                </p>
                <p className="text-amber-50">
                  <b>Ask the class:</b> {st.tutor.ask}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Btn tone="warn" onClick={() => patch(st.tutor.mistake.patch)}>Show the mistake: {st.tutor.mistake.label}</Btn>
                  <Btn tone="go" onClick={() => patch(st.tutor.fix.patch)}>Show the fix: {st.tutor.fix.label}</Btn>
                </div>
                <p className="text-[11px] text-amber-200/70">Left and right arrow keys move between stages.</p>
              </div>
            )}
          </div>

          {st.id === 'data' && (
            <Group title="Your decision">
              <Seg
                label="Which hours to log"
                value={cfg.window}
                onChange={(v) => patch({ window: v })}
                options={[
                  { value: 'lunch', label: 'Lunch, 11 to 3' },
                  { value: 'dinner', label: 'Dinner, 6 to 11' },
                  { value: 'all', label: 'Whole day' },
                ]}
              />
              <Seg
                label="Which areas"
                value={cfg.area}
                onChange={(v) => patch({ area: v })}
                options={[
                  { value: 'near', label: 'Within 3 km' },
                  { value: 'all', label: 'Whole city' },
                ]}
              />
              <Seg
                label={`How many records (₹${COST_PER_RECORD} each to check)`}
                value={String(cfg.size) as '60' | '200' | '600'}
                onChange={(v) => patch({ size: Number(v) as Config['size'] })}
                options={[
                  { value: '60', label: '60' },
                  { value: '200', label: '200' },
                  { value: '600', label: '600' },
                ]}
              />
              <Stats>
                <Stat label="Train / validate / test" value={`${data.train.length} / ${data.val.length} / ${data.test.length}`} />
                <Stat label="Data cost" value={rupees(cfg.size * COST_PER_RECORD)} />
                <Stat label="Situations with no data" value={`${blind} of ${SEGMENTS}`} tone={blind > 2 ? 'bad' : 'good'} />
                <Stat label="Records to choose from" value={data.available} />
              </Stats>
            </Group>
          )}

          {st.id === 'prepare' && (
            <Group title="Your decision">
              <Toggle label="Scale both inputs to −1…1" hint="Using the minimum and maximum of the training orders" value={cfg.normalise} onChange={(v) => patch({ normalise: v })} />
              <Toggle label="Remove broken records" hint="Drop any record longer than 120 minutes" value={cfg.clean} onChange={(v) => patch({ clean: v })} />
              <Stats>
                <Stat label="Broken records in training" value={data.brokenInTrain} tone={data.brokenInTrain ? 'bad' : 'good'} />
                <Stat label="Largest input value" value={cfg.normalise ? '1' : Math.round(data.metreMM.max).toLocaleString('en-IN')} tone={cfg.normalise ? 'good' : 'bad'} />
              </Stats>
            </Group>
          )}

          {st.id === 'design' && (
            <Group title="Your decision">
              <Slider label="Hidden neurons" value={cfg.neurons} min={1} max={20} onChange={(v) => patch({ neurons: v })} fmt={(v) => `2-${v}-1`} />
              <Stats>
                <Stat label="Parameters (4S + 1)" value={params} />
                <Stat label="Training orders" value={data.train.length} />
                <Stat
                  label="Orders per parameter"
                  value={(data.train.length / params).toFixed(1)}
                  tone={data.train.length / params < 2 ? 'bad' : data.train.length / params < 4 ? 'warn' : 'good'}
                />
              </Stats>
            </Group>
          )}

          {st.id === 'train' && (
            <Group title="Your decision">
              <Seg
                label="Training algorithm"
                value={cfg.algo}
                onChange={(v) => patch({ algo: v })}
                options={[
                  { value: 'sd', label: 'Steepest descent' },
                  { value: 'momentum', label: 'With momentum' },
                  { value: 'lm', label: 'Levenberg-Marquardt' },
                ]}
              />
              {cfg.algo !== 'lm' && (
                <Slider
                  label="Learning rate α"
                  value={Math.log10(cfg.alpha)}
                  min={-2.5}
                  max={0.7}
                  step={0.1}
                  onChange={(v) => patch({ alpha: Number((10 ** v).toPrecision(2)) })}
                  fmt={() => String(cfg.alpha)}
                />
              )}
              <Seg
                label="When to stop"
                value={cfg.stopping}
                onChange={(v) => patch({ stopping: v })}
                options={[
                  { value: 'fixed', label: 'After a fixed time' },
                  { value: 'early', label: 'When validation stops improving' },
                ]}
              />
              <Seg
                label="Random starts (keep the best on validation)"
                value={String(cfg.restarts) as '1' | '3' | '5'}
                onChange={(v) => patch({ restarts: Number(v) as Config['restarts'] })}
                options={[
                  { value: '1', label: '1' },
                  { value: '3', label: '3' },
                  { value: '5', label: '5' },
                ]}
              />
              <Btn tone="go" onClick={startTraining}>{run ? 'Train again' : 'Start training'}</Btn>
              {run && (
                <Stats>
                  <Stat
                    label="Status"
                    value={run.status === 'running' ? `start ${run.restart + 1} of ${cfg.restarts}` : run.status === 'done' ? 'finished' : 'blew up'}
                    tone={run.status === 'diverged' ? 'bad' : run.status === 'done' ? 'good' : 'plain'}
                  />
                  <Stat label="Iterations" value={run.its} />
                  <Stat label="Training error" value={run.history.length ? `${run.history[run.history.length - 1].train.toFixed(1)} min` : '—'} />
                  <Stat label="Validation error" value={run.history.length ? `${run.history[run.history.length - 1].val.toFixed(1)} min` : '—'} />
                </Stats>
              )}
              {run?.status === 'diverged' && (
                <p className="text-xs text-rose-300">The error grew instead of shrinking: every step overshot. Lower α or change algorithm.</p>
              )}
              {run && run.diverged > 0 && run.status === 'done' && (
                <p className="text-xs text-amber-300">{run.diverged} of the starts blew up; the others survived.</p>
              )}
            </Group>
          )}

          {st.id === 'inspect' && insp && (
            <Group title="What the tests say">
              <Stats>
                <Stat label="Training error" value={`${insp.train.toFixed(1)} min`} />
                <Stat label="Validation error" value={`${insp.val.toFixed(1)} min`} />
                <Stat label="Test error" value={`${insp.test.toFixed(1)} min`} tone={insp.test < 5 ? 'good' : 'bad'} />
                <Stat label="Situations never tested" value={`${insp.segCount.filter((c) => c === 0).length} of ${SEGMENTS}`} tone={insp.segCount.filter((c) => c === 0).length > 2 ? 'bad' : 'good'} />
              </Stats>
              <p className="text-[13px] leading-snug text-slate-200">{verdict}</p>
            </Group>
          )}

          {st.id === 'ship' && (
            <Group title="Your decision">
              <Slider label="Safety buffer on every promise" value={cfg.buffer} min={0} max={15} onChange={(v) => patch({ buffer: v })} fmt={(v) => `+${v} min`} />
              <Btn tone="go" onClick={doLaunch} disabled={!trained}>{launch ? 'Launch again' : 'Launch'}</Btn>
              {shipment && (
                <Stats>
                  <Stat label="On time" value={launchDone ? shipment.ontime : '…'} tone="good" />
                  <Stat label="Late, refunded" value={launchDone ? shipment.late : '…'} tone="bad" />
                  <Stat label="Went to a rival" value={launchDone ? shipment.lost : '…'} />
                  <Stat label="Error on live orders" value={launchDone ? `${shipment.liveRms.toFixed(1)} min` : '…'} />
                </Stats>
              )}
            </Group>
          )}

          {st.id === 'ship' && shipment && launchDone && (
            <Group title="The month in numbers">
              <div className="rounded-md bg-white/5 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">Profit after data cost</span>
                  <span className="font-mono text-2xl text-white">{rupees(shipment.profit)}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between text-xs text-slate-400">
                  <span aria-label={`${earned} of 3 stars`} className="text-base tracking-widest text-amber-300">
                    {'★'.repeat(earned)}
                    <span className="text-slate-600">{'★'.repeat(3 - earned)}</span>
                  </span>
                  <span>
                    a careful engineer makes {rupees(expertProfit())}
                    {best !== null && ` · your best ${rupees(best)}`}
                  </span>
                </div>
              </div>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">What happened, biggest cause first</h3>
              {launch.findings.map((f) => (
                <div key={f.title} className="rounded-md border border-white/10 bg-white/5 p-2.5 text-[13px] leading-snug">
                  <b className="text-white">{f.title}</b>
                  <p className="mt-0.5 text-slate-300">{f.text}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStage(f.stage)
                      setAttempt((a) => a + 1)
                    }}
                    className="mt-1.5 text-xs text-sky-300 underline"
                  >
                    Go back to stage {f.stage + 1}: {stages[f.stage].name}
                  </button>
                </div>
              ))}
            </Group>
          )}

          <div className="mt-auto flex flex-col gap-2 border-t border-white/10 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <Btn onClick={() => setStage((s) => Math.max(0, s - 1))} disabled={stage === 0}>← Back</Btn>
              {stage < 5 && (
                <Btn tone="go" onClick={() => goto(stage + 1)} disabled={stage >= 3 && !trained}>
                  {stage === 3 && !trained ? 'Train first' : `Next: ${stages[stage + 1].name} →`}
                </Btn>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Go deeper on this stage:{' '}
              {st.stations.map((id, i) => {
                const lab = factoryLabs.find((l) => l.id === id)
                return lab ? (
                  <span key={id}>
                    {i > 0 && ', '}
                    <Link to={`/world/factory/${id}`} className="text-sky-300 underline">
                      {lab.title}
                    </Link>
                  </span>
                ) : null
              })}
            </p>
          </div>
        </aside>
      </div>

      {briefing && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="mission-brief" className="flex max-h-full w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-xl border border-white/10 bg-slate-950 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300">Your first week at Dabba Dash</div>
            <h2 id="mission-brief" className="text-2xl font-semibold leading-tight text-white">
              Every order needs a promise: “arrives in 32 minutes”
            </h2>
            <p className="text-sm leading-relaxed text-slate-300">
              You are the new machine learning engineer at a food-delivery app in Bengaluru. Build the model that makes that promise. Promise too little
              and the order arrives late: the company refunds it. Promise too much and the customer orders from a rival.
            </p>
            <ol className="ml-4 list-decimal space-y-1 text-sm leading-snug text-slate-300">
              <li>Take one model through six stages: collect, prepare, design, train, inspect, ship.</li>
              <li>Each stage is one decision. The picture shows what your decision does.</li>
              <li>Then launch, and a month of real orders arrives. Your score is the profit.</li>
              <li>The report tells you which decision cost the most. Go back, change it, launch again.</li>
            </ol>
            <p className="text-xs leading-snug text-slate-500">
              The settings start as someone in a hurry would leave them. The first launch is meant to go badly. A careful engineer makes{' '}
              {rupees(expertProfit())} in the month.
            </p>
            <div className="flex flex-wrap gap-2">
              <Btn tone="go" onClick={() => setBriefing(false)}>Start the mission</Btn>
              <Btn
                onClick={() => {
                  setTutor(true)
                  setBriefing(false)
                }}
              >
                Start in tutor mode
              </Btn>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
