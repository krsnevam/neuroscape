import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { stepLabels, type StepKind } from '../../data/labs'
import { labsByWorld } from '../../data/labRegistry'
import { worlds } from '../../data/worlds'
import { useAppStore } from '../../store/useAppStore'
import FpsMeter from '../FpsMeter'

export type StepActions = Partial<Record<StepKind, { label: string; run: () => void }>>

const learnHead = 'mb-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500'

const stepTone: Record<StepKind, string> = {
  explore: 'border-sky-400 text-sky-200 bg-sky-400/15',
  break: 'border-amber-400 text-amber-200 bg-amber-400/15',
  fix: 'border-emerald-400 text-emerald-200 bg-emerald-400/15',
  prove: 'border-violet-400 text-violet-200 bg-violet-400/15',
}

/**
 * Frame shared by every station: the live scene on the left (top on phones), and on the
 * right the story, a live "what is happening" commentary, the Explore / Break / Fix / Prove
 * mission, the Theory / Complexity / Words tabs and the station's controls.
 *
 * `happening` is the commentary: one to three short sentences, recomputed on every render from
 * the station's live state, that tell a first-time learner what the network is doing right now
 * and why the picture looks the way it does. Use real numbers from the scene.
 */
export default function LabShell({
  labId,
  children,
  panel,
  actions = {},
  happening,
}: {
  labId: string
  children: ReactNode
  panel: ReactNode
  actions?: StepActions
  happening?: ReactNode
}) {
  const { worldId = '' } = useParams()
  const labs = labsByWorld[worldId] ?? []
  const lab = labs.find((l) => l.id === labId)!
  const world = worlds.find((w) => w.id === worldId)
  const [stepIdx, setStepIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [learn, setLearn] = useState<'theory' | 'complexity' | 'words' | null>(null)
  const markLabDone = useAppStore((s) => s.markLabDone)
  const step = lab.steps[stepIdx]
  const action = actions[step.kind]
  const next = labs[labs.findIndex((l) => l.id === labId) + 1]

  useEffect(() => setShowAnswer(false), [stepIdx])

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950/60 px-3 py-2">
        <Link
          to={`/world/${worldId}`}
          className="shrink-0 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10"
        >
          ← {world?.title.split(' ').pop() ?? 'Back'}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: lab.color }}>
            {lab.lecture}
            <span className="hidden sm:inline"> · {lab.topics}</span>
          </div>
          <h1 className="truncate text-base font-semibold leading-tight text-white">{lab.title}</h1>
        </div>
        <FpsMeter />
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="relative min-h-0 flex-1 overflow-hidden">{children}</main>

        <aside className="flex max-h-[48%] shrink-0 flex-col overflow-y-auto border-t border-white/10 bg-slate-950/70 lg:max-h-none lg:w-[340px] lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-sm leading-snug text-slate-200">{lab.story}</p>
            {lab.equation && (
              <p className="rounded-md bg-white/5 px-2.5 py-1.5 font-mono text-xs leading-relaxed text-sky-200">{lab.equation}</p>
            )}
            {happening && (
              <div className="rounded-md border border-sky-400/25 bg-sky-400/10 p-2.5" aria-live="polite">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-sky-300">What is happening now</div>
                <div className="flex flex-col gap-1 text-[13px] leading-snug text-slate-100">{happening}</div>
              </div>
            )}
            <div className="flex gap-1" role="tablist" aria-label="Mission steps">
              {lab.steps.map((s, i) => (
                <button
                  key={s.kind}
                  type="button"
                  role="tab"
                  aria-selected={i === stepIdx}
                  onClick={() => setStepIdx(i)}
                  className={`flex-1 rounded-md border px-1 py-1.5 text-xs font-medium transition-colors ${
                    i === stepIdx ? stepTone[s.kind] : 'border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  {i + 1}. {stepLabels[s.kind]}
                </button>
              ))}
            </div>
            <p className="text-[13px] leading-snug text-slate-300">{step.text}</p>
            {action && (
              <button
                type="button"
                onClick={action.run}
                className={`self-start rounded-md border px-3 py-1.5 text-xs font-medium ${stepTone[step.kind]}`}
              >
                {action.label}
              </button>
            )}
            {step.answer &&
              (showAnswer ? (
                <div className="flex flex-col gap-2">
                  <p className="rounded-md bg-violet-400/10 p-2.5 text-[13px] leading-snug text-violet-100">
                    {step.answer}
                  </p>
                  {next && (
                    <Link to={`/world/${worldId}/${next.id}`} className="self-start text-xs text-sky-300 underline">
                      Next station: {next.title} →
                    </Link>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowAnswer(true)
                    markLabDone(`${worldId}/${labId}`)
                  }}
                  className="self-start rounded-md border border-violet-400/50 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-400/10"
                >
                  I have my answer. Show the model answer
                </button>
              ))}
            {(lab.theory || lab.complexity || lab.words?.length) && (
              <div className="rounded-md bg-white/5">
                <div className="flex gap-1 p-1" role="tablist" aria-label="Learn more">
                  {(
                    [
                      ['theory', 'Theory', lab.theory],
                      ['complexity', 'Complexity', lab.complexity],
                      ['words', 'Words', lab.words?.length],
                    ] as const
                  ).map(
                    ([key, label, has]) =>
                      has && (
                        <button
                          key={key}
                          type="button"
                          role="tab"
                          aria-selected={learn === key}
                          onClick={() => setLearn(learn === key ? null : key)}
                          className={`flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                            learn === key ? 'bg-sky-400/20 text-sky-100' : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {label}
                        </button>
                      ),
                  )}
                </div>
                {learn === 'theory' && lab.theory && (
                  <div className="flex flex-col gap-2.5 px-2.5 pb-3 pt-1 text-[13px] leading-snug text-slate-200">
                    <p>{lab.theory.idea}</p>
                    <div>
                      <h4 className={learnHead}>How it works</h4>
                      <ol className="ml-4 list-decimal space-y-1 text-slate-300">
                        {lab.theory.how.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ol>
                    </div>
                    <div>
                      <h4 className={learnHead}>Where it is used</h4>
                      <ul className="space-y-1.5">
                        {lab.theory.usedFor.map((u) => (
                          <li key={u.where} className="text-slate-300">
                            <b className="font-semibold text-emerald-200">{u.where}.</b> {u.example}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className={learnHead}>Where it fails</h4>
                      <p className="text-slate-300">{lab.theory.limits}</p>
                    </div>
                  </div>
                )}
                {learn === 'complexity' && lab.complexity && (
                  <dl className="flex flex-col gap-2 px-2.5 pb-3 pt-1 text-[13px] leading-snug">
                    {(
                      [
                        ['Parameters', lab.complexity.parameters],
                        ['One prediction', lab.complexity.prediction],
                        ['Training', lab.complexity.training],
                        ['Memory', lab.complexity.memory],
                        ['As it grows', lab.complexity.scaling],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k}>
                        <dt className={learnHead}>{k}</dt>
                        <dd className="text-slate-300">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {learn === 'words' && lab.words && (
                  <dl className="flex flex-col gap-1.5 px-2.5 pb-3 pt-1 text-xs leading-snug">
                    {lab.words.map((w) => (
                      <div key={w.term}>
                        <dt className="inline font-semibold text-sky-200">{w.term}: </dt>
                        <dd className="inline text-slate-300">{w.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </div>
          {panel}
        </aside>
      </div>
    </div>
  )
}
