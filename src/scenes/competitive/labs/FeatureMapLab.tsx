import { useMemo, useRef, useState } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { createSom, gauss, hits, quantError, rng, somStep, topoError, winners, type Som, type Vec } from '../../../engine'
import { clamp, pointerXY, text } from './kit'

type Shape = 'square' | 'ring' | 'blobs' | 'draw'
type Layout = 'grid' | 'chain'
const LAYOUTS: Record<Layout, [number, number]> = { grid: [7, 7], chain: [1, 30] }
const TAU = { slow: 2500, fast: 120 }
const R_MIN = 0.45
const A_MIN = 0.02

function city(shape: Shape): Vec[] {
  const rand = rng(shape.length * 17 + 2)
  const out: Vec[] = []
  if (shape === 'square') for (let i = 0; i < 500; i++) out.push([0.04 + rand() * 0.92, 0.04 + rand() * 0.92])
  else if (shape === 'ring')
    for (let i = 0; i < 500; i++) {
      const a = rand() * Math.PI * 2
      const r = 0.3 + rand() * 0.14
      out.push([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r])
    }
  else if (shape === 'blobs')
    for (let i = 0; i < 500; i++) {
      const c = i % 2 ? [0.27, 0.68] : [0.72, 0.3]
      out.push([clamp(c[0] + gauss(rand) * 0.09, 0.02, 0.98), clamp(c[1] + gauss(rand) * 0.09, 0.02, 0.98)])
    }
  else
    for (let i = 0; i < 140; i++) {
      const u = i / 139
      out.push([0.12 + u * 0.76 + gauss(rand) * 0.02, 0.5 + Math.sin(u * Math.PI * 2) * 0.3 + gauss(rand) * 0.02])
    }
  return out
}

interface Sim {
  som: Som
  data: Vec[]
  t: number
  rand: () => number
  last: { p: Vec; win: number } | null
  radius: number
  alpha: number
  geo: { x0: number; y0: number; side: number }
}

export default function FeatureMapLab() {
  const [shape, setShape] = useState<Shape>('square')
  const [layout, setLayout] = useState<Layout>('grid')
  const [r0, setR0] = useState(3.5)
  const [shrink, setShrink] = useState<'slow' | 'fast'>('slow')
  const [alpha0, setAlpha0] = useState(0.5)
  const [decayAlpha, setDecayAlpha] = useState(true)
  const [version, setVersion] = useState(0)
  const drawing = useRef(false)
  useTicker(300)
  const [rows, cols] = LAYOUTS[layout]

  const sim = useMemo<Sim>(() => {
    const rand = rng(version * 11 + 4)
    return {
      som: createSom(rows, cols, () => [0.1 + rand() * 0.8, 0.1 + rand() * 0.8]),
      data: city(shape),
      t: 0,
      rand,
      last: null,
      radius: r0,
      alpha: alpha0,
      geo: { x0: 0, y0: 0, side: 1 },
    }
    // r0 and alpha0 are read live in the draw loop; changing them does not restart the map
  }, [shape, rows, cols, version])

  const restart = () => setVersion((v) => v + 1)
  const radiusAt = (t: number) => Math.max(Math.min(r0, R_MIN), r0 * Math.exp(-t / TAU[shrink]))
  const alphaAt = (t: number) => (decayAlpha ? Math.max(A_MIN, alpha0 * Math.exp(-t / 3000)) : alpha0)

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    if (sim.data.length) {
      for (let k = 0; k < 12; k++) {
        const p = sim.data[Math.floor(sim.rand() * sim.data.length)]
        sim.radius = radiusAt(sim.t)
        sim.alpha = alphaAt(sim.t)
        const win = somStep(sim.som, p, sim.alpha, sim.radius)
        sim.last = { p, win }
        sim.t++
      }
    }
    const side = Math.max(120, Math.min(w - 24, h - 78))
    const x0 = (w - side) / 2
    const y0 = 46
    sim.geo = { x0, y0, side }
    const X = (v: number) => x0 + v * side
    const Y = (v: number) => y0 + (1 - v) * side

    // The city: blocks and streets
    ctx.fillStyle = '#0d1528'
    ctx.fillRect(x0, y0, side, side)
    ctx.strokeStyle = 'rgba(148,163,184,0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath()
      ctx.moveTo(X(i / 10), y0)
      ctx.lineTo(X(i / 10), y0 + side)
      ctx.moveTo(x0, Y(i / 10))
      ctx.lineTo(x0 + side, Y(i / 10))
      ctx.stroke()
    }
    text(ctx, 'west ← 10 km → east', x0 + side / 2, y0 + side + 12, { align: 'center', size: 10 })
    ctx.save()
    ctx.translate(x0 - 9, y0 + side / 2)
    ctx.rotate(-Math.PI / 2)
    text(ctx, 'south ← 10 km → north', 0, 0, { align: 'center', size: 10 })
    ctx.restore()
    for (const p of sim.data) dot(ctx, X(p[0]), Y(p[1]), 1.6, 'rgba(251,191,36,0.5)')
    if (!sim.data.length) text(ctx, 'drag here to draw where the orders come from', x0 + side / 2, y0 + side / 2, { align: 'center', color: '#fbbf24' })

    // Links between neighbours on the roster
    const { som } = sim
    ctx.strokeStyle = 'rgba(226,232,240,0.75)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        if (c + 1 < cols) {
          ctx.moveTo(X(som.w[i][0]), Y(som.w[i][1]))
          ctx.lineTo(X(som.w[i + 1][0]), Y(som.w[i + 1][1]))
        }
        if (r + 1 < rows) {
          ctx.moveTo(X(som.w[i][0]), Y(som.w[i][1]))
          ctx.lineTo(X(som.w[i + cols][0]), Y(som.w[i + cols][1]))
        }
      }
    ctx.stroke()
    // Hubs, coloured by their place on the roster so a twist is easy to see
    const hue = (i: number) => {
      const r = Math.floor(i / cols)
      const c = i % cols
      return rows === 1 ? `hsl(${180 + (c / (cols - 1)) * 150},85%,62%)` : `hsl(${170 + (c / (cols - 1)) * 140},85%,${42 + (r / (rows - 1)) * 34}%)`
    }
    const last = sim.last
    const wr = last ? Math.floor(last.win / cols) : 0
    const wc = last ? last.win % cols : 0
    const hOf = (i: number) => {
      if (!last) return 0
      if (i === last.win) return 1
      const dr = Math.floor(i / cols) - wr
      const dc = (i % cols) - wc
      const hv = Math.exp(-(dr * dr + dc * dc) / (2 * sim.radius * sim.radius))
      return hv < 0.01 ? 0 : hv
    }
    som.w.forEach((wv, i) => {
      const hv = hOf(i)
      if (hv > 0.05) dot(ctx, X(wv[0]), Y(wv[1]), 4 + hv * 9, `rgba(45,212,191,${0.12 + hv * 0.25})`)
      dot(ctx, X(wv[0]), Y(wv[1]), 4, hue(i))
    })
    if (last) {
      const wv = som.w[last.win]
      ctx.strokeStyle = '#f8fafc'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(X(last.p[0]), Y(last.p[1]))
      ctx.lineTo(X(wv[0]), Y(wv[1]))
      ctx.stroke()
      dot(ctx, X(last.p[0]), Y(last.p[1]), 4 + Math.sin(t * 8), '#fbbf24')
      ctx.beginPath()
      ctx.arc(X(wv[0]), Y(wv[1]), 8, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Schedule meters
    const bar = (y: number, label: string, frac: number, color: string) => {
      const bw = Math.min(150, w * 0.3)
      text(ctx, label, 10, y, { size: 10, color: '#cbd5e1' })
      ctx.fillStyle = 'rgba(148,163,184,0.18)'
      ctx.fillRect(10, y + 8, bw, 5)
      ctx.fillStyle = color
      ctx.fillRect(10, y + 8, bw * clamp(frac, 0, 1), 5)
    }
    bar(9, `neighbourhood radius r = ${sim.radius.toFixed(2)}`, sim.radius / 5, '#2dd4bf')
    const bx = Math.max(w * 0.5, w - 175)
    text(ctx, `learning rate α = ${sim.alpha.toFixed(2)}`, bx, 9, { size: 10, color: '#cbd5e1' })
    ctx.fillStyle = 'rgba(148,163,184,0.18)'
    ctx.fillRect(bx, 17, Math.min(150, w * 0.3), 5)
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(bx, 17, Math.min(150, w * 0.3) * clamp(sim.alpha, 0, 1), 5)
    text(ctx, '● orders   ○ winner   glow = neighbours that learn too', w / 2, 35, { align: 'center', size: 10, color: '#64748b' })

    // The roster: the same neurons laid out as the grid they really are
    const cell = rows === 1 ? Math.min(6, (side * 0.5) / cols) : 8
    const rw = cols * cell
    const rh = rows * cell
    const rx = x0 + side - rw - 6
    const ry = y0 + side - rh - 18
    ctx.fillStyle = 'rgba(2,6,23,0.8)'
    ctx.fillRect(rx - 4, ry - 4, rw + 8, rh + 20)
    som.w.forEach((_, i) => {
      const hv = hOf(i)
      ctx.fillStyle = hue(i)
      ctx.globalAlpha = 0.3 + hv * 0.7
      ctx.fillRect(rx + (i % cols) * cell, ry + Math.floor(i / cols) * cell, cell - 1, cell - 1)
    })
    ctx.globalAlpha = 1
    text(ctx, 'roster', rx + rw / 2, ry + rh + 8, { align: 'center', size: 9 })
  }

  const qe = quantError(sim.som, sim.data)
  const te = topoError(sim.som, sim.data)
  const hit = hits(sim.som, sim.data)
  const dead = hit.filter((v) => v === 0).length
  const S = rows * cols
  const reach = sim.som.w.filter((_, i) => {
    if (!sim.last) return false
    const dr = Math.floor(i / cols) - Math.floor(sim.last.win / cols)
    const dc = (i % cols) - (sim.last.win % cols)
    return i === sim.last.win || Math.exp(-(dr * dr + dc * dc) / (2 * sim.radius * sim.radius)) >= 0.01
  }).length
  const phase = sim.radius > 1 ? 'ordering' : 'convergence'
  const second = sim.last ? winners(sim.som, sim.last.p)[1] : 0
  const happening = (
    <>
      <p>
        {sim.t} orders shown. Each order goes to its nearest hub, the winner. Right now the radius is {sim.radius.toFixed(2)} roster steps, so{' '}
        {reach <= 1 ? 'only the winner learns, exactly like a plain competitive layer' : `${reach} of the ${S} hubs move with every order`}, and
        α is {sim.alpha.toFixed(2)}.
      </p>
      <p>
        {phase === 'ordering'
          ? 'This is the ordering phase: big groups of neighbours move together, which pulls the net flat.'
          : 'This is the convergence phase: hubs move almost alone and settle on their own areas.'}{' '}
        An address is on average {(qe * 10).toFixed(2)} km from its hub.
      </p>
      <p>
        {te > 0.12
          ? `For ${Math.round(te * 100)}% of orders the two nearest hubs are not neighbours on the roster. Look for crossed white links: the map is twisted.`
          : `For ${Math.round((1 - te) * 100)}% of orders the two nearest hubs are roster neighbours (now hubs ${sim.last ? sim.last.win + 1 : 1} and ${second + 1}): the map keeps the layout of the city.`}
      </p>
    </>
  )

  const addPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = pointerXY(e)
    const { x0, y0, side } = sim.geo
    const px = (x - x0) / side
    const py = 1 - (y - y0) / side
    if (px < 0 || px > 1 || py < 0 || py > 1 || sim.data.length > 1500) return
    for (let i = 0; i < 3; i++) sim.data.push([clamp(px + (Math.random() - 0.5) * 0.04, 0, 1), clamp(py + (Math.random() - 0.5) * 0.04, 0, 1)])
  }

  return (
    <LabShell
      labId="feature-map"
      happening={happening}
      actions={{
        break: {
          label: 'Start with a tiny neighbourhood (r = 0.3)',
          run: () => {
            setR0(0.3)
            restart()
          },
        },
        fix: {
          label: 'Start large (r = 4) and shrink slowly',
          run: () => {
            setR0(4)
            setShrink('slow')
            setDecayAlpha(true)
            restart()
          },
        },
      }}
      panel={
        <>
          <Group title="The city and the map">
            <Seg
              label="Where the orders come from"
              value={shape}
              onChange={setShape}
              options={[
                { value: 'square', label: 'Whole city' },
                { value: 'ring', label: 'Ring road' },
                { value: 'blobs', label: 'Twin towns' },
                { value: 'draw', label: 'I will draw' },
              ]}
            />
            {shape === 'draw' && (
              <div className="flex flex-wrap items-center gap-2">
                <Btn onClick={() => { sim.data.length = 0 }}>Clear the orders</Btn>
                <span className="text-[11px] text-slate-500">Drag on the map to add orders.</span>
              </div>
            )}
            <Seg
              label="How the hubs are connected"
              value={layout}
              onChange={setLayout}
              options={[
                { value: 'grid', label: '7 × 7 grid' },
                { value: 'chain', label: 'Chain of 30' },
              ]}
            />
            <Btn onClick={restart}>Restart from random weights</Btn>
          </Group>
          <Group title="The training schedule">
            <Slider label="Starting neighbourhood radius" value={r0} min={0.3} max={5} step={0.1} onChange={setR0} fmt={(v) => `${v.toFixed(1)} roster steps`} />
            <Seg
              label="How fast the neighbourhood shrinks"
              value={shrink}
              onChange={setShrink}
              options={[
                { value: 'slow', label: 'Slowly' },
                { value: 'fast', label: 'Very fast' },
              ]}
            />
            <Slider label="Starting learning rate α" value={alpha0} min={0.05} max={1} step={0.05} onChange={setAlpha0} fmt={(v) => v.toFixed(2)} />
            <Toggle label="Reduce α over time" hint="Large steps first to get in order, small steps later to settle" value={decayAlpha} onChange={setDecayAlpha} />
          </Group>
          <Group title="How good is the map?">
            <Stats>
              <Stat label="Quantisation error" value={`${(qe * 10).toFixed(2)} km`} />
              <Stat label="Topographic error" value={`${Math.round(te * 100)}%`} tone={te > 0.12 ? 'bad' : 'good'} />
              <Stat label="Hubs with no orders" value={`${dead} of ${S}`} tone={dead > S / 8 ? 'warn' : 'plain'} />
              <Stat label="Weights S × R" value={`${S} × 2 = ${S * 2}`} />
              <Stat label="Updated per order" value={`${reach} hubs`} />
              <Stat label="Orders shown" value={sim.t} />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas2D
        draw={onDraw}
        className={shape === 'draw' ? 'cursor-crosshair touch-none' : ''}
        onPointerDown={(e) => {
          if (shape !== 'draw') return
          drawing.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          addPoint(e)
        }}
        onPointerMove={(e) => drawing.current && addPoint(e)}
        onPointerUp={() => (drawing.current = false)}
        onPointerCancel={() => (drawing.current = false)}
      />
    </LabShell>
  )
}
