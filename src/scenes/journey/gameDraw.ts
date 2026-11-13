import { dot } from '../../ui/lab/Canvas2D'
import { CLASS_COLORS, heatColour, NEURON_COLORS } from './draw'
import { actFn, CLASSES, HIDDEN, type Grads, type Net, type Pass, type Reading } from './sim'

/**
 * The playable journey: one long factory floor. A motor is launched from a sling on the left,
 * its reading travels through the network in the middle, and the answer is fired at one of
 * three bays on the right. Everything is drawn in world units and viewed through a camera.
 */
export const WORLD = { w: 1600, h: 800 }
/** The picture is lifted by this many screen pixels so the commentary strip does not cover the action. */
const LIFT = 50
export const SLING = { x: 175, y: 500 }
const INP = { x: 440, y: [270, 470] }
const HID = { x: 790, y: [150, 290, 430, 570] }
const OUT = { x: 1120, y: [210, 360, 510] }
export const BAY = { x: 1450, y: [190, 360, 530] }

export const PHASES = ['aim', 'encode', 'weigh1', 'sum', 'activate', 'weigh2', 'softmax', 'shot', 'impact', 'learn'] as const
export type Phase = (typeof PHASES)[number]
/** Seconds each phase lasts at normal speed. */
export const DURATION: Record<Phase, number> = { aim: 0, encode: 2.2, weigh1: 2.8, sum: 2, activate: 2.2, weigh2: 2.8, softmax: 2.8, shot: 1.5, impact: 1.8, learn: 2.4 }
/** The part of the floor the camera frames in each phase: [left, right, centre height]. */
const FRAME: Record<Phase, [number, number, number]> = {
  aim: [0, 820, 480],
  encode: [60, 660, 430],
  weigh1: [380, 860, 360],
  sum: [600, 980, 360],
  activate: [620, 1000, 360],
  weigh2: [720, 1190, 360],
  softmax: [980, 1330, 360],
  shot: [1020, 1600, 360],
  impact: [1020, 1600, 360],
  learn: [380, 1250, 360],
}

export interface Flight {
  reading: Reading
  truth: number
  pass: Pass
  winner: number
  hit: boolean
  phase: Phase
  /** progress through the phase, 0 to 1 */
  u: number
  /** how hard the sling was pulled, 0 to 1 */
  power: number
  grads: Grads | null
}

export interface Shard {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  size: number
  color: string
  life: number
}

export interface Scene {
  net: Net
  flight: Flight | null
  /** motors waiting their turn, the first one sits in the sling */
  queue: Reading[]
  /** sling pull in world units while the player is dragging */
  pull: { x: number; y: number } | null
  cam: { x: number; y: number; z: number }
  shards: Shard[]
  /** bays that have been knocked down, with the time it happened */
  fallen: (number | null)[]
  /** hidden neuron the level asks the player to repair, if any */
  broken: number | null
  t: number
}

const POS = '#2dd4bf'
const NEG = '#fb7185'
const AMBER = '#fbbf24'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const SANS = 'system-ui, -apple-system, Segoe UI, sans-serif'
const f2 = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2))
const ease = (u: number) => u * u * (3 - 2 * u)
const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const lerp = (a: number, b: number, u: number) => a + (b - a) * u

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: { color?: string; size?: number; align?: CanvasTextAlign; bold?: boolean; mono?: boolean } = {}) {
  ctx.font = `${o.bold ? '700 ' : ''}${o.size ?? 13}px ${o.mono ? MONO : SANS}`
  ctx.fillStyle = o.color ?? '#cbd5e1'
  ctx.textAlign = o.align ?? 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(s, x, y)
}

/** Where the camera wants to be for a phase, given the canvas size. */
export function cameraFor(phase: Phase, w: number, h: number) {
  const [l, r, cy] = FRAME[phase]
  const z = Math.min(w / (r - l), (h - LIFT * 2) / 640)
  // never show beyond the floor's edges
  const halfW = w / z / 2
  const halfH = h / z / 2
  return {
    x: Math.max(Math.min(halfW, WORLD.w / 2), Math.min(WORLD.w - Math.min(halfW, WORLD.w / 2), (l + r) / 2)),
    y: Math.max(Math.min(halfH, WORLD.h / 2), Math.min(WORLD.h - Math.min(halfH, WORLD.h / 2), cy)),
    z,
  }
}

/** Screen point to world point, for dragging the sling. */
export const toWorld = (sx: number, sy: number, w: number, h: number, cam: Scene['cam']) => ({ x: (sx - w / 2) / cam.z + cam.x, y: (sy - h / 2 + LIFT) / cam.z + cam.y })

/** The motor as a little character: it shakes with vibration and its colour is its bearing temperature. */
function drawMotorBird(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, reading: Reading, t: number, alpha = 1) {
  const shake = Math.min(13, Math.max(0, reading[0])) * 0.045 * r * 0.25
  const cx = x + Math.sin(t * 43 + x) * shake
  const cy = y + Math.cos(t * 57 + y) * shake * 0.6
  ctx.save()
  ctx.globalAlpha = alpha
  // cooling fins
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = r * 0.5
  ctx.beginPath()
  ctx.arc(cx, cy, r * 1.02, 0, Math.PI * 2)
  ctx.stroke()
  dot(ctx, cx, cy, r, heatColour(reading[1]))
  ctx.strokeStyle = 'rgba(15,23,42,0.45)'
  ctx.lineWidth = 2
  for (const k of [-0.5, 0, 0.5]) {
    ctx.beginPath()
    ctx.moveTo(cx - r * 0.85, cy + r * (0.45 + k * 0.3))
    ctx.lineTo(cx + r * 0.85, cy + r * (0.45 + k * 0.3))
    ctx.stroke()
  }
  // shaft
  ctx.fillStyle = '#94a3b8'
  ctx.fillRect(cx + r * 0.9, cy - r * 0.12, r * 0.55, r * 0.24)
  // eyes, worried when things are bad
  const worry = clamp01(Math.max((reading[0] - 3.5) / 5, (reading[1] - 75) / 30))
  for (const s of [-1, 1]) {
    dot(ctx, cx + s * r * 0.32, cy - r * 0.2, r * 0.22, '#f8fafc')
    dot(ctx, cx + s * r * 0.32 + r * 0.05, cy - r * 0.18, r * 0.1, '#0f172a')
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.moveTo(cx + s * r * 0.12, cy - r * (0.5 - worry * 0.18))
    ctx.lineTo(cx + s * r * 0.52, cy - r * (0.5 + worry * 0.14))
    ctx.stroke()
  }
  ctx.restore()
}

function drawFloor(ctx: CanvasRenderingContext2D, t: number) {
  // back wall grid
  ctx.strokeStyle = 'rgba(148,163,184,0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x <= WORLD.w; x += 80) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 660)
    ctx.stroke()
  }
  for (let y = 60; y < 660; y += 80) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(WORLD.w, y)
    ctx.stroke()
  }
  ctx.fillStyle = '#111a2e'
  ctx.fillRect(0, 660, WORLD.w, WORLD.h - 660)
  // conveyor stripes drifting along the floor
  ctx.fillStyle = 'rgba(148,163,184,0.12)'
  for (let x = -60 + ((t * 30) % 60); x < WORLD.w; x += 60) ctx.fillRect(x, 668, 30, 5)
  const zone = (label: string, x: number) => text(ctx, label, x, 698, { size: 13, color: '#64748b', bold: true })
  zone('SENSOR', SLING.x)
  zone('INPUT p', INP.x)
  zone('HIDDEN LAYER', HID.x)
  zone('OUTPUT LAYER', OUT.x)
  zone('DECISION', BAY.x)
}

function drawSling(ctx: CanvasRenderingContext2D, s: Scene) {
  const { x, y } = SLING
  ctx.strokeStyle = '#7c5a3a'
  ctx.lineCap = 'round'
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.moveTo(x, 660)
  ctx.lineTo(x, y + 40)
  ctx.moveTo(x, y + 40)
  ctx.lineTo(x - 26, y - 14)
  ctx.moveTo(x, y + 40)
  ctx.lineTo(x + 26, y - 14)
  ctx.stroke()
  // waiting motors
  s.queue.slice(1, 5).forEach((r, i) => drawMotorBird(ctx, x - 62 - i * 44, 640, 15, r, s.t, 0.9))
  if (s.flight || !s.queue.length) return
  const px = x + (s.pull?.x ?? 0)
  const py = y - 6 + (s.pull?.y ?? 0)
  ctx.strokeStyle = '#3f2d1c'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(x - 26, y - 14)
  ctx.lineTo(px, py)
  ctx.lineTo(x + 26, y - 14)
  ctx.stroke()
  drawMotorBird(ctx, px, py, 24, s.queue[0], s.t)
  if (s.pull) {
    // dotted preview of the launch
    const power = clamp01(Math.hypot(s.pull.x, s.pull.y) / 120)
    for (let k = 1; k <= 9; k++) {
      const p = flightPath(k / 10, power, { x: px, y: py })
      dot(ctx, p.x, p.y, 3, 'rgba(248,250,252,0.5)')
    }
  } else {
    const bob = Math.sin(s.t * 3) * 4
    text(ctx, 'Pull back and let go', x + 4, y - 74 + bob, { size: 15, color: '#f8fafc', bold: true })
    text(ctx, '↙', x - 44, y - 46 + bob, { size: 22, color: '#f8fafc' })
  }
}

/** The motor's arc from the sling to the input layer. */
function flightPath(u: number, power: number, from: { x: number; y: number } = { x: SLING.x, y: SLING.y - 6 }) {
  const to = { x: INP.x - 80, y: 370 }
  const peak = 150 + 190 * power
  const cx = (from.x + to.x) / 2
  const cy = Math.min(from.y, to.y) - peak
  const a = 1 - u
  return { x: a * a * from.x + 2 * a * u * cx + u * u * to.x, y: a * a * from.y + 2 * a * u * cy + u * u * to.y }
}

function wire(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number, bright: number, flash: number) {
  ctx.strokeStyle = rgba(w >= 0 ? POS : NEG, 0.14 + 0.6 * bright)
  ctx.lineWidth = 1 + 4 * Math.min(1, Math.abs(w) / 2.5)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  if (flash !== 0) {
    ctx.strokeStyle = rgba(flash > 0 ? '#4ade80' : '#f87171', Math.min(0.9, Math.abs(flash)))
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
}

/** A spark that starts as `from`, passes the weight gate half way, and arrives as `from × w`. */
function spark(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, u: number, from: number, w: number, showMaths: boolean) {
  const k = ease(clamp01(u))
  const x = lerp(x1, x2, k)
  const y = lerp(y1, y2, k)
  const value = k < 0.5 ? from : from * w
  dot(ctx, x, y, 5 + 11 * Math.min(1, Math.abs(value)), rgba(value >= 0 ? POS : NEG, 0.28))
  dot(ctx, x, y, 3 + 7 * Math.min(1, Math.abs(value)), value >= 0 ? POS : NEG)
  // the gate
  const gx = lerp(x1, x2, 0.5)
  const gy = lerp(y1, y2, 0.5)
  ctx.save()
  ctx.translate(gx, gy)
  ctx.rotate(Math.PI / 4)
  ctx.fillStyle = '#0f172a'
  ctx.strokeStyle = w >= 0 ? POS : NEG
  ctx.lineWidth = 2
  ctx.fillRect(-7, -7, 14, 14)
  ctx.strokeRect(-7, -7, 14, 14)
  ctx.restore()
  if (showMaths) {
    text(ctx, `× ${f2(w)}`, gx, gy - 20, { size: 13, mono: true, color: '#f8fafc', bold: true })
    if (k > 0.55) text(ctx, `${f2(from)} × ${f2(w)} = ${f2(from * w)}`, x, y + 24, { size: 12, mono: true, color: '#e2e8f0' })
    else text(ctx, f2(from), x, y + 22, { size: 12, mono: true, color: '#e2e8f0' })
  }
}

function node(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, ring: string, label: string, ringW = 2.5) {
  dot(ctx, x, y, r, '#0f172a')
  dot(ctx, x, y, r, fill)
  ctx.strokeStyle = ring
  ctx.lineWidth = ringW
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
  text(ctx, label, x, y + 1, { size: 13, mono: true, color: '#f8fafc', bold: true })
}

function drawBay(ctx: CanvasRenderingContext2D, k: number, s: Scene) {
  const x = BAY.x
  const y = BAY.y[k]
  const fallenAt = s.fallen[k]
  const down = fallenAt !== null && s.t - fallenAt < 2.6
  const f = s.flight
  const isTruth = f && (f.phase === 'impact' || f.phase === 'learn') && f.truth === k
  const wrongHit = f && f.phase === 'impact' && !f.hit && f.truth >= 0 && f.winner === k
  const jig = wrongHit ? Math.sin(s.t * 60) * 5 * (1 - f.u) : 0
  if (!down) {
    // a small stack of crates with the instruction painted on
    const rows = [3, 2, 1]
    rows.forEach((n, row) => {
      for (let c = 0; c < n; c++) {
        const bx = x + jig - (n * 34) / 2 + c * 34
        const by = y + 44 - row * 30
        ctx.fillStyle = rgba(CLASS_COLORS[k], 0.24 + 0.1 * row)
        ctx.strokeStyle = CLASS_COLORS[k]
        ctx.lineWidth = 2
        ctx.fillRect(bx, by - 28, 32, 28)
        ctx.strokeRect(bx, by - 28, 32, 28)
      }
    })
  }
  ctx.fillStyle = '#334155'
  ctx.fillRect(x - 62, y + 46, 124, 6)
  text(ctx, CLASSES[k], x, y + 68, { size: 16, bold: true, color: CLASS_COLORS[k] })
  if (isTruth) {
    ctx.strokeStyle = rgba('#f8fafc', 0.5 + 0.4 * Math.sin(s.t * 8))
    ctx.lineWidth = 3
    ctx.setLineDash([8, 6])
    ctx.strokeRect(x - 72, y - 52, 144, 136)
    ctx.setLineDash([])
    text(ctx, "engineer's label", x, y - 64, { size: 12, color: '#f8fafc' })
  }
}

/** Draws the whole floor through the camera. */
export function drawGame(ctx: CanvasRenderingContext2D, w: number, h: number, s: Scene) {
  const { net, flight: f, t } = s
  ctx.save()
  ctx.translate(w / 2, h / 2 - LIFT)
  ctx.scale(s.cam.z, s.cam.z)
  ctx.translate(-s.cam.x, -s.cam.y)

  drawFloor(ctx, t)
  const ph = f?.phase ?? 'aim'
  const idx = PHASES.indexOf(ph)
  const u = f?.u ?? 0
  const pass = f?.pass
  const reached = (p: Phase) => idx > PHASES.indexOf(p) || (idx === PHASES.indexOf(p) && u >= 1)
  const during = (p: Phase) => ph === p

  // the hidden neuron and output the story follows closely
  const star = pass ? pass.n1.reduce((best, n, j) => (Math.abs(n) > Math.abs(pass.n1[best]) ? j : best), 0) : 0

  // learning: how each wire is about to change
  const g = f?.grads
  const maxG = g ? Math.max(1e-6, ...g.W1.flat().map(Math.abs), ...g.W2.flat().map(Math.abs)) : 1
  const flashAmt = during('learn') ? Math.sin(Math.PI * clamp01(u)) : 0

  for (let j = 0; j < HIDDEN; j++)
    for (let i = 0; i < 2; i++)
      wire(ctx, INP.x + 26, INP.y[i], HID.x - 30, HID.y[j], net.W1[j][i], during('weigh1') || during('learn') ? 1 : 0.25, g ? (-g.W1[j][i] / maxG) * flashAmt : 0)
  for (let k = 0; k < 3; k++)
    for (let j = 0; j < HIDDEN; j++)
      wire(ctx, HID.x + 30, HID.y[j], OUT.x - 28, OUT.y[k], net.W2[k][j], during('weigh2') || during('learn') ? 1 : 0.25, g ? (-g.W2[k][j] / maxG) * flashAmt : 0)

  for (let k = 0; k < 3; k++) drawBay(ctx, k, s)
  drawSling(ctx, s)

  // ---- input layer
  const names = ['vibration', 'temperature']
  for (let i = 0; i < 2; i++) {
    const have = pass && (reached('encode') || (during('encode') && u > 0.75))
    node(ctx, INP.x, INP.y[i], 26, rgba('#64748b', 0.35), have ? '#f8fafc' : '#475569', have ? f2(pass.p[i]) : '?')
    text(ctx, `p${i === 0 ? '₁' : '₂'} ${names[i]}`, INP.x, INP.y[i] - 42, { size: 13, color: '#cbd5e1' })
  }

  // ---- hidden layer
  for (let j = 0; j < HIDDEN; j++) {
    const x = HID.x
    const y = HID.y[j]
    let label = ''
    let fill = rgba('#64748b', 0.25)
    if (pass && (during('sum') || reached('sum'))) {
      const n = pass.n1[j]
      const a = pass.a1[j]
      const k = during('sum') ? ease(clamp01(u * 1.4)) : 1
      const shown = reached('activate') ? a : during('activate') ? lerp(n, a, ease(clamp01(u * 1.3))) : n * k
      label = f2(shown)
      fill = rgba(shown >= 0 ? POS : NEG, 0.15 + 0.6 * Math.min(1, Math.abs(shown)))
      // the gauge that fills as the weighted inputs and the bias pour in
      if (during('sum')) {
        ctx.strokeStyle = n >= 0 ? POS : NEG
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.arc(x, y, 38, -Math.PI / 2, -Math.PI / 2 + Math.sign(n || 1) * Math.min(1, Math.abs(n) / 3) * Math.PI * 2 * k, n < 0)
        ctx.stroke()
        const drop = clamp01(u * 2)
        if (drop < 1) {
          dot(ctx, x, lerp(y - 110, y - 34, ease(drop)), 7, AMBER)
          if (j === star) text(ctx, `+ b ${f2(net.b1[j])}`, x + 46, y - 84, { size: 12, mono: true, color: AMBER, bold: true })
        }
      }
    }
    node(ctx, x, y, 30, fill, s.broken === j ? '#f87171' : NEURON_COLORS[j], label, s.broken === j ? 4 : 2.5)
    if (s.broken === j) text(ctx, 'knocked out of place', x, y + 46, { size: 12, color: '#fca5a5', bold: true })

    // activation: a small curve beside the neuron, with the dot sliding from n to a
    if (pass && during('activate')) {
      const bx = x + 46
      const by = y - 26
      const bw = 92
      const bh = 52
      ctx.fillStyle = 'rgba(15,23,42,0.92)'
      ctx.strokeStyle = NEURON_COLORS[j]
      ctx.lineWidth = 1.5
      ctx.fillRect(bx, by, bw, bh)
      ctx.strokeRect(bx, by, bw, bh)
      const fn = actFn[net.act].f
      const top = net.act === 'relu' || net.act === 'linear' ? 3 : 1.15
      const X = (n: number) => bx + ((Math.max(-3.5, Math.min(3.5, n)) + 3.5) / 7) * bw
      const Y = (a: number) => by + bh / 2 - (Math.max(-top, Math.min(top, a)) / top) * (bh / 2 - 5)
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let q = 0; q <= 28; q++) {
        const n = -3.5 + (q / 28) * 7
        if (q === 0) ctx.moveTo(X(n), Y(fn(n)))
        else ctx.lineTo(X(n), Y(fn(n)))
      }
      ctx.stroke()
      const k = ease(clamp01(u * 1.3))
      const nNow = pass.n1[j] * k
      dot(ctx, X(nNow), Y(fn(nNow)), 5.5, AMBER)
      if (j === star) text(ctx, `n ${f2(pass.n1[j])} → a ${f2(pass.a1[j])}`, bx + bw / 2, by + bh + 13, { size: 12, mono: true, color: '#f8fafc', bold: true })
    }
  }

  // ---- output layer with its towers
  const maxScore = pass ? Math.max(1.5, ...pass.n2.map(Math.abs)) : 1
  for (let k = 0; k < 3; k++) {
    const x = OUT.x
    const y = OUT.y[k]
    let label = ''
    let fill = rgba(CLASS_COLORS[k], 0.12)
    const scored = pass && (reached('weigh2') || during('softmax'))
    if (pass && scored) {
      const toProb = reached('softmax') ? 1 : during('softmax') ? ease(clamp01((u - 0.45) * 2.4)) : 0
      label = toProb > 0.5 ? `${Math.round(pass.a2[k] * 100)}%` : f2(pass.n2[k])
      fill = rgba(CLASS_COLORS[k], 0.14 + 0.7 * lerp(0.3, pass.a2[k], toProb))
      // tower: first the raw score, then its share after softmax
      const rise = during('softmax') ? ease(clamp01(u * 2.6)) : 1
      const scoreH = (pass.n2[k] / maxScore) * 52 * rise
      const probH = pass.a2[k] * 104
      const hgt = lerp(scoreH, probH, toProb)
      const tx = x + 44
      ctx.fillStyle = 'rgba(148,163,184,0.15)'
      ctx.fillRect(tx, y - 52, 22, 104)
      ctx.fillStyle = toProb > 0.5 ? CLASS_COLORS[k] : hgt >= 0 ? POS : NEG
      const base = lerp(y, y + 52, toProb)
      ctx.fillRect(tx, Math.min(base, base - hgt), 22, Math.abs(hgt))
      text(ctx, toProb > 0.5 ? 'share' : 'score', tx + 11, y + 64, { size: 11, color: '#94a3b8' })
    }
    const won = f && reached('softmax') && k === f.winner
    node(ctx, x, y, 28, fill, won ? '#f8fafc' : CLASS_COLORS[k], label, won ? 4.5 : 2.5)
    text(ctx, CLASSES[k], x, y - 44, { size: 13, bold: true, color: CLASS_COLORS[k] })
  }

  // ---- the travelling signal
  if (f && pass) {
    if (during('encode')) {
      if (u < 0.62) {
        const p = flightPath(u / 0.62, f.power)
        for (let q = 1; q <= 6; q++) {
          const tr = flightPath(Math.max(0, u / 0.62 - q * 0.035), f.power)
          dot(ctx, tr.x, tr.y, 5 - q * 0.6, `rgba(248,250,252,${0.28 - q * 0.04})`)
        }
        drawMotorBird(ctx, p.x, p.y, 24, f.reading, t)
      } else {
        // the motor is read: two numbers leave it and are scaled on the way in
        const k = ease((u - 0.62) / 0.38)
        const from = flightPath(1, f.power)
        drawMotorBird(ctx, from.x, from.y, 24 * (1 - k * 0.5), f.reading, t, 1 - k)
        for (let i = 0; i < 2; i++) {
          const x = lerp(from.x, INP.x, k)
          const y = lerp(from.y, INP.y[i], k)
          dot(ctx, x, y, 9, '#f8fafc')
          const raw = f.reading[i]
          text(ctx, k < 0.55 ? `${raw.toFixed(1)} ${i === 0 ? 'mm/s' : '°C'}` : `→ ${f2(pass.p[i])}`, x, y + (i === 0 ? -22 : 24), { size: 13, mono: true, color: '#f8fafc', bold: true })
        }
      }
    }
    if (during('weigh1'))
      for (let j = 0; j < HIDDEN; j++)
        for (let i = 0; i < 2; i++) spark(ctx, INP.x + 26, INP.y[i], HID.x - 30, HID.y[j], u * 1.15 - j * 0.04, pass.p[i], net.W1[j][i], j === star)
    if (during('weigh2'))
      for (let k = 0; k < 3; k++)
        for (let j = 0; j < HIDDEN; j++) spark(ctx, HID.x + 30, HID.y[j], OUT.x - 28, OUT.y[k], u * 1.15 - k * 0.05, pass.a1[j], net.W2[k][j], k === f.winner && j === star)
    if (during('shot')) {
      const from = { x: OUT.x + 30, y: OUT.y[f.winner] }
      const to = { x: BAY.x - 10, y: BAY.y[f.winner] + 10 }
      const k = clamp01(u)
      const at = (q: number) => ({ x: lerp(from.x, to.x, q), y: lerp(from.y, to.y, q) - Math.sin(Math.PI * q) * 150 })
      for (let q = 1; q <= 8; q++) {
        const tr = at(Math.max(0, k - q * 0.03))
        dot(ctx, tr.x, tr.y, 9 - q, rgba(CLASS_COLORS[f.winner], 0.5 - q * 0.05))
      }
      const p = at(k)
      dot(ctx, p.x, p.y, 13, CLASS_COLORS[f.winner])
      dot(ctx, p.x, p.y, 6, '#f8fafc')
    }
    if (during('impact')) {
      const x = BAY.x
      const y = BAY.y[f.winner] - 86
      const pop = ease(clamp01(u * 3))
      if (f.truth < 0) text(ctx, '? No such motor in the log', x - 30, y - 8 * pop, { size: 20 * (0.6 + 0.4 * pop), bold: true, color: AMBER })
      else text(ctx, f.hit ? '✔ Right call' : '✘ Wrong call', x, y - 8 * pop, { size: 24 * (0.6 + 0.4 * pop), bold: true, color: f.hit ? '#4ade80' : '#f87171' })
    }
    if (during('learn')) {
      // blame travels back along every wire
      const s2 = pass.a2.map((a, k) => a - (k === f.truth ? 1 : 0))
      const back = (x1: number, y1: number, x2: number, y2: number, blame: number, seed: number) => {
        const q = clamp01(u * 1.2 - seed * 0.02)
        dot(ctx, lerp(x1, x2, ease(q)), lerp(y1, y2, ease(q)), 3 + 9 * Math.min(1, Math.abs(blame) * 1.6), AMBER)
      }
      const half = u < 0.5
      if (half) for (let k = 0; k < 3; k++) for (let j = 0; j < HIDDEN; j++) back(OUT.x - 28, OUT.y[k], HID.x + 30, HID.y[j], s2[k], k + j)
      else if (g) for (let j = 0; j < HIDDEN; j++) for (let i = 0; i < 2; i++) back(HID.x - 30, HID.y[j], INP.x + 26, INP.y[i], g.s1[j], j + i)
    }
  }

  // ---- crates knocked flying
  for (const sh of s.shards) {
    ctx.save()
    ctx.translate(sh.x, sh.y)
    ctx.rotate(sh.rot)
    ctx.globalAlpha = clamp01(sh.life)
    ctx.fillStyle = rgba(sh.color, 0.5)
    ctx.strokeStyle = sh.color
    ctx.lineWidth = 2
    ctx.fillRect(-sh.size / 2, -sh.size / 2, sh.size, sh.size)
    ctx.strokeRect(-sh.size / 2, -sh.size / 2, sh.size, sh.size)
    ctx.restore()
  }
  ctx.restore()
}

/** Crates of a bay thrown outward when the right bay is hit. */
export function burst(k: number): Shard[] {
  const out: Shard[] = []
  const rows = [3, 2, 1]
  rows.forEach((n, row) => {
    for (let c = 0; c < n; c++)
      out.push({
        x: BAY.x - (n * 34) / 2 + c * 34 + 16,
        y: BAY.y[k] + 30 - row * 30,
        vx: 120 + Math.random() * 260,
        vy: -220 - Math.random() * 260 - row * 40,
        rot: 0,
        vr: (Math.random() - 0.5) * 12,
        size: 30,
        color: CLASS_COLORS[k],
        life: 2.2,
      })
  })
  return out
}

export function stepShards(shards: Shard[], dt: number) {
  for (const s of shards) {
    s.vy += 900 * dt
    s.x += s.vx * dt
    s.y += s.vy * dt
    s.rot += s.vr * dt
    if (s.y > 645) {
      s.y = 645
      s.vy *= -0.35
      s.vx *= 0.7
      s.vr *= 0.6
    }
    s.life -= dt
  }
  return shards.filter((s) => s.life > 0)
}
