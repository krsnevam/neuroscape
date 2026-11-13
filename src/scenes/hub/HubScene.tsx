import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Link, useNavigate } from 'react-router-dom'
import type { Mesh } from 'three'
import { worlds, type World } from '../../data/worlds'
import { useAppStore } from '../../store/useAppStore'
import Portal from './Portal'
import QualityToggle from '../../ui/QualityToggle'
import FpsMeter from '../../ui/FpsMeter'
import DeveloperSignal from '../../ui/DeveloperSignal'

const RADIUS = 5

/** Central pulsing neuron: the lobby's landmark. */
function CoreNeuron({ lowQuality }: { lowQuality: boolean }) {
  const ref = useRef<Mesh>(null)
  useFrame((s) => {
    if (!ref.current) return
    const k = 1 + Math.sin(s.clock.elapsedTime * 2) * 0.05
    ref.current.scale.setScalar(k)
  })
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.8, lowQuality ? 16 : 48, lowQuality ? 12 : 32]} />
        <meshStandardMaterial color="#f8fafc" emissive="#60a5fa" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <pointLight color="#60a5fa" intensity={30} distance={14} />
    </group>
  )
}

/** Axon-like lines from the core to each portal. */
function Axons({ positions }: { positions: [number, number, number][] }) {
  const geometry = useMemo(() => {
    const pts = new Float32Array(positions.flatMap((p) => [0, 0, 0, ...p]))
    return pts
  }, [positions])
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geometry, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#334155" />
    </lineSegments>
  )
}

export default function HubScene() {
  const navigate = useNavigate()
  const quality = useAppStore((s) => s.quality)
  const visited = useAppStore((s) => s.visited)
  const focusedId = useAppStore((s) => s.focusedWorld)
  const setFocused = useAppStore((s) => s.setFocusedWorld)
  const low = quality === 'low'

  const positions = useMemo(
    () =>
      worlds.map((_, i): [number, number, number] => {
        const angle = (i / worlds.length) * Math.PI * 2 - Math.PI / 2
        return [Math.cos(angle) * RADIUS, 0, Math.sin(angle) * RADIUS]
      }),
    [],
  )

  const focused = worlds.find((w) => w.id === focusedId)
  const enter = (w: World) => navigate(w.path)

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={low ? 1 : [1, 2]}
        camera={{ position: [0, 6, 11], fov: 55 }}
        gl={{ antialias: !low, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#0b1020']} />
        <fog attach="fog" args={['#0b1020', 12, 30]} />
        <ambientLight intensity={0.4} />
        <Suspense fallback={null}>
          <Stars radius={60} depth={30} count={low ? 800 : 3000} factor={3} fade speed={0.5} />
          <CoreNeuron lowQuality={low} />
          <Axons positions={positions} />
          {worlds.map((w, i) => (
            <Portal
              key={w.id}
              world={w}
              position={positions[i]}
              visited={visited.includes(w.id)}
              lowQuality={low}
              onEnter={enter}
              onFocus={setFocused}
            />
          ))}
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={6}
          maxDistance={18}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={!focusedId}
          autoRotateSpeed={0.4}
        />
      </Canvas>

      {/* Overlay UI */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Neuro<span className="text-sky-400">Scape</span>
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm">Walk inside neural networks. Tap a world to enter.</p>
          <Link
            to="/journey"
            className="pointer-events-auto mt-2 inline-flex flex-col rounded-md border border-teal-400/60 bg-teal-400/15 px-3.5 py-2 text-left backdrop-blur hover:bg-teal-400/25"
          >
            <span className="text-sm font-semibold text-teal-50">▶ The Journey of a Signal</span>
            <span className="text-xs text-teal-100/80">One input followed from measurement to decision, in one class</span>
          </Link>
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <FpsMeter />
          <QualityToggle />
          <DeveloperSignal />
        </div>
      </header>

      {/* Focused world info card (hover on desktop) */}
      {focused && (
        <div className="pointer-events-none absolute inset-x-4 bottom-20 mx-auto max-w-md rounded-xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur">
          <div className="text-xs uppercase tracking-widest" style={{ color: focused.color }}>
            World {focused.number} · {focused.unit}
          </div>
          <div className="text-lg font-semibold">{focused.title}</div>
          <div className="mt-1 text-sm text-slate-300">{focused.topics}</div>
          <div className="mt-2 text-xs text-amber-300">Break &amp; fix: {focused.breakFix}</div>
        </div>
      )}

      {/* World list: accessible fallback and quick nav on phones */}
      <nav className="absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto p-3">
        {worlds.map((w) => (
          <button
            key={w.id}
            onClick={() => enter(w)}
            className="shrink-0 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-left text-xs backdrop-blur hover:bg-slate-800"
          >
            <span style={{ color: w.color }}>●</span> {w.number}. {w.title}
          </button>
        ))}
      </nav>
    </div>
  )
}
