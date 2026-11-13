import { useEffect, useRef, useState } from 'react'
import { Btn } from '../../ui/lab/controls'
import { rng } from './sim'

/**
 * The very first level, told as simply as possible: two friends report on a motor, two knobs
 * say how much to listen to each, and the knobs are nudged after every mistake.
 * It is one neuron with two weights and a fixed threshold, trained by the perceptron rule.
 */
const LINE = 50
/** What the grown-up knows and never tells: heat matters more than shaking. */
const truth = (shaky: number, hot: number) => 3 * shaky + 7 * hot > LINE
const START: [number, number] = [8, 1]
const STEP = 0.06
const clamp = (v: number) => Math.max(0, Math.min(10, v))
const f1 = (v: number) => (Math.round(v * 10) / 10).toString()

interface Motor {
  shaky: number
  hot: number
}

function Face({ kind, level }: { kind: 'shaky' | 'hot'; level: number }) {
  const shaky = kind === 'shaky'
  const color = shaky ? '#38bdf8' : '#fb923c'
  return (
    <svg viewBox="0 0 80 80" className="h-16 w-16 shrink-0" aria-hidden>
      <g className={shaky && level > 0 ? 'origin-center animate-[wiggle_0.18s_linear_infinite]' : ''} style={shaky ? { animationDuration: `${0.5 - level * 0.035}s` } : undefined}>
        <circle cx="40" cy="42" r="28" fill={color} />
        {!shaky && <path d="M40 4 C48 16 54 18 50 30 C46 22 42 24 40 14 C38 24 30 22 30 30 C24 18 34 16 40 4Z" fill="#ef4444" opacity={0.3 + level * 0.07} />}
        <circle cx="31" cy="38" r="6" fill="#fff" />
        <circle cx="49" cy="38" r="6" fill="#fff" />
        <circle cx="32" cy="39" r="2.6" fill="#0f172a" />
        <circle cx="50" cy="39" r="2.6" fill="#0f172a" />
        <path d={level >= 6 ? 'M30 56 Q40 48 50 56' : 'M30 52 Q40 60 50 52'} stroke="#0f172a" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function Bars({ n, color }: { n: number; color: string }) {
  return (
    <div className="flex gap-0.5" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="h-4 w-2.5 rounded-sm" style={{ background: i < n ? color : 'rgba(148,163,184,0.18)' }} />
      ))}
    </div>
  )
}

export default function KidLab({ tutor, onNext }: { tutor: boolean; onNext: () => void }) {
  const rand = useRef(rng(21))
  const draw = (): Motor => ({ shaky: Math.round(rand.current() * 10), hot: Math.round(rand.current() * 10) })
  const [knobs, setKnobs] = useState<[number, number]>(START)
  const [motor, setMotor] = useState<Motor>({ shaky: 2, hot: 9 })
  const [checked, setChecked] = useState(false)
  const [learned, setLearned] = useState<[number, number] | null>(null)
  const [history, setHistory] = useState<boolean[]>([])
  const [auto, setAuto] = useState(false)
  const [seen, setSeen] = useState(0)

  const worry = knobs[0] * motor.shaky + knobs[1] * motor.hot
  const say = worry > LINE
  const real = truth(motor.shaky, motor.hot)
  const right = say === real
  const louder = motor.hot > motor.shaky ? 'Hotty' : motor.shaky > motor.hot ? 'Shaky' : 'both friends'

  const nudge = (k: [number, number], m: Motor): [number, number] => {
    const up = truth(m.shaky, m.hot) ? 1 : -1
    return [clamp(k[0] + up * STEP * m.shaky), clamp(k[1] + up * STEP * m.hot)]
  }
  const check = () => {
    setChecked(true)
    setHistory((h) => [...h, right].slice(-10))
    setSeen((n) => n + 1)
  }
  const learn = () => {
    setLearned(knobs)
    setKnobs(nudge(knobs, motor))
  }
  const next = () => {
    setMotor(draw())
    setChecked(false)
    setLearned(null)
  }

  // "Learn from 30 motors": the same thing, quickly, one motor after another
  const autoLeft = useRef(0)
  useEffect(() => {
    if (!auto) return
    autoLeft.current = 30
    const id = setInterval(() => {
      const m = draw()
      setMotor(m)
      setChecked(true)
      setLearned(null)
      setKnobs((k) => {
        const ok = k[0] * m.shaky + k[1] * m.hot > LINE === truth(m.shaky, m.hot)
        setHistory((h) => [...h, ok].slice(-10))
        return ok ? k : nudge(k, m)
      })
      setSeen((n) => n + 1)
      if (--autoLeft.current <= 0) setAuto(false)
    }, 320)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])

  const score = history.filter(Boolean).length
  const good = history.length === 10 && score >= 9
  const big = 'rounded-xl border border-white/10 bg-slate-900/70 p-4'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <style>{'@keyframes wiggle{0%,100%{transform:translateX(-2px) rotate(-3deg)}50%{transform:translateX(2px) rotate(3deg)}}'}</style>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Two friends and two knobs</h2>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-300">
            A motor has two friends. <b className="text-sky-300">Shaky</b> tells you how much it shakes. <b className="text-orange-300">Hotty</b> tells you how hot it is. You have a knob for each friend. The knob says <b className="text-white">how much you listen</b> to that friend. Your job: say <b className="text-emerald-300">OK</b> or <b className="text-rose-300">STOP</b>.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1.1fr_0.9fr]">
          {/* the friends */}
          <section className={big} aria-label="What the two friends say about this motor">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-slate-400">1 · The friends talk</div>
            <div className="flex items-center gap-3">
              <Face kind="shaky" level={motor.shaky} />
              <div className="flex flex-col gap-1">
                <div className="text-[15px] text-white">
                  Shaky says: <b className="text-2xl text-sky-300">{motor.shaky}</b>
                </div>
                <Bars n={motor.shaky} color="#38bdf8" />
                <div className="text-xs text-slate-400">{motor.shaky >= 7 ? 'It shakes a lot!' : motor.shaky >= 4 ? 'It shakes a bit.' : 'It hardly shakes.'}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Face kind="hot" level={motor.hot} />
              <div className="flex flex-col gap-1">
                <div className="text-[15px] text-white">
                  Hotty says: <b className="text-2xl text-orange-300">{motor.hot}</b>
                </div>
                <Bars n={motor.hot} color="#fb923c" />
                <div className="text-xs text-slate-400">{motor.hot >= 7 ? 'It is very hot!' : motor.hot >= 4 ? 'It is warm.' : 'It is cool.'}</div>
              </div>
            </div>
          </section>

          {/* the knobs */}
          <section className={big} aria-label="Your two knobs">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-slate-400">2 · How much do I listen?</div>
            {(['Shaky', 'Hotty'] as const).map((name, i) => (
              <label key={name} className="mb-4 flex flex-col gap-1.5 last:mb-0">
                <span className="flex items-baseline justify-between text-[15px] text-white">
                  <span>
                    My knob for <b style={{ color: i ? '#fdba74' : '#7dd3fc' }}>{name}</b>
                  </span>
                  <span className="font-mono text-2xl font-bold" style={{ color: i ? '#fdba74' : '#7dd3fc' }}>
                    {f1(knobs[i])}
                    {learned && Math.abs(learned[i] - knobs[i]) > 0.001 && <span className="ml-2 text-sm text-emerald-300">was {f1(learned[i])}</span>}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.1}
                  value={knobs[i]}
                  onChange={(e) => (setLearned(null), setKnobs(i ? [knobs[0], Number(e.target.value)] : [Number(e.target.value), knobs[1]]))}
                  className="h-3 w-full"
                  style={{ accentColor: i ? '#fb923c' : '#38bdf8' }}
                />
                <span className="text-xs text-slate-400">{knobs[i] < 0.5 ? `I am not listening to ${name} at all.` : knobs[i] > 7 ? `I listen to ${name} a lot.` : `I listen to ${name} a little.`}</span>
              </label>
            ))}
            <p className="mt-3 rounded-md bg-white/5 px-2.5 py-2 text-[13px] leading-snug text-slate-300">A knob is a <b className="text-white">weight</b>. Slide them and watch your worry change.</p>
          </section>

          {/* the worry meter */}
          <section className={big} aria-label="Your worry and your answer">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-widest text-slate-400">3 · My worry</div>
            <div className="flex gap-4">
              <div className="relative h-52 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                <div className="absolute inset-x-0 bottom-0 transition-all duration-300" style={{ height: `${Math.min(100, (worry / 120) * 100)}%`, background: say ? '#f87171' : '#4ade80' }} />
                <div className="absolute inset-x-0 border-t-2 border-dashed border-white" style={{ bottom: `${(LINE / 120) * 100}%` }} />
                <span className="absolute right-1 text-[10px] font-bold text-white" style={{ bottom: `calc(${(LINE / 120) * 100}% + 2px)` }}>
                  line
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="font-mono text-[13px] leading-relaxed text-slate-200">
                  <span className="text-sky-300">{f1(knobs[0])} × {motor.shaky}</span> = {f1(knobs[0] * motor.shaky)}
                  <br />
                  <span className="text-orange-300">{f1(knobs[1])} × {motor.hot}</span> = {f1(knobs[1] * motor.hot)}
                  <br />
                  add them: <b className="text-lg text-white">{f1(worry)}</b>
                </div>
                <div className="text-[13px] text-slate-400">{say ? 'My worry is over the line.' : 'My worry is under the line.'}</div>
                <div className={`rounded-lg px-3 py-2 text-center text-xl font-bold ${say ? 'bg-rose-500/25 text-rose-200' : 'bg-emerald-500/25 text-emerald-200'}`}>I say: {say ? 'STOP!' : 'OK'}</div>
              </div>
            </div>
          </section>
        </div>

        {/* the grown-up */}
        <section className={`${big} flex flex-col gap-3`} aria-live="polite">
          <div className="font-mono text-[11px] uppercase tracking-widest text-slate-400">4 · The grown-up tells me if I was right</div>
          {!checked ? (
            <p className="text-[15px] text-slate-300">The engineer knows the real answer for this motor. Ask.</p>
          ) : right ? (
            <p className="text-[16px] leading-relaxed text-emerald-200">
              <b>I was right!</b> The engineer also says {real ? 'STOP' : 'OK'}. I leave my knobs alone.
            </p>
          ) : (
            <p className="text-[16px] leading-relaxed text-rose-100">
              <b>Oops.</b> I said {say ? 'STOP' : 'OK'}, but the engineer says <b>{real ? 'STOP' : 'OK'}</b>. {real ? 'I was not worried enough, so I must turn my knobs UP.' : 'I was too worried, so I must turn my knobs DOWN.'} Who was talking loudest? <b>{louder}</b>. So that knob moves the most.
              {learned && (
                <span className="mt-1 block text-emerald-200">
                  Done. Shaky's knob: {f1(learned[0])} → {f1(knobs[0])}. Hotty's knob: {f1(learned[1])} → {f1(knobs[1])}.
                </span>
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {!checked && !auto && (
              <Btn tone="go" onClick={check}>
                Ask the engineer
              </Btn>
            )}
            {checked && !right && !learned && !auto && (
              <Btn tone="go" onClick={learn}>
                Learn from my mistake
              </Btn>
            )}
            {checked && (right || learned) && !auto && (
              <Btn tone="go" onClick={next}>
                Next motor →
              </Btn>
            )}
            <Btn onClick={() => setAuto(!auto)} disabled={!auto && seen < 2}>
              {auto ? 'Stop' : 'Learn from 30 motors, fast'}
            </Btn>
            <Btn
              onClick={() => {
                setAuto(false)
                setKnobs(START)
                setHistory([])
                setSeen(0)
                next()
              }}
            >
              Start over
            </Btn>
            <span className="ml-auto flex items-center gap-1" aria-label={`${score} of the last ${history.length} right`}>
              <span className="mr-1 text-xs text-slate-400">my last 10:</span>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={`h-4 w-4 rounded-full ${i < history.length ? (history[i] ? 'bg-emerald-400' : 'bg-rose-400') : 'border border-white/20'}`} />
              ))}
            </span>
          </div>
          {seen < 2 && <p className="text-xs text-slate-500">Try two motors yourself first. Then you can go fast.</p>}
        </section>

        {good && (
          <section className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-[15px] leading-relaxed text-emerald-50">
            <b>Look at the knobs now.</b> At the start I hardly listened to Hotty: that knob was {f1(START[1])}. Now it is {f1(knobs[1])}, and Shaky's went from {f1(START[0])} to {f1(knobs[0])}. Nobody told me to listen to the heat. My mistakes moved the knobs. <b>That is how a network gets its weights.</b>
            <div className="mt-3">
              <Btn tone="go" onClick={onNext}>
                Now see the real network: 27 knobs →
              </Btn>
            </div>
          </section>
        )}

        <section className={`${big} text-[14px] leading-relaxed text-slate-300`}>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-widest text-slate-400">The same thing in grown-up words</div>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <span>What a friend says → <b className="text-white">input p</b></span>
            <span>A knob → <b className="text-white">weight w</b></span>
            <span>My worry → <b className="text-white">net input n = w₁p₁ + w₂p₂</b></span>
            <span>The line → <b className="text-white">threshold (the bias)</b></span>
            <span>"OK" or "STOP" → <b className="text-white">output a</b></span>
            <span>The engineer's answer → <b className="text-white">target t</b></span>
            <span className="sm:col-span-2">Turning the knobs after a mistake → <b className="text-white">learning: new w = old w + α (t − a) p</b></span>
          </div>
          {tutor && (
            <p className="mt-3 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-[13px] text-amber-50">
              <b>Tutor:</b> let one student set the knobs badly on purpose (Hotty at 0) and play three motors. Ask the class which knob should move and which way before pressing "Learn from my mistake". Then run 30 motors and ask why Hotty's knob went up and Shaky's came down, when nobody said heat matters. This is the perceptron rule from Unit 2; the full network repeats it for 27 weights.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
