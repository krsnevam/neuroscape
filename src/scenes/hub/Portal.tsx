import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import type { World } from '../../data/worlds'
import Label3D from '../../components/Label3D'

interface Props {
  world: World
  position: [number, number, number]
  visited: boolean
  lowQuality: boolean
  onEnter: (world: World) => void
  onFocus: (id: string | null) => void
}

/** A glowing ring portal for one world. Tap/click to enter. */
export default function Portal({ world, position, visited, lowQuality, onEnter, onFocus }: Props) {
  const group = useRef<Group>(null)
  const core = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (group.current) {
      group.current.position.y = position[1] + Math.sin(t * 1.2 + world.number) * 0.15
      const target = hovered ? 1.15 : 1
      const s = group.current.scale.x + (target - group.current.scale.x) * Math.min(1, dt * 8)
      group.current.scale.setScalar(s)
    }
    if (core.current) core.current.rotation.y += dt * (hovered ? 1.6 : 0.5)
  })

  const segs = lowQuality ? 24 : 64

  return (
    <group
      ref={group}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        onFocus(world.id)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        onFocus(null)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'auto'
        onEnter(world)
      }}
    >
      {/* ring */}
      <mesh>
        <torusGeometry args={[1, 0.08, lowQuality ? 8 : 16, segs]} />
        <meshStandardMaterial
          color={world.color}
          emissive={world.color}
          emissiveIntensity={hovered ? 2.2 : 1.2}
          toneMapped={false}
        />
      </mesh>
      {/* translucent membrane, also a big tap target for phones */}
      <mesh>
        <circleGeometry args={[0.95, segs]} />
        <meshBasicMaterial color={world.color} transparent opacity={hovered ? 0.28 : 0.12} side={2} />
      </mesh>
      {/* spinning core */}
      <mesh ref={core}>
        <icosahedronGeometry args={[0.35, lowQuality ? 0 : 1]} />
        <meshStandardMaterial color={world.color} wireframe emissive={world.color} emissiveIntensity={1} />
      </mesh>

      <Label3D
        position={[0, 1.65, 0]}
        lines={[
          { text: `WORLD ${world.number} · ${world.unit.toUpperCase()}${visited ? ' ✓' : ''}`, color: '#94a3b8', size: 10, mono: true },
          { text: world.title, size: 14, bold: true },
        ]}
      />
    </group>
  )
}
