import { useState } from 'react'
import { Btn } from '../../ui/lab/controls'
import { rng } from './sim'
import { disagree } from './kidnet'
import { CARD, f1, Face, Knob, ProbeMap, TAG, WIGGLE } from './kidParts'

/**
 * Third step: a puzzle one judge cannot solve. Two temperature probes sit on the same bearing.
 * If they disagree, one of them is broken: STOP. The OK motors lie in a stripe, and a stripe
 * needs two lines, so it needs two helpers (a hidden layer) and a boss.
 */
interface Judge {
  wa: number
  wb: number
  line: number
}
const worryOf = (j: Judge, a: number, b: number) => j.wa * a + j.wb * b - j.line
const POOR: { h: [Judge, Judge]; boss: { v: [number, number]; line: number } } = {
  h: [
    { wa: 1, wb: 0, line: 5 },
    { wa: 0, wb: 1, line: 5 },
  ],
  boss: { v: [1, 1], line: 0.5 },
}
const HINT: typeof POOR = {
  h: [
    { wa: 1, wb: -1, line: 2.5 },
    { wa: -1, wb: 1, line: 2.5 },
  ],
  boss: { v: [1, 1], line: 0.5 },
}
const H_COLORS = ['#a78bfa', '#38bdf8']

export default function KidHelpers({ tutor, onNext }: { tutor: boolean; onNext: () => void }) {
  const [stage, setStage] = useState<'one' | 'helpers'>('one')
  const [one, setOne] = useState<Judge>({ wa: 1, wb: 1, line: 10 })
  const [tries, setTries] = useState(0)
  const [net, setNet] = useState(POOR)
  const [bend, setBend] = useState(true)
  const [motor, setMotor] = useState<[number, number]>([8, 3])
  const [tasks, setTasks] = useState({ failed: false, solved: false, collapsed: false })

  const scoreOf = (say: (a: number, b: number) => boolean) => {
    let n = 0
    for (let a = 0; a <= 10; a++) for (let b = 0; b <= 10; b++) if (say(a, b) === disagree(a, b)) n++
    return n
  }
  const oneSays = (a: number, b: number) => worryOf(one, a, b) > 0
  const helperOut = (j: number, a: number, b: number, bent = bend) => {
    const w = worryOf(net.h[j], a, b)
    return bent ? (w > 0 ? 1 : 0) : w
  }
  const bossWorry = (a: number, b: number, bent = bend) => net.boss.v[0] * helperOut(0, a, b, bent) + net.boss.v[1] * helperOut(1, a, b, bent) - net.boss.line
  const netSays = (a: number, b: number) => bossWorry(a, b) > 0

  // the perceptron rule from the first two steps, run on 300 random motors
  const learnOne = () => {
    const r = rng(50 + tries)
    let j = { ...one }
    for (let i = 0; i < 300; i++) {
      const a = Math.round(r() * 10)
      const b = Math.round(r() * 10)
      const t = disagree(a, b)
      if (worryOf(j, a, b) > 0 !== t) {
        const up = t ? 1 : -1
        j = { wa: j.wa + up * 0.02 * a, wb: j.wb + up * 0.02 * b, line: j.line - up * 0.3 }
      }
    }
    setOne(j)
    setTries(tries + 1)
    setTasks((t) => ({ ...t, failed: true }))
  }
  const update = (next: typeof POOR, bent = bend) => {
    setNet(next)
    const s = scoreOf((a, b) => next.boss.v[0] * (bent ? (worryOf(next.h[0], a, b) > 0 ? 1 : 0) : worryOf(next.h[0], a, b)) + next.boss.v[1] * (bent ? (worryOf(next.h[1], a, b) > 0 ? 1 : 0) : worryOf(next.h[1], a, b)) - next.boss.line > 0)
    if (bent && s >= 115) setTasks((t) => ({ ...t, solved: true }))
  }
  const setHelper = (j: number, patch: Partial<Judge>) => update({ ...net, h: net.h.map((h, q) => (q === j ? { ...h, ...patch } : h)) as [Judge, Judge] })
  const toggleBend = (on: boolean) => {
    setBend(on)
    if (!on && tasks.solved) setTasks((t) => ({ ...t, collapsed: true }))
  }

  const [a, b] = motor
  const stars = Number(tasks.failed) + Number(tasks.solved) + Number(tasks.collapsed)
  const oneScore = scoreOf(oneSays)
  const tick = (ok: boolean) => <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${ok ? 'bg-emerald-400 text-slate-950' : 'border border-white/25 text-slate-500'}`}>{ok ? '✓' : ''}</span>

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <style>{WIGGLE}</style>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4">
        <div>
          <h2 className="text-xl font-semibold text-white">A puzzle one judge cannot solve</h2>
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-300">
            Two heat probes sit on the same bearing: <b className="text-orange-300">Probe A</b> and <b className="text-pink-300">Probe B</b>. They should say nearly the same number. If they <b className="text-white">disagree by 3 or more</b>, one of them is broken and the engineer says <b className="text-rose-300">STOP</b>. If they agree, <b className="text-emerald-300">OK</b>.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
          <section className={CARD}>
            <div className={TAG}>Every motor there could be</div>
            {stage === 'one' ? (
              <ProbeMap truth={disagree} say={(x, y) => (oneSays(x, y) ? 1 : 0)} lines={[{ wa: one.wa, wb: one.wb, k: one.line, color: '#facc15' }]} mark={motor} onPick={(x, y) => setMotor([x, y])} />
            ) : (
              <ProbeMap
                truth={disagree}
                say={(x, y) => (netSays(x, y) ? 1 : 0)}
                lines={bend ? net.h.map((h, j) => ({ wa: h.wa, wb: h.wb, k: h.line, color: H_COLORS[j] })) : []}
                mark={motor}
                onPick={(x, y) => setMotor([x, y])}
              />
            )}
          </section>

          {stage === 'one' ? (
            <section className={`${CARD} flex flex-col gap-3`}>
              <div className={TAG} style={{ marginBottom: 0 }}>
                Try it with one judge, like before
              </div>
              <p className="text-[14px] leading-relaxed text-slate-300">
                One judge has two knobs and a line, exactly as in the last two steps. On the map, everything a single judge can do is <b className="text-yellow-300">one straight yellow line</b>: STOP on one side, OK on the other. Turn the knobs, or let it learn from its mistakes.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Knob label="Knob for Probe A" value={one.wa} min={-3} max={3} color="#fb923c" onChange={(v) => setOne({ ...one, wa: v })} />
                <Knob label="Knob for Probe B" value={one.wb} min={-3} max={3} color="#f472b6" onChange={(v) => setOne({ ...one, wb: v })} />
                <Knob label="Line" value={one.line} min={-15} max={25} step={0.5} color="#e2e8f0" onChange={(v) => setOne({ ...one, line: v })} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Btn tone="go" onClick={learnOne}>
                  Learn from 300 motors
                </Btn>
                <span className="text-sm text-slate-300">
                  Right now: <b className={oneScore >= 100 ? 'text-emerald-300' : 'text-rose-300'}>{oneScore} of 121</b>
                  {tries > 0 && ` · learned ${tries} time${tries > 1 ? 's' : ''}`}
                </span>
              </div>
              {tasks.failed && (
                <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-[14px] leading-relaxed text-amber-50">
                  <b>It never gets them all.</b> Look at the map: the green OK motors sit in a <b>stripe</b> down the middle, with red on <b>both</b> sides. One straight line can only cut the map into two pieces. To fence off a stripe you need <b>two lines</b>. One judge, however well it learns, has only one.
                  <div className="mt-2">
                    <Btn tone="go" onClick={() => setStage('helpers')}>
                      Call two helpers →
                    </Btn>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className={`${CARD} flex flex-col gap-3`}>
              <div className={TAG} style={{ marginBottom: 0 }}>
                Two helpers and a boss
              </div>
              <p className="text-[14px] leading-relaxed text-slate-300">
                Each <b className="text-violet-300">helper</b> is a judge like before: two knobs, one line, and it shouts <b className="text-white">YES</b> or <b className="text-white">NO</b>. The <b className="text-yellow-300">boss</b> never hears the probes. It only listens to the two helpers and says STOP if enough of them shout YES.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {[0, 1].map((j) => (
                  <div key={j} className="flex flex-col gap-2 rounded-lg border p-2.5" style={{ borderColor: `${H_COLORS[j]}66` }}>
                    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: H_COLORS[j] }}>
                      <Face kind="helper" level={helperOut(j, a, b, true) ? 8 : 2} size={36} />
                      Helper {j + 1}
                    </div>
                    <Knob label="Knob for A" value={net.h[j].wa} min={-2} max={2} color="#fb923c" onChange={(v) => setHelper(j, { wa: v })} />
                    <Knob label="Knob for B" value={net.h[j].wb} min={-2} max={2} color="#f472b6" onChange={(v) => setHelper(j, { wb: v })} />
                    <Knob label="Line" value={net.h[j].line} min={-10} max={10} step={0.5} color="#e2e8f0" onChange={(v) => setHelper(j, { line: v })} />
                  </div>
                ))}
                <div className="flex flex-col gap-2 rounded-lg border border-yellow-400/40 p-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-yellow-300">
                    <Face kind="boss" level={netSays(a, b) ? 8 : 2} size={36} />
                    The boss
                  </div>
                  <Knob label="Knob for helper 1" value={net.boss.v[0]} min={-2} max={2} color={H_COLORS[0]} onChange={(v) => update({ ...net, boss: { ...net.boss, v: [v, net.boss.v[1]] } })} />
                  <Knob label="Knob for helper 2" value={net.boss.v[1]} min={-2} max={2} color={H_COLORS[1]} onChange={(v) => update({ ...net, boss: { ...net.boss, v: [net.boss.v[0], v] } })} />
                  <Knob label="Line" value={net.boss.line} min={-3} max={3} color="#e2e8f0" onChange={(v) => update({ ...net, boss: { ...net.boss, line: v } })} />
                </div>
              </div>

              <div className="rounded-lg bg-white/5 p-3 text-[14px] leading-relaxed text-slate-200">
                <b>The ringed motor:</b> Probe A says {a}, Probe B says {b}.{' '}
                {[0, 1].map((j) => (
                  <span key={j}>
                    <b style={{ color: H_COLORS[j] }}>Helper {j + 1}</b> {bend ? (helperOut(j, a, b) ? 'shouts YES' : 'says no') : `passes on ${f1(helperOut(j, a, b))}`}.{' '}
                  </span>
                ))}
                The boss says <b className={netSays(a, b) ? 'text-rose-300' : 'text-emerald-300'}>{netSays(a, b) ? 'STOP' : 'OK'}</b>; the engineer says <b>{disagree(a, b) ? 'STOP' : 'OK'}</b>. <span className="text-slate-400">Tap any dot on the map to look at another motor.</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Btn onClick={() => update(HINT)}>Show me one way that works</Btn>
                <Btn onClick={() => update(POOR)}>Reset the helpers</Btn>
                <label className="ml-auto flex items-center gap-2 text-sm text-slate-200">
                  <input type="checkbox" checked={bend} onChange={(e) => toggleBend(e.target.checked)} className="h-4 w-4 accent-violet-400" />
                  Helpers shout only YES or NO
                </label>
              </div>
              {!bend && (
                <div className="rounded-lg border border-rose-400/40 bg-rose-400/10 p-3 text-[14px] leading-relaxed text-rose-50">
                  <b>It has fallen apart.</b> Now each helper passes on its whole worry number, not a YES or NO. The boss adds up two straight sums, and a sum of straight sums is just one more straight sum. Two helpers and a boss have become <b>one judge with one line</b> again. The YES/NO step, the <b>bend</b>, is what made the helpers worth having.
                </div>
              )}
            </section>
          )}
        </div>

        <section className="flex flex-col gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4 text-[14px] leading-snug text-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-widest text-amber-300">Three things to find out</span>
            <span className="text-xl leading-none tracking-widest text-amber-300">
              {'★'.repeat(stars)}
              <span className="text-slate-600">{'★'.repeat(3 - stars)}</span>
            </span>
          </div>
          <div className="flex gap-2">{tick(tasks.failed)} Let one judge learn from 300 motors, and see that it cannot get them all.</div>
          <div className="flex gap-2">{tick(tasks.solved)} With two helpers and a boss, get at least 115 of 121 right. (Hint: one helper should shout when A is much bigger than B. What should the other do?)</div>
          <div className="flex gap-2">{tick(tasks.collapsed)} Then untick "Helpers shout only YES or NO" and watch what happens.</div>
          {stars === 3 && (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="text-emerald-200">
                <b>Helpers each draw one line. The boss puts the lines together. The YES/NO bend is what makes that possible.</b>
              </span>
              <Btn tone="go" onClick={onNext}>
                Next: who teaches the helpers? →
              </Btn>
            </div>
          )}
        </section>

        <section className={`${CARD} text-[14px] leading-relaxed text-slate-300`}>
          <div className={TAG}>The same thing in grown-up words</div>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <span>One judge, one straight line → <b className="text-white">a single neuron is a linear classifier</b></span>
            <span>The stripe → <b className="text-white">not linearly separable</b></span>
            <span>The helpers → <b className="text-white">the hidden layer</b></span>
            <span>The boss → <b className="text-white">the output neuron</b></span>
            <span>Shouting only YES or NO → <b className="text-white">a nonlinear activation function</b></span>
            <span>Passing on the raw worry → <b className="text-white">a linear layer, which collapses</b></span>
          </div>
          {tutor && (
            <p className="mt-3 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-[13px] text-amber-50">
              <b>Tutor:</b> this is the XOR problem in working clothes: a redundant-sensor check used on real plant. Let the class shout out knob settings for one judge until they are convinced no line works. With helpers, ask what each helper has become ("A is much hotter than B", "B is much hotter than A"). Nobody designed those features into the boss; they are what the hidden layer is for. Finish with the tick box: W²(W¹p) is still a single matrix times p.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
