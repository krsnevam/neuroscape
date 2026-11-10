import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

/** Shared pieces for the stations that draw a performance surface F(x₁, x₂) in 3D. */

export const SIZE = 8
export const HEIGHT = 3

export interface Surface {
  F: (x: number, z: number) => number
  rx: [number, number]
  rz: [number, number]
  /** F values above this are drawn at full height */
  cap: number
  min: { x: number; z: number; F: number }
  /** parameter values → scene position on the surface (clamped to the map) */
  toWorld: (x: number, z: number, lift?: number) => THREE.Vector3
  /** scene position → parameter values */
  fromWorld: (v: THREE.Vector3) => { x: number; z: number }
  geometry: THREE.BufferGeometry
  /** contour lines of equal F, lying on the surface */
  contours: THREE.BufferGeometry
}

export function buildSurface(
  F: (x: number, z: number) => number,
  rx: [number, number],
  rz: [number, number],
  o: { n?: number; capAt?: number; pow?: number; levels?: number } = {},
): Surface {
  const N = o.n ?? 64
  const pow = o.pow ?? 1
  const levels = o.levels ?? 10
  const grid = new Float32Array((N + 1) * (N + 1))
  let min = { x: 0, z: 0, F: Infinity }
  for (let j = 0; j <= N; j++)
    for (let i = 0; i <= N; i++) {
      const x = rx[0] + ((rx[1] - rx[0]) * i) / N
      const z = rz[0] + ((rz[1] - rz[0]) * j) / N
      const v = F(x, z)
      grid[j * (N + 1) + i] = v
      if (v < min.F) min = { x, z, F: v }
    }
  const sorted = Array.from(grid).sort((a, b) => a - b)
  const cap = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * (o.capAt ?? 0.9)))]
  const lo = Math.min(min.F, cap - 1e-9)
  /** 0..1 height of a value of F */
  const rel = (v: number) => Math.pow(Math.max(0, Math.min(1, (v - lo) / (cap - lo))), pow)
  const toWorld = (x: number, z: number, lift = 0) => {
    const cx = Math.min(rx[1], Math.max(rx[0], x))
    const cz = Math.min(rz[1], Math.max(rz[0], z))
    return new THREE.Vector3(
      ((cx - rx[0]) / (rx[1] - rx[0]) - 0.5) * SIZE,
      rel(F(cx, cz)) * HEIGHT + lift,
      ((cz - rz[0]) / (rz[1] - rz[0]) - 0.5) * SIZE,
    )
  }
  const fromWorld = (v: THREE.Vector3) => ({
    x: rx[0] + (v.x / SIZE + 0.5) * (rx[1] - rx[0]),
    z: rz[0] + (v.z / SIZE + 0.5) * (rz[1] - rz[0]),
  })

  const positions = new Float32Array((N + 1) * (N + 1) * 3)
  const colors = new Float32Array((N + 1) * (N + 1) * 3)
  const hgt = new Float32Array((N + 1) * (N + 1))
  const color = new THREE.Color()
  for (let j = 0; j <= N; j++)
    for (let i = 0; i <= N; i++) {
      const k = j * (N + 1) + i
      const y = rel(grid[k])
      hgt[k] = y
      positions.set([(i / N - 0.5) * SIZE, y * HEIGHT, (j / N - 0.5) * SIZE], k * 3)
      color.setHSL(0.62 - 0.52 * y, 0.8, 0.28 + 0.25 * y)
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

  // Contours by marching squares on the height field, at evenly spaced heights
  const seg: number[] = []
  const px = (i: number) => (i / N - 0.5) * SIZE
  for (let l = 1; l <= levels; l++) {
    const level = (l - 0.5) / levels
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const a = hgt[j * (N + 1) + i]
        const b = hgt[j * (N + 1) + i + 1]
        const c = hgt[(j + 1) * (N + 1) + i + 1]
        const d = hgt[(j + 1) * (N + 1) + i]
        const pts: number[] = []
        const cross = (v0: number, v1: number, x0: number, z0: number, x1: number, z1: number) => {
          if (v0 < level === v1 < level) return
          const f = (level - v0) / (v1 - v0)
          pts.push(px(x0 + (x1 - x0) * f), px(z0 + (z1 - z0) * f))
        }
        cross(a, b, i, j, i + 1, j)
        cross(b, c, i + 1, j, i + 1, j + 1)
        cross(c, d, i + 1, j + 1, i, j + 1)
        cross(d, a, i, j + 1, i, j)
        for (let k = 0; k + 3 < pts.length; k += 4)
          seg.push(pts[k], level * HEIGHT + 0.012, pts[k + 1], pts[k + 2], level * HEIGHT + 0.012, pts[k + 3])
      }
  }
  const contours = new THREE.BufferGeometry()
  contours.setAttribute('position', new THREE.BufferAttribute(new Float32Array(seg), 3))
  return { F, rx, rz, cap, min, toWorld, fromWorld, geometry, contours }
}

/** The coloured surface with its contour lines. `onPick` receives the tapped parameter values. */
export function SurfaceMesh({
  surface,
  onPick,
  wire = true,
}: {
  surface: Surface
  onPick?: (x: number, z: number) => void
  wire?: boolean
}) {
  useEffect(
    () => () => {
      surface.geometry.dispose()
      surface.contours.dispose()
    },
    [surface],
  )
  const pick = (e: ThreeEvent<MouseEvent>) => {
    if (!onPick || e.delta > 6) return
    e.stopPropagation()
    const q = surface.fromWorld(e.point)
    onPick(q.x, q.z)
  }
  return (
    <>
      <mesh geometry={surface.geometry} onClick={pick}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.55} metalness={0.05} />
      </mesh>
      {wire && (
        <mesh geometry={surface.geometry} position={[0, 0.004, 0]}>
          <meshBasicMaterial wireframe color="#ffffff" transparent opacity={0.05} />
        </mesh>
      )}
      <lineSegments geometry={surface.contours}>
        <lineBasicMaterial color="#f8fafc" transparent opacity={0.4} />
      </lineSegments>
    </>
  )
}

/** A ball that rolls on a surface and leaves a trail. The simulation moves x and z; the mesh follows. */
export interface Runner {
  color: string
  trail: Float32Array
  count: number
  max: number
  x: number
  z: number
  gone: boolean
}

export function makeRunner(color: string, x: number, z: number, max = 1500): Runner {
  return { color, trail: new Float32Array(max * 3), count: 0, max, x, z, gone: false }
}

/** Move the runner and extend its trail (the trail stops growing when it is full). */
export function moveRunner(r: Runner, surface: Surface, x: number, z: number, lift = 0.05) {
  r.x = x
  r.z = z
  if (r.count < r.max) {
    const v = surface.toWorld(x, z, lift)
    r.trail.set([v.x, v.y, v.z], r.count * 3)
    r.count++
  }
}

export function RunnerMesh({ runner, surface, radius = 0.15 }: { runner: Runner; surface: Surface; radius?: number }) {
  const mesh = useRef<THREE.Mesh>(null)
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(runner.trail, 3))
    g.setDrawRange(0, 0)
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: runner.color }))
  }, [runner])
  useEffect(() => () => line.geometry.dispose(), [line])
  useFrame((_, dt) => {
    line.geometry.setDrawRange(0, runner.count)
    line.geometry.attributes.position.needsUpdate = true
    if (!mesh.current) return
    mesh.current.position.lerp(surface.toWorld(runner.x, runner.z, radius), Math.min(1, dt * 14))
    mesh.current.visible = !runner.gone
  })
  return (
    <>
      <primitive object={line} />
      <mesh ref={mesh} position={surface.toWorld(runner.x, runner.z, radius)}>
        <sphereGeometry args={[radius, 20, 14]} />
        <meshStandardMaterial color={runner.color} emissive={runner.color} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </>
  )
}

/** A thin vertical pole with nothing on top; put a Label3D above it. */
export function Pole({ at, height = 1, color = '#f8fafc' }: { at: THREE.Vector3; height?: number; color?: string }) {
  return (
    <mesh position={[at.x, at.y + height / 2, at.z]}>
      <cylinderGeometry args={[0.012, 0.012, height, 6]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}
