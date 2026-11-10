import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Label3D from '../../../components/Label3D'
import LabShell from '../../../ui/lab/LabShell'
import { useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { gauss, rng, type Vec } from '../../../engine'
import {
  competitiveStep,
  createCompetitiveLayer,
  distance,
  meanDistance,
  territory,
  type CompetitiveLayer,
} from '../../../engine/competitive'
import { useAppStore } from '../../../store/useAppStore'
import { NEURON_COLORS } from './kit'

const F = 6 // floor size in scene units
const CONSCIENCE = 3
const at = (v: Vec, y = 0): [number, number, number] => [(v[0] - 0.5) * F, y, (0.5 - v[1]) * F]
const clock = (h: number) => {
  const m = Math.round((((h % 24) + 24) % 24) * 60)
  const hh = Math.floor(m / 60) % 24
  const mm = m % 60
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`
}
/** x = 0…1 is a bedtime from 10 pm to 4 am; y = 0…1 is a wake-up time from 5 am to 11 am. */
const bed = (x: number) => clock(22 + 6 * x)
const wake = (y: number) => clock(5 + 6 * y)

/** Three groups of hostel students: early birds, regulars and night owls. */
function hostel(): Vec[] {
  const rand = rng(8)
  const groups = [[0.13, 0.13], [0.43, 0.44], [0.8, 0.82]]
  return Array.from({ length: 120 }, (_, i) => {
    const g = groups[i % 3]
    return [g[0] + gauss(rand) * 0.055, g[1] + gauss(rand) * 0.055].map((v) => Math.min(0.98, Math.max(0.02, v)))
  })
}

type Init = 'data' | 'far' | 'random'
type Speed = 'slow' | 'normal' | 'fast'

interface Last {
  p: Vec
  d: number[]
  bias: number[]
  win: number
  gap: number
}

interface Sim {
  layer: CompetitiveLayer
  data: Vec[]
  rand: () => number
  t: number
  last: Last | null
  pulse: number[]
  frame: number
}

interface Live {
  alpha: number
  conscience: boolean
  speed: Speed
}

function stepOnce(sim: Sim, live: Live) {
  if (!sim.data.length) return
  const p = sim.data[Math.floor(sim.rand() * sim.data.length)]
  const d = sim.layer.w.map((w) => distance(w, p))
  const bias = sim.layer.bias.slice()
  const win = competitiveStep(sim.layer, p, live.alpha, live.conscience ? { strength: CONSCIENCE } : undefined)
  sim.last = { p, d, bias, win, gap: d[win] }
  sim.pulse[win] = 1
  sim.t++
}

function Scene({ sim, live, onTap }: { sim: Sim; live: RefObject<Live>; onTap: (x: number, y: number) => void }) {
  const S = sim.layer.w.length
  const groups = useRef<(THREE.Group | null)[]>([])
  const boxes = useRef<(THREE.Mesh | null)[]>([])
  const tops = useRef<(THREE.Group | null)[]>([])
  const dots = useRef<THREE.InstancedMesh>(null)
  const marker = useRef<THREE.Mesh>(null)
  const beam = useRef<THREE.Mesh>(null)
  const drawn = useRef(-1)
  const heights = useRef<number[]>(new Array<number>(S).fill(0.3))
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const link = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.9 }))
  }, [])
  // Floor texture: each cell takes the colour of the neuron that would win there
  const floor = useMemo(() => {
    const N = 48
    const canvas = document.createElement('canvas')
    canvas.width = N
    canvas.height = N
    const ctx = canvas.getContext('2d')!
    const img = ctx.createImageData(N, N)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const rgb = NEURON_COLORS.map((c) => {
      const k = new THREE.Color(c)
      return [k.r * 255, k.g * 255, k.b * 255]
    })
    return { N, ctx, img, texture, rgb }
  }, [])
  useEffect(
    () => () => {
      link.geometry.dispose()
      floor.texture.dispose()
    },
    [link, floor],
  )

  useFrame((_, dt) => {
    const lv = live.current!
    sim.frame++
    if (lv.speed === 'fast') for (let k = 0; k < 6; k++) stepOnce(sim, lv)
    else if (sim.frame % (lv.speed === 'slow' ? 50 : 9) === 0) stepOnce(sim, lv)
    const k = 1 - Math.exp(-dt * 7)
    const total = Math.max(1, sim.t)

    for (let i = 0; i < S; i++) {
      const g = groups.current[i]
      const box = boxes.current[i]
      const top = tops.current[i]
      if (!g || !box || !top) continue
      const [x, , z] = at(sim.layer.w[i])
      g.position.x += (x - g.position.x) * k
      g.position.z += (z - g.position.z) * k
      sim.pulse[i] *= Math.exp(-dt * 3)
      const target = 0.25 + 3 * (sim.layer.wins[i] / total) + sim.pulse[i] * 0.7
      heights.current[i] += (target - heights.current[i]) * k
      const hgt = heights.current[i]
      box.scale.y = hgt
      box.position.y = hgt / 2
      top.position.y = hgt
      const mat = box.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.25 + sim.pulse[i] * 0.9
    }

    // Students on the floor
    if (dots.current && drawn.current !== sim.data.length) {
      drawn.current = sim.data.length
      sim.data.forEach((p, i) => {
        dummy.position.set(...at(p, 0.06))
        dummy.updateMatrix()
        dots.current!.setMatrixAt(i, dummy.matrix)
      })
      dots.current.count = sim.data.length
      dots.current.instanceMatrix.needsUpdate = true
    }
    // The student being presented, and the link to the winner
    const last = sim.last
    if (last && marker.current && beam.current) {
      const [x, , z] = at(last.p)
      marker.current.position.set(x, 0.1, z)
      marker.current.scale.setScalar(1 + sim.pulse[last.win] * 0.8)
      beam.current.position.set(x, 1.5, z)
      ;(beam.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + sim.pulse[last.win] * 0.5
      const g = groups.current[last.win]
      const pos = link.geometry.attributes.position.array as Float32Array
      pos.set([x, 0.1, z, g ? g.position.x : x, heights.current[last.win], g ? g.position.z : z])
      link.geometry.attributes.position.needsUpdate = true
      ;(link.material as THREE.LineBasicMaterial).opacity = 0.25 + sim.pulse[last.win] * 0.75
    }
    marker.current && (marker.current.visible = !!last)
    beam.current && (beam.current.visible = !!last)
    link.visible = !!last

    if (sim.frame % 5 === 0) {
      const { N, img, ctx, texture, rgb } = floor
      for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) {
          const px = (i + 0.5) / N
          const py = 1 - (j + 0.5) / N
          let best = 0
          let bn = -Infinity
          for (let s = 0; s < S; s++) {
            const w = sim.layer.w[s]
            const n = -Math.hypot(w[0] - px, w[1] - py) + sim.layer.bias[s]
            if (n > bn) {
              bn = n
              best = s
            }
          }
          const c = rgb[best % rgb.length]
          const o = (j * N + i) * 4
          img.data[o] = 11 + c[0] * 0.2
          img.data[o + 1] = 16 + c[1] * 0.2
          img.data[o + 2] = 32 + c[2] * 0.2
          img.data[o + 3] = 255
        }
      ctx.putImageData(img, 0, 0)
      texture.needsUpdate = true
    }
  })

  const total = Math.max(1, sim.t)
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          if (e.delta > 6 || !e.uv) return
          e.stopPropagation()
          onTap(e.uv.x, e.uv.y)
        }}
      >
        <planeGeometry args={[F, F]} />
        <meshBasicMaterial map={floor.texture} toneMapped={false} />
      </mesh>
      <gridHelper args={[F, 6, '#475569', '#1e293b']} position={[0, 0.005, 0]} />
      <instancedMesh ref={dots} args={[undefined, undefined, 600]} raycast={() => null}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshBasicMaterial color="#e2e8f0" toneMapped={false} />
      </instancedMesh>
      <mesh ref={marker} raycast={() => null}>
        <sphereGeometry args={[0.11, 14, 10]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh ref={beam} raycast={() => null}>
        <cylinderGeometry args={[0.015, 0.015, 3, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
      <primitive object={link} />
      {sim.layer.w.map((w, i) => {
        const color = NEURON_COLORS[i % NEURON_COLORS.length]
        const wins = sim.layer.wins[i]
        const dead = sim.t > 40 && wins === 0
        return (
          <group key={i} ref={(g) => void (groups.current[i] = g)} position={at(w)}>
            <mesh ref={(m) => void (boxes.current[i] = m)} raycast={() => null}>
              <boxGeometry args={[0.3, 1, 0.3]} />
              <meshStandardMaterial color={dead ? '#475569' : color} emissive={dead ? '#1e293b' : color} emissiveIntensity={0.25} />
            </mesh>
            <group ref={(g) => void (tops.current[i] = g)}>
              <Label3D
                position={[0, 0.42, 0]}
                background="rgba(2,6,23,0.75)"
                lines={[
                  { text: `neuron ${i + 1}`, size: 11, bold: true, color: dead ? '#fda4af' : color },
                  { text: dead ? 'dead: 0 wins' : `${wins} wins · ${Math.round((100 * wins) / total)}%`, size: 10, mono: true, color: dead ? '#fda4af' : '#e2e8f0' },
                ]}
              />
            </group>
          </group>
        )
      })}
      {[0, 0.5, 1].map((x) => (
        <Label3D key={`x${x}`} position={at([x, -0.07])} lines={[{ text: bed(x), size: 10, mono: true, color: '#94a3b8' }]} />
      ))}
      <Label3D position={at([0.5, -0.19])} lines={[{ text: 'goes to bed at →', size: 11, mono: true, color: '#7dd3fc' }]} />
      {[0, 0.5, 1].map((y) => (
        <Label3D key={`y${y}`} position={at([-0.1, y])} lines={[{ text: wake(y), size: 10, mono: true, color: '#94a3b8' }]} />
      ))}
      <Label3D position={at([-0.12, 0.78])} lines={[{ text: 'wakes up at ↑', size: 11, mono: true, color: '#7dd3fc' }]} />
    </>
  )
}

export default function CompetitionLab() {
  const low = useAppStore((s) => s.quality) === 'low'
  const [S, setS] = useState(3)
  const [init, setInit] = useState<Init>('data')
  const [alpha, setAlpha] = useState(0.15)
  const [conscience, setConscience] = useState(false)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [version, setVersion] = useState(0)
  const dataRef = useRef<Vec[] | null>(null)
  if (!dataRef.current) dataRef.current = hostel()
  const live = useRef<Live>({ alpha, conscience, speed })
  live.current = { alpha, conscience, speed }
  useTicker(250)

  const sim = useMemo<Sim>(() => {
    const rand = rng(version * 7 + S * 31 + 3)
    const data = dataRef.current!
    const w = Array.from({ length: S }, (_, i) => {
      if (init === 'random') return [rand(), rand()]
      if (init === 'far' && i === S - 1) return [0.95, 0.05]
      // Spread the starting points over the data: one from each third of the list, then nudge
      const p = data[(i * 37 + Math.floor(rand() * 3) * 3 + i) % data.length]
      return [p[0] + (rand() - 0.5) * 0.04, p[1] + (rand() - 0.5) * 0.04]
    })
    return { layer: createCompetitiveLayer(w), data, rand, t: 0, last: null, pulse: new Array<number>(S).fill(0), frame: 0 }
  }, [S, init, version])

  const restart = () => setVersion((v) => v + 1)
  const addGroup = (x: number, y: number) => {
    const rand = rng(dataRef.current!.length + 5)
    if (dataRef.current!.length > 560) return
    for (let i = 0; i < 10; i++)
      dataRef.current!.push([x + gauss(rand) * 0.035, y + gauss(rand) * 0.035].map((v) => Math.min(0.99, Math.max(0.01, v))))
  }

  const own = territory(sim.layer, sim.data)
  const dead = sim.t > 40 ? sim.layer.wins.filter((v) => v === 0).length : 0
  const last = sim.last
  const idle = sim.layer.wins.findIndex((v) => v === 0)
  const happening = !last ? (
    <p>Starting. One student at a time is shown to all {S} neurons.</p>
  ) : (
    <>
      <p>
        This student sleeps at {bed(last.p[0])} and wakes at {wake(last.p[1])}. Neuron {last.win + 1} wins:{' '}
        {conscience ? 'it has the largest −distance + bias' : 'it is the closest'} (distance {last.gap.toFixed(2)}
        {conscience ? `, bias ${last.bias[last.win] >= 0 ? '+' : ''}${last.bias[last.win].toFixed(2)}` : ''}).
      </p>
      <p>
        Only the winner learns. It moves α = {alpha.toFixed(2)} of the gap, about {(alpha * last.gap).toFixed(3)}, toward the student. The other{' '}
        {S - 1} do not move.
      </p>
      {dead > 0 && idle >= 0 ? (
        <p>
          Neuron {idle + 1} has 0 wins after {sim.t} students.{' '}
          {conscience
            ? `Its bias is rising (now +${sim.layer.bias[idle].toFixed(2)}), so it will soon win.`
            : 'It is too far away to ever be the closest, so it never moves: a dead neuron.'}
        </p>
      ) : (
        <p>
          {S} neurons are sharing {sim.data.length} students: {own.join(', ')}. Tower height is the share of wins.
        </p>
      )}
    </>
  )

  const maxD = last ? Math.max(0.3, ...last.d) : 1
  return (
    <LabShell
      labId="competition"
      happening={happening}
      actions={{
        break: {
          label: 'Start one neuron far away',
          run: () => {
            setS((s) => Math.max(4, s))
            setInit('far')
            setConscience(false)
            restart()
          },
        },
        fix: { label: 'Switch the conscience on', run: () => { setConscience(true); setSpeed('fast') } },
      }}
      panel={
        <>
          <Group title="The competitive layer">
            <Slider label="Neurons S (one tower each)" value={S} min={1} max={8} onChange={setS} />
            <Seg
              label="Where the weights start"
              value={init}
              onChange={(v) => { setInit(v); restart() }}
              options={[
                { value: 'data', label: 'On real students' },
                { value: 'far', label: 'One far away' },
                { value: 'random', label: 'Random spots' },
              ]}
            />
            <Slider label="Learning rate α" value={alpha} min={0.01} max={1} step={0.01} onChange={setAlpha} fmt={(v) => v.toFixed(2)} />
            <Toggle
              label="Conscience"
              hint="A bias that handicaps frequent winners and helps neurons that never win"
              value={conscience}
              onChange={setConscience}
            />
            <Seg
              label="Speed"
              value={speed}
              onChange={setSpeed}
              options={[
                { value: 'slow', label: 'One by one' },
                { value: 'normal', label: 'Normal' },
                { value: 'fast', label: 'Fast' },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Btn onClick={restart}>Restart</Btn>
              <Btn onClick={() => { dataRef.current = hostel(); restart() }}>Remove added students</Btn>
            </div>
            <p className="text-[11px] text-slate-500">Tap the floor to add a group of 10 students there. Drag to turn the view.</p>
          </Group>
          <Group title="Readings">
            <Stats>
              <Stat label="Students shown" value={sim.t} />
              <Stat label="Dead neurons" value={`${dead} of ${S}`} tone={dead ? 'bad' : 'good'} />
              <Stat label="Avg distance to tower" value={meanDistance(sim.layer.w, sim.data).toFixed(3)} />
              <Stat label="Students" value={sim.data.length} />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas dpr={low ? 1 : [1, 2]} camera={{ position: [0.6, 6.4, 7.4], fov: 45 }} gl={{ antialias: !low }}>
        <color attach="background" args={['#0b1020']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 8, 5]} intensity={1.4} />
        <Scene key={`${S}-${init}-${version}`} sim={sim} live={live} onTap={addGroup} />
        <OrbitControls enablePan={false} minDistance={5} maxDistance={16} maxPolarAngle={1.45} target={[0, 0.3, 0.2]} />
      </Canvas>
      <div className="pointer-events-none absolute left-2 top-2 flex w-[178px] flex-col gap-1 rounded-lg border border-white/10 bg-slate-950/85 p-2 sm:w-52">
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">The competition · shortest bar wins</span>
        {sim.layer.w.map((_, i) => {
          const d = last ? last.d[i] : 0
          const won = last?.win === i
          return (
            <div key={i} className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className="w-5 shrink-0 font-semibold" style={{ color: NEURON_COLORS[i] }}>N{i + 1}</span>
              <span className="relative h-2 flex-1 rounded-sm bg-white/5">
                <span
                  className="absolute inset-y-0 left-0 rounded-sm transition-all duration-200"
                  style={{ width: `${Math.min(100, (d / maxD) * 100)}%`, background: NEURON_COLORS[i], opacity: won ? 1 : 0.4 }}
                />
              </span>
              <span className={`w-[70px] shrink-0 text-right ${won ? 'text-white' : 'text-slate-500'}`}>
                {d.toFixed(2)}
                {conscience && last ? ` ${last.bias[i] >= 0 ? '+' : '−'}${Math.abs(last.bias[i]).toFixed(2)}` : ''}
                {won ? ' ★' : ''}
              </span>
            </div>
          )
        })}
        <span className="text-[9px] leading-tight text-slate-500">
          bar = distance ‖w − p‖{conscience ? ', then bias b' : ''}. ★ = winner. Floor colour = whose area it is.
        </span>
      </div>
    </LabShell>
  )
}
