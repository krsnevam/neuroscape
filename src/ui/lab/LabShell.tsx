import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { stepLabels, type StepKind } from '../../data/labs'
import { labsByWorld } from '../../data/labRegistry'
import { worlds } from '../../data/worlds'
import { useAppStore } from '../../store/useAppStore'
import FpsMeter from '../FpsMeter'
import { stageOfStation, stages as missionStages } from '../../scenes/factory/mission/stages'

type LearnTab = 'picture' | 'network' | 'nuances' | 'theory' | 'complexity' | 'words'

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
 * mission, an expandable industry case, the Picture / Theory / Complexity / Words tabs and the station's controls.
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
  const [learn, setLearn] = useState<LearnTab | null>(lab.picture?.length ? 'picture' : null)
  const [showIndustry, setShowIndustry] = useState(false)
  const markLabDone = useAppStore((s) => s.markLabDone)
  const tutorMode = useAppStore((s) => s.tutorMode)
  const setTutorMode = useAppStore((s) => s.setTutorMode)
  const step = lab.steps[stepIdx]
  const action = actions[step.kind]
  const next = labs[labs.findIndex((l) => l.id === labId) + 1]
  const missionStage = worldId === 'factory' ? stageOfStation(labId) : -1

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
        {lab.tutor && (
          <button
            type="button"
            role="switch"
            aria-checked={tutorMode}
            onClick={() => setTutorMode(!tutorMode)}
            className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
              tutorMode ? 'border-amber-400 bg-amber-400/20 text-amber-100' : 'border-white/15 text-slate-300 hover:bg-white/10'
            }`}
          >
            Tutor<span className="hidden sm:inline"> mode</span> {tutorMode ? 'on' : 'off'}
          </button>
        )}
        <FpsMeter />
      </header>

      {missionStage >= 0 && (
        <nav
          aria-label="Where this station fits in the mission"
          className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/10 bg-slate-950/40 px-3 py-1.5 text-[11px]"
        >
          <Link to="/world/factory/mission" className="mr-1 shrink-0 text-violet-300 underline">
            The mission
          </Link>
          {missionStages.map((s, i) => (
            <span
              key={s.id}
              className={`shrink-0 rounded px-2 py-0.5 ${
                i === missionStage ? 'bg-violet-400/25 font-semibold text-violet-100' : 'text-slate-500'
              }`}
            >
              {i + 1}. {s.name}
            </span>
          ))}
          <span className="ml-2 hidden shrink-0 text-slate-400 md:inline">
            This station goes deeper into stage {missionStage + 1}: {missionStages[missionStage].question}
          </span>
        </nav>
      )}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="relative min-h-0 flex-1 overflow-hidden">{children}</main>

        <aside className="flex max-h-[48%] shrink-0 flex-col overflow-y-auto border-t border-white/10 bg-slate-950/70 lg:max-h-none lg:w-[340px] lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-sm leading-snug text-slate-200">{lab.story}</p>
            {lab.takeaway && (
              <p className="border-l-2 pl-2.5 text-[13px] font-semibold leading-snug text-white" style={{ borderColor: lab.color }}>
                {lab.takeaway}
              </p>
            )}
            {lab.industry && (
              <div className="rounded-md border border-emerald-400/25 bg-emerald-400/10">
                <button
                  type="button"
                  aria-expanded={showIndustry}
                  onClick={() => setShowIndustry((v) => !v)}
                  className="flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-xs leading-snug text-emerald-100 hover:bg-emerald-400/15"
                >
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300">In industry</span>
                  <span className="min-w-0 flex-1">
                    {lab.industry.setting}.{' '}
                    <span className="whitespace-nowrap text-emerald-300 underline">{showIndustry ? 'Hide' : 'See how'}</span>
                  </span>
                  <span className="shrink-0 text-emerald-300" aria-hidden>
                    {showIndustry ? '−' : '+'}
                  </span>
                </button>
                {showIndustry && (
                  <div className="flex flex-col gap-2.5 border-t border-emerald-400/20 px-2.5 pb-3 pt-2.5 text-[13px] leading-snug">
                    {(
                      [
                        ['The problem', lab.industry.problem],
                        ['How this idea is used', lab.industry.howUsed],
                        ['How it goes wrong', lab.industry.goesWrong],
                        ['Who does this work', lab.industry.roles],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k}>
                        <h4 className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">{k}</h4>
                        <p className="text-slate-100">{v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {lab.equation && (
              <p className="rounded-md bg-white/5 px-2.5 py-1.5 font-mono text-xs leading-relaxed text-sky-200">{lab.equation}</p>
            )}
            {tutorMode && lab.tutor && (
              <div className="flex flex-col gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 p-2.5 text-[13px] leading-snug text-amber-50">
                <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300">
                  <span>Tutor notes · {stepLabels[step.kind]}</span>
                  <span>about {lab.tutor.minutes} min</span>
                </div>
                {stepIdx === 0 && (
                  <p>
                    <b>Open with:</b> {lab.tutor.opener}
                  </p>
                )}
                {lab.tutor.steps[step.kind] && (
                  <>
                    <p>
                      <b>Say:</b> {lab.tutor.steps[step.kind]!.say}
                    </p>
                    <p>
                      <b>Ask the class:</b> {lab.tutor.steps[step.kind]!.ask}
                    </p>
                  </>
                )}
                {action && (
                  <button
                    type="button"
                    onClick={action.run}
                    className="self-start rounded-md border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-400/25"
                  >
                    Show it: {action.label}
                  </button>
                )}
                <details>
                  <summary className="cursor-pointer text-xs text-amber-200">Wrong ideas to listen for ({lab.tutor.misconceptions.length})</summary>
                  <ul className="mt-1.5 flex flex-col gap-1.5 text-xs">
                    {lab.tutor.misconceptions.map((m) => (
                      <li key={m.wrong}>
                        <span className="text-rose-200">“{m.wrong}”</span> <span className="text-amber-50">{m.right}</span>
                      </li>
                    ))}
                  </ul>
                </details>
                {stepIdx === lab.steps.length - 1 && (
                  <p>
                    <b>Close with:</b> {lab.tutor.close}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={stepIdx === 0}
                    onClick={() => setStepIdx((i) => i - 1)}
                    className="rounded border border-amber-400/30 px-2 py-1 text-xs disabled:opacity-40"
                  >
                    ← Previous step
                  </button>
                  <button
                    type="button"
                    disabled={stepIdx === lab.steps.length - 1}
                    onClick={() => setStepIdx((i) => i + 1)}
                    className="rounded border border-amber-400/30 px-2 py-1 text-xs disabled:opacity-40"
                  >
                    Next step →
                  </button>
                </div>
              </div>
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
            {(lab.picture?.length || lab.network || lab.nuances?.length || lab.theory || lab.complexity || lab.words?.length) && (
              <div className="rounded-md bg-white/5">
                <div className="flex flex-wrap gap-1 p-1" role="tablist" aria-label="Learn more">
                  {(
                    [
                      ['picture', 'Picture', lab.picture?.length],
                      ['network', 'ANN inside', lab.network],
                      ['nuances', 'Nuances', lab.nuances?.length],
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
                          className={`flex-auto rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                            learn === key ? 'bg-sky-400/20 text-sky-100' : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {label}
                        </button>
                      ),
                  )}
                </div>
                {learn === 'picture' && lab.picture && (
                  <div className="flex flex-col gap-1.5 px-2.5 pb-3 pt-1 text-xs leading-snug">
                    <h4 className={learnHead}>How to read the picture</h4>
                    {lab.picture.map((k) => (
                      <div key={k.mark} className="flex items-start gap-2">
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                          style={{ background: k.color ?? 'transparent' }}
                        />
                        <span>
                          <b className="font-semibold text-slate-100">{k.mark}:</b> <span className="text-slate-300">{k.meaning}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {learn === 'network' && lab.network && (
                  <dl className="flex flex-col gap-2 px-2.5 pb-3 pt-1 text-[13px] leading-snug">
                    {(
                      [
                        ['The network', lab.network.architecture],
                        ['One forward pass', lab.network.forward],
                        ['How it learns', lab.network.learning],
                        ['Why this network', lab.network.choices],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k}>
                        <dt className={learnHead}>{k}</dt>
                        <dd className="text-slate-200">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {learn === 'nuances' && lab.nuances && (
                  <ol className="flex flex-col gap-2.5 px-2.5 pb-3 pt-1 text-[13px] leading-snug">
                    {lab.nuances.map((n, i) => (
                      <li key={n.point}>
                        <b className="font-semibold text-slate-100">
                          {i + 1}. {n.point}
                        </b>
                        <p className="text-slate-300">{n.detail}</p>
                        {n.tryIt && (
                          <p className="mt-0.5 text-xs text-emerald-200">
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">Try it </span>
                            {n.tryIt}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
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
