import { useEffect, useReducer, useRef, type CanvasHTMLAttributes } from 'react'

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => void

/**
 * A canvas that fills its parent and calls `draw` every animation frame with CSS-pixel
 * width and height. Labs run their simulation step inside `draw`, so what is on screen is
 * always the live state of the network.
 */
export default function Canvas2D({
  draw,
  className = '',
  ...rest
}: { draw: Draw } & CanvasHTMLAttributes<HTMLCanvasElement>) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (w > 0 && h > 0) {
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr)
          canvas.height = Math.round(h * dpr)
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        drawRef.current(ctx, w, h, now / 1000, Math.min(0.1, (now - last) / 1000))
      }
      last = now
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className={`block h-full w-full ${className}`} {...rest} />
}

/** Re-render the component every `ms` so readouts follow a simulation held in refs. */
export function useTicker(ms = 250) {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const id = setInterval(force, ms)
    return () => clearInterval(id)
  }, [ms])
}

export interface Plot {
  X: (x: number) => number
  Y: (y: number) => number
  ix: (px: number) => number
  iy: (py: number) => number
  left: number
  right: number
  top: number
  bottom: number
  xr: [number, number]
  yr: [number, number]
}

export function makePlot(
  w: number,
  h: number,
  xr: [number, number],
  yr: [number, number],
  pad: { l?: number; r?: number; t?: number; b?: number } = {},
): Plot {
  const left = pad.l ?? 46
  const right = w - (pad.r ?? 14)
  const top = pad.t ?? 14
  const bottom = h - (pad.b ?? 34)
  const X = (x: number) => left + ((x - xr[0]) / (xr[1] - xr[0])) * (right - left)
  const Y = (y: number) => bottom - ((y - yr[0]) / (yr[1] - yr[0])) * (bottom - top)
  const ix = (px: number) => xr[0] + ((px - left) / (right - left)) * (xr[1] - xr[0])
  const iy = (py: number) => yr[0] + ((bottom - py) / (bottom - top)) * (yr[1] - yr[0])
  return { X, Y, ix, iy, left, right, top, bottom, xr, yr }
}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  pl: Plot,
  o: {
    xTicks: number[]
    yTicks: number[]
    xLabel?: string
    yLabel?: string
    xFmt?: (v: number) => string
    yFmt?: (v: number) => string
  },
) {
  ctx.save()
  ctx.font = '11px ui-monospace, monospace'
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(148,163,184,0.14)'
  ctx.fillStyle = '#94a3b8'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const x of o.xTicks) {
    ctx.beginPath()
    ctx.moveTo(pl.X(x), pl.top)
    ctx.lineTo(pl.X(x), pl.bottom)
    ctx.stroke()
    ctx.fillText(o.xFmt ? o.xFmt(x) : String(x), pl.X(x), pl.bottom + 5)
  }
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  for (const y of o.yTicks) {
    ctx.beginPath()
    ctx.moveTo(pl.left, pl.Y(y))
    ctx.lineTo(pl.right, pl.Y(y))
    ctx.stroke()
    ctx.fillText(o.yFmt ? o.yFmt(y) : String(y), pl.left - 6, pl.Y(y))
  }
  ctx.fillStyle = '#64748b'
  if (o.xLabel) {
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText(o.xLabel, pl.right, pl.bottom + 30)
  }
  if (o.yLabel) {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(o.yLabel, pl.left + 6, pl.top + 2)
  }
  ctx.restore()
}

/** Draw y = f(x) across the plot, clipped to the plot area. */
export function drawCurve(
  ctx: CanvasRenderingContext2D,
  pl: Plot,
  f: (x: number) => number,
  o: { color: string; width?: number; dash?: number[]; glow?: boolean; from?: number; to?: number; steps?: number },
) {
  const from = o.from ?? pl.xr[0]
  const to = o.to ?? pl.xr[1]
  const steps = o.steps ?? 160
  ctx.save()
  ctx.beginPath()
  ctx.rect(pl.left, pl.top, pl.right - pl.left, pl.bottom - pl.top)
  ctx.clip()
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const x = from + ((to - from) * i) / steps
    const y = f(x)
    const py = Math.max(pl.top - 40, Math.min(pl.bottom + 40, pl.Y(Number.isFinite(y) ? y : 0)))
    if (i === 0) ctx.moveTo(pl.X(x), py)
    else ctx.lineTo(pl.X(x), py)
  }
  ctx.strokeStyle = o.color
  ctx.lineJoin = 'round'
  if (o.dash) ctx.setLineDash(o.dash)
  if (o.glow) {
    // A wide faint stroke under the line: the look of a glow without shadowBlur, which is slow on phones
    ctx.globalAlpha = 0.22
    ctx.lineWidth = (o.width ?? 2) * 3.2
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  ctx.lineWidth = o.width ?? 2
  ctx.stroke()
  ctx.restore()
}

export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}
