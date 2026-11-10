import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Link, useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import type { Lab } from '../data/labs'
import { labsByWorld } from '../data/labRegistry'
import { worlds } from '../data/worlds'
import { useAppStore } from '../store/useAppStore'
import Label3D from '../components/Label3D'
import FpsMeter from '../ui/FpsMeter'
import QualityToggle from '../ui/QualityToggle'
import WorldIntroPanel from '../ui/WorldIntroPanel'
import DeveloperSignal from '../ui/DeveloperSignal'
import { worldIntros } from '../data/worldIntros'

const RADIUS = 6
const CUBES = 27
const angleOf = (i: number, n: number) => Math.PI * 0.75 - (i / n) * Math.PI * 2
const spot = (i: number, n: number, r = RADIUS + 1.7): [number, number, number] => [
  Math.cos(angleOf(i, n)) * r,
  0,
  -Math.sin(angleOf(i, n)) * r,
]

/** Data cubes ride the belt past every station and take each station's colour as they pass. */
function Belt({ low, labs }: { low: boolean; labs: Lab[] }) {
  const cubes = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  useFrame((s) => {
    if (!cubes.current) return
    const n = labs.length
    for (let i = 0; i < CUBES; i++) {
      const u = (i / CUBES + s.clock.elapsedTime * 0.025) % 1
      const a = Math.PI * 0.75 - u * Math.PI * 2
      dummy.position.set(Math.cos(a) * RADIUS, 0.3 + Math.sin(s.clock.elapsedTime * 3 + i) * 0.03, -Math.sin(a) * RADIUS)
      dummy.rotation.set(0, -a, 0)
      dummy.updateMatrix()
      cubes.current.setMatrixAt(i, dummy.matrix)
      cubes.current.setColorAt(i, color.set(labs[Math.floor(u * n) % n].color))
    }
    cubes.current.instanceMatrix.needsUpdate = true
    if (cubes.current.instanceColor) cubes.current.instanceColor.needsUpdate = true
  })
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[RADIUS - 0.45, RADIUS + 0.45, low ? 48 : 96]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[RADIUS - 0.02, RADIUS + 0.02, low ? 48 : 96]} />
        <meshBasicMaterial color="#475569" />
      </mesh>
      <instancedMesh ref={cubes} args={[undefined, undefined, CUBES]}>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial emissive="#ffffff" emissiveIntensity={0.25} toneMapped={false} />
      </instancedMesh>
    </>
  )
}

function Station({
  lab,
  index,
  count,
  done,
  onEnter,
}: {
  lab: Lab
  index: number
  count: number
  done: boolean
  onEnter: (lab: Lab) => void
}) {
  const group = useRef<THREE.Group>(null)
  const icon = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  useEffect(() => () => void (document.body.style.cursor = 'auto'), [])
  useFrame((s, dt) => {
    if (icon.current) {
      icon.current.rotation.y += dt * (hover ? 2.4 : 0.8)
      icon.current.position.y = 2.1 + Math.sin(s.clock.elapsedTime * 1.6 + index) * 0.12
    }
    if (group.current) {
      const k = group.current.scale.x + ((hover ? 1.12 : 1) - group.current.scale.x) * Math.min(1, dt * 8)
      group.current.scale.setScalar(k)
    }
  })
  return (
    <group
      ref={group}
      position={spot(index, count)}
      rotation={[0, angleOf(index, count) + Math.PI / 2, 0]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onEnter(lab)
      }}
    >
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.5, 1.2, 1.1]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.24, 0]}>
        <boxGeometry args={[1.56, 0.08, 1.16]} />
        <meshStandardMaterial color={lab.color} emissive={lab.color} emissiveIntensity={hover ? 2.4 : 1.3} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.62, 0.56]}>
        <planeGeometry args={[1.1, 0.6]} />
        <meshBasicMaterial color={lab.color} transparent opacity={hover ? 0.5 : 0.22} />
      </mesh>
      <mesh ref={icon} position={[0, 2.1, 0]}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color={lab.color} emissive={lab.color} emissiveIntensity={1.2} wireframe={!done} toneMapped={false} />
      </mesh>
      <Label3D
        position={[0, 3, 0]}
        lines={[
          { text: `${index + 1} · ${lab.lecture}${done ? ' ✓' : ''}`, color: lab.color, size: 10, mono: true },
          { text: lab.title, size: 13, bold: true },
        ]}
      />
    </group>
  )
}

/** A world's lobby: its stations around a conveyor belt. Tap a station to walk in. */
export default function WorldFloor({ worldId }: { worldId: string }) {
  const navigate = useNavigate()
  const world = worlds.find((w) => w.id === worldId)!
  const labs = labsByWorld[worldId]
  const low = useAppStore((s) => s.quality) === 'low'
  const doneLabs = useAppStore((s) => s.doneLabs)
  const markVisited = useAppStore((s) => s.markVisited)
  useEffect(() => markVisited(worldId), [markVisited, worldId])
  const enter = (lab: Lab) => navigate(`/world/${worldId}/${lab.id}`)
  const isDone = (lab: Lab) => doneLabs.includes(`${worldId}/${lab.id}`)
  const done = labs.filter(isDone).length
  const [first, ...rest] = world.title.split(' ')
  const intro = worldIntros[worldId]
  const [showIntro, setShowIntro] = useState(false)

  return (
    <div className="relative h-full w-full">
      <Canvas dpr={low ? 1 : [1, 2]} camera={{ position: [0, 9.5, 14.5], fov: 50 }} gl={{ antialias: !low }}>
        <color attach="background" args={['#0b1020']} />
        <fog attach="fog" args={['#0b1020', 18, 38]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 12, 6]} intensity={1.2} />
        <pointLight position={[0, 4, 0]} color={world.color} intensity={40} distance={16} />
        <gridHelper args={[60, 60, '#1e293b', '#141c30']} />
        <Belt low={low} labs={labs} />
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[1.1, 1.4, 1.4, low ? 12 : 32]} />
          <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.9, 0]}>
          <icosahedronGeometry args={[0.6, 1]} />
          <meshStandardMaterial color={world.color} emissive={world.color} emissiveIntensity={1.4} wireframe toneMapped={false} />
        </mesh>
        {labs.map((lab, i) => (
          <Station key={lab.id} lab={lab} index={i} count={labs.length} done={isDone(lab)} onEnter={enter} />
        ))}
        <OrbitControls
          enablePan={false}
          minDistance={9}
          maxDistance={24}
          maxPolarAngle={Math.PI / 2.2}
          autoRotate
          autoRotateSpeed={0.25}
          target={[0, 1, 0]}
        />
      </Canvas>

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div>
          <Link to="/" className="pointer-events-auto text-xs text-slate-400 hover:text-white">
            ← All worlds
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {first} <span style={{ color: world.color }}>{rest.join(' ')}</span>
          </h1>
          <p className="max-w-sm text-xs text-slate-400 sm:text-sm">
            {world.unit}: {world.topics}. Follow the belt, or walk into any station. {done} of {labs.length} proved.
          </p>
          {intro && (
            <button
              type="button"
              onClick={() => setShowIntro(true)}
              className="pointer-events-auto mt-2 rounded-md border px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-white/10"
              style={{ borderColor: world.color, background: `${world.color}22` }}
            >
              {intro.button} →
            </button>
          )}
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <FpsMeter />
          <QualityToggle />
          <DeveloperSignal />
        </div>
      </header>
      {intro && showIntro && (
        <WorldIntroPanel intro={intro} worldId={worldId} labs={labs} color={world.color} onClose={() => setShowIntro(false)} />
      )}

      <nav className="absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto p-3" aria-label="Stations">
        {labs.map((lab, i) => (
          <button
            key={lab.id}
            onClick={() => enter(lab)}
            className="flex shrink-0 flex-col rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-left backdrop-blur hover:bg-slate-800"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: lab.color }}>
              {i + 1} · {lab.lecture} {isDone(lab) && '✓'}
            </span>
            <span className="text-xs font-medium text-white">{lab.title}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
