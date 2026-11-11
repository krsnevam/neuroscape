import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Label3D from '../../../components/Label3D'
import LabShell from '../../../ui/lab/LabShell'
import { useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { createSom, gauss, hits, quantError, rng, somStep, topoError, umatrix, type Som, type Vec } from '../../../engine'
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

type MapView = 'colours' | 'distance' | 'hits' | 'planes'
const grey = (v: number) => {
  const g = Math.round(Math.min(1, Math.max(0, v)) * 255)
  return `rgb(${g},${g},${g})`
}
const planeNames = ['red', 'green', 'blue']
/** One input's weight as brightness of that input's own colour. */
const planeTint = (k: number, v: number) => {
  const x = Math.min(1, Math.max(0, v))
  const c = [0.05 + 0.18 * x, 0.05 + 0.18 * x, 0.07 + 0.18 * x]
  c[k] = 0.1 + 0.9 * x
  return css(c)
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
  const [mapView, setMapView] = useState<MapView>('colours')
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
  const maxHits = Math.max(1, ...h)
  const u = umatrix(sim.som)
  const maxU = Math.max(1e-6, ...u)
  const minU = Math.min(...u)
  const border = u.filter((v) => v > 0.5 * maxU).length
  const busiest = h.indexOf(maxHits)
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
          <p>
            {mapView === 'distance'
              ? `Distance map: each cell is shaded by how far its colour is from its grid neighbours (from ${minU.toFixed(2)} to ${maxU.toFixed(2)} now). The darkest cells, ${border} of them, are the walls between groups that differ most; the light patches are the clusters. Borders between similar colours are fainter.`
              : mapView === 'hits'
                ? `Hit histogram: the number in a cell is how many of the ${sim.data.length} pixels that neuron wins. The busiest neuron (row ${Math.floor(busiest / COLS) + 1}, column ${(busiest % COLS) + 1}) wins ${maxHits}; ${dead} win none.`
                : mapView === 'planes'
                  ? 'Weight planes: the same 8 × 8 map drawn three times, once for each input. Bright means that neuron holds a large weight for that input. Two planes that look alike mean those two inputs carry the same information.'
                  : 'The small map shows the colour each neuron holds. Use "Map view" to read it the way an analyst does: distances, hits and weight planes.'}
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
          <Group title="Map view">
            <Seg
              value={mapView}
              onChange={setMapView}
              options={[
                { value: 'colours', label: 'Colours' },
                { value: 'distance', label: 'Distance map' },
                { value: 'hits', label: 'Hits' },
                { value: 'planes', label: 'Weight planes' },
              ]}
            />
            <p className="text-[11px] text-slate-500">
              {mapView === 'colours'
                ? 'The colour each neuron holds.'
                : mapView === 'distance'
                  ? 'Light: this neuron is close to its neighbours. Dark: far, a border between clusters.'
                  : mapView === 'hits'
                    ? 'How many pixels each neuron wins. 0 is a dead neuron.'
                    : 'One grid per input: the red, green and blue weight of every neuron.'}
            </p>
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
        <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">
          {mapView === 'colours' ? 'The map' : mapView === 'distance' ? 'Distance map' : mapView === 'hits' ? 'Hit histogram' : 'Weight planes'} · 8 × 8 neurons
        </span>
        {mapView === 'planes' ? (
          <div className="flex gap-2">
            {planeNames.map((name, k) => (
              <div key={name} className="flex flex-col gap-0.5">
                <div className="grid grid-cols-8 gap-px">
                  {sim.som.w.map((w, i) => (
                    <div key={i} className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" style={{ background: planeTint(k, w[k]) }} />
                  ))}
                </div>
                <span className="text-[9px] text-slate-400">{name} weight</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {sim.som.w.map((w, i) => {
              const big = mapView !== 'colours'
              // Square root stretches the lighter end so weaker borders are still visible
              const shade = 1 - Math.sqrt((u[i] - minU) / Math.max(1e-6, maxU - minU))
              return (
                <div
                  key={i}
                  className={`grid place-items-center rounded-[2px] font-mono ${
                    big ? 'h-5 w-5 text-[8px] sm:h-6 sm:w-6 sm:text-[9px]' : 'h-4 w-4 text-[9px] text-white/70 sm:h-5 sm:w-5'
                  }`}
                  style={{
                    background:
                      mapView === 'colours'
                        ? css(w)
                        : mapView === 'distance'
                          ? grey(0.06 + 0.94 * shade)
                          : `rgba(56,189,248,${0.08 + 0.92 * (h[i] / maxHits)})`,
                    color: mapView === 'hits' ? (h[i] / maxHits > 0.55 ? '#020617' : '#e2e8f0') : undefined,
                  }}
                >
                  {mapView === 'hits' ? h[i] : mapView === 'colours' && h[i] === 0 ? '×' : ''}
                </div>
              )
            })}
          </div>
        )}
        <span className="text-[9px] text-slate-500">
          {mapView === 'colours'
            ? '× = dead neuron'
            : mapView === 'distance'
              ? 'dark = far from neighbours = cluster border'
              : mapView === 'hits'
                ? 'pixels won by each neuron'
                : 'bright = large weight for that input'}
        </span>
      </div>
    </LabShell>
  )
}
