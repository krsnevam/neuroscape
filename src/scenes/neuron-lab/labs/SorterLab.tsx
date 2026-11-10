import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D from '../../../ui/lab/Canvas2D'
import { Btn, Group, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { hammingRun, hammingWinner } from '../../../engine/hamming'
import { haganHopfield, hopfieldRun } from '../../../engine/hopfield'
import { card, clamp, ease, glow, lerp, line, num, pointerXY, text } from '../draw'

/** Features: shape (+1 round, −1 oblong), texture (+1 smooth, −1 rough), weight (+1 heavy, −1 light). */
const VADA = [1, -1, -1]
const IDLI = [1, 1, -1]
const prototypes = [VADA, IDLI]
const names = ['vada', 'idli']
const C_VADA = '#f59e0b'
const C_IDLI = '#e2e8f0'
const classColor = [C_VADA, C_IDLI]
const features = ['shape', 'texture', 'weight']
const ends = [
  ['oblong', 'round'],
  ['rough', 'smooth'],
  ['light', 'heavy'],
]
const EPS = 0.5
const MAX_STEPS = 30

const presets: { label: string; p: number[] }[] = [
  { label: 'Perfect vada', p: [1, -1, -1] },
  { label: 'Perfect idli', p: [1, 1, -1] },
  { label: 'Squashed vada', p: [-1, -1, -1] },
  { label: 'Heavy soaked idli', p: [1, 1, 1] },
  { label: 'Slightly rough idli', p: [0.8, 0.3, -0.6] },
]

const vecText = (v: number[], d = 2) => `[${v.map((x) => num(x, d)).join(', ')}]`
const near = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-6)

export default function SorterLab() {
  const [p, setP] = useState([-1, -1, -1])
  const [tNow, setTNow] = useState(0)
  const [auto, setAuto] = useState(false)
  const yaw = useRef(0.7)
  const dragX = useRef<number | null>(null)
  const cubeBox = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const shown = useRef({ ham: [0, 0], hop: [0, 0, 0], p: [-1, -1, -1], slide: 0 })

  const ham = useMemo(() => hammingRun(prototypes, p, EPS, MAX_STEPS), [p])
  const hop = useMemo(() => hopfieldRun(haganHopfield.W, haganHopfield.b, p, MAX_STEPS), [p])
  const last = Math.max(ham.history.length, hop.history.length) - 1
  useEffect(() => {
    setTNow(0)
    shown.current.slide = 0
  }, [p])
  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => setTNow((t) => (t < last ? t + 1 : t)), 1000)
    return () => clearInterval(id)
  }, [auto, last])

  // Perceptron (Hagan Ch. 3): W = [0 1 0], b = 0, a = hardlims(n). +1 idli, −1 vada.
  const n = p[1]
  const aPerc = n >= 0 ? 1 : -1
  const onBoundary = Math.abs(n) < 1e-9
  const hamNow = ham.history[Math.min(tNow, ham.history.length - 1)]
  const hopNow = hop.history[Math.min(tNow, hop.history.length - 1)]
  const hamDone = tNow >= ham.history.length - 1
  const hopDone = tNow >= hop.history.length - 1
  const hamWin = hammingWinner(hamNow, 1e-3)
  const hamDead = hamNow.every((v) => v < 1e-3)
  const hopClass = near(hopNow, VADA) ? 0 : near(hopNow, IDLI) ? 1 : -1
  const hopStuck = hop.settled && hopDone && hopClass < 0

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const s = shown.current
    const k = ease(dt, 7)
    s.ham = s.ham.map((v, i) => lerp(v, hamNow[i], k))
    s.hop = s.hop.map((v, i) => lerp(v, hopNow[i], k))
    s.p = s.p.map((v, i) => lerp(v, p[i], k))
    s.slide = lerp(s.slide, 1, ease(dt, 3))
    const wide = w >= 760
    const beltH = wide ? 78 : 58

    // ── Conveyor with the item and its three sensors ───────────
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, beltH - 22, w, 22)
    ctx.strokeStyle = 'rgba(148,163,184,0.35)'
    ctx.lineWidth = 2
    ctx.setLineDash([10, 14])
    ctx.lineDashOffset = -t * 40
    ctx.beginPath()
    ctx.moveTo(0, beltH - 11)
    ctx.lineTo(w, beltH - 11)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineDashOffset = 0
    const ix = lerp(-40, w * (wide ? 0.16 : 0.14), s.slide)
    const iy = beltH - 30
    const smooth = (s.p[1] + 1) / 2
    const size = (wide ? 17 : 13) * (1 + 0.18 * s.p[2])
    const rx = size * (1.25 - 0.25 * ((s.p[0] + 1) / 2) + 0.25 * (1 - (s.p[0] + 1) / 2))
    const ry = size * (0.62 + 0.2 * ((s.p[0] + 1) / 2))
    ctx.beginPath()
    ctx.ellipse(ix, iy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = `rgb(${Math.round(lerp(180, 240, smooth))},${Math.round(lerp(110, 240, smooth))},${Math.round(lerp(40, 232, smooth))})`
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.lineWidth = 1
    ctx.stroke()
    if (smooth < 0.5) {
      // rough items get the crisp speckles and the hole of a vada
      ctx.fillStyle = `rgba(92,45,10,${(1 - smooth * 2).toFixed(2)})`
      for (let q = 0; q < 9; q++) ctx.fillRect(ix + Math.cos(q * 2.4) * rx * 0.62 - 1, iy + Math.sin(q * 2.4) * ry * 0.6 - 1, 2, 2)
      ctx.beginPath()
      ctx.ellipse(ix, iy, rx * 0.22, ry * 0.22, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(17,24,39,${(1 - smooth * 2).toFixed(2)})`
      ctx.fill()
    }
    text(ctx, 'item on the belt', ix, beltH - 4 - (wide ? 62 : 46), { size: 10, color: '#94a3b8', align: 'center' })
    for (let i = 0; i < 3; i++) {
      const sx = w * (wide ? 0.34 + i * 0.22 : 0.4 + i * 0.22)
      const v = p[i]
      line(ctx, sx, 6, sx, 16, '#64748b', 2)
      glow(ctx, sx, 20, 12, v >= 0 ? '#38bdf8' : '#fb7185', 0.5 + 0.3 * Math.sin(t * 6 + i))
      text(ctx, `p${['₁', '₂', '₃'][i]} ${features[i]} = ${num(v, 1)}`, sx, 38, { size: wide ? 11 : 10, color: '#f8fafc', align: 'center', bold: true, maxWidth: w * 0.21 })
      if (wide) text(ctx, `−1 ${ends[i][0]} · +1 ${ends[i][1]}`, sx, 52, { size: 10, color: '#94a3b8', align: 'center' })
    }

    // ── Layout of the three networks ───────────────────────────
    const top = beltH + 6
    const gap = 6
    const cells = wide
      ? [0, 1, 2].map((c) => ({ x: gap + (c * (w - gap)) / 3, y: top, w: (w - gap) / 3 - gap, h: h - top - gap }))
      : [
          { x: gap, y: top, w: w / 2 - gap * 1.5, h: (h - top) * 0.52 - gap },
          { x: w / 2 + gap / 2, y: top, w: w / 2 - gap * 1.5, h: (h - top) * 0.52 - gap },
          { x: gap, y: top + (h - top) * 0.52, w: w - gap * 2, h: (h - top) * 0.48 - gap },
        ]
    const verdict = (c: { x: number; y: number; w: number; h: number }, label: string, color: string) => {
      ctx.fillStyle = 'rgba(2,6,23,0.75)'
      ctx.fillRect(c.x + 6, c.y + c.h - 24, c.w - 12, 18)
      text(ctx, label, c.x + c.w / 2, c.y + c.h - 11, { color, size: 11, bold: true, align: 'center', maxWidth: c.w - 18 })
    }

    // ── (a) Perceptron: the decision plane in feature space ────
    {
      const c = cells[0]
      cubeBox.current = c
      card(ctx, c.x, c.y, c.w, c.h, 'a) Perceptron: one flat boundary', '#f472b6')
      if (dragX.current === null) yaw.current += dt * 0.18
      const ya = yaw.current
      const tilt = 0.42
      const sc = Math.min(c.w, c.h - 70) * 0.27
      const ox = c.x + c.w / 2
      const oy = c.y + (c.h - 30) / 2 + 12
      // world axes: x = p₁ shape, z = p₂ texture, y (up) = p₃ weight
      const P = (v: number[]): [number, number, number] => {
        const x = v[0] * Math.cos(ya) + v[1] * Math.sin(ya)
        const z = -v[0] * Math.sin(ya) + v[1] * Math.cos(ya)
        const y = v[2]
        const y2 = y * Math.cos(tilt) - z * Math.sin(tilt)
        const z2 = y * Math.sin(tilt) + z * Math.cos(tilt)
        const persp = 1 / (1 + z2 * 0.12)
        return [ox + x * sc * persp, oy - y2 * sc * persp, z2]
      }
      const seg = (a: number[], b: number[], color: string, width = 1, dash?: number[]) => {
        const A = P(a)
        const B = P(b)
        line(ctx, A[0], A[1], B[0], B[1], color, width, dash)
      }
      // cube edges
      for (let i = 0; i < 8; i++)
        for (let d = 0; d < 3; d++) {
          if ((i >> d) & 1) continue
          const a = [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1]
          const b = a.slice()
          b[d] = 1
          seg(a, b, 'rgba(148,163,184,0.3)')
        }
      // decision plane p₂ = 0
      const q = [[-1.15, 0, -1.15], [1.15, 0, -1.15], [1.15, 0, 1.15], [-1.15, 0, 1.15]].map(P)
      ctx.beginPath()
      q.forEach((v, i) => (i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])))
      ctx.closePath()
      ctx.fillStyle = `rgba(244,114,182,${onBoundary ? 0.3 + 0.12 * Math.sin(t * 6) : 0.2})`
      ctx.fill()
      ctx.strokeStyle = '#f472b6'
      ctx.lineWidth = 1.5
      ctx.stroke()
      const pc = P([-1.15, 0, 1.15])
      text(ctx, 'boundary: p₂ = 0', pc[0], pc[1] - 5, { color: '#f9a8d4', size: 10, align: 'center' })
      // weight vector, perpendicular to the plane, pointing to the idli side
      seg([0, 0, 0], [0, 0.75, 0], '#f472b6', 2.5)
      const wv = P([0, 0.85, 0])
      text(ctx, 'W', wv[0], wv[1] + 3, { color: '#f472b6', size: 11, bold: true, align: 'center' })
      // axis labels
      const lab = (v: number[], s2: string) => {
        const a = P(v)
        text(ctx, s2, a[0], a[1], { color: '#94a3b8', size: 10, align: 'center' })
      }
      lab([1.45, -1, -1], 'p₁ shape')
      lab([-1, 1.5, -1], 'p₂ texture')
      lab([-1, -1, 1.3], 'p₃ weight')
      // prototypes
      prototypes.forEach((pr, i) => {
        const a = P(pr)
        ctx.beginPath()
        ctx.arc(a[0], a[1], 6, 0, Math.PI * 2)
        ctx.fillStyle = classColor[i]
        ctx.fill()
        text(ctx, `${names[i]} prototype`, a[0], a[1] + 17, { color: classColor[i], size: 10, align: 'center', bold: true })
      })
      // the input, with its perpendicular drop to the boundary (length |n|)
      const a = P(s.p)
      const foot = P([s.p[0], 0, s.p[2]])
      line(ctx, a[0], a[1], foot[0], foot[1], '#f8fafc', 1.2, [3, 3])
      glow(ctx, a[0], a[1], 16, '#ffffff', 0.6)
      ctx.beginPath()
      ctx.arc(a[0], a[1], 5 + Math.sin(t * 5), 0, Math.PI * 2)
      ctx.fillStyle = '#f8fafc'
      ctx.fill()
      text(ctx, 'input p', a[0] + 9, a[1] - 8, { color: '#f8fafc', size: 10, bold: true })
      text(ctx, `n = Wp + b = 0·p₁ + 1·p₂ + 0·p₃ + 0 = ${num(n, 1)}`, c.x + c.w / 2, c.y + 34, { color: '#e2e8f0', size: 10, align: 'center', maxWidth: c.w - 14 })
      text(ctx, 'drag to turn', c.x + c.w - 8, c.y + c.h - 30, { color: '#64748b', size: 9, align: 'right' })
      verdict(
        c,
        onBoundary ? 'a = hardlims(0) = +1: idli, but only by convention' : `a = hardlims(${num(n, 1)}) = ${aPerc > 0 ? '+1' : '−1'}: ${names[aPerc > 0 ? 1 : 0]}`,
        onBoundary ? '#fbbf24' : classColor[aPerc > 0 ? 1 : 0],
      )
    }

    // History chart shared by the two recurrent networks
    const chart = (x: number, y: number, cw: number, chh: number, hist: number[][], lo: number, hi: number, colors: string[], labels: string[]) => {
      const span = Math.max(4, hist.length - 1)
      const X = (i: number) => x + 26 + ((cw - 36) * i) / span
      const Y = (v: number) => y + chh - 14 - ((clamp(v, lo, hi) - lo) / (hi - lo)) * (chh - 24)
      ctx.strokeStyle = 'rgba(148,163,184,0.2)'
      ctx.lineWidth = 1
      ctx.strokeRect(X(0), Y(hi), X(span) - X(0), Y(lo) - Y(hi))
      line(ctx, X(0), Y(0), X(span), Y(0), 'rgba(148,163,184,0.3)')
      text(ctx, num(hi, 0), X(0) - 4, Y(hi) + 4, { size: 9, align: 'right', color: '#94a3b8' })
      text(ctx, num(lo, 0), X(0) - 4, Y(lo) + 3, { size: 9, align: 'right', color: '#94a3b8' })
      text(ctx, 'step t →', X(span), Y(lo) + 12, { size: 9, align: 'right', color: '#94a3b8' })
      for (let i = 0; i <= span; i++) text(ctx, String(i), X(i), Y(lo) + 12, { size: 8, align: 'center', color: '#64748b' })
      const upto = Math.min(tNow, hist.length - 1)
      colors.forEach((col, j) => {
        ctx.beginPath()
        for (let i = 0; i <= upto; i++) {
          if (i) ctx.lineTo(X(i), Y(hist[i][j]))
          else ctx.moveTo(X(i), Y(hist[i][j]))
        }
        ctx.strokeStyle = col
        ctx.lineWidth = 2
        ctx.stroke()
        for (let i = 0; i <= upto; i++) {
          ctx.beginPath()
          ctx.arc(X(i), Y(hist[i][j]), i === upto ? 4 : 2.5, 0, Math.PI * 2)
          ctx.fillStyle = col
          ctx.fill()
        }
        if (labels[j]) text(ctx, labels[j], X(upto) + 6, Y(hist[upto][j]) + (j % 2 ? 10 : -4), { size: 9, color: col })
      })
    }

    // ── (b) Hamming network ────────────────────────────────────
    {
      const c = cells[1]
      card(ctx, c.x, c.y, c.w, c.h, 'b) Hamming: score, then compete', '#38bdf8')
      const tall = c.h > 300
      const bx = c.x + 50
      const bw = c.w - 50 - 48
      const rowH = tall ? 46 : 30
      const y0 = c.y + (tall ? 58 : 34)
      if (tall) text(ctx, `feedforward a¹ = W¹p + b¹ = ${vecText(ham.a1, 1)}   (outline)`, c.x + 10, c.y + 36, { size: 10, color: '#94a3b8', maxWidth: c.w - 20 })
      for (let i = 0; i < 2; i++) {
        const y = y0 + i * rowH
        text(ctx, names[i], c.x + 10, y + 13, { size: 11, color: classColor[i], bold: true })
        ctx.fillStyle = 'rgba(148,163,184,0.1)'
        ctx.fillRect(bx, y, bw, 18)
        ctx.fillStyle = classColor[i]
        ctx.globalAlpha = 0.85
        ctx.fillRect(bx, y, (bw * clamp(s.ham[i], 0, 6)) / 6, 18)
        ctx.globalAlpha = 1
        ctx.strokeStyle = '#f8fafc'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.strokeRect(bx, y, (bw * clamp(ham.a1[i], 0, 6)) / 6, 18)
        ctx.setLineDash([])
        text(ctx, num(hamNow[i]), bx + bw + 6, y + 13, { size: 11, color: '#f8fafc', bold: true })
      }
      // mutual inhibition between the two neurons
      const my = y0 + rowH - (rowH - 18) / 2
      if (tall) {
        text(ctx, `each pushes the other down by ε = ${EPS} × its value`, bx, my + 4, { size: 9, color: '#fb7185', maxWidth: bw + 40 })
      }
      text(ctx, `a²(${Math.min(tNow, ham.history.length - 1)}) = ${vecText(hamNow)}`, c.x + 10, y0 + rowH * 2 + 10, { size: 11, color: '#e2e8f0', maxWidth: c.w - 20 })
      const cy0 = y0 + rowH * 2 + 20
      const chh = c.y + c.h - 30 - cy0
      if (chh > 50) chart(c.x + 4, cy0, c.w - 8, chh, ham.history, 0, 6, classColor, ['', ''])
      verdict(
        c,
        hamWin >= 0 && hamDone ? `only the ${names[hamWin]} neuron is left: ${names[hamWin]}` : hamDead ? 'both neurons reached 0: no winner' : hamWin >= 0 ? `${names[hamWin]} is winning…` : 'still competing: press Step',
        hamWin >= 0 ? classColor[hamWin] : hamDead ? '#fb7185' : '#fbbf24',
      )
    }

    // ── (c) Hopfield network ───────────────────────────────────
    {
      const c = cells[2]
      card(ctx, c.x, c.y, c.w, c.h, 'c) Hopfield: slide to a stored prototype', '#34d399')
      const sideBySide = !wide
      const barsW = sideBySide ? c.w * 0.5 : c.w
      const bx = c.x + 62
      const bw = barsW - 62 - 50
      const tall = c.h > 300
      const rowH = tall ? 40 : 26
      const y0 = c.y + (tall ? 58 : 32)
      if (tall) text(ctx, '▼ vada prototype   ▲ idli prototype', c.x + 10, c.y + 36, { size: 10, color: '#94a3b8' })
      for (let i = 0; i < 3; i++) {
        const y = y0 + i * rowH
        const X = (v: number) => bx + ((v + 1) / 2) * bw
        text(ctx, `a${['₁', '₂', '₃'][i]} ${features[i]}`, c.x + 8, y + 12, { size: 10, color: '#cbd5e1', maxWidth: 52 })
        ctx.fillStyle = 'rgba(148,163,184,0.1)'
        ctx.fillRect(bx, y, bw, 16)
        line(ctx, X(0), y - 2, X(0), y + 18, 'rgba(148,163,184,0.5)')
        const v = s.hop[i]
        ctx.fillStyle = v >= 0 ? '#38bdf8' : '#fb7185'
        ctx.fillRect(Math.min(X(0), X(v)), y, Math.abs(X(v) - X(0)), 16)
        text(ctx, '▼', X(VADA[i]), y - 1, { size: 9, color: C_VADA, align: 'center' })
        text(ctx, '▲', X(IDLI[i]), y + 25, { size: 9, color: C_IDLI, align: 'center' })
        text(ctx, num(hopNow[i]), bx + bw + 6, y + 12, { size: 11, color: '#f8fafc', bold: true })
      }
      const label = `a(${Math.min(tNow, hop.history.length - 1)}) = ${vecText(hopNow)}`
      if (sideBySide) {
        text(ctx, label, c.x + barsW + 6, c.y + 34, { size: 10, color: '#e2e8f0', maxWidth: c.w - barsW - 12 })
        chart(c.x + barsW, c.y + 38, c.w - barsW - 4, c.h - 68, hop.history, -1, 1, ['#f472b6', '#34d399', '#a78bfa'], ['a₁', 'a₂', 'a₃'])
      } else {
        text(ctx, label, c.x + 10, y0 + rowH * 3 + 8, { size: 11, color: '#e2e8f0', maxWidth: c.w - 20 })
        const cy0 = y0 + rowH * 3 + 18
        const chh = c.y + c.h - 30 - cy0
        if (chh > 50) chart(c.x + 4, cy0, c.w - 8, chh, hop.history, -1, 1, ['#f472b6', '#34d399', '#a78bfa'], ['a₁', 'a₂', 'a₃'])
      }
      verdict(
        c,
        hopClass >= 0 ? `resting on the ${names[hopClass]} prototype: ${names[hopClass]}` : hopStuck ? 'resting between the prototypes: no answer' : 'still moving: press Step',
        hopClass >= 0 ? classColor[hopClass] : hopStuck ? '#fb7185' : '#fbbf24',
      )
    }
  }

  const inCube = (e: PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = pointerXY(e)
    const c = cubeBox.current
    return x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h
  }

  const dH = [0, 1].map((i) => prototypes[i].reduce((s, v, j) => s + Math.abs(v - p[j]) / 2, 0))
  const rows = Array.from({ length: Math.min(tNow, last) + 1 }, (_, i) => ({
    t: i,
    ham: ham.history[Math.min(i, ham.history.length - 1)],
    hop: hop.history[Math.min(i, hop.history.length - 1)],
  })).slice(-7)
  return (
    <LabShell
      labId="fruit-sorter"
      actions={{
        break: { label: 'Texture reads exactly 0', run: () => { setP([1, 0, -1]); setAuto(true) } },
        fix: { label: 'Nudge texture to 0.2', run: () => { setP([1, 0.2, -1]); setAuto(true) } },
      }}
      happening={
        <>
          <p>
            Sensors read p = {vecText(p, 1)}. It differs from the vada prototype by {num(dH[0], 1)} features and from the idli prototype by{' '}
            {num(dH[1], 1)}.
          </p>
          <p>
            Perceptron: n = p₂ = {num(n, 1)}, so {onBoundary ? 'the point lies exactly on the boundary and the answer is arbitrary' : `it says ${names[aPerc > 0 ? 1 : 0]} at once`}.
            Hamming at step {Math.min(tNow, ham.history.length - 1)}: scores {vecText(hamNow)}
            {hamDead ? ', equal scores cancelled each other and nobody won' : hamWin >= 0 ? `, the ${names[hamWin]} neuron is the only one above zero` : ', both still alive'}.
          </p>
          <p>
            Hopfield at step {Math.min(tNow, hop.history.length - 1)}: a = {vecText(hopNow)}
            {hopClass >= 0 ? `, which is the ${names[hopClass]} prototype: the corrupted reading has been repaired.` : hopStuck ? '. With a₂ = 0 there is nothing for the feedback to amplify, so it never moves.' : '. Each step multiplies a₂ by 1.2 and pulls a₁ and a₃ to the values both prototypes share.'}
          </p>
        </>
      }
      panel={
        <>
          <Group title="Sensor readings p">
            {p.map((v, i) => (
              <Slider
                key={i}
                label={`p${['₁', '₂', '₃'][i]} ${features[i]} (−1 ${ends[i][0]}, +1 ${ends[i][1]})`}
                value={v}
                min={-1}
                max={1}
                step={0.1}
                onChange={(x) => setP(p.map((q, k) => (k === i ? Math.round(x * 10) / 10 : q)))}
                fmt={(x) => num(x, 1)}
              />
            ))}
            <div className="flex flex-wrap gap-1.5">
              {presets.map((pr) => (
                <Btn key={pr.label} onClick={() => setP(pr.p)}>
                  {pr.label}
                </Btn>
              ))}
            </div>
          </Group>
          <Group title="Step through time">
            <div className="flex flex-wrap gap-2">
              <Btn tone="go" disabled={tNow >= last} onClick={() => { setAuto(false); setTNow((t) => Math.min(last, t + 1)) }}>
                Step: t → t + 1
              </Btn>
              <Btn onClick={() => { setAuto(false); setTNow(0) }}>Back to t = 0</Btn>
            </div>
            <Toggle label="Run by itself" value={auto} onChange={setAuto} />
            <div className="overflow-x-auto rounded-md bg-white/5 p-2">
              <table className="w-full font-mono text-[11px] text-slate-200">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pr-2 font-normal">t</th>
                    <th className="pr-2 font-normal">Hamming a²(t)</th>
                    <th className="font-normal">Hopfield a(t)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.t} className={r.t === tNow ? 'text-sky-200' : ''}>
                      <td className="pr-2">{r.t}</td>
                      <td className="pr-2">{vecText(r.ham)}</td>
                      <td>{vecText(r.hop)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Group>
          <Group title="Answers and cost">
            <Stats>
              <Stat label="Perceptron" value={onBoundary ? 'on boundary' : names[aPerc > 0 ? 1 : 0]} tone={onBoundary ? 'warn' : 'good'} />
              <Stat label="Hamming" value={hamWin >= 0 ? names[hamWin] : hamDead ? 'no winner' : 'competing'} tone={hamWin >= 0 ? 'good' : hamDead ? 'bad' : 'warn'} />
              <Stat label="Hopfield" value={hopClass >= 0 ? names[hopClass] : hopStuck ? 'stuck' : 'moving'} tone={hopClass >= 0 ? 'good' : hopStuck ? 'bad' : 'warn'} />
              <Stat label="Steps to settle" value={`${ham.settled ? ham.history.length - 2 : '30+'} / ${hop.settled ? hop.history.length - 2 : '30+'}`} />
              <Stat label="Perceptron params" value="1(3+1) = 4" />
              <Stat label="Hamming params" value="2(3+1) + 2·2 = 12" />
              <Stat label="Hopfield params" value="3(3+1) = 12" />
              <Stat label="Feedforward a¹" value={vecText(ham.a1, 1)} />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas2D
        draw={onDraw}
        className="touch-none"
        onPointerDown={(e) => {
          if (!inCube(e)) return
          e.currentTarget.setPointerCapture(e.pointerId)
          dragX.current = pointerXY(e).x
        }}
        onPointerMove={(e) => {
          if (dragX.current === null) return
          const x = pointerXY(e).x
          yaw.current += (x - dragX.current) * 0.012
          dragX.current = x
        }}
        onPointerUp={() => (dragX.current = null)}
        onPointerCancel={() => (dragX.current = null)}
      />
    </LabShell>
  )
}
