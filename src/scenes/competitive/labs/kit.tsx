/** Small drawing helpers shared by the Competitive City stations. */

export const MONO = 'ui-monospace, monospace'
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
/** Frame-rate independent easing factor: how much of the gap to close this frame. */
export const ease = (dt: number, speed = 8) => 1 - Math.exp(-dt * speed)

/** One colour per neuron, readable on the dark background. */
export const NEURON_COLORS = ['#38bdf8', '#fbbf24', '#f472b6', '#34d399', '#a78bfa', '#fb923c', '#22d3ee', '#f87171', '#a3e635', '#e879f9']

export function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2,
  dash?: number[],
) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (len < 0.5) return
  const ux = (x2 - x1) / len
  const uy = (y2 - y1) / len
  const head = Math.min(10, len * 0.45) + width
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  if (dash) ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2 - ux * head * 0.7, y2 - uy * head * 0.7)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - ux * head - uy * head * 0.5, y2 - uy * head + ux * head * 0.5)
  ctx.lineTo(x2 - ux * head + uy * head * 0.5, y2 - uy * head - ux * head * 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  o: { color?: string; size?: number; align?: CanvasTextAlign; base?: CanvasTextBaseline; bold?: boolean; sans?: boolean } = {},
) {
  ctx.save()
  ctx.font = `${o.bold ? '600 ' : ''}${o.size ?? 11}px ${o.sans ? 'system-ui, sans-serif' : MONO}`
  ctx.fillStyle = o.color ?? '#94a3b8'
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.base ?? 'middle'
  ctx.fillText(s, x, y)
  ctx.restore()
}

/** A legend row of coloured dots with labels, drawn left to right and wrapped to the width. */
export function legend(
  ctx: CanvasRenderingContext2D,
  items: { color: string; label: string }[],
  x: number,
  y: number,
  maxX: number,
) {
  ctx.save()
  ctx.font = `10px ${MONO}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  let cx = x
  let cy = y
  for (const it of items) {
    const wd = ctx.measureText(it.label).width + 22
    if (cx + wd > maxX && cx > x) {
      cx = x
      cy += 14
    }
    ctx.fillStyle = it.color
    ctx.beginPath()
    ctx.arc(cx + 4, cy, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(it.label, cx + 12, cy)
    cx += wd
  }
  ctx.restore()
  return cy
}

/** Position of a pointer event inside its canvas, in CSS pixels. */
export function pointerXY(e: { clientX: number; clientY: number; currentTarget: Element }) {
  const r = e.currentTarget.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }
}
