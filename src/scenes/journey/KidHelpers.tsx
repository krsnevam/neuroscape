import { useState, type ReactNode } from 'react'
import { Btn } from '../../ui/lab/controls'
import { CARD, f1, Face, Knob, TAG, WIGGLE } from './kidParts'

/**
 * Third step: a puzzle one judge cannot solve, kept as small as it can be.
 * Two heat probes sit on the same bearing and each says only HOT or COLD. If they say different
 * things, one is broken: STOP. That is four cases, and no single neuron gets all four.
 * Helpers are brought in one at a time so each new piece has one visible effect.
 */
const CASES = [
  { a: 0, b: 0, name: 'Both cold', stop: false },
  { a: 1, b: 1, name: 'Both hot', stop: false },
  { a: 1, b: 0, name: 'A hot, B cold', stop: true },
  { a: 0, b: 1, name: 'A cold, B hot', stop: true },
]
interface Judge {
  wa: number
  wb: number
  line: number
}
const worry = (j: Judge, a: number, b: number) => j.wa * a + j.wb * b - j.line
const H1: Judge = { wa: 1, wb: -1, line: 0.5 }
const H2: Judge = { wa: -1, wb: 1, line: 0.5 }
const H_COLORS = ['#a78bfa', '#38bdf8']
const STEPS = ['One judge', 'One helper', 'Two helpers', 'Take away the YES/NO'] as const

const Temp = ({ hot }: { hot: number }) => <span className={`rounded px-2 py-0.5 text-sm font-bold ${hot ? 'bg-orange-500/30 text-orange-200' : 'bg-sky-500/25 text-sky-200'}`}>{hot ? 'HOT' : 'COLD'}</span>
const Say = ({ stop }: { stop: boolean }) => <span className={`rounded px-2 py-0.5 text-sm font-bold ${stop ? 'bg-rose-500/30 text-rose-200' : 'bg-emerald-500/25 text-emerald-200'}`}>{stop ? 'STOP' : 'OK'}</span>
const Mark = ({ ok }: { ok: boolean }) => <span className={`grid h-6 w-6 place-items-center rounded-full text-sm font-bold ${ok ? 'bg-emerald-400 text-slate-950' : 'bg-rose-400 text-slate-950'}`}>{ok ? '✓' : '✗'}</span>

export default function KidHelpers({ tutor, onNext }: { tutor: boolean; onNext: () => void }) {
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [one, setOne] = useState<Judge>({ wa: 1, wb: 1, line: 0.5 })
  const [learned, setLearned] = useState<number | null>(null)
  const [h, setH] = useState<[Judge, Judge]>([H1, H2])
  const [own, setOwn] = useState(false)

  const go = (s: number) => {
    setStep(s)
    setReached((r) => Math.max(r, s))
  }
  const bend = step !== 3
  const helpers = step === 0 ? 0 : step === 1 ? 1 : 2
  const out = (j: number, a: number, b: number) => (bend ? (worry(h[j], a, b) > 0 ? 1 : 0) : worry(h[j], a, b))
  // the boss listens equally to every helper it has and shouts STOP once the total passes one half
  const bossWorry = (a: number, b: number) => Array.from({ length: helpers }, (_, j) => out(j, a, b)).reduce((x, y) => x + y, 0) - 0.5
  const says = (a: number, b: number) => (step === 0 ? worry(one, a, b) > 0 : bossWorry(a, b) > 0)
  const right = CASES.filter((c) => says(c.a, c.b) === c.stop).length

  // the mistake-fixing rule from the first two levels, run round and round the four cases
  const learnOne = () => {
    let j = { ...one }
    let best = 0
    for (let i = 0; i < 400; i++) {
      const c = CASES[i % 4]
      if (worry(j, c.a, c.b) > 0 !== c.stop) {
        const up = c.stop ? 1 : -1
        j = { wa: j.wa + up * 0.3 * c.a, wb: j.wb + up * 0.3 * c.b, line: j.line - up * 0.3 }
      }
      best = Math.max(best, CASES.filter((q) => worry(j, q.a, q.b) > 0 === q.stop).length)
    }
    setOne(j)
    setLearned(best)
  }

  const helperJob = ['A is hot but B is not', 'B is hot but A is not']
  const note = (children: ReactNode, tone: 'amber' | 'emerald' | 'rose' = 'amber') => (
    <div className={`rounded-lg border p-3 text-[15px] leading-relaxed ${tone === 'amber' ? 'border-amber-400/40 bg-amber-400/10 text-amber-50' : tone === 'emerald' ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-50' : 'border-rose-400/40 bg-rose-400/10 text-rose-50'}`}>{children}</div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <style>{WIGGLE}</style>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4">
        <div>
          <h2 className="text-xl font-semibold text-white">A puzzle one judge cannot solve</h2>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-300">
            Two heat probes sit on the <b className="text-white">same</b> bearing. Each one only says <b className="text-orange-300">HOT</b> or <b className="text-sky-300">COLD</b>. They are touching the same metal, so they should say the same thing. If they say <b className="text-white">different</b> things, one probe is broken, and the engineer says <b className="text-rose-300">STOP</b>. There are only four things that can happen.
          </p>
        </div>

        <nav className="flex flex-wrap gap-1.5" aria-label="Steps of this level">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              disabled={i > reached}
              aria-current={i === step ? 'step' : undefined}
              onClick={() => go(i)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-35 ${i === step ? 'border-violet-400 bg-violet-400/20 text-violet-100' : 'border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </nav>

        {/* the four cases: the whole puzzle on one small table */}
        <section className={CARD}>
          <div className={TAG}>The four cases</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-y-1.5 text-left text-[15px]">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 font-medium">Probe A</th>
                  <th className="px-2 font-medium">Probe B</th>
                  {Array.from({ length: helpers }, (_, j) => (
                    <th key={j} className="px-2 font-medium" style={{ color: H_COLORS[j] }}>
                      Helper {j + 1}
                    </th>
                  ))}
                  <th className="px-2 font-medium text-yellow-300">{step === 0 ? 'The judge says' : 'The boss says'}</th>
                  <th className="px-2 font-medium">Engineer says</th>
                  <th className="px-2 font-medium">Right?</th>
                </tr>
              </thead>
              <tbody>
                {CASES.map((c) => {
                  const s = says(c.a, c.b)
                  return (
                    <tr key={c.name} className="bg-white/[0.04]">
                      <td className="rounded-l-lg px-2 py-2">
                        <Temp hot={c.a} />
                      </td>
                      <td className="px-2 py-2">
                        <Temp hot={c.b} />
                      </td>
                      {Array.from({ length: helpers }, (_, j) => {
                        const v = out(j, c.a, c.b)
                        return (
                          <td key={j} className="px-2 py-2 font-semibold" style={{ color: bend ? (v ? H_COLORS[j] : '#64748b') : H_COLORS[j] }}>
                            {bend ? (v ? 'shouts YES' : 'quiet') : `passes ${f1(v)}`}
                          </td>
                        )
                      })}
                      <td className="px-2 py-2">
                        <Say stop={s} />
                      </td>
                      <td className="px-2 py-2">
                        <Say stop={c.stop} />
                      </td>
                      <td className="rounded-r-lg px-2 py-2">
                        <Mark ok={s === c.stop} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className={`mt-2 text-base font-semibold ${right === 4 ? 'text-emerald-300' : 'text-rose-300'}`}>{right} of 4 right</p>
        </section>

        {step === 0 && (
          <section className={`${CARD} flex flex-col gap-3`}>
            <div className={TAG} style={{ marginBottom: 0 }}>
              Step 1 · Try it with one judge, like before
            </div>
            <p className="text-[15px] leading-relaxed text-slate-300">
              One judge, two knobs and a line, exactly as in the last two levels. HOT counts as 1 and COLD as 0. Slide the knobs and watch the table. Can you make all four rows right?
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Knob label="Knob for Probe A" value={one.wa} min={-3} max={3} color="#fb923c" onChange={(v) => (setLearned(null), setOne({ ...one, wa: v }))} />
              <Knob label="Knob for Probe B" value={one.wb} min={-3} max={3} color="#f472b6" onChange={(v) => (setLearned(null), setOne({ ...one, wb: v }))} />
              <Knob label="Line" value={one.line} min={-3} max={3} color="#e2e8f0" onChange={(v) => (setLearned(null), setOne({ ...one, line: v }))} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Btn tone="go" onClick={learnOne}>
                Let it learn from its mistakes, 100 rounds
              </Btn>
              {learned !== null && <span className="text-sm text-slate-300">The best it ever managed: {learned} of 4.</span>}
            </div>
            {learned !== null &&
              note(
                <>
                  <b>It can never get all four.</b> Here is why. To shout STOP for "A hot, B cold", the judge must <b>like</b> A being hot. To shout STOP for "A cold, B hot", it must <b>like</b> B being hot. But if it likes both, then "both hot" makes it shout loudest of all, and that one should be OK. Fix one row and another breaks. One judge cannot do it, however long it learns.
                  <div className="mt-2">
                    <Btn tone="go" onClick={() => go(1)}>
                      Bring in a helper →
                    </Btn>
                  </div>
                </>,
              )}
          </section>
        )}

        {step >= 1 && (
          <section className={`${CARD} flex flex-col gap-3`}>
            <div className={TAG} style={{ marginBottom: 0 }}>
              Step {step + 1} · {STEPS[step]}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: helpers }, (_, j) => (
                <div key={j} className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: `${H_COLORS[j]}66` }}>
                  <div className="flex items-center gap-2 font-semibold" style={{ color: H_COLORS[j] }}>
                    <Face kind="helper" level={3} size={40} />
                    Helper {j + 1}
                  </div>
                  <p className="text-[15px] leading-snug text-white">
                    My only job: {bend ? 'shout YES' : 'report a number'} when <b>{helperJob[j]}</b>.
                  </p>
                  <p className="text-[13px] leading-snug text-slate-400">
                    My knobs: <b className="text-orange-300">{f1(h[j].wa)}</b> for A, <b className="text-pink-300">{f1(h[j].wb)}</b> for B. {j === 0 ? 'A being hot pushes me to shout. B being hot holds me back.' : 'The other way round: B pushes me, A holds me back.'}
                  </p>
                </div>
              ))}
              <div className="flex flex-col gap-2 rounded-lg border border-yellow-400/40 p-3">
                <div className="flex items-center gap-2 font-semibold text-yellow-300">
                  <Face kind="boss" level={3} size={40} />
                  The boss
                </div>
                <p className="text-[15px] leading-snug text-white">
                  I never hear the probes. I only hear {helpers === 1 ? 'my helper' : 'my helpers'}. If {helpers === 1 ? 'it shouts' : 'either one shouts'}, I say STOP.
                </p>
              </div>
            </div>

            {step === 1 &&
              note(
                <>
                  <b>3 of 4.</b> Helper 1 watches for one kind of trouble, "A hot, B cold", and catches it. But look at the last row: "A cold, B hot". Nobody is watching for that one, so the boss says OK. One helper is one more line, and this puzzle needs two.
                  <div className="mt-2">
                    <Btn tone="go" onClick={() => go(2)}>
                      Bring in a second helper →
                    </Btn>
                  </div>
                </>,
              )}
            {step === 2 &&
              note(
                <>
                  <b>All four right.</b> Each helper watches for <b>one</b> kind of trouble. The boss does not need to understand probes at all: it just listens for any helper shouting. Two simple helpers and a simple boss solve a puzzle that no single judge can. That is what a <b>hidden layer</b> is for.
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Btn tone="go" onClick={() => go(3)}>
                      One last experiment →
                    </Btn>
                    <Btn onClick={() => setOwn(!own)}>{own ? 'Hide the knobs' : 'Let me change the helpers\' knobs'}</Btn>
                  </div>
                </>,
                'emerald',
              )}
            {step === 2 && own && (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((j) => (
                  <div key={j} className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: `${H_COLORS[j]}66` }}>
                    <Knob label={`Helper ${j + 1}: knob for A`} value={h[j].wa} min={-2} max={2} color="#fb923c" onChange={(v) => setH(h.map((x, q) => (q === j ? { ...x, wa: v } : x)) as [Judge, Judge])} />
                    <Knob label={`Helper ${j + 1}: knob for B`} value={h[j].wb} min={-2} max={2} color="#f472b6" onChange={(v) => setH(h.map((x, q) => (q === j ? { ...x, wb: v } : x)) as [Judge, Judge])} />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <Btn onClick={() => setH([H1, H2])}>Put the helpers back</Btn>
                </div>
              </div>
            )}
            {step === 3 &&
              note(
                <>
                  <b>It has fallen apart: {right} of 4.</b> The helpers no longer shout YES or NO. Each one just passes its number on. Look at the row "both hot": helper 1 passes {f1(out(0, 1, 1))} and helper 2 passes {f1(out(1, 1, 1))}, and in the two trouble rows one says +0.5 and the other −1.5. When the boss adds them, they cancel out to the same total every time. Two helpers that only pass numbers on are no better than one judge. <b>The YES/NO step, the "bend", is what made them useful.</b>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Btn onClick={() => go(2)}>Give them their YES/NO back</Btn>
                    <Btn tone="go" onClick={onNext}>
                      Next: who teaches the helpers? →
                    </Btn>
                  </div>
                </>,
                'rose',
              )}
          </section>
        )}

        <section className={`${CARD} text-[14px] leading-relaxed text-slate-300`}>
          <div className={TAG}>The same thing in grown-up words</div>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <span>This puzzle → <b className="text-white">XOR, the exclusive-or problem</b></span>
            <span>"One judge cannot do it" → <b className="text-white">not linearly separable</b></span>
            <span>The helpers → <b className="text-white">the hidden layer</b></span>
            <span>The boss → <b className="text-white">the output neuron</b></span>
            <span>Shouting only YES or NO → <b className="text-white">a nonlinear activation function</b></span>
            <span>Passing the number on → <b className="text-white">a linear layer, which collapses to one neuron</b></span>
          </div>
          {tutor && (
            <p className="mt-3 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-[13px] text-amber-50">
              <b>Tutor:</b> spend most of the time on step 1. Let students call out knob settings and watch a different row break each time, until they argue it out themselves. Steps 2 and 3 then feel like relief. In step 4, write the boss's sum on the board for all four rows: it is the same number every time, which is W²(W¹p) reducing to one matrix. This is a redundant-sensor check, a real use of XOR on plant.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
