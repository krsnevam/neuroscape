import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Label3D from '../../../components/Label3D'
import LabShell from '../../../ui/lab/LabShell'
import { useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { createSom, gauss, hits, quantError, rng, somStep, topoError, type Som, type Vec } from '../../../engine'
import { useAppStore } from '../../../store/useAppStore'

const ROWS = 8
const COLS = 8
const CUBE = 5
const COUNT = 700
const cubeEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE, CUBE, CUBE))
const at = (c: Vec): [number, number, number] => [(c[0] - 0.5) * CUBE, (c[1] - 0.5) * CUBE, (c[2] - 0.5) * CUBE]
const css = (c: Vec) => `rgb(${c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)).join(',')})`

/** Six piles of Holi powder, as colours. */
function holi(): Vec[] {
  const rand = rng(14)
  const piles = [[0.93, 0.1, 0.55], [0.98, 0.85, 0.1], [0.1, 0.75, 0.3], [0.1, 0.4, 0.9], [1, 0.5, 0.05], [0.5, 0.15, 0.75]]
  return Array.from({ length: COUNT }, (_, i) =>
    piles[i % piles.length].map((v) => Math.min(1, Math.max(0, v + gauss(rand) * 0.07))),
  )
}

/** Take COUNT random pixels from an image or video frame. */
function samplePixels(source: CanvasImageSource): { data: Vec[]; preview: string } {
  const c = document.createElement('canvas')
  c.width = 96
  c.height = 96
  const ctx = c.getContext('2d')!
  ctx.drawImage(source, 0, 0, 96, 96)
  const px = ctx.getImageData(0, 0, 96, 96).data
  const data = Array.from({ length: COUNT }, () => {
    const k = Math.floor(Math.random() * 96 * 96) * 4
    return [px[k] / 255, px[k + 1] / 255, px[k + 2] / 255]
  })
  return { data, preview: c.toDataURL('image/jpeg', 0.7) }
}

interface Sim {
  som: Som
  data: Vec[]
  t: number
}

function Scene({ sim, neighbourhood }: { sim: Sim; neighbourhood: boolean }) {
  const cloud = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sim.data.flatMap(at)), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sim.data.flat()), 3))
    return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.75 }))
  }, [sim.data])
  const sheet = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ROWS * (COLS - 1) + COLS * (ROWS - 1)) * 6), 3))
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#f8fafc', transparent: true, opacity: 0.7 }))
  }, [])
  const nodes = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])
  useEffect(() => () => { cloud.geometry.dispose(); sheet.geometry.dispose() }, [cloud, sheet])

  useFrame(() => {
    if (sim.data.length) {
      for (let k = 0; k < 20; k++) {
        const alpha = Math.max(0.02, 0.5 * Math.exp(-sim.t / 1500))
        const radius = neighbourhood ? Math.max(0.6, 4 * Math.exp(-sim.t / 1200)) : 0
        somStep(sim.som, sim.data[Math.floor(Math.random() * sim.data.length)], alpha, radius)
        sim.t++
      }
    }
    const pos = sheet.geometry.attributes.position.array as Float32Array
    let k = 0
    const edge = (a: number, b: number) => {
      pos.set(at(sim.som.w[a]), k)
      pos.set(at(sim.som.w[b]), k + 3)
      k += 6
    }
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c
        if (c + 1 < COLS) edge(i, i + 1)
        if (r + 1 < ROWS) edge(i, i + COLS)
      }
    sheet.geometry.attributes.position.needsUpdate = true
    if (nodes.current) {
      sim.som.w.forEach((w, i) => {
        dummy.position.set(...at(w))
        dummy.updateMatrix()
        nodes.current!.setMatrixAt(i, dummy.matrix)
        nodes.current!.setColorAt(i, color.setRGB(w[0], w[1], w[2], THREE.SRGBColorSpace))
      })
      nodes.current.instanceMatrix.needsUpdate = true
      if (nodes.current.instanceColor) nodes.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <>
      <primitive object={cloud} />
      <primitive object={sheet} />
      <instancedMesh ref={nodes} args={[undefined, undefined, ROWS * COLS]}>
        <sphereGeometry args={[0.13, 14, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  )
}

export default function ColoursLab() {
  const low = useAppStore((s) => s.quality) === 'low'
  const [data, setData] = useState<Vec[]>(holi)
  const [source, setSource] = useState<'holi' | 'camera' | 'photo'>('holi')
  const [preview, setPreview] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [neighbourhood, setNeighbourhood] = useState(true)
  const [init, setInit] = useState<'data' | 'corner'>('data')
  const [version, setVersion] = useState(0)
  const file = useRef<HTMLInputElement>(null)
  useTicker(400)

  // `version` restarts training from fresh weights
  const sim = useMemo<Sim>(() => {
    const rand = rng(version * 13 + 5)
    const som = createSom(ROWS, COLS, () =>
      init === 'data' && data.length
        ? data[Math.floor(rand() * data.length)].map((v) => v + (rand() - 0.5) * 0.05)
        : [rand() * 0.04, rand() * 0.04, rand() * 0.04],
    )
    return { som, data, t: 0 }
  }, [data, init, version])

  const openCamera = async () => {
    setSource('camera')
    setMessage('Opening the camera…')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = document.createElement('video')
      video.srcObject = stream
      video.playsInline = true
      await video.play()
      await new Promise((r) => setTimeout(r, 700))
      const s = samplePixels(video)
      stream.getTracks().forEach((t) => t.stop())
      setData(s.data)
      setPreview(s.preview)
      setMessage('')
    } catch {
      setMessage('The camera is not available here. Choose a photo instead.')
    }
  }
  const loadPhoto = async (f: File | undefined) => {
    if (!f) return
    try {
      const s = samplePixels(await createImageBitmap(f))
      setSource('photo')
      setData(s.data)
      setPreview(s.preview)
      setMessage('')
    } catch {
      setMessage('That file could not be read as an image.')
    }
  }

  const h = hits(sim.som, sim.data)
  const dead = h.filter((v) => v === 0).length
  return (
    <LabShell
      labId="colours"
      happening={
        <>
          <p>
            Each step takes one pixel's colour, finds the neuron holding the closest colour (the winner), and pulls it
            {neighbourhood ? ' and its neighbours on the 8 × 8 grid' : ' alone'} towards that colour.
          </p>
          <p>
            Step {sim.t}: learning rate {Math.max(0.02, 0.5 * Math.exp(-sim.t / 1500)).toFixed(2)}
            {neighbourhood ? `, neighbourhood radius ${Math.max(0.6, 4 * Math.exp(-sim.t / 1200)).toFixed(1)} grid cells. Both shrink, so the sheet first unfolds and then settles.` : '. With no neighbourhood the sheet has no reason to stay in one piece.'}
          </p>
          <p>
            {dead > 0 ? `${dead} neurons have not won a single pixel (marked × on the map).` : 'Every neuron wins some pixels: none is dead.'}
          </p>
        </>
      }
      actions={{
        break: {
          label: 'Black corner, neighbourhood off',
          run: () => {
            setInit('corner')
            setNeighbourhood(false)
            setVersion((v) => v + 1)
          },
        },
        fix: { label: 'Switch the neighbourhood on', run: () => { setNeighbourhood(true); setVersion((v) => v + 1) } },
      }}
      panel={
        <>
          <Group title="Where the colours come from">
            <Seg
              value={source}
              onChange={(v) => {
                if (v === 'holi') {
                  setSource('holi')
                  setData(holi())
                  setPreview(null)
                  setMessage('')
                } else if (v === 'camera') void openCamera()
                else file.current?.click()
              }}
              options={[
                { value: 'holi', label: 'Holi powder' },
                { value: 'camera', label: 'Camera' },
                { value: 'photo', label: 'A photo' },
              ]}
            />
            <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void loadPhoto(e.target.files?.[0])} />
            {preview && <img src={preview} alt="The picture the colours were taken from" className="h-20 w-20 rounded-md object-cover" />}
            {message && <p className="text-xs text-amber-300">{message}</p>}
            <p className="text-[11px] text-slate-500">{data.length} pixels, each one a point in the colour cube.</p>
          </Group>
          <Group title="The map">
            <Toggle
              label="Neighbourhood"
              hint="On: the winner's neighbours learn too. Off: a plain competitive layer"
              value={neighbourhood}
              onChange={setNeighbourhood}
            />
            <Seg
              label="Initial weights"
              value={init}
              onChange={setInit}
              options={[
                { value: 'data', label: 'From the data' },
                { value: 'corner', label: 'Black corner' },
              ]}
            />
            <Btn onClick={() => setVersion((v) => v + 1)}>Restart training</Btn>
          </Group>
          <Group title="How good is the map?">
            <Stats>
              <Stat label="Quantisation error" value={quantError(sim.som, sim.data).toFixed(3)} />
              <Stat label="Topographic error" value={`${(topoError(sim.som, sim.data) * 100).toFixed(0)}%`} />
              <Stat label="Dead neurons" value={`${dead} of ${ROWS * COLS}`} tone={dead > 6 ? 'bad' : 'good'} />
              <Stat label="Inputs shown" value={sim.t} />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas dpr={low ? 1 : [1, 2]} camera={{ position: [6, 4.5, 7.5], fov: 45 }} gl={{ antialias: !low }}>
        <color attach="background" args={['#0b1020']} />
        <lineSegments geometry={cubeEdges}>
          <lineBasicMaterial color="#334155" />
        </lineSegments>
        <Label3D position={[CUBE / 2 + 0.4, -CUBE / 2, -CUBE / 2]} lines={[{ text: 'red →', size: 11, mono: true, color: '#fb7185' }]} />
        <Label3D position={[-CUBE / 2, CUBE / 2 + 0.4, -CUBE / 2]} lines={[{ text: 'green ↑', size: 11, mono: true, color: '#34d399' }]} />
        <Label3D position={[-CUBE / 2, -CUBE / 2, CUBE / 2 + 0.4]} lines={[{ text: 'blue →', size: 11, mono: true, color: '#38bdf8' }]} />
        <Scene key={`${version}-${init}-${data.length}-${source}`} sim={sim} neighbourhood={neighbourhood} />
        <OrbitControls enablePan={false} minDistance={5} maxDistance={18} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1 rounded-lg border border-white/10 bg-slate-950/85 p-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">The map · 8 × 8 neurons</span>
        <div className="grid grid-cols-8 gap-0.5">
          {sim.som.w.map((w, i) => (
            <div
              key={i}
              className="grid h-4 w-4 place-items-center rounded-[2px] text-[9px] text-white/70 sm:h-5 sm:w-5"
              style={{ background: css(w) }}
            >
              {h[i] === 0 ? '×' : ''}
            </div>
          ))}
        </div>
        <span className="text-[9px] text-slate-500">× = dead neuron</span>
      </div>
    </LabShell>
  )
}
