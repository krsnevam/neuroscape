/** Drawing helpers shared by the Perceptron Arena stations. */
import type { PointerEvent, ReactNode } from 'react'
import { makePlot, type Plot } from '../../../ui/lab/Canvas2D'

export const FONT = '11px ui-monospace, monospace'
export const ease = (x: number) => {
  const c = Math.max(0, Math.min(1, x))
  return c * c * (3 - 2 * c)
}
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
export const sgn = (v: number, d = 2) => (v < 0 ? '−' : '+') + Math.abs(v).toFixed(d)
export const num = (v: number, d = 2) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(d)
export const vec = (v: number[], d = 2) => `[${v.map((x) => num(x, d)).join(', ')}]`

/**
 * A plot whose two axes use the same scale, so right angles on screen are right angles in
 * the data. That matters here: W must look perpendicular to the decision boundary.
 */
export function squarePlot(
  w: number,
  h: number,
  xr: [number, number],
  yr: [number, number],
  pad: { l: number; r: number; t: number; b: number } = { l: 44, r: 12, t: 12, b: 34 },
): Plot {
  const availW = Math.max(40, w - pad.l - pad.r)
  const availH = Math.max(40, h - pad.t - pad.b)
  const s = Math.min(availW / (xr[1] - xr[0]), availH / (yr[1] - yr[0]))
  const extraX = availW - s * (xr[1] - xr[0])
  const extraY = availH - s * (yr[1] - yr[0])
  return makePlot(w, h, xr, yr, {
    l: pad.l + extraX / 2,
    r: pad.r + extraX / 2,
    t: pad.t + extraY / 2,
    b: pad.b + extraY / 2,
  })
}

export function clipToPlot(ctx: CanvasRenderingContext2D, pl: Plot) {
  ctx.beginPath()
  ctx.rect(pl.left, pl.top, pl.right - pl.left, pl.bottom - pl.top)
  ctx.clip()
}

/** An arrow in screen pixels. */
export function arrow(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width = 2.5,
  dash?: number[],
) {
  const len = Math.hypot(x1 - x0, y1 - y0)
  if (len < 1.5) return
  const ux = (x1 - x0) / len
  const uy = (y1 - y0) / len
  const head = Math.min(11, len * 0.45)
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  if (dash) ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1 - ux * head * 0.8, y1 - uy * head * 0.8)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x1 - ux * head - uy * head * 0.5, y1 - uy * head + ux * head * 0.5)
  ctx.lineTo(x1 - ux * head + uy * head * 0.5, y1 - uy * head - ux * head * 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** The line w·p + b = 0, clipped to the plot. Draws nothing when w is zero. */
export function drawBoundary(
  ctx: CanvasRenderingContext2D,
  pl: Plot,
  w: number[],
  b: number,
  o: { color: string; width?: number; dash?: number[]; glow?: boolean },
) {
  const m2 = w[0] * w[0] + w[1] * w[1]
  if (m2 < 1e-12) return
  const m = Math.sqrt(m2)
  const cx = (-b * w[0]) / m2
  const cy = (-b * w[1]) / m2
  const L = (pl.xr[1] - pl.xr[0] + pl.yr[1] - pl.yr[0]) * 4 + Math.abs(b) / m
  const dx = (-w[1] / m) * L
  const dy = (w[0] / m) * L
  ctx.save()
  clipToPlot(ctx, pl)
  ctx.beginPath()
  ctx.moveTo(pl.X(cx - dx), pl.Y(cy - dy))
  ctx.lineTo(pl.X(cx + dx), pl.Y(cy + dy))
  ctx.strokeStyle = o.color
  ctx.lineCap = 'round'
  if (o.dash) ctx.setLineDash(o.dash)
  if (o.glow) {
    ctx.globalAlpha = 0.2
    ctx.lineWidth = (o.width ?? 2.5) * 3.4
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  ctx.lineWidth = o.width ?? 2.5
  ctx.stroke()
  ctx.restore()
}

/** Fill the side of the plot where w·p + b ≥ 0 (the a = 1 side). */
export function shadeSide(ctx: CanvasRenderingContext2D, pl: Plot, w: number[], b: number, fill: string) {
  let poly: [number, number][] = [
    [pl.xr[0], pl.yr[0]],
    [pl.xr[1], pl.yr[0]],
    [pl.xr[1], pl.yr[1]],
    [pl.xr[0], pl.yr[1]],
  ]
  const f = (p: [number, number]) => w[0] * p[0] + w[1] * p[1] + b
  const out: [number, number][] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const c = poly[(i + 1) % poly.length]
    const fa = f(a)
    const fc = f(c)
    if (fa >= 0) out.push(a)
    if (fa >= 0 !== fc >= 0) {
      const k = fa / (fa - fc)
      out.push([a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k])
    }
  }
  poly = out
  if (poly.length < 3) return
  ctx.save()
  ctx.beginPath()
  poly.forEach((p, i) => (i ? ctx.lineTo(pl.X(p[0]), pl.Y(p[1])) : ctx.moveTo(pl.X(p[0]), pl.Y(p[1]))))
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()
}

/** A short text label on a dark backing so it stays readable over the picture. */
export function tag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color = '#e2e8f0',
  align: 'left' | 'center' | 'right' = 'left',
  bounds?: { left: number; right: number; top: number; bottom: number },
) {
  ctx.save()
  ctx.font = FONT
  const tw = ctx.measureText(text).width
  let lx = align === 'left' ? x : align === 'center' ? x - tw / 2 : x - tw
  let ly = y
  if (bounds) {
    lx = clamp(lx, bounds.left + 3, Math.max(bounds.left + 3, bounds.right - tw - 3))
    ly = clamp(ly, bounds.top + 9, bounds.bottom - 9)
  }
  ctx.fillStyle = 'rgba(2,6,23,0.82)'
  ctx.fillRect(lx - 3, ly - 8, tw + 6, 16)
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, lx, ly + 0.5)
  ctx.restore()
}

export interface LegendItem {
  mark: 'dot' | 'square' | 'line' | 'dash' | 'ring' | 'arrow' | 'fill'
  color: string
  label: string
}

/** The scene with a legend strip under it, so the key never covers the data. */
export function Scene({ children, legend, overlay }: { children: ReactNode; legend: LegendItem[]; overlay?: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">{children}</div>
        {overlay}
      </div>
      <ul className="flex shrink-0 flex-wrap gap-x-3 gap-y-0.5 border-t border-white/10 bg-slate-950/70 px-3 py-1.5 text-[10px] leading-tight text-slate-300 sm:text-[11px]">
        {legend.map((it) => (
          <li key={it.label} className="flex items-center gap-1.5">
            {it.mark === 'dot' && <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />}
            {it.mark === 'square' && <span className="h-2.5 w-2.5" style={{ background: it.color }} />}
            {it.mark === 'fill' && <span className="h-2.5 w-4 opacity-40" style={{ background: it.color }} />}
            {it.mark === 'ring' && <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: it.color }} />}
            {it.mark === 'line' && <span className="h-0.5 w-4" style={{ background: it.color }} />}
            {it.mark === 'dash' && <span className="w-4 border-t-2 border-dashed" style={{ borderColor: it.color }} />}
            {it.mark === 'arrow' && <span className="font-mono text-sm leading-none" style={{ color: it.color }}>→</span>}
            {it.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Pointer position in CSS pixels relative to the canvas. */
export function pointerPos(e: PointerEvent<HTMLCanvasElement>): [number, number] {
  const r = e.currentTarget.getBoundingClientRect()
  return [e.clientX - r.left, e.clientY - r.top]
}

/** Index of the nearest of `pts` (screen pixels) within `reach` pixels, or −1. */
export function nearest(pts: [number, number][], x: number, y: number, reach = 22): number {
  let best = -1
  let bd = reach
  pts.forEach((p, i) => {
    const d = Math.hypot(p[0] - x, p[1] - y)
    if (d < bd) {
      bd = d
      best = i
    }
  })
  return best
}
