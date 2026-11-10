/** Small 2D drawing helpers shared by the Neuron Lab stations. */

export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
export const SANS = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

export const POS = '#38bdf8'
export const NEG = '#fb7185'
export const signColor = (v: number) => (v >= 0 ? POS : NEG)

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
/** Frame-rate independent smoothing factor: how far to move towards a target this frame. */
export const ease = (dt: number, rate = 10) => 1 - Math.exp(-dt * rate)
/** Signed number with a real minus sign, e.g. −0.50 */
export const num = (v: number, d = 2) => (Object.is(v, -0) ? 0 : v).toFixed(d).replace('-', '−')

export interface TextOpts {
  color?: string
  size?: number
  align?: CanvasTextAlign
  base?: CanvasTextBaseline
  bold?: boolean
  sans?: boolean
  /** shrink the font until the text fits this width */
  maxWidth?: number
}

export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts = {}) {
  let size = o.size ?? 11
  const font = () => `${o.bold ? '600 ' : ''}${size}px ${o.sans ? SANS : MONO}`
  ctx.font = font()
  if (o.maxWidth) {
    while (size > 7 && ctx.measureText(s).width > o.maxWidth) {
      size -= 0.5
      ctx.font = font()
    }
  }
  ctx.fillStyle = o.color ?? '#cbd5e1'
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.base ?? 'alphabetic'
  ctx.fillText(s, x, y)
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 8) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** A titled card on the canvas. */
export function card(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title?: string,
  color = '#94a3b8',
) {
  roundRect(ctx, x, y, w, h, 10)
  ctx.fillStyle = 'rgba(15,23,42,0.55)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(148,163,184,0.16)'
  ctx.lineWidth = 1
  ctx.stroke()
  if (title) text(ctx, title, x + 10, y + 17, { color, size: 11, bold: true, maxWidth: w - 20 })
}

/** Soft glow: a radial gradient disc, cheap on phones. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1,
  dash?: number[],
) {
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  if (dash) ctx.setLineDash(dash)
  ctx.stroke()
  ctx.restore()
}

export function arrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size * 0.55)
  ctx.lineTo(-size, size * 0.55)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

/** Canvas-relative pointer position in CSS pixels. */
export function pointerXY(e: { clientX: number; clientY: number; currentTarget: Element }) {
  const box = e.currentTarget.getBoundingClientRect()
  return { x: e.clientX - box.left, y: e.clientY - box.top }
}
