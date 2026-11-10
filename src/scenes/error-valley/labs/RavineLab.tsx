import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Label3D from '../../../components/Label3D'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { drawAxes, makePlot, useTicker, type Plot } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider } from '../../../ui/lab/controls'
import { createBp, haganCh12 } from '../../../engine/vlbp'
import { useAppStore } from '../../../store/useAppStore'
import { buildSurface, makeRunner, moveRunner, Pole, RunnerMesh, SIZE, SurfaceMesh, type Runner, type Surface } from './surface'

const { problem } = haganCh12()
const F = (x: number, z: number) => problem.F([x, z])
const MAX_ITS = 3000
/** The local minimum of this surface (found numerically; Hagan quotes the same point). */
const LOCAL = { x: 0.88, z: 38.6 }

type Key = 'sd' | 'mo' | 'vl'
type View = 'book' | 'wide'
interface Racer {
  key: Key
  short: string
  label: string
  color: string
  bp: ReturnType<typeof createBp>
  runner: Runner
  hist: number[]
  alphaHist: number[]
  rejected: number
  rises: number
  status: 'rolling' | 'arrived' | 'stopped' | 'left the map'
}

function makeRacers(start: [number, number], alpha: number, gamma: number, surface: Surface): Racer[] {
  const defs: Pick<Racer, 'key' | 'short' | 'label' | 'color'>[] = [
    { key: 'sd', short: 'SDBP', label: 'Steepest descent', color: '#38bdf8' },
    { key: 'mo', short: 'MOBP', label: 'Momentum', color: '#fbbf24' },
    { key: 'vl', short: 'VLBP', label: 'Variable learning rate', color: '#f472b6' },
  ]
  return defs.map((d) => {
    const bp = createBp(problem, start, { alpha, gamma: d.key === 'sd' ? 0 : gamma, variable: d.key === 'vl' })
    const runner = makeRunner(d.color, start[0], start[1], MAX_ITS + 2)
    moveRunner(runner, surface, start[0], start[1])
    return { ...d, bp, runner, hist: [bp.state.F], alphaHist: [alpha], rejected: 0, rises: 0, status: 'rolling' }
  })
}

function stepRacer(r: Racer, surface: Surface) {
  if (r.status !== 'rolling') return
  const before = r.bp.state.F
  const st = r.bp.step()
  if (st.last === 'rejected') r.rejected++
  if (st.F > before) r.rises++
  const [x, z] = st.x
  const far = (v: number, range: [number, number]) => !Number.isFinite(v) || v < range[0] - (range[1] - range[0]) || v > range[1] + (range[1] - range[0])
  if (far(x, surface.rx) || far(z, surface.rz)) {
    r.status = 'left the map'
    r.runner.gone = true
    return
  }
  r.hist.push(st.F)
  r.alphaHist.push(st.alpha)
  moveRunner(r.runner, surface, x, z)
  if (st.F < 1e-7) r.status = 'arrived'
  else if (st.iterations >= MAX_ITS) r.status = 'stopped'
}

function Stepper({ racers, surface, speed }: { racers: Racer[]; surface: Surface; speed: number }) {
  const acc = useRef(0)
  useFrame((_, dt) => {
    acc.current += Math.min(dt, 0.1) * speed
    let budget = 12
    while (acc.current >= 1 && budget-- > 0) {
      acc.current -= 1
      for (const r of racers) stepRacer(r, surface)
    }
    if (acc.current > 1) acc.current = 0
  })
  return null
}

const sci = (v: number) => (v >= 0.01 ? v.toFixed(3) : v.toExponential(1))

export default function RavineLab() {
  const low = useAppStore((s) => s.quality) === 'low'
  const [view, setView] = useState<View>('book')
  const [alpha, setAlpha] = useState(1)
  const [gamma, setGamma] = useState(0.8)
  const [speed, setSpeed] = useState(30)
  const [start, setStart] = useState<[number, number]>([-4, -4])
  const [run, setRun] = useState(1)
  useTicker(200)

  const surface = useMemo(
    () => buildSurface(F, [-5, 15], view === 'book' ? [-5, 15] : [-5, 45], { capAt: 0.995, pow: 0.55, levels: 12, n: low ? 48 : 72 }),
    [view, low],
  )
  // `run` restarts the race from the same starting point
  const racers = useMemo(() => makeRacers(start, alpha, gamma, surface), [start, alpha, gamma, surface, run])
  const [sd, mo, vl] = racers
  const go = (s: [number, number], a = alpha, v: View = view) => {
    setStart(s)
    setAlpha(a)
    setView(v)
    setRun((r) => r + 1)
  }

  const drawCharts = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const n = Math.max(60, ...racers.map((r) => r.hist.length))
    const half = w / 2
    const series = (pl: Plot, data: number[], color: string, map: (v: number) => number) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.6
      ctx.beginPath()
      const stride = Math.max(1, Math.floor(data.length / 300))
      for (let i = 0; i < data.length; i += stride) {
        const y = Math.max(pl.top, Math.min(pl.bottom, pl.Y(map(data[i]))))
        if (i === 0) ctx.moveTo(pl.X(i), y)
        else ctx.lineTo(pl.X(i), y)
      }
      ctx.stroke()
    }
    const xt = [0, Math.round(n / 2), n]
    // Left: squared error on a log scale
    const pe = makePlot(half, h, [0, n], [-8, 1], { l: 40, r: 6, t: 16, b: 20 })
    drawAxes(ctx, pe, { xTicks: xt, yTicks: [-8, -5, -2, 1], yFmt: (v) => `1e${v}`, yLabel: 'squared error F' })
    for (const r of racers) series(pe, r.hist, r.color, (v) => Math.log10(Math.max(1e-8, v)))
    // Right: VLBP learning rate
    const amax = Math.max(alpha * 2, ...vl.alphaHist) * 1.1
    ctx.save()
    ctx.translate(half, 0)
    const pa = makePlot(half, h, [0, n], [0, amax], { l: 34, r: 8, t: 16, b: 20 })
    drawAxes(ctx, pa, { xTicks: xt, yTicks: [0, amax / 2, amax], yFmt: (v) => v.toFixed(v < 10 ? 1 : 0), yLabel: 'VLBP learning rate α' })
    ctx.strokeStyle = 'rgba(148,163,184,0.6)'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(pa.left, pa.Y(alpha))
    ctx.lineTo(pa.right, pa.Y(alpha))
    ctx.stroke()
    ctx.setLineDash([])
    series(pa, vl.alphaHist, vl.color, (v) => v)
    ctx.restore()
    ctx.fillStyle = '#64748b'
    ctx.font = '10px ui-monospace, monospace'
    ctx.textAlign = 'right'
    ctx.fillText('iteration →', w - 8, h - 3)
  }

  const allDone = racers.every((r) => r.status !== 'rolling')
  const trapped = racers.filter((r) => r.status !== 'left the map' && r.bp.state.x[1] > 8 && r.bp.state.x[0] < 4 && r.hist.length > 150)
  const vlAlpha = vl.bp.state.alpha
  const sdIts = sd.bp.state.iterations
  const sdZig = sd.status === 'rolling' && sdIts > 30 && sd.rises / sdIts > 0.2
  const tell = (r: Racer) =>
    r.status === 'left the map' ? 'left the map' : r.status === 'arrived' ? `arrived in ${r.bp.state.iterations}` : `F ${sci(r.bp.state.F)}`
  let happening
  if (trapped.length >= 2)
    happening = (
      <>
        <p>
          {trapped.map((r) => r.short).join(', ')} rolled into the valley that runs towards the local minimum near w¹₁,₁ = {LOCAL.x}, w²₁,₁ = {LOCAL.z}. Its floor
          never drops below F = 0.093; the true minimum has F = 0.
        </p>
        <p>The valley floor is almost flat, so the gradient is tiny and progress is a crawl. No change of α or γ gets them out. Only a different start does.</p>
      </>
    )
  else if (sd.status === 'left the map')
    happening = <p>SDBP left the map: α = {alpha.toFixed(1)} is so large that one step threw it out of the valley altogether. VLBP rejected the same kind of step {vl.rejected} times and shrank α instead.</p>
  else if (sdZig)
    happening = (
      <>
        <p>
          SDBP is bouncing between the walls of the ravine: its error went up on {sd.rises} of its {sdIts} steps. With a fixed α = {alpha.toFixed(1)} the step that suits
          the flat plateau is too long for the steep walls.
        </p>
        <p>
          MOBP averages the zig-zag away (γ = {gamma.toFixed(2)}): {tell(mo)}. VLBP threw away {vl.rejected} uphill steps, multiplying α by 0.7 each time: {tell(vl)}.
        </p>
      </>
    )
  else if (allDone)
    happening = (
      <p>
        Race over from ({start[0].toFixed(1)}, {start[1].toFixed(1)}). SDBP: {tell(sd)}. MOBP: {tell(mo)}. VLBP: {tell(vl)}, after raising α as high as{' '}
        {Math.max(...vl.alphaHist).toFixed(1)} on the gentle parts and rejecting {vl.rejected} steps.
      </p>
    )
  else
    happening = (
      <>
        <p>
          Iteration {vl.bp.state.iterations}. SDBP: {tell(sd)}. MOBP: {tell(mo)}. VLBP: {tell(vl)}.
        </p>
        <p>
          VLBP&apos;s α is now {vlAlpha.toFixed(2)} (it started at {alpha.toFixed(1)}): every step that lowers the error multiplies α by 1.05
          {vl.rejected > 0 ? `, and ${vl.rejected} steps that raised it by more than 4 % were thrown away, with α × 0.7 and momentum switched off for one step.` : '.'}{' '}
          {vl.bp.state.last === 'rejected' ? 'The last step was rejected.' : ''}
        </p>
      </>
    )

  const minPos = surface.toWorld(10, 1)
  const localPos = surface.toWorld(LOCAL.x, LOCAL.z)
  const startPos = surface.toWorld(start[0], start[1])
  return (
    <LabShell
      labId="ravine"
      happening={happening}
      actions={{
        break: { label: 'Start at (−4, 10): the wrong valley', run: () => go([-4, 10], 1, 'wide') },
        fix: { label: 'Try another start: (−4, −4)', run: () => go([-4, -4], 1, 'book') },
      }}
      panel={
        <>
          <Group title="The race">
            <div className="flex flex-wrap gap-2">
              <Btn tone="go" onClick={() => setRun((r) => r + 1)}>
                Race again
              </Btn>
              <Btn onClick={() => go([-4, -4])}>Start a (−4, −4)</Btn>
              <Btn onClick={() => go([-4, 10])}>Start b (−4, 10)</Btn>
              <Btn tone="warn" onClick={() => go([-4, -4], 2.5)}>
                α = 2.5: zig-zag
              </Btn>
            </div>
            <div className="flex flex-col gap-1.5">
              {racers.map((r) => (
                <div key={r.key} className="flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1.5 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span className="min-w-0 flex-1 truncate text-slate-200">
                    {r.short} <span className="text-slate-500">{r.label}</span>
                  </span>
                  <span className="font-mono text-slate-400">{r.bp.state.iterations} it</span>
                  <span className={`font-mono ${r.status === 'left the map' ? 'text-rose-400' : r.status === 'arrived' ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {r.status === 'left the map' ? 'left the map' : `F ${sci(r.bp.state.F)}`}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Start: w¹₁,₁ = {start[0].toFixed(1)}, w²₁,₁ = {start[1].toFixed(1)}. Tap the surface to move it. VLBP: α = {vlAlpha.toFixed(2)}, {vl.rejected} steps rejected.
            </p>
          </Group>
          <Group title="Training settings">
            <Slider label="Learning rate α (starting value for VLBP)" value={alpha} min={0.1} max={6} step={0.1} onChange={setAlpha} fmt={(v) => v.toFixed(1)} />
            <Slider label="Momentum γ (MOBP and VLBP)" value={gamma} min={0} max={0.95} step={0.05} onChange={setGamma} fmt={(v) => v.toFixed(2)} />
            <Slider label="Speed" value={speed} min={2} max={240} onChange={setSpeed} fmt={(v) => `${v} iterations / s`} />
            <p className="text-[11px] leading-snug text-slate-500">VLBP constants, as in the book: η = 1.05, ρ = 0.7, ζ = 4 %.</p>
          </Group>
          <Group title="The map">
            <Seg
              value={view}
              onChange={setView}
              options={[
                { value: 'book', label: 'Book view: both −5 to 15' },
                { value: 'wide', label: 'Wide: shows the local minimum' },
              ]}
            />
          </Group>
        </>
      }
    >
      <div className="flex h-full flex-col">
        <div className="relative min-h-0 flex-1">
          <Canvas dpr={low ? 1 : [1, 2]} camera={{ position: [-7.5, 7, 8], fov: 45 }} gl={{ antialias: !low }}>
            <color attach="background" args={['#0b1020']} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[-4, 9, 3]} intensity={1.6} />
            <SurfaceMesh surface={surface} wire={!low} onPick={(x, z) => go([x, z])} />
            <Pole at={minPos} height={1.2} />
            <Label3D position={[minPos.x, minPos.y + 1.4, minPos.z]} lines={[{ text: 'global minimum (10, 1), F = 0', size: 10, mono: true }]} />
            {view === 'wide' && (
              <>
                <Pole at={localPos} height={1.2} color="#fda4af" />
                <Label3D position={[localPos.x, localPos.y + 1.4, localPos.z]} lines={[{ text: 'local minimum, F = 0.093', size: 10, mono: true, color: '#fda4af' }]} />
              </>
            )}
            <Pole at={startPos} height={0.7} color="#a7f3d0" />
            <Label3D position={[startPos.x, startPos.y + 0.9, startPos.z]} lines={[{ text: 'start', size: 10, mono: true, color: '#a7f3d0' }]} />
            <Label3D position={[SIZE / 2 + 0.7, 0, 0]} lines={[{ text: `w¹₁,₁: ${surface.rx[0]} → ${surface.rx[1]}`, size: 11, mono: true, color: '#94a3b8' }]} />
            <Label3D position={[0, 0, SIZE / 2 + 0.7]} lines={[{ text: `w²₁,₁: ${surface.rz[0]} → ${surface.rz[1]}`, size: 11, mono: true, color: '#94a3b8' }]} />
            {racers.map((r) => (
              <RunnerMesh key={`${r.key}-${run}-${start[0]}-${start[1]}-${alpha}-${gamma}-${view}`} runner={r.runner} surface={surface} radius={r.key === 'sd' ? 0.15 : 0.13} />
            ))}
            <Stepper racers={racers} surface={surface} speed={speed} />
            <OrbitControls enablePan={false} minDistance={6} maxDistance={20} maxPolarAngle={Math.PI / 2.05} target={[0, 0.8, 0]} />
          </Canvas>
          <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-0.5 rounded-md bg-slate-950/70 px-2 py-1.5 font-mono text-[10px] leading-tight text-slate-300">
            {racers.map((r) => (
              <span key={r.key}>
                <b style={{ color: r.color }}>●</b> {r.short} {r.label.toLowerCase()}
              </span>
            ))}
            <span className="text-slate-500">height = squared error; tap to set the start</span>
          </div>
        </div>
        <div className="h-[30%] max-h-48 min-h-[104px] shrink-0 border-t border-white/10 bg-slate-950/60">
          <Canvas2D draw={drawCharts} />
        </div>
      </div>
    </LabShell>
  )
}
