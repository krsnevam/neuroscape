import { useMemo, useRef, useState } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, drawAxes, makePlot, useTicker } from '../../../ui/lab/Canvas2D'
import { Group, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import { confusion, createNetwork, createTrainer, gauss, output, rates, rng, roc, shuffle, type Sample } from '../../../engine'

interface Tx {
  amt: number
  logA: number
  hour: number
  fraud: 0 | 1
}

/** 800 payments, about 6% fraud. Fraud is mostly large and late at night, but a quarter of it looks ordinary. */
const payments: Tx[] = (() => {
  const rand = rng(77)
  const clamp = (v: number) => Math.min(5, Math.max(1, v))
  const wrap = (h: number) => ((h % 24) + 24) % 24
  return Array.from({ length: 800 }, () => {
    const fraud = rand() < 0.06 ? 1 : 0
    const odd = fraud && rand() < 0.75
    const logA = clamp(odd ? 4.0 + gauss(rand) * 0.45 : 2.6 + gauss(rand) * 0.65)
    const hour = wrap(odd ? 2.5 + gauss(rand) * 2.2 : 14 + gauss(rand) * 4.5)
    return { amt: Math.round(10 ** logA), logA, hour, fraud }
  })
})()

const features = (logA: number, hour: number) => [(logA - 3) / 2, Math.cos((2 * Math.PI * (hour - 2.5)) / 24)]
const toSample = (t: Tx): Sample => ({ p: features(t.logA, t.hour), t: [t.fraud] })
const trainTx = payments.slice(0, 480)
const testTx = payments.slice(480)
const testLabels = testTx.map((t) => t.fraud)
const rupees = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`

const GX = 40
const GY = 26

export default function FraudLab() {
  const [thr, setThr] = useState(0.5)
  const [balance, setBalance] = useState(false)
  useTicker(250)

  const sim = useMemo(() => {
    const net = createNetwork(2, [6, 1], ['tansig', 'logsig'], { seed: 4 })
    let train = trainTx.map(toSample)
    if (balance) {
      const frauds = train.filter((s) => s.t[0] === 1)
      const copies = Math.floor((train.length - frauds.length) / Math.max(1, frauds.length)) - 1
      for (let c = 0; c < copies; c++) train = train.concat(frauds)
    }
    train = shuffle(train, rng(2))
    return {
      net,
      trainer: createTrainer(net),
      train,
      its: 0,
      scores: testTx.map(() => 0.5),
      heat: new Float32Array(GX * GY),
      curve: roc([0.5], [1]),
    }
  }, [balance])
  const frame = useRef(0)

  const c = confusion(sim.scores, testLabels, thr)
  const r = rates(c)
  const lost = testTx.reduce((s, t, i) => s + (t.fraud && sim.scores[i] < thr ? t.amt : 0), 0)

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    if (sim.its < 6000) {
      // Mini-batches of 160 keep each frame cheap enough for a phone
      for (let k = 0; k < 10; k++) {
        const at = (sim.its * 160) % Math.max(1, sim.train.length - 160)
        sim.trainer.step(sim.train.slice(at, at + 160), { alpha: 0.5, gamma: 0.9, loss: 'xent' })
        sim.its++
      }
    }
    if (frame.current++ % 8 === 0) {
      sim.scores = testTx.map((tx) => output(sim.net, features(tx.logA, tx.hour))[0])
      sim.curve = roc(sim.scores, testLabels)
      for (let j = 0; j < GY; j++)
        for (let i = 0; i < GX; i++)
          sim.heat[j * GX + i] = output(sim.net, features(1 + (4 * (i + 0.5)) / GX, (24 * (j + 0.5)) / GY))[0]
    }
    const pl = makePlot(w, h, [1, 5], [0, 24], { l: 52, r: 36 })
    const cw = (pl.right - pl.left) / GX
    const ch = (pl.bottom - pl.top) / GY
    for (let j = 0; j < GY; j++)
      for (let i = 0; i < GX; i++) {
        const s = sim.heat[j * GX + i]
        ctx.fillStyle = s >= thr ? `rgba(244,63,94,${0.14 + s * 0.22})` : `rgba(56,189,248,${0.03 + (1 - s) * 0.03})`
        ctx.fillRect(pl.left + i * cw, pl.bottom - (j + 1) * ch, cw + 0.5, ch + 0.5)
      }
    drawAxes(ctx, pl, {
      xTicks: [1, 2, 3, 4, 5],
      yTicks: [0, 6, 12, 18, 24],
      xFmt: (v) => ['₹10', '₹100', '₹1,000', '₹10,000', '₹1,00,000'][v - 1],
      yFmt: (v) => ['12 am', '6 am', '12 pm', '6 pm', '12 am'][v / 6],
      xLabel: 'amount',
      yLabel: 'time of payment · red area = alarm rings',
    })
    testTx.forEach((tx, i) => {
      const x = pl.X(tx.logA)
      const y = pl.Y(tx.hour)
      const flagged = sim.scores[i] >= thr
      if (tx.fraud) {
        dot(ctx, x, y, 4.5, '#fb7185')
        ctx.lineWidth = 2
        ctx.strokeStyle = flagged ? '#f8fafc' : `rgba(248,113,113,${0.5 + 0.5 * Math.sin(t * 6)})`
        ctx.beginPath()
        ctx.arc(x, y, flagged ? 7 : 8 + 2 * Math.sin(t * 6), 0, Math.PI * 2)
        ctx.stroke()
      } else if (flagged) {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 1.5
        ctx.strokeRect(x - 4, y - 4, 8, 8)
      } else dot(ctx, x, y, 2, 'rgba(148,163,184,0.6)')
    })
    // ROC inset
    const size = Math.min(130, w * 0.3)
    const rx = pl.right - size - 6
    const ry = pl.top + 20
    ctx.fillStyle = 'rgba(2,6,23,0.85)'
    ctx.fillRect(rx - 6, ry - 18, size + 12, size + 24)
    ctx.strokeStyle = 'rgba(148,163,184,0.4)'
    ctx.lineWidth = 1
    ctx.strokeRect(rx, ry, size, size)
    ctx.beginPath()
    ctx.moveTo(rx, ry + size)
    ctx.lineTo(rx + size, ry)
    ctx.setLineDash([3, 3])
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    sim.curve.points.forEach(([fpr, tpr], i) => {
      if (i === 0) ctx.moveTo(rx + fpr * size, ry + size - tpr * size)
      else ctx.lineTo(rx + fpr * size, ry + size - tpr * size)
    })
    ctx.strokeStyle = '#c4b5fd'
    ctx.lineWidth = 2
    ctx.stroke()
    dot(ctx, rx + (1 - r.specificity) * size, ry + size - r.sensitivity * size, 5, '#f8fafc')
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px ui-monospace, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`ROC · area ${sim.curve.auc.toFixed(2)}`, rx, ry - 6)
  }

  const cell = 'flex flex-col items-center rounded-md px-2 py-2 text-center'
  return (
    <LabShell
      labId="fraud"
      happening={
        <>
          <p>
            The network gives every payment a score from 0 to 1. Above {thr.toFixed(2)} the alarm rings; that is the red area.
            {sim.its < 6000 ? ' It is still training, so the red area is still moving.' : ''}
          </p>
          <p>
            Of the {c.tp + c.fn} frauds in the test set it catches {c.tp} (white rings) and misses {c.fn} (pulsing red rings). It blocks {c.fp}{' '}
            genuine payments (amber squares).
          </p>
          <p>
            Accuracy is {(r.accuracy * 100).toFixed(0)}% mostly because {c.tn} genuine payments are easy to pass. The number that matters to the bank
            is fraud caught: {(r.sensitivity * 100).toFixed(0)}%.
          </p>
        </>
      }
      actions={{
        break: { label: 'Threshold 0.5, original data', run: () => { setBalance(false); setThr(0.5) } },
        fix: { label: 'Rebalance the training data', run: () => setBalance(true) },
      }}
      panel={
        <>
          <Group title="The alarm">
            <Slider label="Ring the alarm when the output is above" value={thr} min={0.02} max={0.98} step={0.01} onChange={setThr} fmt={(v) => v.toFixed(2)} />
            <Toggle
              label="Rebalance the training data"
              hint="Repeat the fraud examples until both classes are equal"
              value={balance}
              onChange={setBalance}
            />
          </Group>
          <Group title={`Confusion matrix · ${testTx.length} test payments`}>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className={`${cell} bg-emerald-400/15 text-emerald-200`}>
                <span className="font-mono text-xl">{c.tp}</span>fraud caught
              </div>
              <div className={`${cell} bg-rose-500/20 text-rose-200`}>
                <span className="font-mono text-xl">{c.fn}</span>fraud missed
              </div>
              <div className={`${cell} bg-amber-400/15 text-amber-200`}>
                <span className="font-mono text-xl">{c.fp}</span>genuine blocked
              </div>
              <div className={`${cell} bg-white/5 text-slate-300`}>
                <span className="font-mono text-xl">{c.tn}</span>genuine passed
              </div>
            </div>
          </Group>
          <Group title="What it means">
            <Stats>
              <Stat label="Accuracy" value={`${(r.accuracy * 100).toFixed(0)}%`} />
              <Stat label="Fraud caught" value={`${(r.sensitivity * 100).toFixed(0)}%`} tone={r.sensitivity < 0.6 ? 'bad' : 'good'} />
              <Stat label="Genuine passed" value={`${(r.specificity * 100).toFixed(0)}%`} />
              <Stat label="Real alarms" value={c.tp + c.fp ? `${(r.precision * 100).toFixed(0)}%` : 'no alarms'} />
              <Stat label="Money lost" value={rupees(lost)} tone={lost > 50000 ? 'bad' : 'plain'} />
              <Stat label="Angry customers" value={c.fp} tone={c.fp > 30 ? 'warn' : 'plain'} />
            </Stats>
          </Group>
        </>
      }
    >
      <Canvas2D draw={onDraw} />
    </LabShell>
  )
}
