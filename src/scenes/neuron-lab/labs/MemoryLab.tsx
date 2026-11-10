import { useMemo, useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Slider, Stat, Stats } from '../../../ui/lab/controls'
import { rng, shuffle } from '../../../engine'
import { energy, hebbWeights, hopfieldCapacity, isStable, netInput, overlap, updateNeuron } from '../../../engine/hopfield'
import { card, clamp, line, num, pointerXY, text } from '../draw'
import { GRID, N, library, type Picture } from '../patterns'

const COLOR = '#fdba74'
const CAP = hopfieldCapacity(N)
const order0 = Array.from({ length: N }, (_, i) => i)

const randomPictures = (() => {
  const rand = rng(1)
  return Array.from({ length: 12 }, (_, k) => ({ name: `Random ${k + 1}`, p: Array.from({ length: N }, () => (rand() < 0.5 ? -1 : 1)) }))
})()

interface Sim {
  a: number[]
  queue: number[]
  flipsThisSweep: number
  status: 'idle' | 'recalling' | 'settled'
  trace: number[]
  updates: number
  flips: number
  flash: Float32Array
  cursor: number
  acc: number
  /** name of the picture the state was loaded from, and how many pixels were then flipped */
  from: string | null
  damaged: number
}

const matchPct = (a: number[], p: number[]) => Math.round(((overlap(a, p) + 1) / 2) * N)

export default function MemoryLab() {
  const [stored, setStored] = useState<Picture[]>(library.slice(0, 3))
  const [noise, setNoise] = useState(15)
  const [speed, setSpeed] = useState(24)
  const [, bump] = useState(0)
  const seeds = useRef({ noise: 1, random: 0, mine: 0 })
  const paint = useRef<{ value: number } | null>(null)
  const geo = useRef({ x: 0, y: 0, s: 1 })
  useTicker(200)

  const W = useMemo(() => hebbWeights(stored.map((s) => s.p), N), [stored])
  const sim = useRef<Sim | null>(null)
  if (!sim.current) {
    const a = library[0].p.slice()
    sim.current = { a, queue: [], flipsThisSweep: 0, status: 'idle', trace: [], updates: 0, flips: 0, flash: new Float32Array(N).fill(-10), cursor: -1, acc: 0, from: 'Smiley', damaged: 0 }
  }
  const s = sim.current
  // Weights changed (a picture was stored or removed): energies are measured on the new landscape
  const lastW = useRef(W)
  if (lastW.current !== W || s.trace.length === 0) {
    lastW.current = W
    s.trace = [energy(W, s.a)]
    s.updates = 0
    s.flips = 0
    if (s.status === 'settled') s.status = 'idle'
  }

  const resetTrace = () => {
    s.trace = [energy(W, s.a)]
    s.updates = 0
    s.flips = 0
    s.queue = []
    s.flipsThisSweep = 0
    s.cursor = -1
  }
  const load = (pic: Picture) => {
    s.a = pic.p.slice()
    s.from = pic.name
    s.damaged = 0
    s.status = 'idle'
    resetTrace()
    bump((v) => v + 1)
  }
  const corrupt = (pct = noise) => {
    const rand = rng(seeds.current.noise++ * 31 + 7)
    const k = Math.round((pct / 100) * N)
    for (const i of shuffle(order0, rand).slice(0, k)) {
      s.a[i] = -s.a[i]
      s.flash[i] = performance.now() / 1000
    }
    s.damaged += k
    s.status = 'idle'
    resetTrace()
    bump((v) => v + 1)
  }
  const recall = () => {
    resetTrace()
    s.status = 'recalling'
    bump((v) => v + 1)
  }
  /** One neuron looks at all the others and takes the sign of its net input. */
  const updateOne = (now: number) => {
    if (s.queue.length === 0) {
      s.queue = shuffle(order0, Math.random)
      s.flipsThisSweep = 0
    }
    const i = s.queue.pop()!
    s.cursor = i
    if (updateNeuron(W, s.a, i)) {
      s.flash[i] = now
      s.flips++
      s.flipsThisSweep++
    }
    s.updates++
    s.trace.push(energy(W, s.a))
    if (s.trace.length > 1200) s.trace.splice(1, 1)
    if (s.queue.length === 0 && s.flipsThisSweep === 0) s.status = 'settled'
    else if (isStableFast()) s.status = 'settled'
  }
  const isStableFast = () => s.flipsThisSweep > 0 && s.queue.length % 8 === 0 && isStable(W, s.a)
  const stepEight = () => {
    if (s.status !== 'recalling') {
      resetTrace()
      s.status = 'recalling'
    }
    const now = performance.now() / 1000
    for (let k = 0; k < 8 && s.status === 'recalling'; k++) updateOne(now)
    if (s.status === 'recalling') s.status = 'idle'
    bump((v) => v + 1)
  }
  const store = (pic: Picture) =>
    setStored((list) => (list.some((q) => q.p.every((v, i) => v === pic.p[i])) ? list : [...list, pic]))

  const overlaps = stored.map((q) => overlap(s.a, q.p))
  let bestI = -1
  overlaps.forEach((o, i) => {
    if (bestI < 0 || Math.abs(o) > Math.abs(overlaps[bestI])) bestI = i
  })
  const bestO = bestI >= 0 ? overlaps[bestI] : 0
  const exact = bestI >= 0 && bestO === 1
  const negative = bestI >= 0 && bestO === -1
  const stable = stored.length > 0 && isStable(W, s.a)
  const E = s.trace[s.trace.length - 1]
  const overloaded = stored.length > CAP
  const target = s.from ? stored.find((q) => q.name === s.from) : undefined

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => {
    const now = performance.now() / 1000
    if (s.status === 'recalling' && stored.length > 0) {
      s.acc += dt * speed
      let budget = 16
      while (s.acc >= 1 && budget-- > 0 && s.status === 'recalling') {
        s.acc -= 1
        updateOne(now)
      }
      if (s.acc > 4) s.acc = 0
    } else if (s.status === 'recalling') s.status = 'idle'

    const wide = w >= 700
    const pad = wide ? Math.min(h - 96, w * 0.44) : Math.min(w * 0.52, h * 0.5 - 30)
    const gx = wide ? 22 : 10
    const gy = wide ? 48 : 30
    geo.current = { x: gx, y: gy, s: pad }
    const cell = pad / GRID
    text(ctx, 'Network state a: 64 neurons, lit = +1, dark = −1', gx, gy - 10, { size: wide ? 12 : 10, color: '#f8fafc', bold: true, maxWidth: wide ? pad + 60 : w - 20 })
    for (let i = 0; i < N; i++) {
      const x = gx + (i % GRID) * cell
      const y = gy + Math.floor(i / GRID) * cell
      const age = now - s.flash[i]
      ctx.fillStyle = s.a[i] > 0 ? COLOR : '#1e293b'
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2)
      if (age < 0.7) {
        ctx.fillStyle = `rgba(255,255,255,${(0.85 * (1 - age / 0.7)).toFixed(2)})`
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2)
      }
      if (target && s.a[i] !== target.p[i]) {
        // a pixel that differs from the picture we started from
        ctx.fillStyle = '#f43f5e'
        ctx.beginPath()
        ctx.arc(x + cell / 2, y + cell / 2, Math.max(2, cell * 0.09), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (s.status === 'recalling' && s.cursor >= 0) {
      ctx.strokeStyle = '#f8fafc'
      ctx.lineWidth = 2
      ctx.strokeRect(gx + (s.cursor % GRID) * cell + 1, gy + Math.floor(s.cursor / GRID) * cell + 1, cell - 2, cell - 2)
    }
    const under = gy + pad + 14
    if (wide) {
      text(ctx, target ? `red dot: differs from "${target.name}"` : 'tap or drag on the grid to draw', gx, under, { size: 10, color: target ? '#fb7185' : '#94a3b8' })
      text(ctx, 'white flash: a neuron just flipped   ·   white frame: the neuron being updated', gx, under + 14, { size: 10, color: '#94a3b8', maxWidth: pad })
      text(ctx, 'tap or drag on the grid to draw your own picture', gx, under + 28, { size: 10, color: '#94a3b8', maxWidth: pad })
    }

    // ── Stored pictures with their overlap with the current state ──
    const sx = gx + pad + (wide ? 26 : 10)
    const sw = w - sx - (wide ? 14 : 6)
    const sy = wide ? 30 : gy - 8
    const sh = wide ? Math.max(120, h * 0.4) : pad + 8
    card(ctx, sx, sy, sw, sh, `Stored: ${stored.length} of about ${CAP.toFixed(1)} (0.138 N)`, overloaded ? '#fb7185' : '#34d399')
    // capacity bar
    const cbx = sx + 10
    const cbw = sw - 20
    ctx.fillStyle = 'rgba(148,163,184,0.15)'
    ctx.fillRect(cbx, sy + 24, cbw, 5)
    ctx.fillStyle = overloaded ? '#fb7185' : '#34d399'
    ctx.fillRect(cbx, sy + 24, cbw * Math.min(1, stored.length / 14), 5)
    line(ctx, cbx + (cbw * CAP) / 14, sy + 20, cbx + (cbw * CAP) / 14, sy + 33, '#f8fafc', 1.5)
    const count = Math.max(1, stored.length)
    const colsN = Math.max(1, Math.min(count, Math.floor(cbw / (wide ? 62 : 44))))
    const rowsN = Math.ceil(count / colsN)
    const th = Math.min((cbw - (colsN - 1) * 6) / colsN, (sh - 44 - rowsN * 24) / rowsN)
    const size = Math.max(14, th)
    stored.forEach((q, k) => {
      const x = cbx + (k % colsN) * (size + 6)
      const y = sy + 40 + Math.floor(k / colsN) * (size + 24)
      const c = size / GRID
      const isBest = k === bestI && Math.abs(overlaps[k]) > 0.5
      ctx.fillStyle = '#0b1020'
      ctx.fillRect(x, y, size, size)
      ctx.fillStyle = isBest ? COLOR : '#94a3b8'
      for (let i = 0; i < N; i++) if (q.p[i] > 0) ctx.fillRect(x + (i % GRID) * c, y + Math.floor(i / GRID) * c, c + 0.3, c + 0.3)
      if (isBest) {
        ctx.strokeStyle = '#f8fafc'
        ctx.lineWidth = 1.5
        ctx.strokeRect(x - 2, y - 2, size + 4, size + 4)
      }
      if (size >= 26) text(ctx, q.name, x, y + size + 10, { size: 9, color: isBest ? '#f8fafc' : '#94a3b8', maxWidth: size + 4 })
      text(ctx, `${matchPct(s.a, q.p)}/64`, x, y + size + (size >= 26 ? 20 : 10), { size: 9, color: isBest ? COLOR : '#64748b', maxWidth: size + 4 })
    })
    if (stored.length === 0) text(ctx, 'Nothing stored: W = 0', cbx, sy + 56, { size: 11, color: '#94a3b8' })

    // ── Energy against neuron updates ──────────────────────────
    const ex = wide ? sx : 8
    const ey = wide ? sy + sh + 10 : gy + pad + 12
    const ew = wide ? sw : w - 16
    const eh = h - ey - 8
    card(ctx, ex, ey, ew, eh, `Energy E = −½ aᵀWa = ${num(E)}`, COLOR)
    const px0 = ex + 44
    const px1 = ex + ew - 12
    const py0 = ey + 30
    const py1 = ey + eh - 22
    if (py1 - py0 > 24) {
      const marks = stored.map((q) => energy(W, q.p))
      const lo = Math.min(...s.trace, ...(target ? [energy(W, target.p)] : marks.slice(0, 1))) - 0.5
      const hi = Math.max(...s.trace, lo + 2) + 0.5
      const span = Math.max(64, s.trace.length - 1)
      const X = (i: number) => px0 + ((px1 - px0) * i) / span
      const Y = (v: number) => py1 - ((clamp(v, lo, hi) - lo) / (hi - lo)) * (py1 - py0)
      ctx.strokeStyle = 'rgba(148,163,184,0.2)'
      ctx.lineWidth = 1
      ctx.strokeRect(px0, py0, px1 - px0, py1 - py0)
      text(ctx, num(hi, 1), px0 - 4, py0 + 8, { size: 9, align: 'right', color: '#94a3b8' })
      text(ctx, num(lo, 1), px0 - 4, py1, { size: 9, align: 'right', color: '#94a3b8' })
      text(ctx, 'E', px0 - 16, (py0 + py1) / 2, { size: 10, align: 'right', color: '#94a3b8' })
      text(ctx, `neuron updates → (${s.updates} done, ${s.flips} flips)`, px1, py1 + 14, { size: 9, align: 'right', color: '#94a3b8' })
      text(ctx, '0', px0, py1 + 14, { size: 9, align: 'center', color: '#94a3b8' })
      for (let k = 64; k < span; k += 64) line(ctx, X(k), py0, X(k), py1, 'rgba(148,163,184,0.12)')
      if (target) {
        const te = energy(W, target.p)
        line(ctx, px0, Y(te), px1, Y(te), 'rgba(52,211,153,0.6)', 1, [5, 4])
        text(ctx, `energy of "${target.name}"`, px1 - 4, Y(te) - 4, { size: 9, align: 'right', color: '#6ee7b7' })
      }
      ctx.beginPath()
      s.trace.forEach((v, i) => {
        // staircase: the energy only changes when a neuron flips
        if (i === 0) ctx.moveTo(X(0), Y(v))
        else {
          ctx.lineTo(X(i), Y(s.trace[i - 1]))
          ctx.lineTo(X(i), Y(v))
        }
      })
      ctx.strokeStyle = COLOR
      ctx.lineWidth = 2.2
      ctx.stroke()
      const li = s.trace.length - 1
      ctx.beginPath()
      ctx.arc(X(li), Y(E), 5 + (s.status === 'recalling' ? Math.sin(t * 8) * 1.5 : 0), 0, Math.PI * 2)
      ctx.fillStyle = '#f8fafc'
      ctx.fill()
      if (s.status === 'settled')
        text(ctx, exact ? 'settled at the bottom of a stored valley' : negative ? 'settled on a negative image' : 'settled in a valley that is not a stored picture', px0 + 6, py0 + 12, {
          size: 10,
          color: exact ? '#6ee7b7' : '#fbbf24',
          maxWidth: px1 - px0 - 12,
        })
    }
  }

  const cellAt = (e: PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = pointerXY(e)
    const g = geo.current
    const cx = Math.floor(((x - g.x) / g.s) * GRID)
    const cy = Math.floor(((y - g.y) / g.s) * GRID)
    return cx >= 0 && cx < GRID && cy >= 0 && cy < GRID ? cy * GRID + cx : -1
  }
  const paintAt = (i: number) => {
    if (i < 0 || !paint.current || s.a[i] === paint.current.value) return
    s.a[i] = paint.current.value
    s.flash[i] = performance.now() / 1000
    s.status = 'idle'
    resetTrace()
    bump((v) => v + 1)
  }

  const breakIt = () => {
    setStored([...library, ...randomPictures.slice(0, 4)])
    s.a = library[0].p.slice()
    s.from = 'Smiley'
    s.damaged = 0
    seeds.current.noise = 1
    corrupt(15)
    s.trace = []
    s.status = 'recalling'
  }
  const fixIt = () => {
    setStored(library.slice(0, 3))
    s.a = library[0].p.slice()
    s.from = 'Smiley'
    s.damaged = 0
    seeds.current.noise = 1
    corrupt(15)
    s.trace = []
    s.status = 'recalling'
  }

  const isLibrary = library.find((q) => q.p.every((v, i) => v === s.a[i]))
  const wantFlip = stored.length ? order0.filter((i) => netInput(W, s.a, i) * s.a[i] < 0).length : 0
  return (
    <LabShell
      labId="memory"
      actions={{
        break: { label: 'Store 12 pictures, then recall the smiley', run: breakIt },
        fix: { label: 'Back to 3 pictures, recall again', run: fixIt },
      }}
      happening={
        <>
          <p>
            {stored.length} picture{stored.length === 1 ? '' : 's'} stored in {N} neurons using {(N * (N - 1)) / 2} distinct weights. The
            rule of thumb allows about {CAP.toFixed(1)}, so the memory is {overloaded ? 'overloaded' : 'within its limit'}.
          </p>
          <p>
            {s.status === 'recalling'
              ? `Recalling: ${s.updates} neurons updated, ${s.flips} flipped, energy now ${num(E)}. Each flip can only lower the energy.`
              : s.status === 'settled'
                ? `Settled after ${s.updates} updates and ${s.flips} flips at energy ${num(E)}: no neuron wants to change.`
                : stored.length === 0
                  ? 'With nothing stored every weight is zero, so no neuron has a reason to change.'
                  : `Waiting. ${wantFlip} of ${N} neurons disagree with their net input and would flip if updated. Energy ${num(E)}.`}
          </p>
          {bestI >= 0 && (
            <p>
              {exact
                ? `The state is exactly "${stored[bestI].name}".`
                : negative
                  ? `The state is the negative of "${stored[bestI].name}", which is always a resting state too.`
                  : stable
                    ? `This is a spurious state: stable, but not a stored picture. The closest is "${stored[bestI].name}" with ${matchPct(s.a, stored[bestI].p)} of 64 pixels.`
                    : `Closest stored picture: "${stored[bestI].name}", ${matchPct(s.a, stored[bestI].p)} of 64 pixels match.`}
              {target && s.status === 'settled' && !exact ? ` It started from "${target.name}" with ${s.damaged} pixels flipped and did not get back.` : ''}
            </p>
          )}
        </>
      }
      panel={
        <>
          <Group title="1. Put a picture on the grid">
            <div className="flex flex-wrap gap-1.5">
              {library.map((q) => (
                <Btn key={q.name} onClick={() => load(q)}>
                  {q.name}
                </Btn>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn
                onClick={() => {
                  s.a = new Array(N).fill(-1)
                  s.from = null
                  s.damaged = 0
                  s.status = 'idle'
                  resetTrace()
                  bump((v) => v + 1)
                }}
              >
                Clear the grid
              </Btn>
              <Btn
                onClick={() => {
                  s.a = s.a.map((v) => -v)
                  s.status = 'idle'
                  resetTrace()
                  bump((v) => v + 1)
                }}
              >
                Invert
              </Btn>
            </div>
          </Group>
          <Group title="2. Store (Hebb rule)">
            <div className="flex flex-wrap gap-2">
              <Btn
                tone="go"
                onClick={() => {
                  const name = isLibrary?.name ?? `Mine ${++seeds.current.mine}`
                  store({ name, p: s.a.slice() })
                  s.from = name
                  s.damaged = 0
                }}
              >
                Store what is on the grid
              </Btn>
              <Btn onClick={() => store(randomPictures[seeds.current.random++ % randomPictures.length])}>+ Random picture</Btn>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stored.map((q) => (
                <button
                  key={q.name}
                  type="button"
                  onClick={() => setStored((list) => list.filter((x) => x !== q))}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                  title="Remove from memory"
                >
                  {q.name} ×
                </button>
              ))}
            </div>
            <Btn onClick={() => setStored([])} disabled={stored.length === 0}>
              Forget everything
            </Btn>
          </Group>
          <Group title="3. Corrupt and recall">
            <Slider label="Noise: pixels to flip" value={noise} min={0} max={50} onChange={setNoise} fmt={(v) => `${v}% (${Math.round((v / 100) * N)} pixels)`} />
            <div className="flex flex-wrap gap-2">
              <Btn tone="warn" onClick={() => corrupt()}>
                Corrupt
              </Btn>
              <Btn tone="go" onClick={recall} disabled={stored.length === 0}>
                Recall
              </Btn>
              <Btn onClick={stepEight} disabled={stored.length === 0}>
                Step 8 neurons
              </Btn>
            </div>
            <Slider label="Recall speed" value={speed} min={2} max={120} onChange={setSpeed} fmt={(v) => `${v} neurons / s`} />
          </Group>
          <Group title="Live numbers">
            <Stats>
              <Stat label="Stored P" value={stored.length} tone={overloaded ? 'bad' : 'good'} />
              <Stat label="Capacity 0.138 N" value={CAP.toFixed(1)} />
              <Stat label="Weights N(N−1)" value={N * (N - 1)} />
              <Stat label="Energy E" value={num(E)} />
              <Stat label="Updates / flips" value={`${s.updates} / ${s.flips}`} />
              <Stat
                label="State"
                value={exact ? stored[bestI].name : negative ? 'negative' : stable ? 'spurious' : s.status === 'recalling' ? 'recalling' : 'not stable'}
                tone={exact ? 'good' : stable ? 'bad' : 'warn'}
              />
            </Stats>
            <p className="text-[11px] leading-snug text-slate-500">
              One neuron update costs {N - 1} multiplications; one sweep of all {N} neurons costs {N * (N - 1)}.
            </p>
          </Group>
        </>
      }
    >
      <Canvas2D
        draw={onDraw}
        className="touch-none"
        onPointerDown={(e) => {
          const i = cellAt(e)
          if (i < 0) return
          e.currentTarget.setPointerCapture(e.pointerId)
          paint.current = { value: -s.a[i] }
          s.from = null
          s.damaged = 0
          paintAt(i)
        }}
        onPointerMove={(e) => paint.current && paintAt(cellAt(e))}
        onPointerUp={() => (paint.current = null)}
        onPointerCancel={() => (paint.current = null)}
      />
    </LabShell>
  )
}
