import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Label3D from '../../../components/Label3D'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { gauss, rng, shuffle } from '../../../engine'
import {
  correlationMatrix,
  createAdaline,
  crossCorrelation,
  lmsStep,
  mseQuadratic,
  solveLinear,
  symEigen,
  type Adaline,
} from '../../../engine/lms'
import { useAppStore } from '../../../store/useAppStore'
import { buildSurface, makeRunner, moveRunner, Pole, RunnerMesh, SIZE, SurfaceMesh, type Runner, type Surface } from './surface'

/** 44 auto rides: distance, minutes spent waiting in traffic, and what the meter showed. */
const rides = (() => {
  const rand = rng(11)
  return Array.from({ length: 44 }, () => {
    const km = 1 + rand() * 11
    const wait = Math.max(0, 1 + 1.3 * km + gauss(rand) * 3.6)
    return { km, wait, fare: 30 + 15 * km + 2 * wait + gauss(rand) * 9 }
  })
})()
const stat = (v: number[]) => {
  const mean = v.reduce((s, x) => s + x, 0) / v.length
  return { mean, sd: Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length) }
}
const sKm = stat(rides.map((r) => r.km))
const sWait = stat(rides.map((r) => r.wait))
const sFare = stat(rides.map((r) => r.fare))

type Mode = 'fare' | 'sort'
interface Pt {
  p: [number, number]
  t: number
  ride: (typeof rides)[number]
}

interface Problem {
  mode: Mode
  pts: Pt[]
  R: number[][]
  h: number[]
  c: number
  eig: { values: number[]; vectors: number[][] }
  xStar: [number, number]
  Fmin: number
  bound: number
  surface: Surface
}

function buildProblem(mode: Mode): Problem {
  let pts: Pt[] = rides.map((ride) => ({
    p: [(ride.km - sKm.mean) / sKm.sd, (ride.wait - sWait.mean) / sWait.sd],
    t: (ride.fare - sFare.mean) / sFare.sd,
    ride,
  }))
  if (mode === 'sort') {
    // Two classes with a clear gap: short cheap hops (−1) and long costly hauls (+1)
    const score = (q: Pt) => (15 * sKm.sd * q.p[0] + 2 * sWait.sd * q.p[1]) / sFare.sd
    pts = pts.filter((q) => Math.abs(score(q)) > 0.42).map((q) => ({ ...q, t: score(q) > 0 ? 1 : -1 }))
  }
  const zs = pts.map((q) => q.p as number[])
  const ts = pts.map((q) => q.t)
  const R = correlationMatrix(zs)
  const h = crossCorrelation(zs, ts)
  const c = ts.reduce((s, t) => s + t * t, 0) / ts.length
  const eig = symEigen(R)
  const x = solveLinear(R, h) ?? [0, 0]
  const F = (w1: number, w2: number) => mseQuadratic([w1, w2], c, h, R)
  return {
    mode,
    pts,
    R,
    h,
    c,
    eig,
    xStar: [x[0], x[1]],
    Fmin: F(x[0], x[1]),
    bound: 1 / eig.values[1],
    surface: buildSurface(F, [-1.2, 2.4], [-1.8, 1.8], { capAt: 0.86, levels: 9 }),
  }
}

interface Sim {
  ad: Adaline
  /** exact steepest descent on the true mean square error, for comparison */
  sd: [number, number]
  /** a perceptron trained on the same rides with the perceptron rule */
  perc: [number, number]
  percUpdates: number
  order: number[]
  k: number
  last: { i: number; a: number; e: number; dw: [number, number] } | null
  lms: Runner
  sdRun: Runner
  status: 'running' | 'left the map'
  rand: () => number
}

function makeSim(start: [number, number], prob: Problem, seed: number): Sim {
  const ad = createAdaline(2, false)
  ad.w = [start[0], start[1]]
  const lms = makeRunner('#facc15', start[0], start[1], 2500)
  const sdRun = makeRunner('#38bdf8', start[0], start[1], 2500)
  moveRunner(lms, prob.surface, start[0], start[1])
  moveRunner(sdRun, prob.surface, start[0], start[1])
  return { ad, sd: [start[0], start[1]], perc: [start[0], start[1]], percUpdates: 0, order: [], k: 0, last: null, lms, sdRun, status: 'running', rand: rng(seed) }
}

function stepSim(sim: Sim, prob: Problem, alpha: number) {
  if (sim.status !== 'running') return
  if (sim.order.length === 0) sim.order = shuffle(prob.pts.map((_, i) => i), sim.rand)
  const i = sim.order.pop()!
  const q = prob.pts[i]
  const before = sim.ad.w.slice()
  const { a, e } = lmsStep(sim.ad, q.p, q.t, alpha)
  sim.last = { i, a, e, dw: [sim.ad.w[0] - before[0], sim.ad.w[1] - before[1]] }
  sim.k++
  // Steepest descent on F(x) = c − 2xᵀh + xᵀRx: gradient = 2(Rx − h)
  const g = [0, 1].map((r) => 2 * (prob.R[r][0] * sim.sd[0] + prob.R[r][1] * sim.sd[1] - prob.h[r]))
  sim.sd = [sim.sd[0] - alpha * g[0], sim.sd[1] - alpha * g[1]]
  if (prob.mode === 'sort') {
    // Perceptron rule with hardlims: W ← W + e pᵀ, e = t − a ∈ {−2, 0, 2}
    const out = sim.perc[0] * q.p[0] + sim.perc[1] * q.p[1] >= 0 ? 1 : -1
    if (out !== q.t) {
      sim.perc = [sim.perc[0] + (q.t - out) * q.p[0], sim.perc[1] + (q.t - out) * q.p[1]]
      sim.percUpdates++
    }
  }
  const s = prob.surface
  const far = (x: number, r: [number, number]) => !Number.isFinite(x) || x < r[0] - (r[1] - r[0]) || x > r[1] + (r[1] - r[0])
  if (far(sim.ad.w[0], s.rx) || far(sim.ad.w[1], s.rz)) {
    sim.status = 'left the map'
    sim.lms.gone = true
  } else moveRunner(sim.lms, s, sim.ad.w[0], sim.ad.w[1])
  if (far(sim.sd[0], s.rx) || far(sim.sd[1], s.rz)) sim.sdRun.gone = true
  else if (!sim.sdRun.gone) moveRunner(sim.sdRun, s, sim.sd[0], sim.sd[1])
}

/** Smallest signed distance from the boundary w·p = 0 to a ride; negative if any ride is on the wrong side. */
const margin = (w: number[], pts: Pt[]) => {
  const len = Math.hypot(w[0], w[1]) || 1
  return Math.min(...pts.map((q) => (q.t * (w[0] * q.p[0] + w[1] * q.p[1])) / len))
}

function Stepper({ sim, prob, alpha, speed, paused }: { sim: Sim; prob: Problem; alpha: number; speed: number; paused: boolean }) {
  const acc = useRef(0)
  useFrame((_, dt) => {
    if (paused) return
    acc.current += Math.min(dt, 0.1) * speed
    while (acc.current >= 1) {
      acc.current -= 1
      stepSim(sim, prob, alpha)
    }
  })
  return null
}

const f2 = (v: number) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2)
const rupees = (t: number) => `₹${Math.round(sFare.mean + sFare.sd * t)}`

export default function AdalineLab() {
  const low = useAppStore((s) => s.quality) === 'low'
  const [mode, setMode] = useState<Mode>('fare')
  const [alpha, setAlpha] = useState(0.06)
  const [speed, setSpeed] = useState(8)
  const [start, setStart] = useState<[number, number]>([-0.7, 1.4])
  const [run, setRun] = useState(1)
  const [paused, setPaused] = useState(false)
  const [showSd, setShowSd] = useState(true)
  useTicker(200)

  const prob = useMemo(() => buildProblem(mode), [mode])
  // `run` restarts from the same starting weights
  const sim = useMemo(() => makeSim(start, prob, run), [start, prob, run])
  const s = prob.surface
  const w = sim.ad.w
  const Fnow = sim.status === 'running' ? s.F(w[0], w[1]) : Infinity
  const stable = alpha < prob.bound
  const last = sim.last
  const q = last ? prob.pts[last.i] : null
  const lmsMargin = margin(w, prob.pts)
  const percMargin = margin(sim.perc, prob.pts)
  const minPos = s.toWorld(prob.xStar[0], prob.xStar[1])
  const restart = () => setRun((r) => r + 1)

  const eigLines = useMemo(() => {
    const pts: number[] = []
    prob.eig.vectors.forEach((v, k) => {
      const len = 0.55 / Math.sqrt(prob.eig.values[k])
      for (const sign of [-1, 1]) {
        const a = s.toWorld(prob.xStar[0], prob.xStar[1], 0.03)
        const b = s.toWorld(prob.xStar[0] + sign * v[0] * len, prob.xStar[1] + sign * v[1] * len, 0.03)
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3))
    return g
  }, [prob, s])
  const eigTip = (k: number) => {
    const v = prob.eig.vectors[k]
    const len = 0.55 / Math.sqrt(prob.eig.values[k])
    const sign = v[0] + v[1] > 0 ? 1 : -1
    return s.toWorld(prob.xStar[0] + sign * v[0] * len, prob.xStar[1] + sign * v[1] * len, 0.35).toArray()
  }

  const drawInset = (ctx: CanvasRenderingContext2D, cw: number, ch: number, time: number) => {
    const L = 2.6
    const X = (x: number) => cw / 2 + (x / L) * (cw / 2 - 6)
    const Y = (y: number) => ch / 2 - (y / L) * (ch / 2 - 6)
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(X(-L), Y(0))
    ctx.lineTo(X(L), Y(0))
    ctx.moveTo(X(0), Y(-L))
    ctx.lineTo(X(0), Y(L))
    ctx.stroke()
    ctx.font = '10px ui-monospace, monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'right'
    ctx.fillText('distance →', cw - 6, Y(0) - 4)
    ctx.textAlign = 'left'
    ctx.fillText('waiting ↑', X(0) + 4, 12)
    const line = (wv: number[], color: string, dash: number[]) => {
      const len = Math.hypot(wv[0], wv[1])
      if (!(len > 1e-6) || !Number.isFinite(len)) return
      const dx = (-wv[1] / len) * L * 1.5
      const dy = (wv[0] / len) * L * 1.5
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.setLineDash(dash)
      ctx.beginPath()
      ctx.moveTo(X(-dx), Y(-dy))
      ctx.lineTo(X(dx), Y(dy))
      ctx.stroke()
      ctx.setLineDash([])
    }
    prob.pts.forEach((pt, i) => {
      const hue = prob.mode === 'sort' ? (pt.t > 0 ? '#fb923c' : '#38bdf8') : `hsl(${115 - 85 * Math.max(-1, Math.min(1, pt.t / 1.6))}, 85%, 62%)`
      const active = last?.i === i
      if (active) dot(ctx, X(pt.p[0]), Y(pt.p[1]), 8 + Math.sin(time * 8) * 1.5, 'rgba(250,204,21,0.35)')
      dot(ctx, X(pt.p[0]), Y(pt.p[1]), active ? 4.5 : 3, hue)
    })
    if (prob.mode === 'sort') line(sim.perc, '#f472b6', [5, 4])
    if (sim.status === 'running') line(w, '#facc15', [])
    ctx.fillStyle = '#facc15'
    ctx.fillText(prob.mode === 'sort' ? '— LMS boundary' : '— LMS: fare = average', 6, ch - (prob.mode === 'sort' ? 18 : 6))
    if (prob.mode === 'sort') {
      ctx.fillStyle = '#f472b6'
      ctx.fillText('- - perceptron boundary', 6, ch - 6)
    }
  }

  let happening
  if (sim.status === 'left the map')
    happening = (
      <>
        <p>
          The weights left the map after {sim.k} rides. α = {alpha.toFixed(2)} is above the limit 1/λ_max = {prob.bound.toFixed(2)}.
        </p>
        <p>Along the steep direction of the bowl each correction overshoots the bottom by more than the error it fixes, so the error grows every step.</p>
      </>
    )
  else if (!last || !q) happening = <p>Ready. The ball sits at the starting weights W = [{f2(w[0])}, {f2(w[1])}].</p>
  else
    happening = (
      <>
        <p>
          Ride {sim.k}: {q.ride.km.toFixed(1)} km, {q.ride.wait.toFixed(0)} min waiting.{' '}
          {mode === 'fare'
            ? `The neuron said ${rupees(last.a)}, the meter said ${rupees(q.t)}`
            : `The neuron said ${f2(last.a)}, the label is ${q.t > 0 ? '+1 (costly)' : '−1 (cheap)'}`}
          , so e = {f2(last.e)}. LMS moved W by 2αe·pᵀ = [{f2(last.dw[0])}, {f2(last.dw[1])}].
        </p>
        <p>
          {stable
            ? `One ride at a time makes the yellow path jitter around the smooth blue one. Both head for x* = [${f2(prob.xStar[0])}, ${f2(prob.xStar[1])}], where the error is ${prob.Fmin.toFixed(3)}; now it is ${Fnow.toFixed(3)}.`
            : `α = ${alpha.toFixed(2)} is above 1/λ_max = ${prob.bound.toFixed(2)}: the steps overshoot and grow.`}
        </p>
        {mode === 'sort' && (
          <p>
            {percMargin > 0
              ? `The perceptron stopped after ${sim.percUpdates} corrections, as soon as nothing was wrong, with its line only ${percMargin.toFixed(2)} from the nearest ride. LMS keeps reducing the error and sits ${lmsMargin > 0 ? lmsMargin.toFixed(2) : 'not yet clear'} away.`
              : `The perceptron still has rides on the wrong side (${sim.percUpdates} corrections so far).`}
          </p>
        )}
      </>
    )

  return (
    <LabShell
      labId="adaline"
      happening={happening}
      actions={{
        break: {
          label: `Set α = ${(prob.bound * 1.5).toFixed(2)}, above 1/λ_max`,
          run: () => {
            setAlpha(Math.round(prob.bound * 150) / 100)
            setPaused(false)
            restart()
          },
        },
        fix: {
          label: `Set α = ${(prob.bound * 0.1).toFixed(2)}, a tenth of the limit`,
          run: () => {
            setAlpha(Math.round(prob.bound * 10) / 100)
            setPaused(false)
            restart()
          },
        },
      }}
      panel={
        <>
          <Group title="LMS, one ride at a time">
            <div className="flex flex-wrap gap-2">
              <Btn tone="go" onClick={restart}>
                Start again
              </Btn>
              <Btn onClick={() => setPaused((v) => !v)}>{paused ? 'Resume' : 'Pause'}</Btn>
              <Btn
                onClick={() => {
                  setStart([s.rx[0] + (0.1 + Math.random() * 0.8) * (s.rx[1] - s.rx[0]), s.rz[0] + (0.1 + Math.random() * 0.8) * (s.rz[1] - s.rz[0])])
                  setPaused(false)
                }}
              >
                Random start
              </Btn>
            </div>
            <Slider label="Learning rate α" value={alpha} min={0.01} max={1} step={0.01} onChange={setAlpha} fmt={(v) => v.toFixed(2)} />
            <Slider label="Speed" value={speed} min={1} max={60} onChange={setSpeed} fmt={(v) => `${v} rides / s`} />
            <Toggle label="Show exact steepest descent (blue)" hint="Uses all rides for every step, so its path is smooth" value={showSd} onChange={setShowSd} />
            <Stats>
              <Stat label="W now" value={sim.status === 'running' ? `${f2(w[0])}, ${f2(w[1])}` : 'left the map'} tone={sim.status === 'running' ? 'plain' : 'bad'} />
              <Stat label="Best x*" value={`${f2(prob.xStar[0])}, ${f2(prob.xStar[1])}`} />
              <Stat label="Error F now" value={Number.isFinite(Fnow) ? Fnow.toFixed(3) : '∞'} tone={Fnow < prob.Fmin * 1.5 + 0.01 ? 'good' : 'plain'} />
              <Stat label="Lowest F" value={prob.Fmin.toFixed(3)} />
            </Stats>
          </Group>
          <Group title="Why the bowl has this shape">
            <Stats>
              <Stat label="R = E[p pᵀ]" value={<span className="text-xs">[{f2(prob.R[0][0])} {f2(prob.R[0][1])}; {f2(prob.R[1][0])} {f2(prob.R[1][1])}]</span>} />
              <Stat label="h = E[t p]" value={<span className="text-xs">[{f2(prob.h[0])}; {f2(prob.h[1])}]</span>} />
              <Stat label="λ₁ (shallow)" value={prob.eig.values[0].toFixed(2)} />
              <Stat label="λ₂ = λ_max (steep)" value={prob.eig.values[1].toFixed(2)} />
              <Stat label="Stable while α <" value={prob.bound.toFixed(2)} tone={stable ? 'good' : 'bad'} />
              <Stat label="α / limit" value={`${Math.round((alpha / prob.bound) * 100)} %`} tone={stable ? (alpha > prob.bound * 0.4 ? 'warn' : 'good') : 'bad'} />
            </Stats>
            <p className="text-[11px] leading-snug text-slate-500">
              The limit is for the average path. Single rides are noisier than the average, so in practice stay well below it.
            </p>
          </Group>
          <Group title="What the neuron learns">
            <Seg
              value={mode}
              onChange={(m) => {
                setMode(m)
                restart()
              }}
              options={[
                { value: 'fare', label: 'Predict the fare' },
                { value: 'sort', label: 'Sort cheap / costly (±1)' },
              ]}
            />
            {mode === 'sort' && (
              <Stats>
                <Stat label="LMS margin" value={lmsMargin > 0 ? lmsMargin.toFixed(2) : 'not separated'} tone={lmsMargin > percMargin ? 'good' : 'plain'} />
                <Stat label="Perceptron margin" value={percMargin > 0 ? percMargin.toFixed(2) : 'not separated'} tone={percMargin > 0 && percMargin < 0.1 ? 'warn' : 'plain'} />
              </Stats>
            )}
            <p className="text-[11px] leading-snug text-slate-500">
              Inputs are standard scores: p₁ = (km − {sKm.mean.toFixed(1)}) / {sKm.sd.toFixed(1)}, p₂ = (min − {sWait.mean.toFixed(1)}) / {sWait.sd.toFixed(1)}. Average fare ₹{Math.round(sFare.mean)}.
            </p>
          </Group>
        </>
      }
    >
      <Canvas dpr={low ? 1 : [1, 2]} camera={{ position: [6.5, 6.5, 8.5], fov: 45 }} gl={{ antialias: !low }}>
        <color attach="background" args={['#0b1020']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 9, 3]} intensity={1.6} />
        <SurfaceMesh
          surface={s}
          wire={!low}
          onPick={(x, z) => {
            setStart([x, z])
            setPaused(false)
          }}
        />
        <lineSegments geometry={eigLines}>
          <lineBasicMaterial color="#f472b6" />
        </lineSegments>
        <Label3D position={eigTip(0)} lines={[{ text: `λ₁ = ${prob.eig.values[0].toFixed(2)} shallow`, size: 10, mono: true, color: '#f9a8d4' }]} />
        <Label3D position={eigTip(1)} lines={[{ text: `λ₂ = ${prob.eig.values[1].toFixed(2)} steep`, size: 10, mono: true, color: '#f9a8d4' }]} />
        <Pole at={minPos} height={1.3} />
        <Label3D position={[minPos.x, minPos.y + 1.5, minPos.z]} lines={[{ text: 'x* = R⁻¹h', size: 11, mono: true }]} />
        <Label3D position={[SIZE / 2 + 0.7, 0, 0]} lines={[{ text: 'w₁ (distance) →', size: 11, mono: true, color: '#94a3b8' }]} />
        <Label3D position={[0, 0, SIZE / 2 + 0.7]} lines={[{ text: 'w₂ (waiting) →', size: 11, mono: true, color: '#94a3b8' }]} />
        <Label3D position={[-SIZE / 2, 3.5, -SIZE / 2]} lines={[{ text: 'height = mean square error F(x)', size: 10, mono: true, color: '#94a3b8' }]} />
        <RunnerMesh key={`l-${run}-${start[0]}-${start[1]}-${mode}`} runner={sim.lms} surface={s} />
        {showSd && <RunnerMesh key={`s-${run}-${start[0]}-${start[1]}-${mode}`} runner={sim.sdRun} surface={s} radius={0.1} />}
        <Stepper sim={sim} prob={prob} alpha={alpha} speed={speed} paused={paused} />
        <OrbitControls enablePan={false} minDistance={6} maxDistance={20} maxPolarAngle={Math.PI / 2.05} target={[0, 0.8, 0]} />
      </Canvas>
      <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-0.5 rounded-md bg-slate-950/70 px-2 py-1.5 font-mono text-[10px] leading-tight text-slate-300">
        <span><b className="text-yellow-400">●</b> LMS: one ride per step</span>
        {showSd && <span><b className="text-sky-400">●</b> steepest descent: all rides</span>}
        <span><b className="text-slate-100">○</b> rings: equal error</span>
        <span className="text-slate-500">tap the bowl to set W(0)</span>
      </div>
      {sim.status === 'left the map' && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 text-center font-mono text-sm text-rose-300">LMS left the map: α is too large</div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-2 aspect-square h-[40%] max-h-60 overflow-hidden rounded-lg border border-white/10 bg-slate-950/85">
        <Canvas2D draw={drawInset} />
      </div>
    </LabShell>
  )
}
