import { drawAxes, drawCurve, dot, makePlot, type Plot } from '../../ui/lab/Canvas2D'
import { actFn, boundaryLine, CLASSES, decode, encode, forward, HIDDEN, lossOf, type Grads, type Mango, type Net, type Pass } from './sim'

/** Everything the picture needs for one frame. */
export interface View {
  stage: number
  net: Net
  pass: Pass
  mango: { colour: number; soft: number }
  target: number
  focus: number
  data: Mango[]
  sure: number
  history: { loss: number; acc: number }[]
  /** The last single-example step, so changed connections can flash */
  flash: { g: Grads; at: number } | null
  training: boolean
  t: number
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

export const CLASS_COLORS = ['#4ade80', '#fbbf24', '#f97316']
export const NEURON_COLORS = ['#38bdf8', '#a78bfa', '#f472b6', '#e2e8f0']
const POS = '#2dd4bf'
const NEG = '#fb7185'
const AMBER = '#fbbf24'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const SANS = 'system-ui, -apple-system, Segoe UI, sans-serif'

const f2 = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2))

function label(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  o: { color?: string; size?: number; align?: CanvasTextAlign; base?: CanvasTextBaseline; bold?: boolean; mono?: boolean } = {},
) {
  ctx.font = `${o.bold ? '600 ' : ''}${o.size ?? 11}px ${o.mono ? MONO : SANS}`
  ctx.fillStyle = o.color ?? '#94a3b8'
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.base ?? 'middle'
  ctx.fillText(s, x, y)
}

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** Green when raw, yellow when ripe, brown when it has gone too far. */
export function mangoColour(c: number) {
  const stops: [number, number[]][] = [
    [0, [47, 143, 58]],
    [5, [196, 196, 58]],
    [8, [246, 178, 27]],
    [10, [150, 88, 26]],
  ]
  const v = Math.max(0, Math.min(10, c))
  let i = 0
  while (i < stops.length - 2 && v > stops[i + 1][0]) i++
  const [a, ca] = stops[i]
  const [b, cb] = stops[i + 1]
  const k = (v - a) / (b - a)
  return `rgb(${ca.map((x, j) => Math.round(x + (cb[j] - x) * k)).join(',')})`
}

function drawMango(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, colour: number, soft: number, t: number) {
  const s = Math.max(0, Math.min(10, soft)) / 10
  const wob = 1 + Math.sin(t * 2.2) * 0.012 * (1 + 3 * s)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-0.35)
  ctx.beginPath()
  ctx.ellipse(0, 0, size * (1 + 0.12 * s) * wob, size * (0.72 - 0.1 * s) / wob, 0, 0, Math.PI * 2)
  ctx.fillStyle = mangoColour(colour)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(-size * 0.3, -size * 0.22, size * 0.32, size * 0.14, -0.3, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fill()
  // soft mangoes bruise
  if (s > 0.7 || colour > 8.5) {
    ctx.fillStyle = 'rgba(60,30,10,0.45)'
    for (const [dx, dy, r] of [[0.35, 0.18, 0.11], [-0.1, 0.3, 0.08], [0.55, -0.12, 0.07]]) {
      ctx.beginPath()
      ctx.arc(size * dx, size * dy, size * r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.strokeStyle = '#3f6212'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(size * 0.95, -size * 0.1)
  ctx.lineTo(size * 1.15, -size * 0.3)
  ctx.stroke()
  ctx.restore()
}

/* ---------------- the network, always on screen ---------------- */

function drawNetwork(ctx: CanvasRenderingContext2D, b: Box, v: View) {
  const { net, pass, stage, t } = v
  const xin = b.x + b.w * 0.15
  const xh = b.x + b.w * 0.5
  const xo = b.x + b.w * 0.8
  const top = b.y + 44
  const bottom = b.y + b.h - 40
  const span = bottom - top
  const mid = (top + bottom) / 2
  const inY = (i: number) => mid + (i - 0.5) * span * 0.36
  const hidY = (j: number) => top + ((j + 0.5) / HIDDEN) * span
  const outY = (k: number) => top + ((k + 0.5) / 3) * span
  const r = Math.max(10, Math.min(19, span / 13))

  const lit1 = (j: number) => (stage === 1 || stage === 2 ? j === v.focus : stage === 3 || stage >= 6)
  const lit2 = stage >= 4
  const back = stage === 6

  const edge = (x1: number, y1: number, x2: number, y2: number, w: number, lit: boolean, signal: number, blame: number, seed: number, dw: number) => {
    ctx.strokeStyle = rgba(w >= 0 ? POS : NEG, lit ? 0.75 : 0.12)
    ctx.lineWidth = 0.6 + 2.6 * Math.min(1, Math.abs(w) / 2.5)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
    if (dw !== 0) {
      // this connection has just been changed by a learning step
      ctx.strokeStyle = rgba(dw > 0 ? '#4ade80' : '#f87171', Math.min(0.95, Math.abs(dw)))
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    if (!lit || stage === 5) return
    const phase = (t * 0.55 + seed * 0.173) % 1
    if (!back || !v.training) {
      const size = 1.6 + 3 * Math.min(1, Math.abs(signal))
      dot(ctx, x1 + (x2 - x1) * phase, y1 + (y2 - y1) * phase, size, rgba(signal >= 0 ? POS : NEG, 0.95))
    }
    if (back) {
      const q = 1 - ((t * 0.55 + seed * 0.31) % 1)
      dot(ctx, x1 + (x2 - x1) * q, y1 + (y2 - y1) * q, 1.6 + 3.2 * Math.min(1, Math.abs(blame) * 2), rgba(AMBER, 0.95))
    }
  }

  const fade = v.flash ? Math.max(0, 1 - (t - v.flash.at) / 1.8) : 0
  const maxG = v.flash ? Math.max(1e-6, ...v.flash.g.W1.flat().map(Math.abs), ...v.flash.g.W2.flat().map(Math.abs)) : 1
  // sensitivities for the backward pulses
  const s2 = pass.a2.map((a, k) => a - (k === v.target ? 1 : 0))
  const s1 = pass.n1.map((n, j) => actFn[net.act].d(n, pass.a1[j]) * s2.reduce((sum, s, k) => sum + net.W2[k][j] * s, 0))

  for (let j = 0; j < HIDDEN; j++)
    for (let i = 0; i < 2; i++) {
      const dw = v.flash && fade > 0 ? (-v.flash.g.W1[j][i] / maxG) * fade : 0
      edge(xin + r, inY(i), xh - r, hidY(j), net.W1[j][i], lit1(j), net.W1[j][i] * pass.p[i], s1[j], j * 2 + i, dw)
    }
  for (let k = 0; k < 3; k++)
    for (let j = 0; j < HIDDEN; j++) {
      const dw = v.flash && fade > 0 ? (-v.flash.g.W2[k][j] / maxG) * fade : 0
      edge(xh + r, hidY(j), xo - r, outY(k), net.W2[k][j], lit2, net.W2[k][j] * pass.a1[j], s2[k], 11 + k * 4 + j, dw)
    }

  // weight labels on the neuron in focus
  if (stage === 1) {
    for (let i = 0; i < 2; i++) {
      const x = xin + r + (xh - xin - 2 * r) * 0.38
      const y = inY(i) + (hidY(v.focus) - inY(i)) * 0.38
      label(ctx, `w${i === 0 ? '₁' : '₂'} = ${f2(net.W1[v.focus][i])}`, x, y - 9, { color: '#e2e8f0', mono: true, align: 'center' })
    }
    label(ctx, `b = ${f2(net.b1[v.focus])}`, xh, hidY(v.focus) + r + 11, { color: '#e2e8f0', mono: true, align: 'center' })
  }

  const node = (x: number, y: number, fill: string, ring: string, text: string, alpha: number, ringW = 1.5, radius = r) => {
    ctx.globalAlpha = alpha
    dot(ctx, x, y, radius, '#0f172a')
    dot(ctx, x, y, radius, fill)
    ctx.strokeStyle = ring
    ctx.lineWidth = ringW
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.stroke()
    label(ctx, text, x, y + 0.5, { color: '#f8fafc', mono: true, size: radius > 15 ? 11 : 10, align: 'center' })
    ctx.globalAlpha = 1
  }

  const names = ['colour', 'softness']
  for (let i = 0; i < 2; i++) {
    node(xin, inY(i), rgba('#64748b', 0.35), stage === 0 ? '#f8fafc' : '#64748b', f2(pass.p[i]), 1, stage === 0 ? 2.5 : 1.5)
    label(ctx, `p${i === 0 ? '₁' : '₂'} ${names[i]}`, xin, inY(i) - r - 9, { align: 'center', color: '#cbd5e1' })
  }
  for (let j = 0; j < HIDDEN; j++) {
    const a = pass.a1[j]
    const on = stage >= 3 || ((stage === 1 || stage === 2) && j === v.focus)
    const focused = (stage === 1 || stage === 2) && j === v.focus
    node(xh, hidY(j), rgba(a >= 0 ? POS : NEG, 0.15 + 0.6 * Math.min(1, Math.abs(a))), NEURON_COLORS[j], f2(a), stage === 0 ? 0.3 : on ? 1 : 0.4, focused ? 3 : 1.8, focused ? r + 3 : r)
  }
  const win = decode(pass.a2, v.sure)
  for (let k = 0; k < 3; k++) {
    const on = stage >= 4
    node(xo, outY(k), rgba(CLASS_COLORS[k], 0.12 + 0.75 * pass.a2[k]), on && k === win.k ? '#f8fafc' : CLASS_COLORS[k], `${Math.round(pass.a2[k] * 100)}%`, on ? 1 : 0.3, on && k === win.k ? 3 : 1.5)
    ctx.globalAlpha = on ? 1 : 0.35
    label(ctx, CLASSES[k], xo + r + 7, outY(k) - (stage >= 5 && k === v.target ? 6 : 0), { color: CLASS_COLORS[k], bold: true })
    if (stage >= 5 && stage <= 6 && k === v.target) label(ctx, 'target', xo + r + 7, outY(k) + 8, { color: '#e2e8f0', size: 10 })
    ctx.globalAlpha = 1
  }

  label(ctx, 'input p', xin, bottom + 22, { align: 'center', size: 10 })
  label(ctx, 'hidden layer a¹', xh, bottom + 22, { align: 'center', size: 10 })
  label(ctx, 'output a²', xo, bottom + 22, { align: 'center', size: 10 })
  const caption =
    stage === 6
      ? 'Teal and rose: the signal going forward. Amber: the blame coming back.'
      : stage === 5
        ? 'The answer is compared with the target.'
        : 'Teal: positive weight. Rose: negative. Thicker: larger. Dots: the signal moving.'
  if (b.w > 420) label(ctx, caption, b.x + 12, b.y + 16, { size: 11, color: '#94a3b8' })
}

/* ---------------- the input plane ---------------- */

function drawPlane(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  b: Box,
  v: View,
  o: { lines: number[]; shade?: number; vector?: number; regions?: boolean; wide?: boolean },
): Plot {
  const lo = o.wide ? -3 : 0
  const hi = o.wide ? 13 : 10
  const pl = makePlot(w, h, [lo, hi], [lo, hi], { l: b.x + 40, r: w - (b.x + b.w) + 10, t: b.y + 8, b: h - (b.y + b.h) + 30 })
  const pw = pl.right - pl.left
  const ph = pl.bottom - pl.top
  ctx.save()
  ctx.beginPath()
  ctx.rect(pl.left, pl.top, pw, ph)
  ctx.clip()

  if (o.regions) {
    const N = 34
    const cw = pw / N
    const ch = ph / N
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const c = lo + ((i + 0.5) / N) * (hi - lo)
        const s = hi - ((j + 0.5) / N) * (hi - lo)
        const d = decode(forward(v.net, encode(c, s)).a2)
        ctx.fillStyle = rgba(CLASS_COLORS[d.k], 0.06 + 0.3 * Math.max(0, (d.confidence - 0.34) / 0.66))
        ctx.fillRect(pl.left + i * cw, pl.top + j * ch, cw + 0.6, ch + 0.6)
      }
  }
  if (o.shade !== undefined) {
    const N = 26
    const cw = pw / N
    const ch = ph / N
    const wj = v.net.W1[o.shade]
    ctx.fillStyle = rgba(NEURON_COLORS[o.shade], 0.13)
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const p = encode(lo + ((i + 0.5) / N) * (hi - lo), hi - ((j + 0.5) / N) * (hi - lo))
        if (wj[0] * p[0] + wj[1] * p[1] + v.net.b1[o.shade] > 0) ctx.fillRect(pl.left + i * cw, pl.top + j * ch, cw + 0.6, ch + 0.6)
      }
  }
  if (o.wide) {
    ctx.strokeStyle = 'rgba(226,232,240,0.6)'
    ctx.setLineDash([5, 4])
    ctx.lineWidth = 1.2
    ctx.strokeRect(pl.X(0), pl.Y(10), pl.X(10) - pl.X(0), pl.Y(0) - pl.Y(10))
    ctx.setLineDash([])
  }
  for (const m of v.data) dot(ctx, pl.X(m.colour), pl.Y(m.soft), o.wide ? 2.2 : 3, rgba(CLASS_COLORS[m.label], 0.85))

  for (const j of o.lines) {
    const seg = boundaryLine(v.net.W1[j], v.net.b1[j])
    if (!seg) continue
    // extend well past the plot; the clip trims it
    const [a, c] = seg
    const dx = c[0] - a[0]
    const dy = c[1] - a[1]
    ctx.strokeStyle = NEURON_COLORS[j]
    ctx.lineWidth = j === v.focus && o.shade !== undefined ? 3 : 2
    ctx.beginPath()
    ctx.moveTo(pl.X(a[0] - dx * 4), pl.Y(a[1] - dy * 4))
    ctx.lineTo(pl.X(c[0] + dx * 4), pl.Y(c[1] + dy * 4))
    ctx.stroke()
  }
  if (o.vector !== undefined) {
    const wj = v.net.W1[o.vector]
    const m2 = wj[0] * wj[0] + wj[1] * wj[1]
    if (m2 > 1e-6) {
      const k = -v.net.b1[o.vector] / m2
      const x0 = Math.max(lo + 0.6, Math.min(hi - 0.6, k * wj[0] * 5 + 5))
      const y0 = Math.max(lo + 0.6, Math.min(hi - 0.6, k * wj[1] * 5 + 5))
      const len = 1.7 / Math.sqrt(m2)
      const x1 = pl.X(x0 + wj[0] * len)
      const y1 = pl.Y(y0 + wj[1] * len)
      const ax = pl.X(x0)
      const ay = pl.Y(y0)
      ctx.strokeStyle = '#f8fafc'
      ctx.fillStyle = '#f8fafc'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(x1, y1)
      ctx.stroke()
      const ang = Math.atan2(y1 - ay, x1 - ax)
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x1 - 9 * Math.cos(ang - 0.4), y1 - 9 * Math.sin(ang - 0.4))
      ctx.lineTo(x1 - 9 * Math.cos(ang + 0.4), y1 - 9 * Math.sin(ang + 0.4))
      ctx.fill()
      label(ctx, 'w', x1 + 8 * Math.cos(ang), y1 + 8 * Math.sin(ang), { color: '#f8fafc', bold: true, align: 'center' })
    }
  }
  // the mango in hand
  const mx = pl.X(Math.max(lo, Math.min(hi, v.mango.colour)))
  const my = pl.Y(Math.max(lo, Math.min(hi, v.mango.soft)))
  const pulse = 9 + Math.sin(v.t * 4) * 1.5
  ctx.strokeStyle = '#f8fafc'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(mx, my, pulse, 0, Math.PI * 2)
  ctx.stroke()
  dot(ctx, mx, my, 5, mangoColour(v.mango.colour))
  ctx.restore()

  const ticks = o.wide ? [0, 5, 10] : [0, 2.5, 5, 7.5, 10]
  drawAxes(ctx, pl, { xTicks: ticks, yTicks: ticks, xLabel: 'colour: green → yellow → dark', yLabel: 'softness' })
  return pl
}

function hbar(ctx: CanvasRenderingContext2D, x0: number, y: number, half: number, value: number, scale: number, color: string, h = 14) {
  const len = Math.max(-half, Math.min(half, (value / scale) * half))
  ctx.fillStyle = 'rgba(148,163,184,0.12)'
  ctx.fillRect(x0 - half, y - h / 2, half * 2, h)
  ctx.fillStyle = color
  ctx.fillRect(Math.min(x0, x0 + len), y - h / 2, Math.abs(len), h)
  ctx.fillStyle = '#cbd5e1'
  ctx.fillRect(x0 - 0.5, y - h / 2 - 2, 1, h + 4)
}

/* ---------------- one detail view per stop ---------------- */

function detailEncode(ctx: CanvasRenderingContext2D, b: Box, v: View) {
  const size = Math.min(70, b.w * 0.14, b.h * 0.16)
  drawMango(ctx, b.x + b.w / 2, b.y + size + 18, size, v.mango.colour, v.mango.soft, v.t)
  const rows = [
    { name: 'Colour', raw: v.mango.colour, p: v.pass.p[0], ends: ['green', 'dark yellow'] },
    { name: 'Softness', raw: v.mango.soft, p: v.pass.p[1], ends: ['hard', 'very soft'] },
  ]
  const x0 = b.x + 34
  const x1 = b.x + b.w - 34
  const startY = b.y + size * 2 + 56
  const gap = Math.max(96, (b.y + b.h - startY) / 2)
  rows.forEach((r, i) => {
    const y = startY + i * gap
    label(ctx, `${r.name}: measured ${r.raw.toFixed(1)} on a 0 to 10 scale`, x0, y - 22, { color: '#e2e8f0', size: 12, bold: true })
    const X = (val: number) => x0 + (Math.max(0, Math.min(10, val)) / 10) * (x1 - x0)
    // measured scale
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x1, y)
    ctx.stroke()
    label(ctx, `0 ${r.ends[0]}`, x0, y + 12, { size: 10 })
    label(ctx, `${r.ends[1]} 10`, x1, y + 12, { size: 10, align: 'right' })
    dot(ctx, X(r.raw), y, 6, '#f8fafc')
    // the scale the network receives
    const y2 = y + 40
    ctx.strokeStyle = POS
    ctx.beginPath()
    ctx.moveTo(x0, y2)
    ctx.lineTo(x1, y2)
    ctx.stroke()
    for (const [val, tx] of [[0, '−1'], [5, '0'], [10, '+1']] as [number, string][]) {
      ctx.fillStyle = POS
      ctx.fillRect(X(val) - 0.5, y2 - 4, 1, 8)
      label(ctx, tx, X(val), y2 + 13, { size: 10, align: 'center', color: POS, mono: true })
    }
    // the value travels down from one scale to the other
    const k = (v.t * 0.7 + i * 0.4) % 1
    ctx.strokeStyle = 'rgba(248,250,252,0.35)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(X(r.raw), y)
    ctx.lineTo(X(r.raw), y2)
    ctx.stroke()
    ctx.setLineDash([])
    dot(ctx, X(r.raw), y + (y2 - y) * k, 3, '#f8fafc')
    dot(ctx, X(r.raw), y2, 6, POS)
    label(ctx, `p${i === 0 ? '₁' : '₂'} = (${r.raw.toFixed(1)} − 5) / 5 = ${f2(r.p)}`, x1, y - 22, { color: POS, mono: true, align: 'right', size: 12 })
  })
}

function detailWeights(ctx: CanvasRenderingContext2D, w: number, h: number, b: Box, v: View): Plot {
  const barsH = 118
  const pl = drawPlane(ctx, w, h, { ...b, h: b.h - barsH }, v, { lines: [v.focus], shade: v.focus, vector: v.focus })
  const j = v.focus
  const wj = v.net.W1[j]
  const parts = [
    { name: `w₁p₁ = (${f2(wj[0])})(${f2(v.pass.p[0])})`, val: wj[0] * v.pass.p[0] },
    { name: `w₂p₂ = (${f2(wj[1])})(${f2(v.pass.p[1])})`, val: wj[1] * v.pass.p[1] },
    { name: 'bias b', val: v.net.b1[j] },
    { name: 'net input n', val: v.pass.n1[j] },
  ]
  const scale = Math.max(2, ...parts.map((p) => Math.abs(p.val)))
  const y0 = b.y + b.h - barsH + 22
  const textW = Math.min(190, b.w * 0.42)
  const cx = b.x + textW + (b.w - textW - 60) / 2 + 6
  const half = (b.w - textW - 70) / 2
  parts.forEach((p, i) => {
    const y = y0 + i * 24 + (i === 3 ? 4 : 0)
    const total = i === 3
    label(ctx, p.name, b.x + 6, y, { color: total ? '#f8fafc' : '#cbd5e1', mono: true, size: 11, bold: total })
    hbar(ctx, cx, y, half, p.val, scale, total ? NEURON_COLORS[j] : p.val >= 0 ? POS : NEG, total ? 16 : 12)
    label(ctx, f2(p.val), b.x + b.w - 4, y, { color: total ? '#f8fafc' : '#cbd5e1', mono: true, align: 'right', bold: total })
  })
  return pl
}

function detailActivation(ctx: CanvasRenderingContext2D, w: number, h: number, b: Box, v: View) {
  const relu = v.net.act === 'relu'
  const lin = v.net.act === 'linear'
  const yr: [number, number] = relu || lin ? [-3, 3] : [-1.25, 1.25]
  const pl = makePlot(w, h, [-4, 4], yr, { l: b.x + 44, r: w - (b.x + b.w) + 12, t: b.y + 10, b: h - (b.y + b.h) + 34 })
  if (!relu && !lin) {
    ctx.fillStyle = 'rgba(251,113,133,0.08)'
    ctx.fillRect(pl.left, pl.top, pl.X(-2) - pl.left, pl.bottom - pl.top)
    ctx.fillRect(pl.X(2), pl.top, pl.right - pl.X(2), pl.bottom - pl.top)
    label(ctx, 'saturated', pl.left + 6, pl.bottom - 10, { size: 10, color: '#fda4af' })
    label(ctx, 'saturated', pl.right - 6, pl.top + 10, { size: 10, color: '#fda4af', align: 'right' })
  }
  drawAxes(ctx, pl, { xTicks: [-4, -2, 0, 2, 4], yTicks: relu || lin ? [-3, -1.5, 0, 1.5, 3] : [-1, -0.5, 0, 0.5, 1], xLabel: 'net input n', yLabel: 'output a' })
  for (const k of ['tansig', 'logsig', 'relu', 'linear'] as const)
    if (k !== v.net.act) drawCurve(ctx, pl, actFn[k].f, { color: 'rgba(148,163,184,0.28)', width: 1.2, dash: [4, 4] })
  const col = NEURON_COLORS[v.focus]
  drawCurve(ctx, pl, actFn[v.net.act].f, { color: col, width: 3, glow: true })
  const n = Math.max(-4, Math.min(4, v.pass.n1[v.focus]))
  const a = Math.max(yr[0], Math.min(yr[1], v.pass.a1[v.focus]))
  ctx.strokeStyle = 'rgba(248,250,252,0.4)'
  ctx.setLineDash([4, 4])
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pl.X(n), pl.bottom)
  ctx.lineTo(pl.X(n), pl.Y(a))
  ctx.lineTo(pl.left, pl.Y(a))
  ctx.stroke()
  ctx.setLineDash([])
  dot(ctx, pl.X(n), pl.Y(a), 7 + Math.sin(v.t * 4), '#f8fafc')
  dot(ctx, pl.X(n), pl.Y(a), 4, col)
  label(ctx, `n = ${f2(v.pass.n1[v.focus])}`, pl.X(n), pl.bottom - 8, { color: '#f8fafc', mono: true, align: n > 2 ? 'right' : 'left' })
  label(ctx, `a = ${f2(v.pass.a1[v.focus])}`, pl.left + 8, pl.Y(a) - 9, { color: '#f8fafc', mono: true })
  label(ctx, `${actFn[v.net.act].name}: ${actFn[v.net.act].formula}`, pl.left + 8, pl.top + 26, { color: col, size: 12, bold: true })
}

function detailLayer(ctx: CanvasRenderingContext2D, w: number, h: number, b: Box, v: View): Plot {
  const barsH = 122
  const pl = drawPlane(ctx, w, h, { ...b, h: b.h - barsH }, v, { lines: [0, 1, 2, 3] })
  const y0 = b.y + b.h - barsH + 22
  label(ctx, 'The hidden layer\'s code for this mango, a¹', b.x + 6, y0 - 4, { color: '#e2e8f0', bold: true })
  const cx = b.x + b.w * 0.56
  const half = b.w * 0.3
  const scale = v.net.act === 'relu' || v.net.act === 'linear' ? Math.max(1, ...v.pass.a1.map(Math.abs)) : 1
  for (let j = 0; j < HIDDEN; j++) {
    const y = y0 + 20 + j * 21
    dot(ctx, b.x + 12, y, 5, NEURON_COLORS[j])
    label(ctx, `neuron ${j + 1}`, b.x + 24, y, { color: '#cbd5e1' })
    hbar(ctx, cx, y, half, v.pass.a1[j], scale, NEURON_COLORS[j], 12)
    label(ctx, f2(v.pass.a1[j]), b.x + b.w - 4, y, { color: '#f8fafc', mono: true, align: 'right' })
  }
  return pl
}

function detailDecode(ctx: CanvasRenderingContext2D, b: Box, v: View) {
  const { n2, a2 } = v.pass
  const win = decode(a2, v.sure)
  const ex = n2.map((x) => Math.exp(x))
  const sumEx = ex.reduce((x, y) => x + y, 0)
  const labelW = 74
  const colW = (b.w - labelW - 16) / 3
  const colX = (c: number) => b.x + labelW + c * colW
  const top = b.y + 58
  const rowH = Math.min(64, (b.h - 170) / 3)
  const heads = ['1. Score n²', '2. e to the score', '3. Share = probability']
  heads.forEach((s, c) => label(ctx, s, colX(c) + 6, b.y + 22, { color: '#e2e8f0', bold: true, size: 12 }))
  label(ctx, 'W²a¹ + b²', colX(0) + 6, b.y + 39, { mono: true, size: 10 })
  label(ctx, `total ${sumEx.toFixed(2)}`, colX(1) + 6, b.y + 39, { mono: true, size: 10 })
  label(ctx, 'each ÷ total', colX(2) + 6, b.y + 39, { mono: true, size: 10 })
  const sScale = Math.max(3, ...n2.map(Math.abs))
  const eScale = Math.max(...ex)
  for (let k = 0; k < 3; k++) {
    const y = top + k * rowH + rowH / 2
    if (k === win.k) {
      ctx.strokeStyle = win.confident ? '#f8fafc' : 'rgba(248,250,252,0.4)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(b.x + 2, y - rowH / 2 + 3, b.w - 4, rowH - 6)
    }
    label(ctx, CLASSES[k], b.x + 10, y, { color: CLASS_COLORS[k], bold: true, size: 12 })
    const half = (colW - 70) / 2
    hbar(ctx, colX(0) + 8 + half, y, half, n2[k], sScale, n2[k] >= 0 ? POS : NEG)
    label(ctx, f2(n2[k]), colX(0) + colW - 22, y, { mono: true, color: '#f8fafc', align: 'right' })
    const bw = colW - 70
    ctx.fillStyle = 'rgba(148,163,184,0.12)'
    ctx.fillRect(colX(1) + 8, y - 7, bw, 14)
    ctx.fillStyle = rgba(CLASS_COLORS[k], 0.7)
    ctx.fillRect(colX(1) + 8, y - 7, bw * (ex[k] / eScale), 14)
    label(ctx, ex[k].toFixed(2), colX(1) + colW - 22, y, { mono: true, color: '#f8fafc', align: 'right' })
    ctx.fillStyle = 'rgba(148,163,184,0.12)'
    ctx.fillRect(colX(2) + 8, y - 7, bw, 14)
    ctx.fillStyle = CLASS_COLORS[k]
    ctx.fillRect(colX(2) + 8, y - 7, bw * a2[k], 14)
    // the "sure" level
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(colX(2) + 8 + bw * v.sure, y - 10, 1.5, 20)
    label(ctx, `${(a2[k] * 100).toFixed(0)}%`, colX(2) + colW - 8, y, { mono: true, color: '#f8fafc', align: 'right', bold: true })
    // arrows between the columns
    for (const c of [1, 2]) label(ctx, '→', colX(c) - 8, y, { color: '#94a3b8', align: 'center', size: 14 })
  }
  const y = top + 3 * rowH + 34
  label(ctx, '4. Decode', b.x + 10, y, { color: '#e2e8f0', bold: true, size: 12 })
  if (win.confident) label(ctx, `${win.label}, ${(win.confidence * 100).toFixed(0)}% sure`, b.x + 10, y + 30, { color: CLASS_COLORS[win.k], size: 24, bold: true })
  else label(ctx, `Not sure. Best guess: ${win.label}, ${(win.confidence * 100).toFixed(0)}%`, b.x + 10, y + 30, { color: '#e2e8f0', size: 20, bold: true })
  label(ctx, `White mark: the "sure" level, ${(v.sure * 100).toFixed(0)}%. A seller would call this mango ${CLASSES[v.target]}.`, b.x + 10, y + 58, { size: 11 })
}

function detailError(ctx: CanvasRenderingContext2D, w: number, h: number, b: Box, v: View) {
  const split = b.w > 520
  const left: Box = split ? { ...b, w: b.w * 0.46 } : { ...b, h: b.h * 0.42 }
  const right: Box = split ? { x: b.x + b.w * 0.5, y: b.y, w: b.w * 0.5, h: b.h } : { x: b.x, y: b.y + b.h * 0.46, w: b.w, h: b.h * 0.54 }
  label(ctx, 'Network (solid) against target (outline)', left.x + 6, left.y + 14, { color: '#e2e8f0', bold: true })
  const rowH = Math.min(58, (left.h - 40) / 3)
  for (let k = 0; k < 3; k++) {
    const y = left.y + 44 + k * rowH
    label(ctx, CLASSES[k], left.x + 6, y, { color: CLASS_COLORS[k], bold: true })
    const x0 = left.x + 74
    const bw = left.w - 74 - 52
    ctx.fillStyle = 'rgba(148,163,184,0.12)'
    ctx.fillRect(x0, y - 9, bw, 18)
    ctx.fillStyle = CLASS_COLORS[k]
    ctx.fillRect(x0, y - 9, bw * v.pass.a2[k], 18)
    if (k === v.target) {
      ctx.strokeStyle = '#f8fafc'
      ctx.lineWidth = 2
      ctx.strokeRect(x0, y - 12, bw, 24)
    }
    label(ctx, `${f2(v.pass.a2[k])}  t=${k === v.target ? 1 : 0}`, left.x + left.w - 2, y, { mono: true, align: 'right', color: '#f8fafc', size: 10 })
  }
  const pl = makePlot(w, h, [0, 1], [0, 5], { l: right.x + 40, r: w - (right.x + right.w) + 12, t: right.y + 28, b: h - (right.y + right.h) + 34 })
  label(ctx, 'Cost F = −ln(probability of the true class)', right.x + 6, right.y + 14, { color: '#e2e8f0', bold: true })
  drawAxes(ctx, pl, { xTicks: [0, 0.25, 0.5, 0.75, 1], yTicks: [0, 1, 2, 3, 4, 5], xLabel: 'probability given to the true class', yLabel: 'cost' })
  drawCurve(ctx, pl, (a) => -Math.log(Math.max(0.004, a)), { color: AMBER, width: 2.5, glow: true, from: 0.004 })
  const a = v.pass.a2[v.target]
  const F = lossOf(v.pass.a2, v.target)
  const py = pl.Y(Math.min(5, F))
  ctx.strokeStyle = 'rgba(248,250,252,0.4)'
  ctx.setLineDash([4, 4])
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pl.X(a), pl.bottom)
  ctx.lineTo(pl.X(a), py)
  ctx.lineTo(pl.left, py)
  ctx.stroke()
  ctx.setLineDash([])
  dot(ctx, pl.X(a), py, 7 + Math.sin(v.t * 4), '#f8fafc')
  dot(ctx, pl.X(a), py, 4, CLASS_COLORS[v.target])
  label(ctx, `F = −ln(${f2(a)}) = ${f2(F)}`, pl.X(Math.min(0.55, a)) + 12, Math.max(pl.top + 12, py - 14), { color: '#f8fafc', mono: true, size: 12, bold: true })
}

function detailLearn(ctx: CanvasRenderingContext2D, w: number, h: number, b: Box, v: View): Plot {
  const curveH = Math.max(110, b.h * 0.3)
  const pl = drawPlane(ctx, w, h, { ...b, h: b.h - curveH }, v, { lines: [0, 1, 2, 3], regions: true })
  const c: Box = { x: b.x, y: b.y + b.h - curveH + 8, w: b.w, h: curveH - 8 }
  const n = Math.max(200, v.history.length)
  const cp = makePlot(w, h, [0, n], [0, 1.3], { l: c.x + 40, r: w - (c.x + c.w) + 10, t: c.y + 8, b: h - (c.y + c.h) + 30 })
  drawAxes(ctx, cp, { xTicks: [0, Math.round(n / 2), n], yTicks: [0, 0.5, 1], xLabel: 'passes over all the mangoes', yLabel: 'average cost' })
  if (v.history.length > 1) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(cp.left, cp.top, cp.right - cp.left, cp.bottom - cp.top)
    ctx.clip()
    ctx.strokeStyle = AMBER
    ctx.lineWidth = 2.2
    ctx.beginPath()
    const stride = Math.max(1, Math.floor(v.history.length / 300))
    for (let i = 0; i < v.history.length; i += stride) {
      const y = cp.Y(Math.min(1.3, v.history[i].loss))
      if (i === 0) ctx.moveTo(cp.X(i), y)
      else ctx.lineTo(cp.X(i), y)
    }
    ctx.stroke()
    ctx.restore()
    const last = v.history[v.history.length - 1]
    label(ctx, `cost ${f2(last.loss)} · ${(last.acc * 100).toFixed(0)}% of mangoes right`, cp.right - 6, cp.top + 12, { color: '#f8fafc', mono: true, align: 'right' })
  } else label(ctx, 'Press "Train on all the mangoes" to fill this in', cp.left + 12, (cp.top + cp.bottom) / 2, { color: '#94a3b8' })
  return pl
}

function detailNew(ctx: CanvasRenderingContext2D, w: number, h: number, b: Box, v: View): Plot {
  const foot = 54
  const pl = drawPlane(ctx, w, h, { ...b, h: b.h - foot }, v, { lines: [], regions: true, wide: true })
  const win = decode(v.pass.a2, v.sure)
  const out = v.mango.colour < 0 || v.mango.colour > 10 || v.mango.soft < 0 || v.mango.soft > 10
  const y = b.y + b.h - foot + 26
  label(ctx, `It answers: ${win.label}, ${(win.confidence * 100).toFixed(0)}% sure`, b.x + 8, y, { color: CLASS_COLORS[win.k], size: 16, bold: true })
  label(
    ctx,
    out ? 'This point is outside the dashed box. No training mango was anywhere near it.' : 'Inside the dashed box: among the mangoes it was trained on.',
    b.x + 8,
    y + 22,
    { color: out ? '#fda4af' : '#94a3b8', size: 11 },
  )
  label(ctx, 'Dashed box: where every training mango lay', pl.X(0) + 6, pl.Y(10) - 9, { size: 10, color: '#e2e8f0' })
  return pl
}

/**
 * Draws the whole frame: the network on one side, the current stop's detail on the other.
 * Returns the input plane's plot when one is shown, so taps on it can place the mango.
 */
export function drawJourney(ctx: CanvasRenderingContext2D, w: number, h: number, v: View): Plot | null {
  const wide = w >= 760
  const netBox: Box = wide ? { x: 0, y: 0, w: w * 0.42, h } : { x: 0, y: 0, w, h: h * 0.38 }
  const det: Box = wide ? { x: w * 0.42 + 8, y: 10, w: w * 0.58 - 20, h: h - 20 } : { x: 8, y: h * 0.38 + 4, w: w - 16, h: h * 0.62 - 10 }
  ctx.fillStyle = 'rgba(15,23,42,0.55)'
  ctx.fillRect(det.x - 4, det.y - 4, det.w + 8, det.h + 8)
  drawNetwork(ctx, netBox, v)
  switch (v.stage) {
    case 0:
      detailEncode(ctx, det, v)
      return null
    case 1:
      return detailWeights(ctx, w, h, det, v)
    case 2:
      detailActivation(ctx, w, h, det, v)
      return null
    case 3:
      return detailLayer(ctx, w, h, det, v)
    case 4:
      detailDecode(ctx, det, v)
      return null
    case 5:
      detailError(ctx, w, h, det, v)
      return null
    case 6:
      return detailLearn(ctx, w, h, det, v)
    default:
      return detailNew(ctx, w, h, det, v)
  }
}
