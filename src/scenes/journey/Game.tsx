import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import Canvas2D, { useTicker } from '../../ui/lab/Canvas2D'
import { Btn, Seg, Slider, Stat, Stats } from '../../ui/lab/controls'
import { useAppStore } from '../../store/useAppStore'
import { drawPlane, type View } from './draw'
import { burst, cameraFor, drawGame, DURATION, SLING, stepShards, toWorld, type Flight, type Phase, type Scene } from './gameDraw'
import { levels, tutorFor } from './levels'
import WeightLab from './WeightLab'
import KidLab from './KidLab'
import KidCalm from './KidCalm'
import KidHelpers from './KidHelpers'
import KidBlame from './KidBlame'
import {
  actFn,
  applyStep,
  backward,
  CLASSES,
  cloneNet,
  createTrainer,
  decode,
  encode,
  evaluate,
  forward,
  INPUTS,
  LIMITS,
  makeData,
  outsideData,
  randomNet,
  trainEpoch,
  trainedNet,
  trueLabel,
  whyLabel,
  type Act,
  type Net,
  type Reading,
  type Sample,
} from './sim'

const f2 = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2))
const vec = (a: number[]) => `[${a.map(f2).join('  ')}]`
/** Levels that have their own screen instead of the factory floor. */
const SIMPLE = ['kids', 'calm', 'helpers', 'blame', 'weights']
const EXPLAIN: Phase[] = ['encode', 'weigh1', 'sum', 'activate', 'weigh2', 'softmax', 'impact', 'learn']
const ORDER: Phase[] = ['encode', 'weigh1', 'sum', 'activate', 'weigh2', 'softmax', 'shot', 'impact']

/** Readings the `bad` network gets wrong and the `good` one gets right, plus one both get right. */
function tellingQueue(data: Sample[], bad: Net, good: Net): Reading[] {
  const call = (n: Net, m: Sample) => decode(forward(n, encode(m.x)).a2).k
  const missed = data.filter((m) => call(bad, m) !== m.label && call(good, m) === m.label)
  const fine = data.find((m) => call(bad, m) === m.label && call(good, m) === m.label)
  const picks: Sample[] = []
  for (const k of [0, 1, 2]) {
    const m = missed.find((q) => q.label === k && !picks.includes(q))
    if (m) picks.push(m)
  }
  for (const m of missed) if (picks.length < 3 && !picks.includes(m)) picks.push(m)
  return [...picks, ...(fine ? [fine] : [])].map((m) => [+m.x[0].toFixed(1), +m.x[1].toFixed(1)] as Reading)
}

const ZONE = ['#4ade80', '#fbbf24', '#f87171']

/** One sensor reading on its scale, with the engineer's healthy, service and stop zones marked. */
function Gauge({ i, value }: { i: 0 | 1; value: number }) {
  const q = INPUTS[i]
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - q.min) / (q.max - q.min)) * 100))}%`
  const off = value < q.min || value > q.max
  const zone = value > LIMITS.stop[i] ? 2 : value >= LIMITS.service[i] ? 1 : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-slate-300">{q.name}</span>
        <span className="font-mono font-semibold" style={{ color: off ? '#f8fafc' : ZONE[zone] }}>
          {value.toFixed(1)} {q.unit}
          {off && ' · off the scale'}
        </span>
      </div>
      <div className="relative h-3 w-56 overflow-hidden rounded-sm">
        <div className="absolute inset-y-0 left-0" style={{ width: pct(LIMITS.service[i]), background: `${ZONE[0]}99` }} />
        <div className="absolute inset-y-0" style={{ left: pct(LIMITS.service[i]), right: `calc(100% - ${pct(LIMITS.stop[i])})`, background: `${ZONE[1]}99` }} />
        <div className="absolute inset-y-0 right-0" style={{ left: pct(LIMITS.stop[i]), background: `${ZONE[2]}99` }} />
        <div className="absolute inset-y-0 w-1 -translate-x-1/2 bg-white" style={{ left: pct(value) }} />
      </div>
      <div className="relative h-3 w-56 font-mono text-[10px] text-slate-500">
        <span className="absolute left-0">{q.min}</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(LIMITS.service[i]) }}>
          {LIMITS.service[i]}
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(LIMITS.stop[i]) }}>
          {LIMITS.stop[i]}
        </span>
        <span className="absolute right-0">{q.max}</span>
      </div>
    </div>
  )
}

/**
 * The playable journey. A motor is launched from a sling, the camera follows its reading through
 * the network, and the answer is fired at one of three bays. Five levels, each adding one idea.
 */
export default function Game() {
  const data = useMemo(() => makeData(), [])
  const trained = useMemo(() => trainedNet(data), [data])
  const tutor = useAppStore((s) => s.tutorMode)
  const setTutor = useAppStore((s) => s.setTutorMode)

  const [levelIdx, setLevelIdx] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [phase, setPhase] = useState<Phase>('aim')
  const [waiting, setWaiting] = useState(false)
  const [stepMode, setStepMode] = useState(true)
  const [speed, setSpeed] = useState<'1' | '2' | '4'>('1')
  const [askTrust, setAskTrust] = useState(false)
  const [done, setDone] = useState(false)
  const [act, setAct] = useState<Act>('linear')
  const [shots, setShots] = useState(0)
  const [, bump] = useState(0)
  const redraw = useCallback(() => bump((n) => n + 1), [])
  useTicker(phase === 'aim' ? 100000 : 250)

  const scene = useRef<Scene>({ net: cloneNet(trained), flight: null, queue: [], pull: null, cam: { x: 450, y: 400, z: 0.6 }, shards: [], fallen: [null, null, null], broken: null, t: 0 })
  const total = useRef(0)
  const size = useRef({ w: 1, h: 1 })
  const live = useRef({ waiting: false, stepMode: true, speed: 1 })
  live.current = { waiting, stepMode, speed: Number(speed) }
  const level = levels[levelIdx]

  const setup = useCallback(
    (idx: number, keepNet = false, activation: Act = 'linear') => {
      const sc = scene.current
      const id = levels[idx].id
      sc.broken = null
      if (id === 'first') {
        if (!keepNet) sc.net = cloneNet(trained)
        sc.queue = [[1.5, 55], [5.2, 84], [8.6, 72]]
      } else if (SIMPLE.includes(id)) {
        sc.net = cloneNet(trained)
        sc.queue = []
      } else if (id === 'fix') {
        // knock out the hidden neuron that matters most
        const knocked = [0, 1, 2, 3].map((j) => {
          const n = cloneNet(trained)
          n.W1[j] = [0.3, -0.2]
          n.b1[j] = 0
          return { j, n, acc: evaluate(n, data).acc }
        })
        const worst = knocked.reduce((a, b) => (b.acc < a.acc ? b : a))
        if (!keepNet) sc.net = worst.n
        sc.broken = evaluate(sc.net, data).acc < 0.9 ? worst.j : null
        sc.queue = tellingQueue(data, worst.n, trained)
        brokenIndex.current = worst.j
      } else if (id === 'bend') {
        const flat = trainedNet(data, 'linear')
        if (!keepNet) sc.net = activation === 'linear' ? flat : trainedNet(data, activation)
        sc.queue = tellingQueue(data, flat, trained)
      } else if (id === 'teach') {
        if (!keepNet) sc.net = randomNet(3)
        sc.queue = [[1.5, 55], [8.6, 72], [5.2, 84], [2.4, 101], [6.1, 60], [3.0, 68], [9.2, 96], [4.4, 79]]
      } else {
        if (!keepNet) sc.net = cloneNet(trained)
        sc.queue = [[2, 58], [6.5, 20], [5, 80], [12.8, 128]]
      }
      total.current = sc.queue.length
      sc.flight = null
      sc.pull = null
      sc.shards = []
      sc.fallen = [null, null, null]
      setResults([])
      setPhase('aim')
      setWaiting(false)
      setAskTrust(false)
      setDone(false)
      redraw()
    },
    [data, trained, redraw],
  )
  const brokenIndex = useRef(0)
  useEffect(() => setup(0), [setup])

  const gotoLevel = (idx: number) => {
    setLevelIdx(idx)
    setAct('linear')
    setShots(0)
    setup(idx)
  }

  const finishFlight = useCallback((ok: boolean) => {
    const sc = scene.current
    sc.flight = null
    sc.queue.shift()
    setResults((r) => [...r, ok])
    setPhase('aim')
    setWaiting(false)
    setAskTrust(false)
    if (!sc.queue.length) setDone(true)
  }, [])

  /** Move the flight on to its next phase. */
  const advance = useCallback(() => {
    const sc = scene.current
    const f = sc.flight
    if (!f) return
    const lvl = levels[levelIdxRef.current]
    const enter = (p: Phase) => {
      f.phase = p
      f.u = 0
      setPhase(p)
      setWaiting(false)
    }
    if (f.phase === 'impact') {
      if (lvl.id === 'teach') {
        f.grads = backward(sc.net, f.pass, f.truth)
        enter('learn')
      } else if (lvl.id === 'trust') {
        setAskTrust(true)
        setWaiting(true)
      } else finishFlight(f.hit)
      return
    }
    if (f.phase === 'learn') {
      // big corrections while it knows nothing, gentle ones once it is mostly right
      if (f.grads) applyStep(sc.net, f.grads, evaluate(sc.net, dataRef.current).acc > 0.85 ? 0.03 : 0.9)
      finishFlight(f.hit)
      return
    }
    const next = ORDER[ORDER.indexOf(f.phase) + 1]
    if (next === 'impact' && f.hit) {
      sc.fallen[f.winner] = sc.t
      sc.shards.push(...burst(f.winner))
    }
    enter(next)
  }, [finishFlight])
  const levelIdxRef = useRef(0)
  const dataRef = useRef(data)
  levelIdxRef.current = levelIdx

  const launch = useCallback((power: number) => {
    const sc = scene.current
    if (sc.flight || !sc.queue.length) return
    const reading = sc.queue[0]
    const pass = forward(sc.net, encode(reading))
    const winner = decode(pass.a2).k
    const truth = outsideData(reading) ? -1 : trueLabel(reading)
    sc.flight = { reading, truth, pass, winner, hit: winner === truth, phase: 'encode', u: 0, power, grads: null }
    sc.pull = null
    setShots((n) => n + 1)
    setPhase('encode')
  }, [])

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const sc = scene.current
    sc.t = t
    size.current = { w, h }
    const f = sc.flight
    const want = cameraFor(done ? 'learn' : (f?.phase ?? 'aim'), w, h)
    const k = Math.min(1, dt * 3.2)
    sc.cam.x += (want.x - sc.cam.x) * k
    sc.cam.y += (want.y - sc.cam.y) * k
    sc.cam.z += (want.z - sc.cam.z) * k
    if (f && !live.current.waiting && f.u < 1) {
      f.u = Math.min(1, f.u + (dt * live.current.speed) / DURATION[f.phase])
      if (f.u >= 1) {
        if (live.current.stepMode && EXPLAIN.includes(f.phase) && f.phase !== 'impact') {
          live.current.waiting = true
          setWaiting(true)
        } else advance()
      }
    }
    sc.shards = stepShards(sc.shards, dt)
    drawGame(ctx, w, h, sc)

    // the repair bench: where the knocked neuron's line lies across the logged readings
    if (level.id === 'fix' && !f && w > 520) {
      const j = brokenIndex.current
      const bw = Math.min(310, w * 0.34)
      const bh = Math.min(270, h * 0.4)
      const box = { x: 14, y: 76, w: bw, h: bh }
      ctx.fillStyle = 'rgba(2,6,23,0.9)'
      ctx.fillRect(box.x - 8, box.y - 26, box.w + 16, box.h + 34)
      ctx.font = '600 12px system-ui, sans-serif'
      ctx.fillStyle = '#e2e8f0'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`Neuron ${j + 1}'s line across the logged readings`, box.x, box.y - 12)
      const reading = sc.queue[0] ?? [5, 75]
      const view: View = { stage: 1, net: sc.net, pass: forward(sc.net, encode(reading)), reading, target: 0, focus: j, data, sure: 0.6, history: [], flash: null, training: false, t }
      drawPlane(ctx, w, h, box, view, { lines: [0, 1, 2, 3].filter((q) => q !== j).concat(j), shade: j })
    }
  }

  // ---- the sling
  const dragging = useRef(false)
  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    const sc = scene.current
    if (sc.flight || !sc.queue.length || done) return
    const rect = e.currentTarget.getBoundingClientRect()
    const p = toWorld(e.clientX - rect.left, e.clientY - rect.top, size.current.w, size.current.h, sc.cam)
    if (Math.hypot(p.x - SLING.x, p.y - SLING.y) > 110) return
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    sc.pull = { x: 0, y: 0 }
  }
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return
    const sc = scene.current
    const rect = e.currentTarget.getBoundingClientRect()
    const p = toWorld(e.clientX - rect.left, e.clientY - rect.top, size.current.w, size.current.h, sc.cam)
    let dx = Math.min(10, p.x - SLING.x)
    let dy = Math.max(-20, p.y - (SLING.y - 6))
    const len = Math.hypot(dx, dy)
    if (len > 120) {
      dx = (dx / len) * 120
      dy = (dy / len) * 120
    }
    sc.pull = { x: dx, y: dy }
  }
  const onUp = () => {
    if (!dragging.current) return
    dragging.current = false
    const sc = scene.current
    const len = sc.pull ? Math.hypot(sc.pull.x, sc.pull.y) : 0
    if (len > 24) launch(Math.min(1, len / 120))
    else sc.pull = null
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (scene.current.flight) {
          if (waiting && !askTrust) advance()
        } else launch(0.7)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, launch, waiting, askTrust])

  // ---- what to say about the moment on screen
  const sc = scene.current
  const f: Flight | null = sc.flight
  const net = sc.net
  const next = sc.queue[0]
  const score = evaluate(net, data)
  const caption = (() => {
    if (!f) {
      if (!next) return { title: 'All motors launched', body: '', maths: [] as string[] }
      return {
        title: 'Load the sling',
        body: outsideData(next)
          ? `This reading is ${next[0].toFixed(1)} mm/s and ${next[1].toFixed(1)} °C. At least one value is off the sensor's normal scale, so the engineer's rule has no label for it. Launch it and see what the network does anyway.`
          : `By the engineer's rule this motor is "${CLASSES[trueLabel(next)]}", because ${whyLabel(next)}. The network was never told that rule; it only saw 180 labelled readings. Launch it and see whether the network agrees.`,
        maths: [],
      }
    }
    const { pass } = f
    const j = pass.n1.reduce((best, n, q) => (Math.abs(n) > Math.abs(pass.n1[best]) ? q : best), 0)
    const w = net.W1[j]
    switch (f.phase) {
      case 'encode':
        return {
          title: '1 · Encode',
          body: 'The sensor reports two numbers in different units. Each is rescaled to lie between −1 and 1. From here on, the motor is only this pair of numbers.',
          maths: [`p₁ = (${f.reading[0].toFixed(1)} − 5) / 5 = ${f2(pass.p[0])}`, `p₂ = (${f.reading[1].toFixed(1)} − 75) / 35 = ${f2(pass.p[1])}`],
        }
      case 'weigh1':
        return {
          title: '2 · Weigh',
          body: 'Each wire multiplies the signal by its weight as it passes the gate. Teal wires keep the sign, rose wires flip it, thick wires amplify. Follow the labelled sparks into one neuron.',
          maths: [`into neuron ${j + 1}:  w₁p₁ = (${f2(w[0])})(${f2(pass.p[0])}) = ${f2(w[0] * pass.p[0])}`, `                 w₂p₂ = (${f2(w[1])})(${f2(pass.p[1])}) = ${f2(w[1] * pass.p[1])}`],
        }
      case 'sum':
        return {
          title: '3 · Add up',
          body: 'Each neuron adds what arrived, then the bias drops in from above. The total is the net input n: how strongly this reading matches what the neuron looks for.',
          maths: [`neuron ${j + 1}:  n = ${f2(w[0] * pass.p[0])} + ${f2(w[1] * pass.p[1])} + (${f2(net.b1[j])}) = ${f2(pass.n1[j])}`, `all four:  n¹ = ${vec(pass.n1)}`],
        }
      case 'activate':
        return {
          title: '4 · Activate',
          body:
            net.act === 'linear'
              ? 'With the Linear function the dot rides a straight line: a = n. Nothing is bent, so the layer adds no new power.'
              : 'Each neuron passes n through its activation curve. Near zero the output changes fast; large values flatten out. This bend is what lets the network draw corners.',
          maths: [`${actFn[net.act].formula}`, `a¹ = ${vec(pass.a1)}`],
        }
      case 'weigh2':
        return {
          title: '5 · Weigh again',
          body: 'The four hidden outputs are the network\'s own description of the motor. They are weighted and added once more, into three scores: one for each instruction.',
          maths: [`n² = W²a¹ + b² = ${vec(pass.n2)}`],
        }
      case 'softmax':
        return {
          title: '6 · Softmax',
          body: 'Scores can be any size. Softmax raises e to each score and divides by the total, so the towers become shares of 100%. The tallest share wins.',
          maths: [`a² = softmax(n²) = ${vec(pass.a2)}`, `winner: ${CLASSES[f.winner]} at ${(pass.a2[f.winner] * 100).toFixed(0)}%`],
        }
      case 'shot':
        return { title: '7 · Decode', body: `The largest share is turned into an instruction and fired at its bay: ${CLASSES[f.winner]}, ${(pass.a2[f.winner] * 100).toFixed(0)}% sure.`, maths: [] }
      case 'impact':
        return {
          title: f.truth < 0 ? 'A confident answer to a reading that makes no sense' : f.hit ? 'Right call' : 'Wrong call',
          body:
            f.truth < 0
              ? `No motor in the log ever read ${f.reading[0].toFixed(1)} mm/s at ${f.reading[1].toFixed(1)} °C. The network answered "${CLASSES[f.winner]}" all the same.`
              : f.hit
                ? `The network fired at ${CLASSES[f.winner]}, and the engineer's rule agrees: ${whyLabel(f.reading)}. The crates come down.`
                : `The network fired at ${CLASSES[f.winner]}, but the engineer's rule says ${CLASSES[f.truth]} (dashed frame), because ${whyLabel(f.reading)}. The weights sent this reading to the wrong bay.`,
          maths: f.truth >= 0 ? [`cost F = −ln(${f2(pass.a2[f.truth])}) = ${f2(-Math.log(Math.max(1e-9, pass.a2[f.truth])))}`] : [],
        }
      default:
        return {
          title: '8 · Learn',
          body: 'The error at the output is passed back through the same wires. Each weight moves by −α × (blame at its far end) × (signal it carried). Green wires grew, red wires shrank.',
          maths: f.grads ? [`s² = a² − t = ${vec(f.grads.s2)}`, `s¹ = f′(n¹) ∘ (W²ᵀs²) = ${vec(f.grads.s1)}`] : [],
        }
    }
  })()
  const notes = tutorFor(f?.phase ?? 'aim')

  const hits = results.filter(Boolean).length
  const stars = (() => {
    if (level.id === 'teach') return score.acc >= 0.9 ? 3 : score.acc >= 0.8 ? 2 : score.acc >= 0.6 ? 1 : 0
    const n = total.current
    return hits === n ? 3 : hits === n - 1 ? 2 : hits > 0 ? 1 : 0
  })()
  const bj = brokenIndex.current
  const fixWeight = (which: 0 | 1 | 'b', value: number) => {
    if (which === 'b') net.b1[bj] = value
    else net.W1[bj][which] = value
    sc.broken = evaluate(net, data).acc < 0.9 ? bj : null
    redraw()
  }
  const btn = 'shrink-0 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10'

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <Link to="/" className={btn}>
          ← Worlds
        </Link>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-teal-300">Predictive maintenance · level {levelIdx + 1} of {levels.length}</div>
          <h1 className="truncate text-base font-semibold leading-tight text-white">The Journey of a Signal: {level.name}</h1>
        </div>
        <nav className="order-last flex w-full min-w-0 gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1" aria-label="Levels">
          {levels.map((l, i) => (
            <button
              key={l.id}
              type="button"
              aria-current={i === levelIdx ? 'step' : undefined}
              onClick={() => gotoLevel(i)}
              className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                i === levelIdx ? 'border-teal-400 bg-teal-400/20 text-teal-100' : 'border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {i + 1}. {l.name}
            </button>
          ))}
        </nav>
        <Link to="/journey?mode=study" className={`${btn} ml-auto`}>
          Study the eight stops
        </Link>
        <button
          type="button"
          role="switch"
          aria-checked={tutor}
          onClick={() => setTutor(!tutor)}
          className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium ${tutor ? 'border-amber-400 bg-amber-400/20 text-amber-100' : 'border-white/15 text-slate-300 hover:bg-white/10'}`}
        >
          Tutor mode {tutor ? 'on' : 'off'}
        </button>
      </header>

      {level.id === 'kids' && <KidLab tutor={tutor} onNext={() => gotoLevel(levelIdx + 1)} />}
      {level.id === 'calm' && <KidCalm tutor={tutor} onNext={() => gotoLevel(levelIdx + 1)} />}
      {level.id === 'helpers' && <KidHelpers tutor={tutor} onNext={() => gotoLevel(levelIdx + 1)} />}
      {level.id === 'blame' && <KidBlame tutor={tutor} onNext={() => gotoLevel(levelIdx + 1)} />}
      {level.id === 'weights' && <WeightLab data={data} trained={trained} tutor={tutor} onNext={() => gotoLevel(levelIdx + 1)} />}
      <div className={`${SIMPLE.includes(level.id) ? 'hidden' : 'flex'} min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden`}>
        <main className="relative h-[560px] shrink-0 overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
          <Canvas2D
            draw={draw}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="touch-none"
            aria-label="The factory floor: a sling on the left, the network in the middle, three decision bays on the right"
          />

          {/* score, top left */}
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-3 rounded-md bg-slate-950/70 px-3 py-1.5 text-xs backdrop-blur">
            <span className="text-lg leading-none tracking-widest text-amber-300" aria-label={`${stars} of 3 stars`}>
              {'★'.repeat(stars)}
              <span className="text-slate-600">{'★'.repeat(3 - stars)}</span>
            </span>
            <span className="flex gap-1" aria-label="Motors launched">
              {Array.from({ length: total.current }, (_, i) => (
                <span key={i} className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${i < results.length ? (results[i] ? 'bg-emerald-400 text-slate-950' : 'bg-rose-400 text-slate-950') : 'border border-white/25 text-slate-500'}`}>
                  {i < results.length ? (results[i] ? '✓' : '✗') : i + 1}
                </span>
              ))}
            </span>
            {level.id === 'teach' && <span className="font-mono text-slate-200">{(score.acc * 100).toFixed(0)}% of the log right</span>}
          </div>

          {/* the commentary strip */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent px-4 pb-3 pt-8" aria-live="polite">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div className="min-w-0 max-w-2xl flex-1">
                <div className="text-base font-semibold text-white">{caption.title}</div>
                <p className="text-[13px] leading-snug text-slate-300">{caption.body}</p>
              </div>
              {!f && next && !done && (
                <div className="flex flex-col gap-1.5 rounded-md border border-white/15 bg-slate-900/80 px-3 py-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">This motor on the engineer's scales</div>
                  <Gauge i={0} value={next[0]} />
                  <Gauge i={1} value={next[1]} />
                  <div className="text-xs text-slate-300">
                    Engineer's label:{' '}
                    {outsideData(next) ? <b className="text-white">none, the reading is off the scale</b> : <b style={{ color: ZONE[trueLabel(next)] }}>{CLASSES[trueLabel(next)]}</b>}
                  </div>
                </div>
              )}
              {caption.maths.length > 0 && <pre className="overflow-x-auto rounded-md border border-teal-400/25 bg-teal-400/[0.07] px-2.5 py-1.5 font-mono text-[12px] leading-relaxed text-teal-50">{caption.maths.join('\n')}</pre>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!f && !done && next && (
                <Btn tone="go" onClick={() => launch(0.7)}>
                  Launch (space)
                </Btn>
              )}
              {f && waiting && !askTrust && (
                <Btn tone="go" onClick={advance}>
                  Next step → (space)
                </Btn>
              )}
              {askTrust && f && (
                <>
                  <span className="text-sm font-semibold text-white">Would you act on this answer?</span>
                  <Btn tone="go" onClick={() => finishFlight(!outsideData(f.reading))}>
                    Yes, trust it
                  </Btn>
                  <Btn tone="warn" onClick={() => finishFlight(outsideData(f.reading))}>
                    No, check the sensor
                  </Btn>
                </>
              )}
              {f && !waiting && <span className="text-xs text-slate-500">watching…</span>}
              <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-300">
                <input type="checkbox" checked={stepMode} onChange={(e) => setStepMode(e.target.checked)} className="accent-teal-400" />
                Pause at every step
              </label>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                Speed
                {(['1', '2', '4'] as const).map((s) => (
                  <button key={s} type="button" aria-pressed={speed === s} onClick={() => setSpeed(s)} className={`rounded px-1.5 py-0.5 ${speed === s ? 'bg-teal-400/25 text-teal-100' : 'hover:bg-white/10'}`}>
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          {done && (
            <div className="absolute inset-0 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
              <div role="dialog" aria-label="Level complete" className="flex max-w-md flex-col gap-3 rounded-xl border border-white/15 bg-slate-900 p-5 text-center">
                <div className="text-4xl tracking-widest text-amber-300">
                  {'★'.repeat(stars)}
                  <span className="text-slate-700">{'★'.repeat(3 - stars)}</span>
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {level.id === 'teach' ? `${(score.acc * 100).toFixed(0)}% of the log right` : `${hits} of ${total.current} ${level.id === 'trust' ? 'calls right' : 'in the right bay'}`}
                </h2>
                <p className="text-sm leading-snug text-slate-300">{stars === 3 ? level.lesson : level.id === 'teach' ? 'Not there yet. Run more passes over the log, then launch again.' : `Not all of them yet. ${level.goal}`}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Btn onClick={() => setup(levelIdx, level.id !== 'first' && level.id !== 'trust', act)}>{level.id === 'teach' ? 'Launch more motors' : 'Reload the motors'}</Btn>
                  {levelIdx < levels.length - 1 ? (
                    <Btn tone="go" onClick={() => gotoLevel(levelIdx + 1)}>
                      Next level: {levels[levelIdx + 1].name} →
                    </Btn>
                  ) : (
                    <Link to="/journey?mode=study" className="rounded-md border border-teal-400/60 bg-teal-400/15 px-3 py-1.5 text-sm font-medium text-teal-100 hover:bg-teal-400/25">
                      Study each stop in depth →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        <aside className="flex shrink-0 flex-col gap-3 border-t border-white/10 bg-slate-950/70 px-4 py-3 lg:w-[340px] lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">Level {levelIdx + 1} · the goal</div>
            <h2 className="text-base font-semibold leading-snug text-white">{level.goal}</h2>
          </div>
          <p className="text-[13px] leading-snug text-slate-300">{level.brief}</p>

          {level.id === 'fix' && (
            <div className="flex flex-col gap-2 rounded-md border border-rose-400/30 bg-rose-400/[0.06] p-2.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-rose-200">Repair neuron {bj + 1}</div>
              <Slider label="w₁, weight on vibration" value={net.W1[bj][0]} min={-6} max={6} step={0.05} onChange={(v) => fixWeight(0, v)} fmt={f2} />
              <Slider label="w₂, weight on temperature" value={net.W1[bj][1]} min={-6} max={6} step={0.05} onChange={(v) => fixWeight(1, v)} fmt={f2} />
              <Slider label="b, bias" value={net.b1[bj]} min={-6} max={6} step={0.05} onChange={(v) => fixWeight('b', v)} fmt={f2} />
              <p className="text-xs text-slate-400">The small plot shows this neuron's line. Rotate it with the weights, slide it with the bias.</p>
              <Btn
                onClick={() => {
                  net.W1[bj] = [...trained.W1[bj]]
                  net.b1[bj] = trained.b1[bj]
                  sc.broken = null
                  redraw()
                }}
              >
                Show me where training put it
              </Btn>
            </div>
          )}
          {level.id === 'bend' && (
            <div className="flex flex-col gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2.5">
              <Seg
                label="Activation function of the hidden layer"
                value={act}
                onChange={(a) => (setAct(a), setup(levelIdx, false, a))}
                options={(['linear', 'tansig', 'logsig', 'relu'] as const).map((a) => ({ value: a, label: actFn[a].name }))}
              />
              <p className="text-xs text-slate-400">Changing it retrains the network with the new function, then reloads the motors.</p>
            </div>
          )}
          {level.id === 'teach' && (
            <div className="flex flex-col gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2.5">
              <Btn
                tone="go"
                disabled={!!f || shots < 2}
                onClick={() => {
                  const tr = createTrainer(net)
                  for (let e = 0; e < 500; e++) trainEpoch(tr, data)
                  redraw()
                }}
              >
                Run 500 passes over the whole log
              </Btn>
              <p className="text-xs text-slate-400">{shots < 2 ? 'Launch two motors first, to see one correction happen.' : 'Each pass does for all 180 readings what you just watched for one.'}</p>
              <Btn onClick={() => (setup(levelIdx), setShots(0))}>Start again from random weights</Btn>
            </div>
          )}

          <div className="rounded-md border border-white/10 bg-white/[0.03] p-2.5">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">How a reading gets its label</div>
            <ul className="flex flex-col gap-1.5 text-[13px] leading-snug text-slate-300">
              <li>
                <b style={{ color: ZONE[0] }}>Healthy</b>: vibration below {LIMITS.service[0]} mm/s <b>and</b> bearing below {LIMITS.service[1]} °C. Keep running.
              </li>
              <li>
                <b style={{ color: ZONE[2] }}>Stop now</b>: vibration above {LIMITS.stop[0]} mm/s <b>or</b> bearing above {LIMITS.stop[1]} °C. Halt the line.
              </li>
              <li>
                <b style={{ color: ZONE[1] }}>Service soon</b>: anything in between. Book maintenance.
              </li>
            </ul>
            <p className="mt-2 text-xs leading-snug text-slate-400">
              This is the maintenance engineer's rule. It labelled the 180 logged readings. The network is never shown the rule, only the labelled readings, and each launch tests whether its answer matches.
            </p>
          </div>

          <Stats>
            <Stat label="Right on the whole log" value={`${(score.acc * 100).toFixed(0)}%`} tone={score.acc > 0.9 ? 'good' : 'warn'} />
            <Stat label="Motors left" value={sc.queue.length} />
          </Stats>

          {tutor && (
            <div className="flex flex-col gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-[13px] leading-snug">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300">Tutor notes for this moment</div>
              <p className="text-amber-50">
                <b>Say:</b> {notes.say}
              </p>
              <p className="text-amber-50">
                <b>Ask the class:</b> {notes.ask}
              </p>
              <p className="text-amber-50">
                <b>Listen for:</b> "{notes.wrong}" <b>Correct it:</b> {notes.right}
              </p>
              <p className="text-[11px] text-amber-200/70">Space launches, and moves on from each pause.</p>
            </div>
          )}
          <p className="border-l-2 border-teal-400 pl-2.5 text-xs leading-snug text-slate-400">
            The case: a bottling plant's conveyor motors, each with a vibration and temperature sensor. Healthy keeps running, Service soon books maintenance, Stop now halts the line. Readings are simulated.
          </p>
        </aside>
      </div>
    </div>
  )
}
