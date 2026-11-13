import { useEffect, useRef, useState } from 'react'
import { Btn } from '../../ui/lab/controls'
import { rng } from './sim'
import { Bars, CARD, f1, Face, Knob, Last10, TAG, WIGGLE } from './kidParts'

/**
 * Second step: a third friend whose shouting should make you worry LESS, and a line that can move.
 * One neuron, three weights that may go negative, and a learnable threshold (the bias).
 */
const FRIENDS = [
  { key: 'shaky', name: 'Shaky', color: '#38bdf8', says: 'how much it shakes' },
  { key: 'hot', name: 'Hotty', color: '#fb923c', says: 'how hot it is' },
  { key: 'fan', name: 'Fanny', color: '#34d399', says: 'how fast the cooling fan spins' },
] as const
type Motor = [number, number, number]
/** What the grown-up knows: shaking and heat are bad, a fast fan is good. */
const truth = (m: Motor) => 3 * m[0] + 7 * m[1] - 5 * m[2] > 30
const START = { knobs: [3, 3, 3] as Motor, line: 50 }
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export default function KidCalm({ tutor, onNext }: { tutor: boolean; onNext: () => void }) {
  const rand = useRef(rng(33))
  const draw = (): Motor => [Math.round(rand.current() * 10), Math.round(rand.current() * 10), Math.round(rand.current() * 10)]
  const [knobs, setKnobs] = useState<Motor>(START.knobs)
  const [line, setLine] = useState(START.line)
  const [motor, setMotor] = useState<Motor>([2, 3, 9])
  const [checked, setChecked] = useState(false)
  const [was, setWas] = useState<{ knobs: Motor; line: number } | null>(null)
  const [history, setHistory] = useState<boolean[]>([])
  const [auto, setAuto] = useState(false)
  const [seen, setSeen] = useState(0)

  const parts = knobs.map((k, i) => k * motor[i])
  const worry = parts.reduce((a, b) => a + b, 0)
  const say = worry > line
  const real = truth(motor)
  const right = say === real
  const loudest = FRIENDS[motor.indexOf(Math.max(...motor))].name

  const nudge = (k: Motor, l: number, m: Motor) => {
    const up = truth(m) ? 1 : -1
    return { knobs: k.map((v, i) => clamp(v + up * 0.06 * m[i], -10, 10)) as Motor, line: clamp(l - up * 2.5, -40, 120) }
  }
  const check = () => {
    setChecked(true)
    setHistory((h) => [...h, right].slice(-10))
    setSeen((n) => n + 1)
  }
  const learn = () => {
    setWas({ knobs, line })
    const n = nudge(knobs, line, motor)
    setKnobs(n.knobs)
    setLine(n.line)
  }
  const next = () => {
    setMotor(draw())
    setChecked(false)
    setWas(null)
  }

  // the same thing, fast
  const state = useRef({ knobs, line })
  state.current = { knobs, line }
  useEffect(() => {
    if (!auto) return
    let left = 40
    const id = setInterval(() => {
      const m = draw()
      const s = state.current
      const ok = s.knobs.reduce((a, k, i) => a + k * m[i], 0) > s.line === truth(m)
      setMotor(m)
      setChecked(true)
      setWas(null)
      setHistory((h) => [...h, ok].slice(-10))
      setSeen((n) => n + 1)
      if (!ok) {
        const n = nudge(s.knobs, s.line, m)
        state.current = n
        setKnobs(n.knobs)
        setLine(n.line)
      }
      if (--left <= 0) setAuto(false)
    }, 260)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto])

  const score = history.filter(Boolean).length
  const good = history.length === 10 && score >= 9 && knobs[2] < 0
  const meterMax = 140
  const pct = (v: number) => `${clamp(((v + 40) / (meterMax + 40)) * 100, 0, 100)}%`

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <style>{WIGGLE}</style>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4">
        <div>
          <h2 className="text-xl font-semibold text-white">A friend who calms you down, and a line that moves</h2>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-300">
            A new friend joins: <b className="text-emerald-300">Fanny</b>, who tells you how fast the cooling fan spins. A fast fan is <b className="text-white">good</b> news. But right now your knob for Fanny is +3, so when she shouts you worry <b className="text-white">more</b>. Two new things can happen here: a knob can go <b className="text-white">below zero</b>, and the <b className="text-white">line itself can move</b>.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr_0.95fr]">
          <section className={CARD} aria-label="What the three friends say">
            <div className={TAG}>1 · The friends talk</div>
            <div className="flex flex-col gap-3">
              {FRIENDS.map((f, i) => (
                <div key={f.key} className="flex items-center gap-3">
                  <Face kind={f.key} level={motor[i]} size={54} />
                  <div className="flex flex-col gap-1">
                    <div className="text-[14px] text-white">
                      {f.name} says: <b className="text-xl" style={{ color: f.color }}>{motor[i]}</b>
                    </div>
                    <Bars n={motor[i]} color={f.color} />
                    <div className="text-xs text-slate-400">{f.says}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={`${CARD} flex flex-col gap-3`} aria-label="Your knobs">
            <div className={TAG} style={{ marginBottom: 0 }}>
              2 · How much do I listen?
            </div>
            {FRIENDS.map((f, i) => (
              <Knob
                key={f.key}
                label={
                  <>
                    My knob for <b style={{ color: f.color }}>{f.name}</b>
                    {was && Math.abs(was.knobs[i] - knobs[i]) > 0.001 && <span className="ml-2 text-xs text-emerald-300">was {f1(was.knobs[i])}</span>}
                  </>
                }
                value={knobs[i]}
                min={-10}
                max={10}
                color={f.color}
                onChange={(v) => (setWas(null), setKnobs(knobs.map((k, q) => (q === i ? v : k)) as Motor))}
                note={knobs[i] < -0.4 ? `Below zero: when ${f.name} shouts, I worry LESS.` : knobs[i] > 0.4 ? `Above zero: when ${f.name} shouts, I worry more.` : `Zero: I do not hear ${f.name}.`}
              />
            ))}
            <Knob
              label={
                <>
                  My <b className="text-white">line</b>
                  {was && Math.abs(was.line - line) > 0.001 && <span className="ml-2 text-xs text-emerald-300">was {f1(was.line)}</span>}
                </>
              }
              value={line}
              min={-40}
              max={120}
              step={0.5}
              color="#e2e8f0"
              onChange={(v) => (setWas(null), setLine(v))}
              note={line < 20 ? 'A low line: I shout STOP very easily.' : line > 70 ? 'A high line: it takes a lot to make me shout STOP.' : 'How much worry it takes before I shout STOP.'}
            />
          </section>

          <section className={CARD} aria-label="Your worry and your answer">
            <div className={TAG}>3 · My worry</div>
            <div className="flex gap-4">
              <div className="relative h-56 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-800">
                <div className="absolute inset-x-0 bottom-0 transition-all duration-300" style={{ height: pct(worry), background: say ? '#f87171' : '#4ade80' }} />
                <div className="absolute inset-x-0 border-t-2 border-dashed border-white transition-all duration-300" style={{ bottom: pct(line) }} />
                <span className="absolute right-1 text-[10px] font-bold text-white transition-all duration-300" style={{ bottom: `calc(${pct(line)} + 2px)` }}>
                  line
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="font-mono text-[13px] leading-relaxed text-slate-200">
                  {FRIENDS.map((f, i) => (
                    <div key={f.key}>
                      <span style={{ color: f.color }}>
                        {f1(knobs[i])} × {motor[i]}
                      </span>{' '}
                      = <span className={parts[i] < 0 ? 'text-rose-300' : ''}>{f1(parts[i])}</span>
                    </div>
                  ))}
                  add them: <b className="text-lg text-white">{f1(worry)}</b>
                  <div className="text-slate-400">my line: {f1(line)}</div>
                </div>
                <div className={`rounded-lg px-3 py-2 text-center text-xl font-bold ${say ? 'bg-rose-500/25 text-rose-200' : 'bg-emerald-500/25 text-emerald-200'}`}>I say: {say ? 'STOP!' : 'OK'}</div>
              </div>
            </div>
          </section>
        </div>

        <section className={`${CARD} flex flex-col gap-3`} aria-live="polite">
          <div className={TAG} style={{ marginBottom: 0 }}>
            4 · The grown-up tells me if I was right
          </div>
          {!checked ? (
            <p className="text-[15px] text-slate-300">Ask the engineer about this motor.</p>
          ) : right ? (
            <p className="text-[16px] leading-relaxed text-emerald-200">
              <b>I was right!</b> The engineer also says {real ? 'STOP' : 'OK'}. Nothing moves.
            </p>
          ) : (
            <p className="text-[16px] leading-relaxed text-rose-100">
              <b>Oops.</b> I said {say ? 'STOP' : 'OK'}, the engineer says <b>{real ? 'STOP' : 'OK'}</b>. {real ? 'I was not worried enough: every knob goes UP a little, and my line comes DOWN a little.' : 'I was too worried: every knob goes DOWN a little, and my line goes UP a little.'} The loudest friend was <b>{loudest}</b>, so that knob moves the most.
              {was && (
                <span className="mt-1 block text-emerald-200">
                  Done. {FRIENDS.map((f, i) => `${f.name}: ${f1(was.knobs[i])} → ${f1(knobs[i])}`).join('.  ')}. Line: {f1(was.line)} → {f1(line)}.
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
            {checked && !right && !was && !auto && (
              <Btn tone="go" onClick={learn}>
                Learn from my mistake
              </Btn>
            )}
            {checked && (right || was) && !auto && (
              <Btn tone="go" onClick={next}>
                Next motor →
              </Btn>
            )}
            <Btn onClick={() => setAuto(!auto)} disabled={!auto && seen < 2}>
              {auto ? 'Stop' : 'Learn from 40 motors, fast'}
            </Btn>
            <Btn
              onClick={() => {
                setAuto(false)
                setKnobs(START.knobs)
                setLine(START.line)
                setHistory([])
                setSeen(0)
                next()
              }}
            >
              Start over
            </Btn>
            <Last10 history={history} />
          </div>
        </section>

        {knobs[2] < 0 && (
          <section className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-[15px] leading-relaxed text-emerald-50">
            <b>Fanny's knob has gone below zero: {f1(knobs[2])}.</b> Now the faster the fan, the less I worry. Nobody told me a fast fan is good news. Being wrong again and again pushed that knob down past zero.
            {good ? (
              <>
                {' '}
                And my line moved from {START.line} to {f1(line)} by itself. <b>A knob can count against, and the line is just one more knob.</b>
                <div className="mt-3">
                  <Btn tone="go" onClick={onNext}>
                    Next: a puzzle one judge cannot solve →
                  </Btn>
                </div>
              </>
            ) : (
              ' Keep going until 9 of my last 10 are right.'
            )}
          </section>
        )}

        <section className={`${CARD} text-[14px] leading-relaxed text-slate-300`}>
          <div className={TAG}>The same thing in grown-up words</div>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <span>A knob below zero → <b className="text-white">a negative weight</b> (this input counts against)</span>
            <span>The line → <b className="text-white">the bias, b = −line</b></span>
            <span>Saying STOP → <b className="text-white">a = 1 when w₁p₁ + w₂p₂ + w₃p₃ + b &gt; 0</b></span>
            <span>Moving the line after a mistake → <b className="text-white">new b = old b + α (t − a)</b></span>
          </div>
          {tutor && (
            <p className="mt-3 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-[13px] text-amber-50">
              <b>Tutor:</b> before any learning, ask which knob looks wrong and why (Fanny at +3). Run 40 motors and stop when Fanny's knob crosses zero: that moment is the lesson. Then ask what the line does that no knob can do: it lets the neuron say STOP even when every friend is quiet. In Hagan's notation the line is −b.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
