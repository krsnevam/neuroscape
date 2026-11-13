import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import Canvas2D, { useTicker, type Plot } from '../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats } from '../../ui/lab/controls'
import { useAppStore } from '../../store/useAppStore'
import { drawJourney } from './draw'
import { journeyMinutes, journeyStages } from './stages'
import {
  actFn,
  applyStep,
  backward,
  CLASSES,
  createTrainer,
  decode,
  encode,
  evaluate,
  forward,
  lossOf,
  makeData,
  randomNet,
  trainEpoch,
  trainedNet,
  trueLabel,
  type Act,
  type Grads,
  type Trainer,
} from './sim'

const f2 = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2))
const vec = (a: number[]) => `[${a.map(f2).join('  ')}]`
const MAX_EPOCHS = 1500

/**
 * /journey — one mango followed from measurement to decision, then backwards through learning.
 * Eight stops, each interactive, with notes for a tutor taking a class through it in one sitting.
 */
export default function Journey() {
  const data = useMemo(() => makeData(), [])
  const tutor = useAppStore((s) => s.tutorMode)
  const setTutor = useAppStore((s) => s.setTutorMode)

  const [stage, setStage] = useState(0)
  const [mango, setMango] = useState({ colour: 6.5, soft: 5 })
  const [act, setAct] = useState<Act>('tansig')
  const [focus, setFocus] = useState(0)
  const [sure, setSure] = useState(0.6)
  const [alpha, setAlpha] = useState(0.6)
  const [override, setOverride] = useState<number | null>(null)
  const [weights, setWeights] = useState<'random' | 'trained' | 'yours'>('random')
  const [training, setTraining] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [, bump] = useState(0)
  const redraw = useCallback(() => bump((n) => n + 1), [])

  const trainer = useRef<Trainer>(createTrainer(randomNet(3, 'tansig')))
  const flash = useRef<{ g: Grads; at: number } | null>(null)
  const plane = useRef<Plot | null>(null)
  const clock = useRef(0)
  const runRef = useRef(false)
  runRef.current = training
  useTicker(training ? 200 : 100000)

  const net = trainer.current.net
  const st = journeyStages[stage]
  const p = encode(mango.colour, mango.soft)
  const pass = forward(net, p)
  const seller = trueLabel(Math.max(0, Math.min(10, mango.colour)), Math.max(0, Math.min(10, mango.soft)))
  const target = override ?? seller
  const answer = decode(pass.a2, sure)
  const cost = lossOf(pass.a2, target)
  const grads = backward(net, pass, target)
  const score = evaluate(net, data)

  const loadWeights = useCallback(
    (kind: 'random' | 'trained', a: Act = act) => {
      setTraining(false)
      trainer.current = createTrainer(kind === 'trained' ? trainedNet(data, a) : randomNet(3, a))
      flash.current = null
      setWeights(kind)
      redraw()
    },
    [act, data, redraw],
  )

  const moveMango = (m: { colour: number; soft: number }) => {
    setMango(m)
    setOverride(null)
  }
  const goto = useCallback((i: number) => setStage(Math.max(0, Math.min(journeyStages.length - 1, i))), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowRight') goto(stage + 1)
      else if (e.key === 'ArrowLeft') goto(stage - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goto, stage])

  // "Play the journey": walk the forward path, stops 1 to 5, a few seconds each
  useEffect(() => {
    if (!playing) return
    if (stage >= 4) {
      const done = setTimeout(() => setPlaying(false), 4500)
      return () => clearTimeout(done)
    }
    const next = setTimeout(() => setStage((s) => s + 1), 4500)
    return () => clearTimeout(next)
  }, [playing, stage])

  const setWeight = (which: 0 | 1 | 'b', value: number) => {
    if (which === 'b') net.b1[focus] = value
    else net.W1[focus][which] = value
    setWeights('yours')
    redraw()
  }

  const oneStep = () => {
    flash.current = { g: grads, at: clock.current }
    applyStep(net, grads, alpha)
    setWeights('yours')
    redraw()
  }

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    clock.current = t
    const tr = trainer.current
    if (runRef.current) {
      for (let k = 0; k < 6 && tr.epoch < MAX_EPOCHS; k++) trainEpoch(tr, data, alpha)
      if (tr.epoch >= MAX_EPOCHS) setTraining(false)
    }
    plane.current = drawJourney(ctx, w, h, {
      stage,
      net: tr.net,
      pass: forward(tr.net, p),
      mango,
      target,
      focus,
      data,
      sure,
      history: tr.history,
      flash: flash.current,
      training: runRef.current,
      t,
    })
  }

  // tap or drag on the plane to place the mango
  const place = (e: PointerEvent<HTMLCanvasElement>) => {
    const pl = plane.current
    if (!pl || (e.type === 'pointermove' && e.buttons === 0)) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (x < pl.left - 6 || x > pl.right + 6 || y < pl.top - 6 || y > pl.bottom + 6) return
    const clamp = (v: number, r: [number, number]) => Math.max(r[0], Math.min(r[1], v))
    moveMango({ colour: +clamp(pl.ix(x), pl.xr).toFixed(1), soft: +clamp(pl.iy(y), pl.yr).toFixed(1) })
  }

  const j = focus
  const wj = net.W1[j]
  const numbers: string[] = (() => {
    switch (st.id) {
      case 'encode':
        return [`p₁ = (${mango.colour.toFixed(1)} − 5) / 5 = ${f2(p[0])}`, `p₂ = (${mango.soft.toFixed(1)} − 5) / 5 = ${f2(p[1])}`, `p = ${vec(p)}`]
      case 'weights':
        return [
          `n = w₁p₁ + w₂p₂ + b`,
          `  = (${f2(wj[0])})(${f2(p[0])}) + (${f2(wj[1])})(${f2(p[1])}) + (${f2(net.b1[j])})`,
          `  = ${f2(wj[0] * p[0])} + ${f2(wj[1] * p[1])} + ${f2(net.b1[j])} = ${f2(pass.n1[j])}`,
        ]
      case 'activation':
        return [
          `n = ${f2(pass.n1[j])}`,
          `${actFn[net.act].formula}  →  a = ${f2(pass.a1[j])}`,
          `slope here f′(n) = ${f2(actFn[net.act].d(pass.n1[j], pass.a1[j]))}`,
        ]
      case 'layer':
        return [`n¹ = W¹p + b¹ = ${vec(pass.n1)}`, `a¹ = f(n¹) = ${vec(pass.a1)}`]
      case 'decode':
        return [`n² = W²a¹ + b² = ${vec(pass.n2)}`, `a² = softmax(n²) = ${vec(pass.a2)}`, `largest: ${answer.label} at ${(answer.confidence * 100).toFixed(0)}%`]
      case 'error':
        return [`t  = [${[0, 1, 2].map((k) => (k === target ? 1 : 0)).join('  ')}]   (${CLASSES[target]})`, `a² = ${vec(pass.a2)}`, `F = −ln(${f2(pass.a2[target])}) = ${f2(cost)}`]
      case 'learn':
        return [
          `s² = a² − t = ${vec(grads.s2)}`,
          `s¹ = f′(n¹) ∘ (W²ᵀ s²) = ${vec(grads.s1)}`,
          `Δw = −α · s · (signal carried)`,
          `neuron ${j + 1}, w₁:  −${f2(alpha)} × ${f2(grads.s1[j])} × ${f2(p[0])} = ${f2(-alpha * grads.W1[j][0])}`,
        ]
      default:
        return [`p = ${vec(p)}`, `a¹ = ${vec(pass.a1)}`, `a² = ${vec(pass.a2)}`]
    }
  })()

  const neuronSeg = (
    <Seg
      label="Which hidden neuron"
      value={String(focus)}
      onChange={(v) => setFocus(Number(v))}
      options={[0, 1, 2, 3].map((k) => ({ value: String(k), label: `Neuron ${k + 1}` }))}
    />
  )

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <Link to="/" className="shrink-0 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10">
          ← Worlds
        </Link>
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-teal-300">One class · about {journeyMinutes} minutes</div>
          <h1 className="truncate text-base font-semibold leading-tight text-white">The Journey of a Signal</h1>
        </div>
        <nav className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto sm:flex-1 sm:justify-center" aria-label="Stops on the journey">
          {journeyStages.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-current={i === stage ? 'step' : undefined}
              onClick={() => (setPlaying(false), goto(i))}
              className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                i === stage ? 'border-teal-400 bg-teal-400/20 text-teal-100' : 'border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {i + 1}. {s.name}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => (playing ? setPlaying(false) : (setStage(0), setPlaying(true)))}
          className="ml-auto shrink-0 rounded-md border border-teal-400/60 bg-teal-400/15 px-2.5 py-1.5 text-xs font-medium text-teal-100 hover:bg-teal-400/25"
        >
          {playing ? '■ Stop' : '▶ Play the journey'}
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={tutor}
          onClick={() => setTutor(!tutor)}
          className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
            tutor ? 'border-amber-400 bg-amber-400/20 text-amber-100' : 'border-white/15 text-slate-300 hover:bg-white/10'
          }`}
        >
          Tutor mode {tutor ? 'on' : 'off'}
        </button>
      </header>

      {/* On a phone the picture keeps a readable height and the page scrolls; on a wide screen the two sit side by side */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <main className="relative h-[620px] shrink-0 overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
          <Canvas2D draw={draw} onPointerDown={place} onPointerMove={place} className="touch-pan-y" aria-label={`Picture for stop ${stage + 1}: ${st.title}`} />
        </main>

        <aside className="flex shrink-0 flex-col border-t border-white/10 bg-slate-950/70 lg:w-[380px] lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-3 px-4 py-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                Stop {stage + 1} of {journeyStages.length} · {st.name}
              </div>
              <h2 className="text-lg font-semibold leading-snug text-white">{st.title}</h2>
            </div>
            <p className="text-[13px] leading-snug text-slate-300">{st.what}</p>
            <div className="rounded-md border border-teal-400/25 bg-teal-400/[0.07] px-2.5 py-2">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-teal-300">The numbers right now</div>
              <pre className="overflow-x-auto whitespace-pre font-mono text-[12px] leading-relaxed text-teal-50">{numbers.join('\n')}</pre>
            </div>
            <p className="rounded-md bg-white/5 px-2.5 py-2 text-xs leading-snug text-slate-400">
              <b className="text-slate-200">Reading the picture.</b> {st.picture}
            </p>
            {tutor && (
              <div className="flex flex-col gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-[13px] leading-snug">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300">Tutor notes · about {st.tutor.minutes} min</div>
                <p className="text-amber-50">
                  <b>Say:</b> {st.tutor.say}
                </p>
                <p className="text-amber-50">
                  <b>Ask the class:</b> {st.tutor.ask}
                </p>
                <p className="text-amber-50">
                  <b>Listen for:</b> "{st.tutor.wrong}" <b>Correct it:</b> {st.tutor.right}
                </p>
                <p className="text-[11px] text-amber-200/70">Left and right arrow keys move between stops.</p>
              </div>
            )}
          </div>

          <Group title="The mango in your hand">
            <Slider label="Colour: green to dark yellow" value={Math.max(0, Math.min(10, mango.colour))} min={0} max={10} step={0.1} onChange={(v) => moveMango({ ...mango, colour: v })} fmt={(v) => v.toFixed(1)} />
            <Slider label="Softness: hard to very soft" value={Math.max(0, Math.min(10, mango.soft))} min={0} max={10} step={0.1} onChange={(v) => moveMango({ ...mango, soft: v })} fmt={(v) => v.toFixed(1)} />
            <Seg
              label="Weights in the network"
              value={weights}
              onChange={(v) => v !== 'yours' && loadWeights(v)}
              options={[
                { value: 'random', label: 'Random' },
                { value: 'trained', label: 'Trained' },
                ...(weights === 'yours' ? [{ value: 'yours' as const, label: 'Your own' }] : []),
              ]}
            />
            <Stats>
              <Stat label="A seller says" value={CLASSES[seller]} />
              <Stat label="Network says" value={answer.confident ? answer.label : 'Not sure'} tone={answer.k === seller && answer.confident ? 'good' : 'bad'} />
              <Stat label="Right on all mangoes" value={`${(score.acc * 100).toFixed(0)}%`} />
            </Stats>
          </Group>

          {st.id === 'weights' && (
            <Group title="Change this neuron">
              {neuronSeg}
              <Slider label="w₁, weight on colour" value={wj[0]} min={-4} max={4} step={0.05} onChange={(v) => setWeight(0, v)} fmt={f2} />
              <Slider label="w₂, weight on softness" value={wj[1]} min={-4} max={4} step={0.05} onChange={(v) => setWeight(1, v)} fmt={f2} />
              <Slider label="b, bias" value={net.b1[j]} min={-4} max={4} step={0.05} onChange={(v) => setWeight('b', v)} fmt={f2} />
            </Group>
          )}
          {st.id === 'activation' && (
            <Group title="Activation function of the hidden layer">
              <Seg
                value={act}
                onChange={(a) => (setAct(a), loadWeights(weights === 'trained' ? 'trained' : 'random', a))}
                options={(['tansig', 'logsig', 'relu', 'linear'] as const).map((a) => ({ value: a, label: actFn[a].name }))}
              />
              {neuronSeg}
            </Group>
          )}
          {st.id === 'decode' && (
            <Group title="Decoding">
              <Slider label="How sure before it gives an answer" value={sure} min={0.34} max={0.95} step={0.01} onChange={setSure} fmt={(v) => `${(v * 100).toFixed(0)}%`} />
            </Group>
          )}
          {st.id === 'error' && (
            <Group title="The target">
              <Seg label="A seller says this mango is" value={String(target)} onChange={(v) => setOverride(Number(v))} options={CLASSES.map((c, k) => ({ value: String(k), label: c }))} />
              <Stats>
                <Stat label="Cost F" value={f2(cost)} tone={cost < 0.3 ? 'good' : cost > 1 ? 'bad' : 'warn'} />
                <Stat label="Probability of the true class" value={`${(pass.a2[target] * 100).toFixed(0)}%`} />
              </Stats>
            </Group>
          )}
          {st.id === 'learn' && (
            <Group title="Learning">
              <div className="flex flex-wrap gap-2">
                <Btn onClick={oneStep} disabled={training}>
                  One step on this mango
                </Btn>
                <Btn tone="go" onClick={() => setTraining(!training)} disabled={trainer.current.epoch >= MAX_EPOCHS}>
                  {training ? 'Pause' : 'Train on all the mangoes'}
                </Btn>
                <Btn tone="warn" onClick={() => loadWeights('random')}>
                  Start again from random weights
                </Btn>
              </div>
              <Slider label="Learning rate α" value={alpha} min={0.05} max={6} step={0.05} onChange={setAlpha} fmt={f2} />
              {neuronSeg}
              <Stats>
                <Stat label="Passes" value={trainer.current.epoch} />
                <Stat label="Average cost" value={f2(score.loss)} tone={score.loss < 0.3 ? 'good' : 'warn'} />
                <Stat label="Cost on this mango" value={f2(cost)} />
              </Stats>
            </Group>
          )}
          {st.id === 'new' && (
            <Group title="Try a new mango">
              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => moveMango({ colour: 6.6, soft: 5.2 })}>A good ripe one</Btn>
                <Btn onClick={() => moveMango({ colour: 1.2, soft: 1.5 })}>Green and hard</Btn>
                <Btn onClick={() => moveMango({ colour: 6.2, soft: 7 })}>On the border</Btn>
                <Btn tone="warn" onClick={() => moveMango({ colour: 12.5, soft: -2.5 })}>
                  Impossible: off both scales
                </Btn>
              </div>
              {score.acc < 0.85 && (
                <Btn tone="go" onClick={() => loadWeights('trained')}>
                  Load the trained weights first
                </Btn>
              )}
            </Group>
          )}

          <div className="flex flex-col gap-2 px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">Try this</div>
            <ul className="flex list-disc flex-col gap-1 pl-4 text-[13px] leading-snug text-slate-300">
              {st.tryIt.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="border-l-2 border-teal-400 pl-2.5 text-[13px] font-semibold leading-snug text-white">{st.takeaway}</p>
            <div className="mt-1 flex justify-between gap-2">
              <Btn onClick={() => goto(stage - 1)} disabled={stage === 0}>
                ← {stage > 0 ? journeyStages[stage - 1].name : 'Back'}
              </Btn>
              <Btn tone="go" onClick={() => goto(stage + 1)} disabled={stage === journeyStages.length - 1}>
                Next: {stage < journeyStages.length - 1 ? journeyStages[stage + 1].name : 'done'} →
              </Btn>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
