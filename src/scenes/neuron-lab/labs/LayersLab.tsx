import { useEffect, useMemo, useRef, useState } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { drawAxes, makePlot } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { createNetwork, forward, paramCount, type TransferName } from '../../../engine'
import { collapseLinear, paramTerms } from '../../../engine/architecture'
import { hopfieldStep } from '../../../engine/hopfield'
import { arrowHead, card, clamp, ease, glow, lerp, line, num, roundRect, signColor, text } from '../draw'

const inputNames = ['hunger', 'budget', 'time']
const dishes = ['dosa', 'thali', 'samosa', 'biryani', 'chai']
const SUP = ['⁰', '¹', '²', '³', '⁴']
const COLOR = '#a78bfa'
const R = 3
const MAX_T = 30

type HiddenFn = 'tansig' | 'logsig' | 'purelin'

const valueFill = (v: number) => {
  const k = clamp(Math.abs(v), 0, 1)
  return v >= 0 ? `rgba(56,189,248,${(0.12 + 0.75 * k).toFixed(2)})` : `rgba(251,113,133,${(0.12 + 0.75 * k).toFixed(2)})`
}

export default function LayersLab() {
  const [view, setView] = useState<'forward' | 'recurrent'>('forward')
  const [sizes, setSizes] = useState([4, 3])
  const [hidden, setHidden] = useState<HiddenFn>('tansig')
  const [seed, setSeed] = useState(5)
  const [p, setP] = useState([0.8, -0.3, 0.4])
  // Recurrent demo
  const [self, setSelf] = useState(0.9)
  const [cross, setCross] = useState(0.5)
  const [a0, setA0] = useState([0.3, -0.1])
  const [tNow, setTNow] = useState(0)
  const [auto, setAuto] = useState(true)
  const shown = useRef<number[][]>([])
  const stepAt = useRef(0)

  const M = sizes.length
  const fns: TransferName[] = sizes.map((_, m) => (m === M - 1 ? 'purelin' : hidden))
  const net = useMemo(
    () => createNetwork(R, sizes, fns, { seed, range: 1.2 }),
    // fns is derived from sizes and hidden
    [sizes, hidden, seed],
  )
  const trace = forward(net, p)
  const terms = paramTerms(R, sizes)
  const total = paramCount(net)
  const mults = terms.reduce((s, t) => s + t.S * t.inputs, 0)
  const flat = collapseLinear(net)
  // What the "multiply the matrices together" shortcut would give if we pretended every layer were linear
  const pretend = collapseLinear({ layers: net.layers.map((L) => ({ ...L, f: 'purelin' as TransferName })) })!
  const shortcut = pretend.W.map((row, i) => row.reduce((s, w, j) => s + w * p[j], pretend.b[i]))
  const gap = Math.max(...shortcut.map((v, i) => Math.abs(v - trace.a[i])))
  const best = trace.a.indexOf(Math.max(...trace.a))
  const notation = [R, ...sizes].join(' – ')
  const formula = terms.map((t) => `${t.S}(${t.inputs}+1)`).join(' + ')

  // Recurrent network: two friends, +1 = canteen, −1 = mess
  const Wr = [
    [self, cross],
    [cross, self],
  ]
  const hist = useMemo(() => {
    const h = [a0.slice()]
    for (let t = 0; t < MAX_T; t++) h.push(hopfieldStep(Wr, [0, 0], h[t]))
    return h
    // Wr is derived from self and cross
  }, [self, cross, a0])
  useEffect(() => setTNow(0), [self, cross, a0])
  useEffect(() => {
    if (view !== 'recurrent' || !auto) return
    const id = setInterval(() => setTNow((t) => (t < MAX_T ? t + 1 : t)), 900)
    return () => clearInterval(id)
  }, [view, auto])
  useEffect(() => {
    stepAt.current = performance.now() / 1000
  }, [tNow])

  const setSize = (m: number, S: number) => setSizes(sizes.map((s, k) => (k === m ? S : s)))

  const drawForward = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const narrow = w < 620
    const top = 54
    const foot = narrow ? 118 : 112
    const cols = M + 1
    const padX = narrow ? 52 : 110
    const colX = (c: number) => (cols === 1 ? w / 2 : padX + ((w - padX * 2) * c) / (cols - 1))
    const bodyH = h - top - foot - 34
    const maxS = Math.max(R, ...sizes)
    const r = clamp(Math.min(bodyH / (maxS * 2.7), (w - padX * 2) / (cols * 3.2)), 9, 24)
    const rowY = (count: number, i: number) => top + 16 + bodyH / 2 + (i - (count - 1) / 2) * Math.min(bodyH / Math.max(1, count - 0.2), r * 3.4)

    // Header: abbreviated notation and the parameter count
    text(ctx, notation, 14, 24, { color: '#f8fafc', size: narrow ? 17 : 22, bold: true })
    text(ctx, 'abbreviated notation R – S¹ – S² …', 14, 41, { color: '#94a3b8', size: 10 })
    text(ctx, `parameters = ${formula} = ${total}`, w - 12, 24, { color: COLOR, size: narrow ? 11 : 14, bold: true, align: 'right', maxWidth: w * 0.55 })
    text(ctx, 'each layer: S × (inputs + 1 bias)', w - 12, 41, { color: '#94a3b8', size: 10, align: 'right' })

    // Smoothed values, one array per column
    const target = [p, ...trace.layers.map((L) => L.a)]
    if (shown.current.length !== target.length || shown.current.some((c, i) => c.length !== target[i].length))
      shown.current = target.map((c) => c.slice())
    const k = ease(dt, 8)
    shown.current.forEach((c, i) => c.forEach((v, j) => (c[j] = lerp(v, target[i][j], k))))

    // A wave travels from the inputs to the outputs, one layer per beat
    const phase = (t * 0.75) % (M + 0.8)
    for (let m = 0; m < M; m++) {
      const L = net.layers[m]
      const x1 = colX(m) + r
      const x2 = colX(m + 1) - r
      const u = phase - m
      for (let i = 0; i < L.W.length; i++)
        for (let j = 0; j < L.W[i].length; j++) {
          const wt = L.W[i][j]
          const y1 = rowY(L.W[i].length, j)
          const y2 = rowY(L.W.length, i)
          ctx.globalAlpha = 0.3 + 0.35 * Math.min(1, Math.abs(wt))
          line(ctx, x1, y1, x2, y2, signColor(wt), 0.6 + Math.abs(wt) * 2.4)
          ctx.globalAlpha = 1
          if (u >= 0 && u <= 1) {
            const sig = wt * target[m][j]
            const size = 2 + Math.min(6, Math.abs(sig) * 5)
            if (Math.abs(sig) > 0.03) glow(ctx, lerp(x1, x2, u), lerp(y1, y2, u), size * 1.8, sig >= 0 ? '#bae6fd' : '#fecdd3', 0.9)
          }
        }
    }

    for (let c = 0; c < cols; c++) {
      const count = target[c].length
      const x = colX(c)
      const arriving = phase - c
      const flash = c === 0 ? (phase < 0.25 ? 1 - phase / 0.25 : 0) : arriving >= 0 && arriving < 0.5 ? 1 - arriving / 0.5 : 0
      for (let i = 0; i < count; i++) {
        const y = rowY(count, i)
        const v = shown.current[c][i]
        if (flash > 0) glow(ctx, x, y, r * 2.6, '#ffffff', 0.35 * flash)
        ctx.beginPath()
        if (c === 0) ctx.rect(x - r, y - r * 0.8, r * 2, r * 1.6)
        else ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = '#0b1020'
        ctx.fill()
        ctx.fillStyle = valueFill(c === cols - 1 ? v / 2 : v)
        ctx.fill()
        const isBest = c === cols - 1 && i === best
        ctx.strokeStyle = isBest ? '#fde68a' : c === 0 ? '#fde68a' : COLOR
        ctx.lineWidth = isBest ? 3 : 1.4
        ctx.stroke()
        text(ctx, num(v, r < 13 ? 1 : 2), x, y + 3.5, { color: '#f8fafc', size: r < 13 ? 8.5 : 10, align: 'center', bold: true })
        if (c === 0) text(ctx, narrow ? inputNames[i] : `p${['₁', '₂', '₃'][i]} ${inputNames[i]}`, x - r - 5, y + 3.5, { color: '#fde68a', size: 10, align: 'right' })
        if (c === cols - 1)
          text(ctx, `${dishes[i]}${isBest ? ' ★' : ''}`, x + r + 5, y + 3.5, { color: isBest ? '#fde68a' : '#cbd5e1', size: 10, bold: isBest })
      }
      // Column captions
      const cy = top + 6
      if (c === 0) text(ctx, `p = a⁰  (R = ${R})`, x, cy, { color: '#fde68a', size: 10, align: 'center' })
      else {
        const tm = terms[c - 1]
        text(ctx, `a${SUP[c]} = ${fns[c - 1]}(W${SUP[c]}a${SUP[c - 1]} + b${SUP[c]})`, x, cy, {
          color: '#e9d5ff',
          size: 10,
          align: 'center',
          maxWidth: (w - padX * 2) / Math.max(1, cols - 1) + (narrow ? 20 : 60),
        })
        text(ctx, `W${SUP[c]} ${tm.S}×${tm.inputs}, b${SUP[c]} ${tm.S}×1`, x, h - foot - 20, { color: '#94a3b8', size: 10, align: 'center' })
        text(ctx, `${tm.count} parameters`, x, h - foot - 7, { color: COLOR, size: 10, align: 'center' })
      }
    }
    text(ctx, 'line thickness = |w|', 14, h - foot - 20, { color: '#94a3b8', size: 10 })
    text(ctx, 'blue: positive   red: negative', 14, h - foot - 7, { color: '#94a3b8', size: 10 })

    // Footer: can this network be replaced by one layer?
    const fy = h - foot + 4
    card(ctx, 8, fy, w - 16, foot - 12, flat ? 'Every layer is linear: this single layer does the same job' : 'Can one layer replace this network?', flat ? '#fbbf24' : '#34d399')
    const rowsN = pretend.W.length
    const lh = Math.min(13, (foot - 46) / rowsN)
    const fs = Math.min(11, lh)
    const mx = 18
    const my = fy + 34
    if (flat || !narrow) {
      text(ctx, M > 1 ? `W = W${SUP[M]}…W¹ =` : 'W = W¹ =', mx, my, { color: '#cbd5e1', size: 10 })
      for (let i = 0; i < rowsN; i++)
        text(ctx, `[ ${pretend.W[i].map((v) => num(v).padStart(6)).join(' ')} ]   b = ${num(pretend.b[i]).padStart(6)}`, mx + (narrow ? 0 : 92), my + (narrow ? 14 : 0) + i * lh, {
          color: flat ? '#fde68a' : '#64748b',
          size: fs,
          maxWidth: narrow ? w - 40 : w * 0.5,
        })
    }
    const rx = narrow ? mx : w * 0.62
    const ry = narrow ? (flat ? my + 20 + rowsN * lh : my) : my
    if (flat) {
      text(ctx, `Wp + b = [${shortcut.map((v) => num(v)).join(', ')}]`, rx, ry, { color: '#fde68a', size: 11, maxWidth: w - rx - 16 })
      if (!narrow || rowsN < 4) text(ctx, `network  = [${trace.a.map((v) => num(v)).join(', ')}]  identical`, rx, ry + 15, { color: '#f8fafc', size: 11, maxWidth: w - rx - 16 })
      if (!narrow) text(ctx, `${total} parameters did the work of ${rowsN * (R + 1)}`, rx, ry + 32, { color: '#fbbf24', size: 11, maxWidth: w - rx - 16 })
    } else {
      text(ctx, `No. Multiplying the matrices gives [${shortcut.map((v) => num(v)).join(', ')}]`, rx, ry, { color: '#94a3b8', size: 11, maxWidth: w - rx - 16 })
      text(ctx, `but the network gives      [${trace.a.map((v) => num(v)).join(', ')}]`, rx, ry + 15, { color: '#f8fafc', size: 11, maxWidth: w - rx - 16 })
      text(ctx, `They differ by up to ${num(gap)}: ${hidden} bends the signal between layers.`, rx, ry + 32, { color: '#34d399', size: 11, maxWidth: w - rx - 16 })
    }
  }

  const drawRecurrent = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    const narrow = w < 620
    const dh = h * 0.46
    const now = hist[tNow]
    const next = hist[Math.min(MAX_T, tNow + 1)]
    const age = clamp(t - stepAt.current, 0, 0.85) / 0.85
    text(ctx, `Recurrent layer, time step t = ${tNow}`, 14, 22, { color: '#f8fafc', size: narrow ? 13 : 16, bold: true })
    text(ctx, 'a(t+1) = satlins(W a(t) + b):  the output goes back in through a delay', 14, 39, { color: '#94a3b8', size: 10, maxWidth: w - 28 })

    // Block diagram: a(t) → W → + → satlins → a(t+1) → D → back to a(t)
    const y = dh * 0.5 + 16
    const xs = [0.1, 0.3, 0.48, 0.67, 0.88].map((f) => w * f)
    const bw = narrow ? 24 : 34
    const loopY = dh - 8
    const path: [number, number][] = [
      [xs[0], y], [xs[1], y], [xs[2], y], [xs[3], y], [xs[4], y], [xs[4], loopY], [w * 0.5, loopY], [xs[0], loopY], [xs[0], y],
    ]
    ctx.strokeStyle = '#c4b5fd'
    ctx.lineWidth = 2
    ctx.beginPath()
    path.forEach(([x, yy], i) => (i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy)))
    ctx.stroke()
    arrowHead(ctx, xs[1] - bw, y, 0, 8, '#c4b5fd')
    arrowHead(ctx, xs[3] - bw, y, 0, 8, '#c4b5fd')
    arrowHead(ctx, xs[0], y + 22, -Math.PI / 2, 8, '#c4b5fd')
    // Pulse travelling once round the loop for each time step
    let len = 0
    const seg = path.slice(1).map((q, i) => {
      const d = Math.hypot(q[0] - path[i][0], q[1] - path[i][1])
      len += d
      return d
    })
    let dist = age * len
    for (let i = 0; i < seg.length; i++) {
      if (dist <= seg[i]) {
        const u = dist / seg[i]
        glow(ctx, lerp(path[i][0], path[i + 1][0], u), lerp(path[i][1], path[i + 1][1], u), 14, '#ffffff', age < 1 ? 0.9 : 0.3)
        break
      }
      dist -= seg[i]
    }
    const box = (x: number, yy: number, label: string, sub: string, color: string) => {
      roundRect(ctx, x - bw, yy - 17, bw * 2, 34, 7)
      ctx.fillStyle = '#0f172a'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.6
      ctx.stroke()
      text(ctx, label, x, yy + 4, { color: '#f8fafc', size: narrow ? 10 : 12, align: 'center', bold: true, maxWidth: bw * 2 - 4 })
      text(ctx, sub, x, yy - 23, { color: '#94a3b8', size: 10, align: 'center' })
    }
    box(xs[1], y, 'W', 'weights', COLOR)
    ctx.beginPath()
    ctx.arc(xs[2], y, 15, 0, Math.PI * 2)
    ctx.fillStyle = '#0f172a'
    ctx.fill()
    ctx.strokeStyle = COLOR
    ctx.stroke()
    text(ctx, '+', xs[2], y + 5, { color: '#f8fafc', size: 15, align: 'center', bold: true })
    line(ctx, xs[2], y - 44, xs[2], y - 15, '#c4b5fd', 1.5)
    text(ctx, 'b = [0, 0]', xs[2], y - 49, { color: '#94a3b8', size: 10, align: 'center' })
    box(xs[3], y, 'satlins', 'keeps a in [−1, 1]', COLOR)
    box(w * 0.5, loopY, 'D', '', '#fbbf24')
    text(ctx, 'delay: holds a for one step', w * 0.5 + bw + 8, loopY + 4, { color: '#fbbf24', size: 10, maxWidth: xs[4] - w * 0.5 - bw - 12 })
    const vec = (x: number, v: number[], label: string) => {
      roundRect(ctx, x - 38, y - 52, 76, 30, 6)
      ctx.fillStyle = 'rgba(2,6,23,0.92)'
      ctx.fill()
      text(ctx, label, x, y - 40, { color: '#94a3b8', size: 10, align: 'center' })
      text(ctx, `[${num(v[0])}, ${num(v[1])}]`, x, y - 27, { color: '#f8fafc', size: 11, align: 'center', bold: true })
    }
    vec(clamp(xs[0], 44, w), now, `a(${tNow})`)
    vec(clamp(xs[4], 0, w - 44), next, `a(${tNow + 1})`)

    // Time plot
    const span = Math.max(12, Math.min(MAX_T, tNow + 2))
    const pl = makePlot(w, h, [0, span], [-1.25, 1.25], { t: dh + 26, b: 30, l: 62 })
    drawAxes(ctx, pl, {
      xTicks: Array.from({ length: Math.floor(span / 2) + 1 }, (_, i) => i * 2),
      yTicks: [-1, 0, 1],
      xLabel: 'time step t',
      yFmt: (v) => (v === 1 ? '+1 canteen' : v === -1 ? '−1 mess' : '0'),
    })
    const cols = ['#38bdf8', '#fbbf24']
    for (let i = 0; i < 2; i++) {
      ctx.beginPath()
      for (let k = 0; k <= tNow; k++) {
        const x = pl.X(k)
        const yy = pl.Y(hist[k][i])
        if (k) ctx.lineTo(x, yy)
        else ctx.moveTo(x, yy)
      }
      ctx.strokeStyle = cols[i]
      ctx.lineWidth = 2.5
      ctx.stroke()
      for (let k = 0; k <= tNow; k++) {
        ctx.beginPath()
        ctx.arc(pl.X(k), pl.Y(hist[k][i]), k === tNow ? 5 + Math.sin(t * 5) : 3, 0, Math.PI * 2)
        ctx.fillStyle = cols[i]
        ctx.fill()
      }
      text(ctx, `friend ${i + 1}: a${['₁', '₂'][i]}(t)`, pl.left + 8 + i * 130, pl.top - 8, { color: cols[i], size: 11, bold: true })
    }
  }

  const settled = hist[tNow].every((v, i) => Math.abs(v - hist[Math.min(MAX_T, tNow + 1)][i]) < 1e-6)
  const agree = Math.sign(hist[tNow][0]) === Math.sign(hist[tNow][1])
  return (
    <LabShell
      labId="layers"
      actions={{
        break: {
          label: 'Make every layer linear',
          run: () => {
            setView('forward')
            if (sizes.length < 2) setSizes([4, 3])
            setHidden('purelin')
          },
        },
        fix: {
          label: 'Hidden layers back to tansig',
          run: () => {
            setView('forward')
            setHidden('tansig')
          },
        },
      }}
      happening={
        view === 'forward' ? (
          <>
            <p>
              This is a {notation} network: {M} layer{M > 1 ? 's' : ''}, {total} parameters ({formula}). One forward pass costs {mults}{' '}
              multiplications, one for each connection.
            </p>
            <p>
              The pulse carries p = [{p.map((v) => num(v, 1)).join(', ')}] through each layer in turn. The last layer gives [
              {trace.a.map((v) => num(v)).join(', ')}], so the canteen suggests <b>{dishes[best]}</b> (largest output).
            </p>
            <p>
              {flat
                ? `Every layer is purelin, so the whole network equals one layer with W = ${M > 1 ? 'the product of the weight matrices' : 'W¹'}: the same outputs from ${sizes[M - 1] * (R + 1)} parameters.`
                : `The hidden layers use ${hidden}. The single-layer shortcut is off by up to ${num(gap)}, so the depth is doing real work.`}
            </p>
          </>
        ) : (
          <>
            <p>
              Two friends each hold an opinion between −1 (mess) and +1 (canteen). At t = {tNow} they are at [{num(hist[tNow][0])},{' '}
              {num(hist[tNow][1])}].
            </p>
            <p>
              Each step, a friend keeps {num(self, 1)} of their own opinion and adds {num(cross, 1)} of the other one. The delay block
              feeds the result back as the next input.
            </p>
            <p>
              {settled
                ? `The state has stopped changing: ${agree ? 'they agree' : 'they disagree'}, and satlins holds the values inside [−1, 1].`
                : 'The state is still moving. Press Step or let it run.'}
            </p>
          </>
        )
      }
      panel={
        <>
          <Group title="View">
            <Seg
              value={view}
              onChange={setView}
              options={[
                { value: 'forward', label: 'Layers (feedforward)' },
                { value: 'recurrent', label: 'Recurrent (with delay)' },
              ]}
            />
          </Group>
          {view === 'forward' ? (
            <>
              <Group title="Architecture">
                <div className="flex flex-wrap gap-2">
                  <Btn tone="go" disabled={M >= 3} onClick={() => setSizes([...sizes.slice(0, -1), 3, sizes[M - 1]])}>
                    + Add a hidden layer
                  </Btn>
                  <Btn disabled={M <= 1} onClick={() => setSizes(sizes.filter((_, k) => k !== M - 2))}>
                    − Remove a layer
                  </Btn>
                </div>
                {sizes.map((S, m) => (
                  <Slider
                    key={m}
                    label={m === M - 1 ? `S${SUP[m + 1]} output neurons (dishes)` : `S${SUP[m + 1]} neurons in hidden layer ${m + 1}`}
                    value={S}
                    min={1}
                    max={5}
                    onChange={(v) => setSize(m, v)}
                  />
                ))}
                <Seg
                  label="Hidden-layer transfer function (output layer is purelin)"
                  value={hidden}
                  onChange={setHidden}
                  options={[
                    { value: 'tansig', label: 'tansig' },
                    { value: 'logsig', label: 'logsig' },
                    { value: 'purelin', label: 'purelin (linear)' },
                  ]}
                />
                <Btn onClick={() => setSeed((s) => s + 1)}>New random weights</Btn>
              </Group>
              <Group title="Inputs p (−1 low, +1 high)">
                {p.map((v, i) => (
                  <Slider key={i} label={inputNames[i]} value={v} min={-1} max={1} step={0.05} onChange={(x) => setP(p.map((q, k) => (k === i ? x : q)))} fmt={(x) => num(x)} />
                ))}
              </Group>
              <Group title="Live count">
                <Stats>
                  <Stat label="Notation" value={notation} />
                  <Stat label="Parameters" value={total} />
                  <Stat label="Weights" value={mults} />
                  <Stat label="Biases" value={total - mults} />
                  <Stat label="Multiplications / pass" value={mults} />
                  <Stat label="Suggests" value={dishes[best]} tone="good" />
                </Stats>
              </Group>
            </>
          ) : (
            <>
              <Group title="Step through time">
                <div className="flex flex-wrap gap-2">
                  <Btn tone="go" disabled={tNow >= MAX_T} onClick={() => { setAuto(false); setTNow((t) => Math.min(MAX_T, t + 1)) }}>
                    Step: t → t + 1
                  </Btn>
                  <Btn onClick={() => setTNow(0)}>Back to t = 0</Btn>
                </div>
                <Toggle label="Run by itself" value={auto} onChange={setAuto} />
                <Stats>
                  <Stat label="Time step t" value={tNow} />
                  <Stat label="a(t)" value={`${num(hist[tNow][0])}, ${num(hist[tNow][1])}`} />
                  <Stat label="Parameters" value="2(2+1) = 6" />
                  <Stat label="State" value={settled ? 'settled' : 'moving'} tone={settled ? 'good' : 'warn'} />
                </Stats>
              </Group>
              <Group title="Weights W = [self friend; friend self]">
                <Slider label="Weight on your own opinion" value={self} min={0} max={1.5} step={0.1} onChange={setSelf} fmt={(v) => num(v, 1)} />
                <Slider label="Weight on your friend's opinion" value={cross} min={-1.5} max={1.5} step={0.1} onChange={setCross} fmt={(v) => num(v, 1)} />
              </Group>
              <Group title="Starting opinions a(0)">
                <Slider label="Friend 1" value={a0[0]} min={-1} max={1} step={0.05} onChange={(v) => setA0([v, a0[1]])} fmt={(v) => num(v)} />
                <Slider label="Friend 2" value={a0[1]} min={-1} max={1} step={0.05} onChange={(v) => setA0([a0[0], v])} fmt={(v) => num(v)} />
              </Group>
            </>
          )}
        </>
      }
    >
      <Canvas2D draw={view === 'forward' ? drawForward : drawRecurrent} />
    </LabShell>
  )
}
