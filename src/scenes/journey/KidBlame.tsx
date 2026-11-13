import { useEffect, useRef, useState } from 'react'
import { Btn } from '../../ui/lab/controls'
import { rng } from './sim'
import { disagree, forwardKid, helperLine, learnKid, randomKid, scoreKid, type KidNet, type KidStep } from './kidnet'
import { CARD, ProbeMap, TAG } from './kidParts'

/**
 * Fourth step: who teaches the helpers? The engineer only corrects the boss. The boss passes
 * each helper a share of the blame, in proportion to how much it listened to that helper.
 * This is backpropagation on a 2-2-1 network, on the probe-disagreement puzzle.
 */
const SEEDS = [1, 7, 9, 6, 2, 5, 12, 8]
const H_COLORS = ['#a78bfa', '#38bdf8']
const pc = (v: number) => `${Math.round(v * 100)}%`
const f2 = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2))

export default function KidBlame({ tutor, onNext }: { tutor: boolean; onNext: () => void }) {
  const [start, setStart] = useState(0)
  const net = useRef<KidNet>(randomKid(SEEDS[0]))
  const rand = useRef(rng(77))
  const [motor, setMotor] = useState<[number, number]>([8, 2])
  const [asked, setAsked] = useState(false)
  const [step, setStep] = useState<KidStep | null>(null)
  const [fast, setFast] = useState(false)
  const [count, setCount] = useState(0)
  const [byHand, setByHand] = useState(0)
  const [, bump] = useState(0)

  const [a, b] = motor
  const now = forwardKid(net.current, a, b)
  const target = disagree(a, b) ? 1 : 0
  const score = scoreKid(net.current)
  const shown = step ? { h: step.h, out: step.out } : now

  const nextMotor = () => {
    setMotor([Math.round(rand.current() * 10), Math.round(rand.current() * 10)])
    setAsked(false)
    setStep(null)
  }
  const passBlame = () => {
    setStep(learnKid(net.current, a, b, 1))
    setCount((n) => n + 1)
    setByHand((n) => n + 1)
  }
  const restart = () => {
    const s = (start + 1) % SEEDS.length
    setStart(s)
    net.current = randomKid(SEEDS[s])
    setFast(false)
    setCount(0)
    nextMotor()
  }

  // the same correction, many motors a second
  useEffect(() => {
    if (!fast) return
    let raf = 0
    let done = 0
    const tick = () => {
      for (let i = 0; i < 20; i++) learnKid(net.current, Math.round(rand.current() * 10), Math.round(rand.current() * 10), 1)
      done += 20
      setCount((n) => n + 20)
      bump((n) => n + 1)
      if (done >= 3000 || scoreKid(net.current) === 121) {
        setFast(false)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fast])

  const n = net.current
  const before = step?.before
  const solved = score >= 115
  const stuck = !fast && count >= 3000 && score < 100
  // picture of the little network
  const P = [
    { x: 60, y: 70 },
    { x: 60, y: 190 },
  ]
  const Hd = [
    { x: 270, y: 60 },
    { x: 270, y: 200 },
  ]
  const B = { x: 470, y: 130 }
  const edge = (x1: number, y1: number, x2: number, y2: number, w: number, old: number | undefined, key: string, at = 0.5) => {
    const mx = x1 + (x2 - x1) * at
    const my = y1 + (y2 - y1) * at
    const changed = old !== undefined && Math.abs(old - w) > 0.004
    return (
      <g key={key}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={w >= 0 ? '#2dd4bf' : '#fb7185'} strokeWidth={1 + Math.min(6, Math.abs(w) * 1.6)} opacity={0.8} />
        <rect x={mx - (changed ? 44 : 20)} y={my - 10} width={changed ? 88 : 40} height={20} rx={4} fill="#0f172a" stroke={changed ? '#4ade80' : '#334155'} />
        <text x={mx} y={my + 4} textAnchor="middle" fontSize="12" fontFamily="ui-monospace, monospace" fill={changed ? '#86efac' : '#e2e8f0'}>
          {changed ? `${f2(old)} → ${f2(w)}` : f2(w)}
        </text>
      </g>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Who teaches the helpers?</h2>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-300">
            Same puzzle: STOP when the two probes disagree. Last time <b className="text-white">you</b> set the helpers' knobs. Now nobody does: all 9 knobs start as random numbers. The engineer only ever tells the <b className="text-yellow-300">boss</b> "right" or "wrong". So how can a <b className="text-violet-300">helper</b> learn? The boss <b className="text-white">passes the blame back</b>.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section className={`${CARD} flex flex-col gap-3`}>
            <div className={TAG} style={{ marginBottom: 0 }}>
              One motor, step by step
            </div>
            <svg viewBox="0 0 560 262" className="w-full" role="img" aria-label="Two probes feed two helpers, which feed the boss. Numbers on the wires are the knobs.">
              {[0, 1].map((j) => [0, 1].map((i) => edge(P[i].x + 26, P[i].y, Hd[j].x - 30, Hd[j].y, n.W[j][i], before?.W[j][i], `w${j}${i}`, i === j ? 0.5 : 0.3)))}
              {[0, 1].map((j) => edge(Hd[j].x + 30, Hd[j].y, B.x - 34, B.y, n.v[j], before?.v[j], `v${j}`))}
              {P.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={26} fill={i ? '#f472b6' : '#fb923c'} />
                  <text x={p.x} y={p.y + 6} textAnchor="middle" fontSize="20" fontWeight="700" fill="#0f172a">
                    {motor[i]}
                  </text>
                  <text x={p.x} y={p.y + 44} textAnchor="middle" fontSize="12" fill="#94a3b8">
                    Probe {i ? 'B' : 'A'}
                  </text>
                </g>
              ))}
              {Hd.map((h, j) => (
                <g key={j}>
                  <circle cx={h.x} cy={h.y} r={30} fill="#1e1b4b" stroke={H_COLORS[j]} strokeWidth={3} />
                  <circle cx={h.x} cy={h.y} r={30} fill={H_COLORS[j]} opacity={shown.h[j] * 0.7} />
                  <text x={h.x} y={h.y + 6} textAnchor="middle" fontSize="16" fontWeight="700" fill="#f8fafc">
                    {pc(shown.h[j])}
                  </text>
                  <text x={h.x} y={h.y + (j ? 48 : -38)} textAnchor="middle" fontSize="12" fill={H_COLORS[j]}>
                    Helper {j + 1}'s worry
                  </text>
                  {step && (
                    <text x={h.x} y={h.y + (j ? -38 : 50)} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fbbf24">
                      blame {f2(step.blame[j])}
                    </text>
                  )}
                </g>
              ))}
              <circle cx={B.x} cy={B.y} r={34} fill="#422006" stroke="#facc15" strokeWidth={3} />
              <circle cx={B.x} cy={B.y} r={34} fill="#facc15" opacity={shown.out * 0.6} />
              <text x={B.x} y={B.y + 6} textAnchor="middle" fontSize="17" fontWeight="700" fill="#f8fafc">
                {pc(shown.out)}
              </text>
              <text x={B.x} y={B.y - 44} textAnchor="middle" fontSize="12" fill="#facc15">
                The boss's worry
              </text>
              <text x={B.x} y={B.y + 54} textAnchor="middle" fontSize="13" fontWeight="700" fill={shown.out > 0.5 ? '#fca5a5' : '#86efac'}>
                says {shown.out > 0.5 ? 'STOP' : 'OK'}
              </text>
              {asked && (
                <text x={B.x} y={B.y + 74} textAnchor="middle" fontSize="12" fill="#e2e8f0">
                  engineer: {target ? 'STOP (100%)' : 'OK (0%)'}
                </text>
              )}
            </svg>

            <div className="min-h-[5.5rem] text-[15px] leading-relaxed" aria-live="polite">
              {!asked ? (
                <p className="text-slate-300">
                  Probe A says {a}, Probe B says {b}. Helpers no longer shout only YES or NO. They say <b className="text-white">how worried</b> they are, from 0% to 100%, so that they can be nudged a little at a time. The boss is {pc(now.out)} worried.
                </p>
              ) : !step ? (
                <p className="text-slate-200">
                  The engineer says <b>{target ? 'STOP' : 'OK'}</b>, so the boss should have been {target ? '100%' : '0%'} worried. It was {pc(now.out)}. The boss is wrong by <b className="text-amber-300">{f2(target - now.out)}</b>. {Math.abs(target - now.out) < 0.15 ? 'That is close: only a tiny correction is needed.' : 'Now pass that back.'}
                </p>
              ) : (
                <div className="text-slate-200">
                  <p>
                    <b className="text-yellow-300">1. The boss fixes its own knobs</b>, most for the helper who was loudest (green boxes on the right).
                  </p>
                  <p>
                    <b className="text-amber-300">2. The boss passes blame back.</b> A helper's blame = how wrong the boss was × how much the boss listens to that helper × how unsure that helper was. Helper 1 gets <b className="text-amber-300">{f2(step.blame[0])}</b>, helper 2 gets <b className="text-amber-300">{f2(step.blame[1])}</b>.
                  </p>
                  <p>
                    <b className="text-violet-300">3. Each helper turns its own knobs</b> by its blame, the loudest probe most: exactly what you did in the first step.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!asked && !fast && (
                <Btn tone="go" onClick={() => setAsked(true)}>
                  Ask the engineer
                </Btn>
              )}
              {asked && !step && !fast && (
                <Btn tone="go" onClick={passBlame}>
                  Pass the blame back
                </Btn>
              )}
              {step && !fast && (
                <Btn tone="go" onClick={nextMotor}>
                  Next motor →
                </Btn>
              )}
              <Btn onClick={() => (setStep(null), setAsked(false), setFast(!fast))} disabled={!fast && byHand < 2}>
                {fast ? 'Stop' : 'Do this for 3,000 motors, fast'}
              </Btn>
              <Btn tone="warn" onClick={restart}>
                New random knobs
              </Btn>
              <span className="ml-auto text-sm text-slate-400">{count} motors so far</span>
            </div>
            {byHand < 2 && <p className="text-xs text-slate-500">Pass the blame back by hand for two motors first. Then you can go fast.</p>}
          </section>

          <section className={CARD}>
            <div className={TAG}>What all 9 knobs add up to</div>
            <ProbeMap
              truth={disagree}
              say={(x, y) => forwardKid(n, x, y).out}
              lines={[0, 1].map((j) => ({ ...helperLine(n, j), color: H_COLORS[j] }))}
              mark={motor}
              onPick={(x, y) => (setMotor([x, y]), setAsked(false), setStep(null))}
            />
          </section>
        </div>

        {solved && (
          <section className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-[15px] leading-relaxed text-emerald-50">
            <b>{score} of 121 right, from random knobs.</b> Look at the two helper lines on the map: they have moved to the two edges of the green stripe. One helper has become "A is much hotter than B", the other "B is much hotter than A". Nobody told them to. The engineer only ever corrected the boss. <b>Passing the blame back is how every knob in a network learns.</b>
            <div className="mt-3">
              <Btn tone="go" onClick={onNext}>
                Now the real thing: follow a signal through the network →
              </Btn>
            </div>
          </section>
        )}
        {stuck && (
          <section className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-4 text-[15px] leading-relaxed text-rose-50">
            <b>Stuck at {score} of 121.</b> Every correction was a small step that made things a little better, and those steps have led to a place where no small step helps any more. The knobs did not start somewhere lucky. This happens with real networks too. Press <b>New random knobs</b> and try again: that is why engineers train from several different starts.
          </section>
        )}

        <section className={`${CARD} text-[14px] leading-relaxed text-slate-300`}>
          <div className={TAG}>The same thing in grown-up words</div>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <span>How worried, 0% to 100% → <b className="text-white">log-sigmoid activation</b></span>
            <span>How wrong the boss was → <b className="text-white">output error, t − a</b></span>
            <span>A helper's blame → <b className="text-white">its sensitivity s¹</b></span>
            <span>Passing the blame back → <b className="text-white">backpropagation</b></span>
            <span>"How much the boss listens" → <b className="text-white">the weight W² the blame travels back through</b></span>
            <span>"How unsure the helper was" → <b className="text-white">the slope of its activation, a(1 − a)</b></span>
            <span>Stuck after many motors → <b className="text-white">a local minimum</b></span>
            <span>New random knobs → <b className="text-white">a new weight initialisation</b></span>
          </div>
          {tutor && (
            <p className="mt-3 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-[13px] text-amber-50">
              <b>Tutor:</b> do two motors by hand and make the class predict which helper gets more blame before you press the button (the one the boss listens to more, unless it is already at 0% or 100%). Ask why a helper that is completely sure gets almost no blame: its a(1 − a) is nearly zero, which is the saturation problem from Unit 3. The second "New random knobs" start is chosen to get stuck; use it to motivate several restarts (L37).
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
