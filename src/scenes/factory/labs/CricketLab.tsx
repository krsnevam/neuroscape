import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Label3D from '../../../components/Label3D'
import LabShell from '../../../ui/lab/LabShell'
import { useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Slider, Stat, Stats } from '../../../ui/lab/controls'
import { createNetwork, createTrainer, output, type Network, type Sample } from '../../../engine'
import { useAppStore } from '../../../store/useAppStore'

const MAX_R = 60
const MAX_N = 36
const SIZE = 8
const HEIGHT = 3
const G = 28
const MAX_MATCHES = 3000

/** One ball: [outcome, probability]. 'W' is a wicket. */
const BALL: [string, number][] = [['0', 0.33], ['1', 0.36], ['2', 0.08], ['4', 0.12], ['6', 0.06], ['W', 0.05]]

/** Play out a chase needing r runs from n balls with 3 wickets in hand. */
function playChase(r: number, n: number): { win: boolean; balls: string[] } {
  let wickets = 3
  const balls: string[] = []
  while (n > 0 && r > 0 && wickets > 0) {
    let u = Math.random()
    let out = '0'
    for (const [o, p] of BALL) {
      if (u < p) {
        out = o
        break
      }
      u -= p
    }
    balls.push(out)
    if (out === 'W') wickets--
    else r -= Number(out)
    n--
  }
  return { win: r <= 0, balls }
}

const inputs = (r: number, n: number) => [r / 30 - 1, n / 18 - 1]
const worldX = (r: number) => (r / MAX_R - 0.5) * SIZE
const worldZ = (n: number) => (n / MAX_N - 0.5) * SIZE

interface Sim {
  net: Network
  trainer: ReturnType<typeof createTrainer>
  data: Sample[]
  wins: number
  pour: number
  points: THREE.Points
  surface: THREE.BufferGeometry
}

function makeSim(pour: number): Sim {
  const net = createNetwork(2, [8, 1], ['tansig', 'logsig'], { seed: 12 })
  const pg = new THREE.BufferGeometry()
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_MATCHES * 3), 3))
  pg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_MATCHES * 3), 3))
  pg.setDrawRange(0, 0)
  const points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.11, vertexColors: true }))
  const surface = new THREE.BufferGeometry()
  const pos = new Float32Array((G + 1) * (G + 1) * 3)
  for (let j = 0; j <= G; j++)
    for (let i = 0; i <= G; i++) pos.set([(i / G - 0.5) * SIZE, 0, (j / G - 0.5) * SIZE], (j * (G + 1) + i) * 3)
  const index: number[] = []
  for (let j = 0; j < G; j++)
    for (let i = 0; i < G; i++) {
      const a = j * (G + 1) + i
      index.push(a, a + G + 1, a + 1, a + 1, a + G + 1, a + G + 2)
    }
  surface.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  surface.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length), 3))
  surface.setIndex(index)
  return { net, trainer: createTrainer(net), data: [], wins: 0, pour, points, surface }
}

function addMatch(sim: Sim, r: number, n: number, win: boolean) {
  const k = sim.data.length
  if (k >= MAX_MATCHES) return
  sim.data.push({ p: inputs(r, n), t: [win ? 1 : 0] })
  if (win) sim.wins++
  const g = sim.points.geometry
  const jitter = () => (Math.random() - 0.5) * 0.12
  ;(g.attributes.position.array as Float32Array).set([worldX(r) + jitter(), win ? HEIGHT : 0, worldZ(n) + jitter()], k * 3)
  ;(g.attributes.color.array as Float32Array).set(win ? [0.29, 0.87, 0.5] : [0.98, 0.44, 0.52], k * 3)
  g.attributes.position.needsUpdate = true
  g.attributes.color.needsUpdate = true
  g.setDrawRange(0, k + 1)
}

function Field({ sim, low }: { sim: Sim; low: boolean }) {
  const frame = useRef(0)
  const color = useMemo(() => new THREE.Color(), [])
  useFrame(() => {
    // Matches pour in a few at a time so the class sees the data arrive
    const drip = Math.min(sim.pour, 8)
    for (let k = 0; k < drip; k++) {
      const r = 1 + Math.floor(Math.random() * MAX_R)
      const n = 1 + Math.floor(Math.random() * MAX_N)
      addMatch(sim, r, n, playChase(r, n).win)
    }
    sim.pour -= drip
    if (sim.data.length) {
      const batch = sim.data.length > 500 ? sim.data.slice(-500) : sim.data
      for (let k = 0; k < 6; k++) sim.trainer.step(batch, { alpha: 0.6, gamma: 0.9, loss: 'xent' })
    }
    if (frame.current++ % 4 !== 0) return
    const pos = sim.surface.attributes.position.array as Float32Array
    const col = sim.surface.attributes.color.array as Float32Array
    for (let j = 0; j <= G; j++)
      for (let i = 0; i <= G; i++) {
        const k = (j * (G + 1) + i) * 3
        const p = output(sim.net, inputs((i / G) * MAX_R, (j / G) * MAX_N))[0]
        pos[k + 1] = p * HEIGHT
        color.setHSL(0.98 + 0.36 * p, 0.75, 0.45)
        col[k] = color.r
        col[k + 1] = color.g
        col[k + 2] = color.b
      }
    sim.surface.attributes.position.needsUpdate = true
    sim.surface.attributes.color.needsUpdate = true
    sim.surface.computeVertexNormals()
  })
  return (
    <>
      <mesh geometry={sim.surface}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} transparent opacity={0.82} roughness={0.6} />
      </mesh>
      {!low && (
        <mesh geometry={sim.surface}>
          <meshBasicMaterial wireframe color="#ffffff" transparent opacity={0.08} />
        </mesh>
      )}
      <primitive object={sim.points} />
    </>
  )
}

export default function CricketLab() {
  const low = useAppStore((s) => s.quality) === 'low'
  const [runs, setRuns] = useState(24)
  const [ballsLeft, setBallsLeft] = useState(12)
  const [version, setVersion] = useState(0)
  const [ticker, setTicker] = useState<{ balls: string[]; shown: number; win: boolean } | null>(null)
  const [truth, setTruth] = useState<number | null>(null)
  useTicker(250)
  // `version` rebuilds the simulation when the data is cleared
  const sim = useMemo(() => makeSim(version === 0 ? 60 : 15), [version])
  useEffect(
    () => () => {
      sim.surface.dispose()
      sim.points.geometry.dispose()
    },
    [sim],
  )
  useEffect(() => setTruth(null), [runs, ballsLeft])

  useEffect(() => {
    if (!ticker || ticker.shown >= ticker.balls.length) return
    const id = setTimeout(() => setTicker((t) => (t ? { ...t, shown: t.shown + 1 } : t)), 110)
    return () => clearTimeout(id)
  }, [ticker])

  const play = () => {
    const m = playChase(runs, ballsLeft)
    addMatch(sim, runs, ballsLeft, m.win)
    setTicker({ balls: m.balls, shown: 0, win: m.win })
  }
  const checkTruth = () => {
    let wins = 0
    for (let k = 0; k < 2000; k++) if (playChase(runs, ballsLeft).win) wins++
    setTruth(wins / 2000)
  }

  const p = output(sim.net, inputs(runs, ballsLeft))[0]
  const done = ticker && ticker.shown >= ticker.balls.length
  return (
    <LabShell
      labId="cricket"
      actions={{
        break: {
          label: 'Clear and train on 15 matches',
          run: () => setVersion((v) => v + 1),
        },
        fix: { label: 'Simulate 400 matches', run: () => (sim.pour += 400) },
      }}
      panel={
        <>
          <Group title="The situation">
            <Slider label="Runs needed" value={runs} min={1} max={MAX_R} onChange={setRuns} />
            <Slider label="Balls left" value={ballsLeft} min={1} max={MAX_N} onChange={setBallsLeft} fmt={(v) => `${v} (${Math.floor(v / 6)}.${v % 6} overs)`} />
            <div className="flex flex-wrap gap-2">
              <Btn tone="go" onClick={play}>Play this match</Btn>
              <Btn onClick={checkTruth}>Check with 2000 simulations</Btn>
            </div>
            {ticker && (
              <div className="rounded-md bg-black/50 p-2 font-mono text-xs">
                <div className="flex flex-wrap gap-1">
                  {ticker.balls.slice(0, ticker.shown).map((b, i) => (
                    <span
                      key={i}
                      className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                        b === 'W' ? 'bg-rose-500 text-white' : b === '4' || b === '6' ? 'bg-emerald-400 text-black' : 'bg-slate-600 text-white'
                      }`}
                    >
                      {b}
                    </span>
                  ))}
                </div>
                {done && (
                  <div className={`mt-1.5 ${ticker.win ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {ticker.win ? 'Won. Target = 1' : 'Lost. Target = 0'}
                  </div>
                )}
              </div>
            )}
          </Group>
          <Group title="Win probability here">
            <Stats>
              <Stat label="Network says" value={`${(p * 100).toFixed(0)}%`} />
              <Stat
                label="2000 simulations"
                value={truth === null ? 'not checked' : `${(truth * 100).toFixed(0)}%`}
                tone={truth === null ? 'plain' : Math.abs(truth - p) < 0.08 ? 'good' : 'bad'}
              />
            </Stats>
          </Group>
          <Group title="Training data">
            <Stats>
              <Stat label="Matches seen" value={sim.data.length} />
              <Stat label="Won" value={sim.data.length ? `${((sim.wins / sim.data.length) * 100).toFixed(0)}%` : '—'} />
            </Stats>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={() => (sim.pour += 300)}>Simulate 300 more</Btn>
              <Btn onClick={() => setVersion((v) => v + 1)}>Clear, keep 15</Btn>
            </div>
          </Group>
        </>
      }
    >
      <Canvas dpr={low ? 1 : [1, 2]} camera={{ position: [7.5, 6, 8.5], fov: 45 }} gl={{ antialias: !low }}>
        <color attach="background" args={['#0b1020']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 9, 5]} intensity={1.4} />
        <gridHelper args={[SIZE, 12, '#334155', '#1e293b']} position={[0, -0.01, 0]} />
        <gridHelper args={[SIZE, 2, '#334155', '#334155']} position={[0, HEIGHT, 0]} />
        <Field sim={sim} low={low} />
        <mesh position={[worldX(runs), (p * HEIGHT) / 2, worldZ(ballsLeft)]} scale={[1, Math.max(0.02, p * HEIGHT), 1]}>
          <cylinderGeometry args={[0.035, 0.035, 1, 8]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[worldX(runs), p * HEIGHT, worldZ(ballsLeft)]}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshStandardMaterial color="#f8fafc" emissive="#a78bfa" emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
        <Label3D
          position={[worldX(runs), p * HEIGHT + 0.5, worldZ(ballsLeft)]}
          lines={[{ text: `${(p * 100).toFixed(0)}%`, size: 13, mono: true, bold: true }]}
          background="rgba(2,6,23,0.8)"
        />
        <Label3D position={[0, 0, SIZE / 2 + 0.6]} lines={[{ text: 'runs needed →', size: 11, mono: true, color: '#94a3b8' }]} />
        <Label3D position={[SIZE / 2 + 0.7, 0, 0]} lines={[{ text: 'balls left →', size: 11, mono: true, color: '#94a3b8' }]} />
        <Label3D position={[-SIZE / 2 - 0.4, HEIGHT, -SIZE / 2]} lines={[{ text: 'wins: target 1', size: 10, mono: true, color: '#6ee7b7' }]} />
        <Label3D position={[-SIZE / 2 - 0.4, 0, -SIZE / 2]} lines={[{ text: 'losses: target 0', size: 10, mono: true, color: '#fda4af' }]} />
        <OrbitControls enablePan={false} minDistance={6} maxDistance={20} maxPolarAngle={Math.PI / 2.05} target={[0, 1.2, 0]} />
      </Canvas>
    </LabShell>
  )
}
