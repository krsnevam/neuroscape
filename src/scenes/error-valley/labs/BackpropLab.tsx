import { useMemo, useState } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, drawAxes, drawCurve, makePlot, useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats } from '../../../ui/lab/controls'
import { cloneNetwork, createTrainer, forward, gradient, lossOn, output, rng, transferFns, type Network, type Sample } from '../../../engine'

/** Fan speed for regulator position p: the function Hagan's 1-2-1 network learns. */
const g = (p: number) => 1 + Math.sin((Math.PI * p) / 4)
const grid = Array.from({ length: 21 }, (_, i) => -2 + i * 0.2)
const gridSamples: Sample[] = grid.map((p) => ({ p: [p], t: [g(p)] }))

type Init = 'book' | 'saturated' | 'random'
type Mode = 'step' | 'auto' | 'run'

function makeNet(init: Init, seed: number): Network {
  if (init === 'book')
    return {
      layers: [
        { W: [[-0.27], [-0.41]], b: [-0.48, -0.13], f: 'logsig' },
        { W: [[0.09, -0.17]], b: [0.48], f: 'purelin' },
      ],
    }
  if (init === 'saturated')
    return {
      layers: [
        { W: [[4], [-5]], b: [12, -14], f: 'logsig' },
        { W: [[0.09, -0.17]], b: [0.48], f: 'purelin' },
      ],
    }
  const r = rng(seed * 31 + 5)
  const u = () => Math.round((r() - 0.5) * 100) / 100
  return {
    layers: [
      { W: [[u()], [u()]], b: [u(), u()], f: 'logsig' },
      { W: [[u(), u()]], b: [u()], f: 'purelin' },
    ],
  }
}

/** Everything one iteration computes, kept so each sub-step can be shown on its own. */
interface Stage {
  p: number
  t: number
  n1: number[]
  a1: number[]
  n2: number
  a2: number
  e: number
  /** derivative of each hidden transfer function at n¹ */
  d1: number[]
  s2: number
  s1: number[]
  alpha: number
  next: Network
}

function prepare(net: Network, p: number, alpha: number): Stage {
  const t = g(p)
  const tr = forward(net, [p])
  const grad = gradient(net, [{ p: [p], t: [t] }])
  const next = cloneNetwork(net)
  createTrainer(next).step([{ p: [p], t: [t] }], { alpha })
  return {
    p,
    t,
    n1: tr.layers[0].n,
    a1: tr.layers[0].a,
    n2: tr.layers[1].n[0],
    a2: tr.a[0],
    e: t - tr.a[0],
    d1: tr.layers[0].n.map(transferFns.logsig.df),
    // For one sample the bias gradient is the sensitivity itself: ∂F/∂b^m = s^m
    s2: grad.b[1][0],
    s1: grad.b[0],
    alpha,
    next,
  }
}

const PHASES = ['Present an input', 'Forward: layer 1', 'Forward: layer 2', 'The error', 'Sensitivity s²', 'Backpropagate: s¹', 'Update layer 2', 'Update layer 1']
const FWD = '#34d399'
const BACK = '#f472b6'
const UPD = '#fbbf24'

const f = (v: number, d = 3) => {
  if (!Number.isFinite(v)) return '∞'
  const s = Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : Math.abs(v).toFixed(d)
  return (v < 0 && Number(s) !== 0 ? '−' : '') + s
}
/** Small numbers keep their size visible: 0.00002 → 2.0e-5 */
const fs = (v: number) => (v !== 0 && Math.abs(v) < 0.001 ? v.toExponential(1).replace('-', '−').replace('e−', 'e-') : f(v, 4))

export default function BackpropLab() {
  const [init, setInit] = useState<Init>('book')
  const [mode, setMode] = useState<Mode>('auto')
  const [alpha, setAlpha] = useState(0.1)
  const [reset, setReset] = useState(0)
  useTicker(150)

  const sim = useMemo(() => {
    const net = makeNet(init, reset)
    return { net, stage: prepare(net, 1, 0.1), phase: 0, prog: 0, dwell: 0, iter: 0, rand: rng(reset + 3), lost: false }
  }, [init, reset])

  const advance = () => {
    if (sim.lost) return
    sim.dwell = 0
    if (sim.phase < 7) {
      sim.phase++
      sim.prog = 0
      // The update uses the learning rate set at this moment
      if (sim.phase === 6 && sim.stage.alpha !== alpha) sim.stage = prepare(sim.net, sim.stage.p, alpha)
      return
    }
    sim.net = sim.stage.next
    sim.iter++
    sim.stage = prepare(sim.net, grid[Math.floor(sim.rand() * grid.length)], alpha)
    sim.phase = 0
    sim.prog = 0
  }

  const st = sim.stage
  const net = sim.net
  const ph = sim.phase
  const mse = lossOn(net, gridSamples)

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, dt: number) => {
    // --- simulation ---
    if (!sim.lost) {
      if (mode === 'run') {
        const trainer = createTrainer(sim.net)
        let p = st.p
        for (let k = 0; k < 20; k++) {
          p = grid[Math.floor(sim.rand() * grid.length)]
          trainer.step([{ p: [p], t: [g(p)] }], { alpha })
        }
        sim.iter += 20
        sim.stage = prepare(sim.net, p, alpha)
        sim.phase = 5
        sim.prog = 1
      } else {
        sim.prog = Math.min(1, sim.prog + dt / 0.9)
        if (mode === 'auto' && sim.prog >= 1) {
          sim.dwell += dt
          if (sim.dwell > 1.6) advance()
        }
      }
      if (!Number.isFinite(lossOn(sim.net, gridSamples)) || Math.abs(sim.stage.a2) > 1e6) sim.lost = true
    }
    const s = sim.stage
    const phase = sim.phase
    const pr = sim.prog
    const cur = sim.net
    const small = w < 520
    const font = `${small ? 10 : 12}px ui-monospace, monospace`
    const dh = Math.round(h * (small ? 0.6 : 0.56))

    // --- network diagram ---
    const P = { x: w * (small ? 0.08 : 0.1), y: dh * 0.52 }
    const H = [
      { x: w * 0.43, y: dh * 0.27 },
      { x: w * 0.43, y: dh * 0.77 },
    ]
    const O = { x: w * (small ? 0.74 : 0.76), y: dh * 0.52 }
    const r = Math.max(12, Math.min(22, dh * 0.085))
    const W1 = phase >= 7 ? s.next.layers[0] : cur.layers[0]
    const W2 = phase >= 6 ? s.next.layers[1] : cur.layers[1]
    const text = (str: string, x: number, y: number, color: string, align: CanvasTextAlign = 'center') => {
      ctx.font = font
      ctx.textAlign = align
      ctx.textBaseline = 'middle'
      ctx.fillStyle = color
      ctx.fillText(str, x, y)
    }
    const lh = small ? 13 : 16
    ctx.font = font
    text(`iteration ${sim.iter + 1} · step ${phase + 1} of 8 · ${PHASES[phase]}`, 8, 12, '#e2e8f0', 'left')

    const edge = (a: { x: number; y: number }, b: { x: number; y: number }, label: string, side: number, hot: boolean) => {
      ctx.strokeStyle = hot ? UPD : 'rgba(148,163,184,0.45)'
      ctx.lineWidth = hot ? 2 + 2 * (1 - pr) : 1.5
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      const mx = a.x + (b.x - a.x) * 0.48
      const my = a.y + (b.y - a.y) * 0.48
      text(label, mx, my + side * (lh * 0.75), hot ? UPD : '#cbd5e1')
    }
    H.forEach((hn, i) => {
      edge(P, hn, `w¹${i + 1},₁=${f(W1.W[i][0])}`, i === 0 ? -1 : 1, phase === 7)
      edge(hn, O, `w²₁,${i + 1}=${f(W2.W[0][i])}`, i === 0 ? -1 : 1, phase === 6)
    })
    // output → error
    const T = { x: w - 6, y: O.y }
    ctx.strokeStyle = 'rgba(148,163,184,0.45)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(O.x + r, O.y)
    ctx.lineTo(O.x + r + (small ? 10 : 26), O.y)
    ctx.stroke()

    // travelling pulses
    const pulse = (a: { x: number; y: number }, b: { x: number; y: number }, u: number, color: string) => {
      if (u <= 0 || u >= 1) return
      const x = a.x + (b.x - a.x) * u
      const y = a.y + (b.y - a.y) * u
      dot(ctx, x, y, 9, color + '44')
      dot(ctx, x, y, 4.5, color)
    }
    const travel = Math.min(1, pr / 0.6)
    if (phase === 1) H.forEach((hn) => pulse(P, hn, travel, FWD))
    if (phase === 2) H.forEach((hn) => pulse(hn, O, travel, FWD))
    if (phase === 5) H.forEach((hn) => pulse(O, hn, travel, BACK))

    const node = (c: { x: number; y: number }, kind: 'in' | 'logsig' | 'purelin', lit: string | null) => {
      ctx.beginPath()
      if (kind === 'in') ctx.rect(c.x - r * 0.7, c.y - r * 0.7, r * 1.4, r * 1.4)
      else ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
      ctx.fillStyle = '#0f172a'
      ctx.fill()
      ctx.strokeStyle = lit ?? '#64748b'
      ctx.lineWidth = lit ? 2.5 : 1.5
      ctx.stroke()
      if (lit) {
        ctx.globalAlpha = 0.18
        ctx.fillStyle = lit
        ctx.fill()
        ctx.globalAlpha = 1
      }
      if (kind === 'in') return
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i <= 12; i++) {
        const u = (i / 12) * 2 - 1
        const v = kind === 'logsig' ? 2 / (1 + Math.exp(-u * 5)) - 1 : u
        const x = c.x + u * r * 0.55
        const y = c.y - v * r * 0.45
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    const seen1 = phase > 1 || (phase === 1 && pr > 0.6)
    const seen2 = phase > 2 || (phase === 2 && pr > 0.6)
    const seenS2 = phase > 4 || (phase === 4 && pr > 0.3)
    const seenS1 = phase > 5 || (phase === 5 && pr > 0.6)
    node(P, 'in', phase === 0 ? FWD : null)
    text(`a⁰ = p`, P.x, P.y - r - lh * 0.7, '#94a3b8')
    text(f(s.p, 2), P.x, P.y + r + lh * 0.6, FWD)
    H.forEach((hn, i) => {
      const dir = i === 0 ? -1 : 1
      node(hn, 'logsig', phase === 1 && seen1 ? FWD : phase === 5 && seenS1 ? BACK : null)
      text(`b¹=${f(W1.b[i])}`, hn.x, hn.y - dir * (r + lh * 0.6), phase === 7 ? UPD : '#64748b')
      if (seen1) text(`n¹=${f(s.n1[i])} a¹=${f(s.a1[i])}`, hn.x, hn.y + dir * (r + lh * 0.65), FWD)
      if (seenS1) text(`f′=${fs(s.d1[i])} s¹=${fs(s.s1[i])}`, hn.x, hn.y + dir * (r + lh * 1.65), BACK)
    })
    node(O, 'purelin', phase === 2 && seen2 ? FWD : phase === 4 ? BACK : null)
    if (phase === 4) {
      ctx.strokeStyle = BACK
      ctx.globalAlpha = 1 - pr
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(O.x, O.y, r + pr * 22, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    text(`b²=${f(W2.b[0])}`, O.x, O.y + r + lh * 0.6, phase === 6 ? UPD : '#64748b')
    if (seen2) text(`n²=${f(s.n2)} a²=${f(s.a2)}`, O.x, O.y - r - lh * 0.65, FWD)
    if (seenS2) text(`f′=1 s²=${f(s.s2)}`, O.x, O.y + r + lh * 1.65, BACK)
    text(`t=${f(s.t)}`, T.x, T.y - lh * 0.6, '#f8fafc', 'right')
    if (phase >= 3) text(`e=${f(s.e)}`, T.x, T.y + lh * 0.6, phase === 3 ? '#fb7185' : '#fda4af', 'right')
    if (!small) {
      text('layer 1: logsig', H[0].x, dh - 8, '#64748b')
      text('layer 2: linear', O.x, dh - 8, '#64748b')
    }
    // legend
    ctx.font = font
    const lg: [string, string][] = [
      ['● forward signal', FWD],
      ['● sensitivity', BACK],
      ['● weight update', UPD],
    ]
    let lx = w - 8
    for (const [label, color] of lg.reverse()) {
      text(label, lx, 12, color, 'right')
      lx -= ctx.measureText(label).width + 10
      if (small) break
    }

    // --- function plot ---
    ctx.save()
    ctx.translate(0, dh)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.beginPath()
    ctx.moveTo(0, 0.5)
    ctx.lineTo(w, 0.5)
    ctx.stroke()
    const pl = makePlot(w, h - dh, [-2, 2], [-0.4, 2.4], { t: 10, b: 30 })
    drawAxes(ctx, pl, {
      xTicks: [-2, -1, 0, 1, 2],
      yTicks: [0, 1, 2],
      xLabel: 'regulator position p →',
      yLabel: 'fan speed: white = target g(p), green = network a²',
    })
    drawCurve(ctx, pl, g, { color: 'rgba(248,250,252,0.85)', width: 2, dash: [6, 4] })
    drawCurve(ctx, pl, (p) => output(cur, [p])[0], { color: FWD, width: 3, glow: true })
    for (const p of grid) dot(ctx, pl.X(p), pl.Y(g(p)), 2.5, 'rgba(248,250,252,0.7)')
    const x = pl.X(s.p)
    const ya = Math.max(pl.top, Math.min(pl.bottom, pl.Y(s.a2)))
    ctx.strokeStyle = '#fb7185'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, pl.Y(s.t))
    ctx.lineTo(x, ya)
    ctx.stroke()
    dot(ctx, x, pl.Y(s.t), 5 + Math.sin(time * 5), '#f8fafc')
    dot(ctx, x, ya, 5, FWD)
    ctx.font = '10px ui-monospace, monospace'
    ctx.fillStyle = '#fda4af'
    ctx.textAlign = s.p > 1 ? 'right' : 'left'
    ctx.fillText(`e = ${f(s.e)}`, x + (s.p > 1 ? -8 : 8), (pl.Y(s.t) + ya) / 2)
    ctx.restore()
  }

  const a = st.alpha
  const steps = [
    <p key={0}>
      A reading is shown to the network: regulator at p = {f(st.p, 2)}, where the fan really runs at t = g(p) = {f(st.t)}. The input is the first signal: a⁰ = p ={' '}
      {f(st.p, 2)}.
    </p>,
    <p key={1}>
      Layer 1: n¹ = W¹a⁰ + b¹ = [{f(net.layers[0].W[0][0], 2)}·{f(st.p, 2)} + {f(net.layers[0].b[0], 2)}, {f(net.layers[0].W[1][0], 2)}·{f(st.p, 2)} +{' '}
      {f(net.layers[0].b[1], 2)}] = [{f(st.n1[0])}, {f(st.n1[1])}]. Each neuron squashes its n with logsig: a¹ = [{f(st.a1[0])}, {f(st.a1[1])}].
    </p>,
    <p key={2}>
      Layer 2: n² = W²a¹ + b² = {f(net.layers[1].W[0][0], 2)}·{f(st.a1[0])} + {f(net.layers[1].W[0][1], 2)}·{f(st.a1[1])} + {f(net.layers[1].b[0], 2)} = {f(st.n2)}.
      The output neuron is linear, so a² = n² = {f(st.a2)}.
    </p>,
    <p key={3}>
      The error: e = t − a² = {f(st.t)} − {f(st.a2)} = {f(st.e)}. The network said {f(st.a2)}, the fan really ran at {f(st.t)}. Now the blame has to be shared
      among the weights.
    </p>,
    <p key={4}>
      Start at the output: s² = −2 · f²′(n²) · e = −2 · 1 · ({f(st.e)}) = {f(st.s2)}. A linear neuron has derivative 1. s² says how fast the squared error
      changes when n² changes.
    </p>,
    <p key={5}>
      Chain rule, one layer back: s¹ = F¹′(n¹)(W²)ᵀs². Neuron 1: (1 − a¹)(a¹) = {fs(st.d1[0])}, times w² = {f(net.layers[1].W[0][0], 2)}, times s² = {f(st.s2)}{' '}
      gives {fs(st.s1[0])}. Neuron 2: {fs(st.d1[1])} · {f(net.layers[1].W[0][1], 2)} · {f(st.s2)} = {fs(st.s1[1])}.
      {Math.max(...st.d1) < 0.02 ? ' Both derivatives are almost zero because the neurons are saturated, so hardly any blame gets through.' : ''}
    </p>,
    <p key={6}>
      Update layer 2: W² ← W² − α s²(a¹)ᵀ = [{f(net.layers[1].W[0][0])}, {f(net.layers[1].W[0][1])}] − {a}·({f(st.s2)})·[{f(st.a1[0])}, {f(st.a1[1])}] = [
      {f(st.next.layers[1].W[0][0])}, {f(st.next.layers[1].W[0][1])}]. b² ← {f(net.layers[1].b[0])} − {a}·({f(st.s2)}) = {f(st.next.layers[1].b[0])}.
    </p>,
    <p key={7}>
      Update layer 1: W¹ ← W¹ − α s¹(a⁰)ᵀ = [{f(st.next.layers[0].W[0][0])}; {f(st.next.layers[0].W[1][0])}], b¹ ← b¹ − α s¹ = [{f(st.next.layers[0].b[0])};{' '}
      {f(st.next.layers[0].b[1])}]. Each weight moved by −α · (its neuron&apos;s sensitivity) · (the signal on that wire). One iteration is done.
    </p>,
  ]
  const happening = sim.lost ? (
    <p>The weights grew without limit and left the map: α = {alpha} is too large for this network. Press Reset and use a smaller α.</p>
  ) : mode === 'run' ? (
    <>
      <p>
        Training fast: {sim.iter} iterations so far, each one the same eight steps on one random regulator position. Mean square error over the 21 positions:{' '}
        {mse.toFixed(4)}.
      </p>
      <p>
        {Math.max(...st.d1) < 0.02
          ? `The hidden neurons are saturated: f′ = ${fs(st.d1[0])} and ${fs(st.d1[1])}, so s¹ is almost zero and layer 1 does not learn. Only b² moves, which gives a flat line.`
          : mse < 0.002
            ? 'The green curve now lies on the white one. Two logsig neurons were enough for this gentle curve.'
            : `Latest reading p = ${f(st.p, 2)}: e = ${f(st.e)}, s² = ${f(st.s2)}, s¹ = [${fs(st.s1[0])}, ${fs(st.s1[1])}]. Watch the green curve bend towards the white one.`}
      </p>
    </>
  ) : (
    steps[ph]
  )

  return (
    <LabShell
      labId="backprop"
      happening={happening}
      actions={{
        break: {
          label: 'Start with large weights (saturated)',
          run: () => {
            setInit('saturated')
            setReset((r) => r + 1)
            setMode('auto')
          },
        },
        fix: {
          label: 'Small starting weights, train fast',
          run: () => {
            setInit('book')
            setReset((r) => r + 1)
            setMode('run')
          },
        },
      }}
      panel={
        <>
          <Group title="Step through one iteration">
            <Seg
              value={mode}
              onChange={setMode}
              options={[
                { value: 'step', label: 'Step by hand' },
                { value: 'auto', label: 'Auto-play' },
                { value: 'run', label: 'Train fast' },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Btn
                tone="go"
                onClick={() => {
                  setMode('step')
                  advance()
                }}
              >
                Next step →
              </Btn>
              <Btn onClick={() => setReset((r) => r + 1)}>Reset</Btn>
            </div>
            <ol className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] leading-snug">
              {PHASES.map((name, i) => (
                <li key={name} className={mode !== 'run' && i === ph ? 'font-semibold text-sky-200' : mode !== 'run' && i < ph ? 'text-slate-400' : 'text-slate-600'}>
                  {i + 1}. {name}
                </li>
              ))}
            </ol>
            <Slider label="Learning rate α" value={alpha} min={0.01} max={0.5} step={0.01} onChange={setAlpha} fmt={(v) => v.toFixed(2)} />
          </Group>
          <Group title="This iteration">
            <Stats>
              <Stat label="Iteration" value={sim.iter + 1} />
              <Stat label="Input p" value={f(st.p, 2)} />
              <Stat label="Target t" value={f(st.t)} />
              <Stat label="Output a²" value={f(st.a2)} />
              <Stat label="Error e" value={f(st.e)} tone={Math.abs(st.e) < 0.05 ? 'good' : 'plain'} />
              <Stat label="MSE, 21 positions" value={mse.toFixed(4)} tone={mse < 0.002 ? 'good' : 'plain'} />
              <Stat label="Hidden f′ (max 0.25)" value={`${fs(st.d1[0])}, ${fs(st.d1[1])}`} tone={Math.max(...st.d1) < 0.02 ? 'bad' : 'plain'} />
              <Stat label="s¹" value={<span className="text-xs">{fs(st.s1[0])}, {fs(st.s1[1])}</span>} />
            </Stats>
          </Group>
          <Group title="Starting weights">
            <Seg
              value={init}
              onChange={(v) => {
                setInit(v)
                setReset((r) => r + 1)
              }}
              options={[
                { value: 'book', label: 'Book values' },
                { value: 'random', label: 'Random small' },
                { value: 'saturated', label: 'Large (saturated)' },
              ]}
            />
            <p className="text-[11px] leading-snug text-slate-500">
              Book values: W¹ = [−0.27; −0.41], b¹ = [−0.48; −0.13], W² = [0.09 −0.17], b² = 0.48, first input p = 1. The numbers on screen match the worked example
              in the textbook.
            </p>
          </Group>
        </>
      }
    >
      <Canvas2D draw={draw} />
    </LabShell>
  )
}
