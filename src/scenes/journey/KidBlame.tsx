import { useEffect, useRef, useState } from 'react'
import { Btn } from '../../ui/lab/controls'
import { CASES, disagree, forwardKid, learnKid, randomKid, scoreCases, type KidNet, type KidStep } from './kidnet'
import { CARD, Face, TAG } from './kidParts'

/**
 * Fourth step: who teaches the helpers? Same four cases as before, but nobody sets the knobs.
 * The engineer corrects only the boss; the boss hands each helper a share of the blame.
 * One correction is shown slowly, in three plain steps, before it is run fast.
 * (Backpropagation on a 2-2-1 network learning XOR.)
 */
const SEEDS = [1, 3, 2, 5, 4, 14, 10, 6]
const H_COLORS = ['#a78bfa', '#38bdf8']
const pc = (v: number) => `${Math.round(v * 100)}%`
const f1 = (v: number) => (Math.abs(v) < 0.05 ? '0' : v.toFixed(1))

const Temp = ({ hot }: { hot: boolean }) => <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${hot ? 'bg-orange-500/30 text-orange-200' : 'bg-sky-500/25 text-sky-200'}`}>{hot ? 'HOT' : 'COLD'}</span>

/** A worry level as a bar, with a mark where it should have been. */
function Meter({ value, target, color }: { value: number; target?: number; color: string }) {
  return (
    <div className="relative h-5 w-full overflow-hidden rounded bg-slate-800">
      <div className="absolute inset-y-0 left-0 transition-all duration-500" style={{ width: pc(value), background: color }} />
      {target !== undefined && <div className="absolute inset-y-0 w-1 bg-white" style={{ left: target ? 'calc(100% - 4px)' : 0 }} />}
      <span className="absolute inset-0 grid place-items-center text-xs font-bold text-white">{pc(value)}</span>
    </div>
  )
}

/** In words, what a helper has turned into after learning. */
function describe(net: KidNet, j: number) {
  const on = CASES.filter((c) => forwardKid(net, c.a, c.b).h[j] > 0.5).map((c) => c.name)
  if (on.length === 0) return 'never gets worried'
  if (on.length === 4) return 'is always worried'
  if (on.length === 1) return `gets worried only for "${on[0]}"`
  if (on.length === 3) return `gets worried for everything except "${CASES.find((c) => !on.includes(c.name))!.name}"`
  return `gets worried for "${on.join('" and "')}"`
}

export default function KidBlame({ tutor, onNext }: { tutor: boolean; onNext: () => void }) {
  const [start, setStart] = useState(0)
  const net = useRef<KidNet>(randomKid(SEEDS[0]))
  const [pick, setPick] = useState(2)
  const [stage, setStage] = useState(0) // 0 look, 1 how wrong, 2 who is to blame, 3 knobs changed
  const [step, setStep] = useState<KidStep | null>(null)
  const [fast, setFast] = useState(false)
  const [count, setCount] = useState(0)
  const [byHand, setByHand] = useState(0)
  const [, bump] = useState(0)

  const n = net.current
  const c = CASES[pick]
  const now = forwardKid(n, c.a, c.b)
  const target = disagree(c.a, c.b) ? 1 : 0
  // while a correction is on screen, keep showing the answer as it was before the knobs moved
  const seen = step ? { h: step.h, out: step.out } : now
  const err = target - seen.out
  const score = scoreCases(n)

  const choose = (i: number) => {
    setPick(i)
    setStage(0)
    setStep(null)
  }
  const forward = () => {
    if (stage === 0) setStage(1)
    else if (stage === 1) {
      setStep(learnKid(n, c.a, c.b, 1))
      setCount((k) => k + 1)
      setByHand((k) => k + 1)
      setStage(2)
    } else if (stage === 2) setStage(3)
    else choose((pick + 1) % 4)
  }
  const restart = () => {
    const s = (start + 1) % SEEDS.length
    setStart(s)
    net.current = randomKid(SEEDS[s])
    setFast(false)
    setCount(0)
    choose(2)
  }

  // the same correction over and over, round the four cases
  useEffect(() => {
    if (!fast) return
    let raf = 0
    let done = 0
    let i = 0
    const settled = () => CASES.every((q) => Math.abs(forwardKid(net.current, q.a, q.b).out - (disagree(q.a, q.b) ? 1 : 0)) < 0.12)
    const tick = () => {
      for (let k = 0; k < 6; k++) {
        const q = CASES[i++ % 4]
        learnKid(net.current, q.a, q.b, 1)
      }
      done += 6
      setCount((v) => v + 6)
      bump((v) => v + 1)
      if (done >= 2000 || settled()) return setFast(false)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [fast])

  const solved = score === 4 && !fast && count > 20
  const stuck = !fast && count >= 2000 && score < 4
  const share = step ? step.blame.map((b) => Math.abs(b)) : [0, 0]
  const total = Math.max(1e-9, share[0] + share[1])
  const more = share[0] >= share[1] ? 0 : 1
  const f2 = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2))
  const arrow = (before: number, after: number) => (f2(after) === f2(before) ? '· no change' : after > before ? `↑ up to ${f2(after)}` : `↓ down to ${f2(after)}`)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Who teaches the helpers?</h2>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-300">
            The same four cases. Last time <b className="text-white">you</b> were told what each helper's job was. This time nobody is told anything: every knob starts as a random number, so the helpers have no jobs yet. And the engineer only ever speaks to the <b className="text-yellow-300">boss</b>. So how does a <b className="text-violet-300">helper</b> find out it is doing the wrong thing? <b className="text-white">The boss passes the blame back.</b>
          </p>
        </div>

        <section className={CARD}>
          <div className={TAG}>The four cases, right now · tap a row to look at it</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-separate border-spacing-y-1.5 text-left text-[14px]">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 font-medium">Probes</th>
                  <th className="w-[19%] px-2 font-medium" style={{ color: H_COLORS[0] }}>
                    Helper 1's worry
                  </th>
                  <th className="w-[19%] px-2 font-medium" style={{ color: H_COLORS[1] }}>
                    Helper 2's worry
                  </th>
                  <th className="w-[22%] px-2 font-medium text-yellow-300">Boss's worry (white mark = should be)</th>
                  <th className="px-2 font-medium">Right?</th>
                </tr>
              </thead>
              <tbody>
                {CASES.map((q, i) => {
                  const r = forwardKid(n, q.a, q.b)
                  const t = disagree(q.a, q.b)
                  const ok = r.out > 0.5 === t
                  return (
                    <tr key={q.name} onClick={() => !fast && choose(i)} className={`cursor-pointer ${i === pick ? 'bg-violet-400/15 outline outline-1 outline-violet-400/60' : 'bg-white/[0.04] hover:bg-white/[0.07]'}`}>
                      <td className="whitespace-nowrap rounded-l-lg px-2 py-2">
                        A <Temp hot={q.a > 5} /> B <Temp hot={q.b > 5} />
                      </td>
                      <td className="px-2 py-2">
                        <Meter value={r.h[0]} color={H_COLORS[0]} />
                      </td>
                      <td className="px-2 py-2">
                        <Meter value={r.h[1]} color={H_COLORS[1]} />
                      </td>
                      <td className="px-2 py-2">
                        <Meter value={r.out} target={t ? 1 : 0} color={r.out > 0.5 ? '#f87171' : '#4ade80'} />
                      </td>
                      <td className="rounded-r-lg px-2 py-2">
                        <span className={`grid h-6 w-6 place-items-center rounded-full text-sm font-bold ${ok ? 'bg-emerald-400 text-slate-950' : 'bg-rose-400 text-slate-950'}`}>{ok ? '✓' : '✗'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className={`text-base font-semibold ${score === 4 ? 'text-emerald-300' : 'text-rose-300'}`}>{score} of 4 right</span>
            <span className="text-sm text-slate-400">{count} corrections so far</span>
            <span className="ml-auto flex flex-wrap gap-2">
              <Btn onClick={() => (setStage(0), setStep(null), setFast(!fast))} disabled={!fast && byHand < 2}>
                {fast ? 'Stop' : 'Do this 2,000 times, fast'}
              </Btn>
              <Btn tone="warn" onClick={restart}>
                New random knobs
              </Btn>
            </span>
          </div>
          {byHand < 2 && <p className="mt-1 text-xs text-slate-500">Go through two corrections slowly below. Then you can go fast.</p>}
        </section>

        {!fast && (
          <section className={`${CARD} flex flex-col gap-4`} aria-live="polite">
            <div className={TAG} style={{ marginBottom: 0 }}>
              One correction, slowly · Probe A is {c.a > 5 ? 'HOT' : 'COLD'}, Probe B is {c.b > 5 ? 'HOT' : 'COLD'}
            </div>

            {/* 1: how wrong */}
            <div className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-yellow-400 text-base font-bold text-slate-950">1</span>
              <div className="flex-1 text-[15px] leading-relaxed text-slate-200">
                <b className="text-yellow-300">How wrong was the boss?</b>
                {stage === 0 ? (
                  <p className="text-slate-400">The boss is {pc(seen.out)} worried about this case. Ask the engineer.</p>
                ) : (
                  <p>
                    The boss was <b>{pc(seen.out)}</b> worried. The engineer says <b>{target ? 'STOP' : 'OK'}</b>, so it should have been <b>{target ? '100%' : '0%'}</b>.{' '}
                    {Math.abs(err) < 0.12 ? (
                      'That is nearly right. Only a tiny fix is needed.'
                    ) : err > 0 ? (
                      <>
                        The boss was <b className="text-amber-300">not worried enough</b>.
                      </>
                    ) : (
                      <>
                        The boss was <b className="text-amber-300">too worried</b>.
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* 2: who gets the blame */}
            {stage >= 2 && step && (
              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-400 text-base font-bold text-slate-950">2</span>
                <div className="flex-1 text-[15px] leading-relaxed text-slate-200">
                  <b className="text-amber-300">Who gets the blame?</b>
                  <p>
                    The boss cannot fix this alone, because its answer came from what the helpers told it. So it shares out the blame. A helper gets more blame when the boss <b>listens to it more</b>.
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {[0, 1].map((j) => (
                      <div key={j} className="flex items-center gap-3">
                        <Face kind="helper" level={3} size={34} />
                        <div className="w-24 shrink-0 text-sm font-semibold" style={{ color: H_COLORS[j] }}>
                          Helper {j + 1}
                        </div>
                        <div className="h-5 flex-1 overflow-hidden rounded bg-slate-800">
                          <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${(share[j] / total) * 100}%` }} />
                        </div>
                        <div className="w-40 shrink-0 text-xs text-slate-400">
                          boss's knob for it: <b className="text-white">{f1(step.before.v[j])}</b>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2">
                    {share[more] / total > 0.6 ? (
                      <>
                        Most of the blame goes to <b style={{ color: H_COLORS[more] }}>Helper {more + 1}</b>.
                      </>
                    ) : (
                      'The two helpers share the blame about equally.'
                    )}{' '}
                    <span className="text-slate-400">A helper that is already completely sure (0% or 100%) gets very little: it is too stuck to be nudged.</span>
                  </p>
                </div>
              </div>
            )}

            {/* 3: everyone turns their own knobs */}
            {stage >= 3 && step && (
              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-400 text-base font-bold text-slate-950">3</span>
                <div className="flex-1 text-[15px] leading-relaxed text-slate-200">
                  <b className="text-emerald-300">Everyone turns their own knobs a little.</b>
                  <p>The boss changes how much it listens. Each helper changes its own two knobs by the size of its blame, exactly the way you turned knobs in level 1.</p>
                  <div className="mt-2 grid gap-2 font-mono text-[13px] sm:grid-cols-3">
                    <div className="rounded-md border border-yellow-400/40 p-2">
                      <div className="mb-1 font-sans text-xs font-semibold text-yellow-300">The boss</div>
                      knob for helper 1: {f2(step.before.v[0])} {arrow(step.before.v[0], n.v[0])}
                      <br />
                      knob for helper 2: {f2(step.before.v[1])} {arrow(step.before.v[1], n.v[1])}
                    </div>
                    {[0, 1].map((j) => (
                      <div key={j} className="rounded-md border p-2" style={{ borderColor: `${H_COLORS[j]}66` }}>
                        <div className="mb-1 font-sans text-xs font-semibold" style={{ color: H_COLORS[j] }}>
                          Helper {j + 1}
                        </div>
                        knob for A: {f2(step.before.W[j][0])} {arrow(step.before.W[j][0], n.W[j][0])}
                        <br />
                        knob for B: {f2(step.before.W[j][1])} {arrow(step.before.W[j][1], n.W[j][1])}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2">
                    For this case the boss would now be <b>{pc(now.out)}</b> worried, where before it was {pc(step.out)}. {Math.abs(target - now.out) < Math.abs(target - step.out) ? 'A little closer.' : 'About the same: it will take many more turns.'} One correction is tiny. It takes hundreds.
                  </p>
                </div>
              </div>
            )}

            <div>
              <Btn tone="go" onClick={forward}>
                {stage === 0 ? 'Ask the engineer' : stage === 1 ? 'Share out the blame →' : stage === 2 ? 'Turn the knobs →' : 'Next case →'}
              </Btn>
            </div>
          </section>
        )}

        {solved && (
          <section className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4 text-[15px] leading-relaxed text-emerald-50">
            <b>All four right, starting from random knobs.</b> Look at the helper columns in the table. <b style={{ color: H_COLORS[0] }}>Helper 1</b> now {describe(n, 0)}. <b style={{ color: H_COLORS[1] }}>Helper 2</b> now {describe(n, 1)}. Nobody gave them those jobs. The engineer only ever corrected the boss, and the blame that came back shaped each helper into something useful. <b>That is how every knob in a network learns.</b>
            <div className="mt-3">
              <Btn tone="go" onClick={onNext}>
                Now the real thing: follow a signal through the network →
              </Btn>
            </div>
          </section>
        )}
        {stuck && (
          <section className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-4 text-[15px] leading-relaxed text-rose-50">
            <b>
              Stuck at {score} of 4 after {count} corrections.
            </b>{' '}
            Every correction was a small step that made things slightly better, and those steps have led somewhere that no small step can improve. These random knobs were an unlucky place to start. It happens with real networks too. Press <b>New random knobs</b> and try again: this is why engineers train from several different starts and keep the best.
          </section>
        )}

        <section className={`${CARD} text-[14px] leading-relaxed text-slate-300`}>
          <div className={TAG}>The same thing in grown-up words</div>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <span>Worry from 0% to 100% → <b className="text-white">log-sigmoid activation</b></span>
            <span>How wrong the boss was → <b className="text-white">output error, t − a</b></span>
            <span>A helper's share of the blame → <b className="text-white">its sensitivity s¹</b></span>
            <span>Passing the blame back → <b className="text-white">backpropagation</b></span>
            <span>"The boss listens to it more" → <b className="text-white">the weight the blame travels back through</b></span>
            <span>"Too sure to be nudged" → <b className="text-white">a saturated neuron, slope near zero</b></span>
            <span>Stuck after many corrections → <b className="text-white">a local minimum</b></span>
            <span>New random knobs → <b className="text-white">a new weight initialisation</b></span>
          </div>
          {tutor && (
            <p className="mt-3 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-[13px] text-amber-50">
              <b>Tutor:</b> before pressing "Share out the blame", ask the class which helper should get more, and why (the one the boss's knob is larger for, unless that helper is pinned at 0% or 100%). After the fast run, read out what each helper has become and compare it with the jobs handed out by hand in the last level: the network found a division of labour by itself, sometimes a different one that works just as well. The second set of random knobs is chosen to get stuck; use it to motivate several restarts (L37).
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
