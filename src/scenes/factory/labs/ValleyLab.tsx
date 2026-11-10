import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Label3D from '../../../components/Label3D'
import LabShell from '../../../ui/lab/LabShell'
import { useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { createTrainer, gauss, lmStep, rng, type Network, type Sample, type TransferName } from '../../../engine'
import { useAppStore } from '../../../store/useAppStore'

/** 26 students: hours of sleep, and whether they stayed awake in the 8 am class. */
const students = (() => {
  const rand = rng(5)
  return Array.from({ length: 26 }, () => {
    const h = 2 + rand() * 7.5
    return { h, awake: h + gauss(rand) * 0.9 > 5.6 ? 1 : 0 }
  })
})()

type Neuron = 'logsig' | 'purelin'
const ranges: Record<string, { w: [number, number]; b: [number, number] }> = {
  'logsig-norm': { w: [-10, 10], b: [-10, 10] },
  'logsig-raw': { w: [-4, 4], b: [-16, 16] },
  'purelin-norm': { w: [-1.5, 2.5], b: [-1.5, 2.5] },
  'purelin-raw': { w: [-0.5, 0.8], b: [-3, 3.6] },
}

const SIZE = 8
const HEIGHT = 3
const N = 64
const MAX_TRAIL = 1500

interface Ball {
  key: 'sd' | 'mom' | 'lm'
  label: string
  color: string
  net: Network
  trainer: ReturnType<typeof createTrainer>
  lm: { mu: number }
  trail: Float32Array
  count: number
  its: number
  loss: number
  status: 'ready' | 'rolling' | 'arrived' | 'left the map'
}

interface Land {
  samples: Sample[]
  F: (w: number, b: number) => number
  r: { w: [number, number]; b: [number, number] }
  cap: number
  toWorld: (w: number, b: number) => THREE.Vector3
  geometry: THREE.BufferGeometry
  min: { w: number; b: number; F: number }
  lambdaMax: number
}

function buildLand(neuron: Neuron, norm: boolean): Land {
  const samples: Sample[] = students.map((s) => ({ p: [norm ? (s.h - 5.75) / 3.75 : s.h], t: [s.awake] }))
  const f = neuron === 'logsig' ? (n: number) => 1 / (1 + Math.exp(-n)) : (n: number) => n
  const F = (w: number, b: number) => {
    let s = 0
    for (const d of samples) s += (d.t[0] - f(w * d.p[0] + b)) ** 2
    return s / samples.length
  }
  const r = ranges[`${neuron}-${norm ? 'norm' : 'raw'}`]
  const grid = new Float32Array((N + 1) * (N + 1))
  let min = { w: 0, b: 0, F: Infinity }
  for (let j = 0; j <= N; j++)
    for (let i = 0; i <= N; i++) {
      const w = r.w[0] + ((r.w[1] - r.w[0]) * i) / N
      const b = r.b[0] + ((r.b[1] - r.b[0]) * j) / N
      const v = F(w, b)
      grid[j * (N + 1) + i] = v
      if (v < min.F) min = { w, b, F: v }
    }
  const cap = Array.from(grid).sort((a, b) => a - b)[Math.floor(grid.length * 0.9)]
  const toWorld = (w: number, b: number) => {
    const cw = Math.min(r.w[1], Math.max(r.w[0], w))
    const cb = Math.min(r.b[1], Math.max(r.b[0], b))
    return new THREE.Vector3(
      ((cw - r.w[0]) / (r.w[1] - r.w[0]) - 0.5) * SIZE,
      (Math.min(F(cw, cb), cap) / cap) * HEIGHT,
      ((cb - r.b[0]) / (r.b[1] - r.b[0]) - 0.5) * SIZE,
    )
  }
  const positions = new Float32Array((N + 1) * (N + 1) * 3)
  const colors = new Float32Array((N + 1) * (N + 1) * 3)
  const color = new THREE.Color()
  for (let j = 0; j <= N; j++)
    for (let i = 0; i <= N; i++) {
      const k = j * (N + 1) + i
      const y = Math.min(grid[k], cap) / cap
      positions.set([(i / N - 0.5) * SIZE, y * HEIGHT, (j / N - 0.5) * SIZE], k * 3)
      color.setHSL(0.62 - 0.52 * y, 0.8, 0.3 + 0.25 * y)
      colors.set([color.r, color.g, color.b], k * 3)
    }
  const index: number[] = []
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i
      index.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2)
    }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  // Largest eigenvalue of the Hessian 2·E[zzᵀ], z = [p, 1] (exact for the linear neuron)
  const ep2 = samples.reduce((s, d) => s + d.p[0] ** 2, 0) / samples.length
  const ep = samples.reduce((s, d) => s + d.p[0], 0) / samples.length
  const tr = 2 * (ep2 + 1)
  const det = 4 * (ep2 - ep * ep)
  const lambdaMax = tr / 2 + Math.sqrt(Math.max(0, (tr * tr) / 4 - det))
  return { samples, F, r, cap, toWorld, geometry, min, lambdaMax }
}

function makeBalls(neuron: Neuron, start: { w: number; b: number }): Ball[] {
  const defs: Pick<Ball, 'key' | 'label' | 'color'>[] = [
    { key: 'sd', label: 'Steepest descent', color: '#38bdf8' },
    { key: 'mom', label: 'With momentum', color: '#fbbf24' },
    { key: 'lm', label: 'Levenberg-Marquardt', color: '#f472b6' },
  ]
  return defs.map((d) => {
    const net: Network = { layers: [{ W: [[start.w]], b: [start.b], f: neuron as TransferName }] }
    return {
      ...d,
      net,
      trainer: createTrainer(net),
      lm: { mu: 0.01 },
      trail: new Float32Array(MAX_TRAIL * 3),
      count: 0,
      its: 0,
      loss: 0,
      status: 'ready',
    }
  })
}

function stepBall(ball: Ball, land: Land, alpha: number, gamma: number) {
  if (ball.status !== 'rolling') return
  const before = ball.loss
  if (ball.key === 'lm') lmStep(ball.net, land.samples, ball.lm)
  else ball.trainer.step(land.samples, { alpha, gamma: ball.key === 'mom' ? gamma : 0 })
  const w = ball.net.layers[0].W[0][0]
  const b = ball.net.layers[0].b[0]
  ball.its++
  const spanW = land.r.w[1] - land.r.w[0]
  const spanB = land.r.b[1] - land.r.b[0]
  if (
    !Number.isFinite(w + b) ||
    w < land.r.w[0] - spanW || w > land.r.w[1] + spanW ||
    b < land.r.b[0] - spanB || b > land.r.b[1] + spanB
  ) {
    ball.status = 'left the map'
    return
  }
  ball.loss = land.F(w, b)
  if (ball.count < MAX_TRAIL) {
    const v = land.toWorld(w, b)
    ball.trail.set([v.x, v.y + 0.06, v.z], ball.count * 3)
    ball.count++
  }
  if (ball.its >= MAX_TRAIL - 1 || (ball.its > 3 && Math.abs(before - ball.loss) < 1e-9)) ball.status = 'arrived'
}

function BallMesh({ ball, land }: { ball: Ball; land: Land }) {
  const mesh = useRef<THREE.Mesh>(null)
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(ball.trail, 3))
    g.setDrawRange(0, 0)
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: ball.color }))
  }, [ball])
  useEffect(() => () => line.geometry.dispose(), [line])
  useFrame((_, dt) => {
    line.geometry.setDrawRange(0, ball.count)
    line.geometry.attributes.position.needsUpdate = true
    if (!mesh.current) return
    const target = land.toWorld(ball.net.layers[0].W[0][0], ball.net.layers[0].b[0])
    target.y += 0.16
    mesh.current.position.lerp(target, Math.min(1, dt * 14))
    mesh.current.visible = ball.status !== 'left the map'
  })
  return (
    <>
      <primitive object={line} />
      <mesh ref={mesh} position={land.toWorld(ball.net.layers[0].W[0][0], ball.net.layers[0].b[0])}>
        <sphereGeometry args={[0.16, 20, 14]} />
        <meshStandardMaterial color={ball.color} emissive={ball.color} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </>
  )
}

function Stepper({ balls, land, alpha, gamma, speed }: { balls: Ball[]; land: Land; alpha: number; gamma: number; speed: number }) {
  const acc = useRef(0)
  useFrame((_, dt) => {
    acc.current += Math.min(dt, 0.1) * speed
    while (acc.current >= 1) {
      acc.current -= 1
      for (const b of balls) stepBall(b, land, alpha, gamma)
    }
  })
  return null
}

export default function ValleyLab() {
  const low = useAppStore((s) => s.quality) === 'low'
  const [neuron, setNeuron] = useState<Neuron>('logsig')
  const [norm, setNorm] = useState(true)
  const [logAlpha, setLogAlpha] = useState(0.3)
  const [gamma, setGamma] = useState(0.8)
  const [speed, setSpeed] = useState(14)
  const [startFrac, setStartFrac] = useState({ x: 0.16, z: 0.2 })
  const [run, setRun] = useState(1)
  useTicker(200)

  const alpha = 10 ** logAlpha
  const land = useMemo(() => buildLand(neuron, norm), [neuron, norm])
  useEffect(() => () => land.geometry.dispose(), [land])
  const start = useMemo(
    () => ({
      w: land.r.w[0] + startFrac.x * (land.r.w[1] - land.r.w[0]),
      b: land.r.b[0] + startFrac.z * (land.r.b[1] - land.r.b[0]),
    }),
    [land, startFrac],
  )
  const balls = useMemo(() => {
    const bs = makeBalls(neuron, start)
    for (const b of bs) {
      b.loss = land.F(start.w, start.b)
      if (run > 0) b.status = 'rolling'
    }
    return bs
    // `run` restarts the race from the same starting point
  }, [neuron, start, land, run])

  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return
    e.stopPropagation()
    setStartFrac({ x: e.point.x / SIZE + 0.5, z: e.point.z / SIZE + 0.5 })
    setRun((r) => r + 1)
  }

  const limit = 2 / land.lambdaMax
  const minPos = land.toWorld(land.min.w, land.min.b)
  return (
    <LabShell
      labId="valley"
      happening={
        <>
          <p>
            All three balls start at w = {start.w.toFixed(2)}, b = {start.b.toFixed(2)}. Each iteration every ball reads the slope under it and
            moves its weights downhill; lower means smaller error.
          </p>
          <p>
            {neuron === 'purelin' && alpha >= limit
              ? `α = ${alpha.toPrecision(2)} is above the stable limit ${limit.toPrecision(2)}, so each steepest-descent step overshoots the valley floor and lands higher on the other side.`
              : balls[0].loss > land.min.F + 0.05 && balls[0].its > 30
                ? 'Steepest descent is on a flat part: the slope is nearly zero, so its steps (α × slope) are tiny. Momentum keeps some speed from earlier steps. Levenberg-Marquardt uses curvature to jump.'
                : 'Steepest descent steps by α × slope. Momentum adds a share of its previous step. Levenberg-Marquardt estimates the curvature and aims at the bottom directly.'}
          </p>
          <p>
            Lowest so far:{' '}
            {[...balls].filter((b) => b.status !== 'left the map').sort((a, b) => a.loss - b.loss)[0]?.label ?? 'none'}. The true minimum is F ={' '}
            {land.min.F.toFixed(4)}.
          </p>
        </>
      }
      actions={{
        break: {
          label: 'Linear neuron, raw hours, α = 0.1',
          run: () => {
            setNeuron('purelin')
            setNorm(false)
            setLogAlpha(-1)
            setRun((r) => r + 1)
          },
        },
        fix: {
          label: 'Normalise the input, α = 0.3',
          run: () => {
            setNorm(true)
            setLogAlpha(Math.log10(0.3))
            setRun((r) => r + 1)
          },
        },
      }}
      panel={
        <>
          <Group title="The race">
            <div className="flex flex-wrap gap-2">
              <Btn tone="go" onClick={() => setRun((r) => r + 1)}>
                {run ? 'Race again' : 'Race'}
              </Btn>
              <Btn onClick={() => setStartFrac({ x: 0.1 + Math.random() * 0.8, z: 0.1 + Math.random() * 0.8 })}>
                Random start
              </Btn>
            </div>
            <div className="flex flex-col gap-1.5">
              {balls.map((b) => (
                <div key={b.key} className="flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1.5 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: b.color }} />
                  <span className="min-w-0 flex-1 truncate text-slate-200">{b.label}</span>
                  <span className="font-mono text-slate-400">{b.its} it</span>
                  <span
                    className={`font-mono ${
                      b.status === 'left the map' ? 'text-rose-400' : b.status === 'arrived' ? 'text-emerald-300' : 'text-slate-200'
                    }`}
                  >
                    {b.status === 'left the map' ? 'left the map' : `F ${b.loss.toFixed(4)}`}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Start: w = {start.w.toFixed(2)}, b = {start.b.toFixed(2)}. Tap the surface to move it.
            </p>
          </Group>
          <Group title="Training settings">
            <Slider
              label="Learning rate α"
              value={logAlpha}
              min={-3}
              max={1.5}
              step={0.05}
              onChange={setLogAlpha}
              fmt={() => alpha.toPrecision(2)}
            />
            <Slider label="Momentum γ" value={gamma} min={0} max={0.95} step={0.05} onChange={setGamma} fmt={(v) => v.toFixed(2)} />
            <Slider label="Speed" value={speed} min={2} max={60} onChange={setSpeed} fmt={(v) => `${v} iterations / s`} />
          </Group>
          <Group title="The neuron">
            <Seg
              value={neuron}
              onChange={setNeuron}
              options={[
                { value: 'logsig', label: 'Sigmoid: a = logsig(wp + b)' },
                { value: 'purelin', label: 'Linear: a = wp + b' },
              ]}
            />
            <Toggle label="Normalise hours of sleep to [−1, 1]" value={norm} onChange={setNorm} />
            <Stats>
              <Stat label="Lowest error" value={land.min.F.toFixed(4)} />
              <Stat label="At w, b" value={`${land.min.w.toFixed(2)}, ${land.min.b.toFixed(2)}`} />
              {neuron === 'purelin' && <Stat label="λ max of Hessian" value={land.lambdaMax.toFixed(2)} />}
              {neuron === 'purelin' && (
                <Stat label="Stable while α <" value={limit.toPrecision(2)} tone={alpha < limit ? 'good' : 'bad'} />
              )}
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas dpr={low ? 1 : [1, 2]} camera={{ position: [6.5, 6.5, 8.5], fov: 45 }} gl={{ antialias: !low }}>
        <color attach="background" args={['#0b1020']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 9, 3]} intensity={1.6} />
        <mesh geometry={land.geometry} onClick={pick}>
          <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.55} metalness={0.05} />
        </mesh>
        {!low && (
          <mesh geometry={land.geometry} position={[0, 0.004, 0]}>
            <meshBasicMaterial wireframe color="#ffffff" transparent opacity={0.06} />
          </mesh>
        )}
        <mesh position={[minPos.x, minPos.y + 0.5, minPos.z]}>
          <cylinderGeometry args={[0.012, 0.012, 1, 6]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <Label3D position={[minPos.x, minPos.y + 1.15, minPos.z]} lines={[{ text: 'minimum', size: 10, mono: true }]} />
        <Label3D position={[SIZE / 2 + 0.6, 0, 0]} lines={[{ text: 'weight w →', size: 11, mono: true, color: '#94a3b8' }]} />
        <Label3D position={[0, 0, SIZE / 2 + 0.6]} lines={[{ text: 'bias b →', size: 11, mono: true, color: '#94a3b8' }]} />
        {balls.map((b) => (
          <BallMesh key={`${b.key}-${run}-${start.w}-${start.b}-${neuron}-${norm}`} ball={b} land={land} />
        ))}
        <Stepper balls={balls} land={land} alpha={alpha} gamma={gamma} speed={speed} />
        <OrbitControls enablePan={false} minDistance={6} maxDistance={20} maxPolarAngle={Math.PI / 2.05} target={[0, 0.8, 0]} />
      </Canvas>
    </LabShell>
  )
}
