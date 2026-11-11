import { useMemo, useState, type ReactNode } from 'react'
import Canvas2D, { dot, drawAxes, drawCurve, makePlot } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats, Toggle } from '../../../ui/lab/controls'
import {
  createStopRun,
  distinctNeurons,
  gauss,
  initNetwork,
  output,
  paramCount,
  rng,
  type InitScheme,
  type Sample,
  type StopReason,
} from '../../../engine'
import type { StepActions } from '../../../ui/lab/LabShell'

/** 40 students: hours of sleep and marks in the next morning's quiz. Marks rise with sleep, then dip for the oversleepers. */
const S = 6
const quiz = (() => {
  const rand = rng(11)
  const truth = (h: number) => 28 + 58 * Math.exp(-(((h - 7.3) / 2.1) ** 2))
  return Array.from({ length: 40 }, (_, i) => {
    const h = 2 + (i + rand()) * (8.5 / 40)
    return { h, m: Math.max(0, Math.min(100, truth(h) + gauss(rand) * 6)), val: i % 3 === 1 }
  })
})()
const pn = (h: number) => (h - 6.25) / 4.25
const toSample = (r: { h: number; m: number }): Sample => ({ p: [pn(r.h)], t: [r.m / 50 - 1] })
const train = quiz.filter((r) => !r.val).map(toSample)
const val = quiz.filter((r) => r.val).map(toSample)
const meanMark = quiz.filter((r) => !r.val).reduce((s, r) => s + r.m, 0) / train.length
const marks = (mse: number) => Math.sqrt(mse) * 50

const MIN_GRAD = 1e-4
const PATIENCE = 400
const neuronColors = ['#38bdf8', '#f472b6', '#a3e635', '#fbbf24', '#c084fc', '#fb7185']
const schemeNames: Record<InitScheme, string> = {
  random: 'Small random',
  zero: 'All zero',
  equal: 'All equal',
  nw: 'Nguyen-Widrow',
}
const stopText: Record<StopReason, string> = {
  goal: 'Goal met',
  gradient: 'Gradient below minimum',
  validation: 'Validation stopped improving',
  maxit: 'Maximum iterations',
}

/**
 * The "Starting weights" view of the Error Valley station: a 1-6-1 network trained from four
 * different starting points, with all four stopping criteria live.
 */
export function useStartWeights(): {
  scene: ReactNode
  panel: ReactNode
  happening: ReactNode
  actions: StepActions
} {
  const [scheme, setScheme] = useState<InitScheme>('random')
  const [maxIt, setMaxIt] = useState(4000)
  const [early, setEarly] = useState(true)
  const [goal, setGoal] = useState(0)
  const [version, setVersion] = useState(0)

  const sim = useMemo(
    () =>
      createStopRun(initNetwork(1, S, scheme, 3 + version), train, val, {
        alpha: 0.3,
        gamma: 0.9,
        maxIt,
        goal: goal > 0 ? (goal / 50) ** 2 : 0,
        minGrad: MIN_GRAD,
        patience: early ? PATIENCE : 0,
      }),
    [scheme, maxIt, early, goal, version],
  )

  const shown = sim.stopped === 'validation' ? sim.best : sim.net
  const distinct = distinctNeurons(shown)

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    sim.step(8)
    const net = sim.stopped === 'validation' ? sim.best : sim.net
    const L1 = net.layers[0]
    const split1 = Math.round(h * 0.5)
    const split2 = Math.round(h * 0.73)

    // Top: the data and the fit
    const fit = makePlot(w, h, [2, 10.5], [0, 100], { t: 14, b: h - split1 + 22 })
    drawAxes(ctx, fit, { xTicks: [2, 4, 6, 8, 10], yTicks: [0, 25, 50, 75, 100], yLabel: 'quiz marks', xFmt: (v) => `${v} h` })
    for (const r of quiz) dot(ctx, fit.X(r.h), fit.Y(r.m), 3.5, r.val ? '#fbbf24' : '#38bdf8')
    drawCurve(ctx, fit, (x) => (output(net, [pn(x)])[0] + 1) * 50, { color: '#fde047', width: 3, glow: true })
    ctx.font = '10px ui-monospace, monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#fde047'
    ctx.fillText('network output', fit.right - 4, fit.top + 12)
    ctx.fillStyle = '#64748b'
    ctx.fillText('hours of sleep', fit.right - 4, fit.bottom - 6)

    // Middle: what each hidden neuron is doing
    const hid = makePlot(w, h, [2, 10.5], [-1.2, 1.2], { t: split1 + 8, b: h - split2 + 8 })
    drawAxes(ctx, hid, { xTicks: [], yTicks: [-1, 0, 1] })
    for (let i = S - 1; i >= 0; i--)
      drawCurve(ctx, hid, (x) => Math.tanh(L1.W[i][0] * pn(x) + L1.b[i]), {
        color: neuronColors[i],
        width: 1.5 + i * 0.9,
        steps: 80,
      })
    ctx.textAlign = 'left'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(`outputs of the ${S} hidden neurons · ${distinctNeurons(net)} distinct`, hid.left + 6, hid.top + 10)

    // Bottom: error while training
    const top = Math.max(12, marks(sim.history[0]?.[0] ?? sim.trainLoss) * 1.1)
    const err = makePlot(w, h, [0, maxIt], [0, top], { t: split2 + 12, b: 22 })
    drawAxes(ctx, err, {
      xTicks: [0, maxIt / 2, maxIt],
      yTicks: [0, Math.round(top / 2), Math.round(top)],
    })
    const line = (k: 0 | 1, color: string) => {
      ctx.beginPath()
      sim.history.forEach((p, i) => {
        const x = err.X((i + 1) * sim.every)
        const y = err.Y(Math.min(top, marks(p[k])))
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.strokeStyle = color
      ctx.lineWidth = 1.8
      ctx.stroke()
    }
    line(0, '#38bdf8')
    line(1, '#fbbf24')
    if (early && sim.bestAt > 0) {
      ctx.strokeStyle = '#34d399'
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(err.X(sim.bestAt), err.top)
      ctx.lineTo(err.X(sim.bestAt), err.bottom)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'right'
    ctx.fillText(
      sim.stopped ? `stopped at ${sim.its}: ${stopText[sim.stopped].toLowerCase()}` : `error in marks · iteration ${sim.its}`,
      err.right - 4,
      err.top + (w < 560 ? 23 : 10),
    )
    ctx.textAlign = 'left'
    ctx.fillStyle = '#38bdf8'
    ctx.fillText('training', err.left + 6, err.top + 10)
    ctx.fillStyle = '#fbbf24'
    ctx.fillText('validation', err.left + 62, err.top + 10)
  }

  const tr = marks(sim.trainLoss)
  const va = marks(sim.stopped === 'validation' ? sim.bestVal : sim.valLoss)
  const stopLine = sim.stopped
    ? {
        goal: `Training stopped at iteration ${sim.its} because the training error reached the goal of ${goal} marks.`,
        gradient: `Training stopped at iteration ${sim.its} because the gradient length fell to ${sim.grad.toExponential(1)}, below the minimum ${MIN_GRAD}. A tiny gradient means flat ground, not necessarily a good answer.`,
        validation: `Training stopped at iteration ${sim.its} because the validation error had not improved for ${PATIENCE} iterations. The weights from iteration ${sim.bestAt} (green line) are kept.`,
        maxit: `Training stopped because it used all ${maxIt} iterations. That is a time limit, not a sign it has finished learning.`,
      }[sim.stopped]
    : `Training is running: iteration ${sim.its}, gradient length ${Number.isFinite(sim.grad) ? sim.grad.toExponential(1) : '—'}.`

  const happening = (
    <>
      <p>
        A 1-{S}-1 network ({paramCount(sim.net)} parameters) learns quiz marks from hours of sleep. Start: {schemeNames[scheme].toLowerCase()}.
      </p>
      <p>
        {scheme === 'zero'
          ? `Every hidden neuron outputs tanh(0) = 0 and every output weight is 0, so the sensitivity passed back to the hidden layer is 0. Only the output bias has a gradient. It moved to the mean mark (${meanMark.toFixed(0)}) and the prediction is a flat line, off by ${tr.toFixed(1)} marks.`
          : scheme === 'equal'
            ? `All ${S} hidden neurons began with the same weights, so they get the same input, the same sensitivity and the same update every iteration. There ${distinct === 1 ? 'is still 1 distinct neuron' : `are ${distinct} distinct neurons`}: the network bends once, like a 1-1-1 network, and misses the dip for long sleepers (error ${tr.toFixed(1)} marks).`
            : scheme === 'nw'
              ? `Nguyen-Widrow gave each hidden weight the size 0.7 × ${S} = ${(0.7 * S).toFixed(1)} and spread the biases, so the ${S} sigmoids already cover the whole range of sleep hours before training. Error now ${tr.toFixed(1)} marks.`
              : `The neurons started different, so each received a different update and took a different part of the curve. ${distinct} distinct neurons, error ${tr.toFixed(1)} marks.`}
      </p>
      <p>{stopLine}</p>
    </>
  )

  const L1 = shown.layers[0]
  const W2 = shown.layers[1].W[0]
  const panel = (
    <>
      <Group title="Starting weights">
        <Seg
          value={scheme}
          onChange={setScheme}
          options={(['random', 'zero', 'equal', 'nw'] as InitScheme[]).map((v) => ({ value: v, label: schemeNames[v] }))}
        />
        <Btn tone="go" onClick={() => setVersion((v) => v + 1)}>
          Train again
        </Btn>
        <table className="w-full font-mono text-[11px] tabular-nums text-slate-300">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="font-normal">neuron</th>
              <th className="font-normal">w¹</th>
              <th className="font-normal">b¹</th>
              <th className="font-normal">w²</th>
            </tr>
          </thead>
          <tbody>
            {L1.W.map((row, i) => (
              <tr key={i}>
                <td>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: neuronColors[i] }} />
                  {i + 1}
                </td>
                <td>{row[0].toFixed(3)}</td>
                <td>{L1.b[i].toFixed(3)}</td>
                <td>{W2[i].toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-slate-500">Output bias b² = {shown.layers[1].b[0].toFixed(3)}. Identical rows are copies of one neuron.</p>
      </Group>
      <Group title="When to stop">
        <Slider label="Maximum iterations" value={maxIt} min={500} max={8000} step={500} onChange={setMaxIt} />
        <Slider
          label="Error goal"
          value={goal}
          min={0}
          max={12}
          onChange={setGoal}
          fmt={(v) => (v ? `${v} marks` : 'off')}
        />
        <Toggle
          label="Early stopping"
          hint={`Stop when validation error has not improved for ${PATIENCE} iterations`}
          value={early}
          onChange={setEarly}
        />
        <p className="text-[11px] text-slate-500">Minimum gradient is fixed at {MIN_GRAD}.</p>
      </Group>
      <Group title="Result">
        <Stats>
          <Stat label="Training error" value={`${tr.toFixed(1)} marks`} tone={tr > 10 ? 'bad' : 'good'} />
          <Stat label="Validation error" value={`${va.toFixed(1)} marks`} />
          <Stat label="Distinct neurons" value={`${distinct} of ${S}`} tone={distinct < S ? 'bad' : 'good'} />
          <Stat label="Iterations" value={sim.its} />
        </Stats>
        <Stat label="Why it stopped" value={sim.stopped ? stopText[sim.stopped] : 'still training'} tone={sim.stopped === 'gradient' && tr > 10 ? 'bad' : 'plain'} />
      </Group>
    </>
  )

  const actions: StepActions = {
    break: { label: 'Start every weight at zero', run: () => { setScheme('zero'); setVersion((v) => v + 1) } },
    fix: { label: 'Small random start', run: () => { setScheme('random'); setVersion((v) => v + 1) } },
  }

  return { scene: <Canvas2D draw={draw} />, panel, happening, actions }
}
