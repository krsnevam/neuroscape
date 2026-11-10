import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { factoryLabs, labById, stepLabels, type StepKind } from '../../data/factoryLabs'
import { useAppStore } from '../../store/useAppStore'
import FpsMeter from '../FpsMeter'

export type StepActions = Partial<Record<StepKind, { label: string; run: () => void }>>

const stepTone: Record<StepKind, string> = {
  explore: 'border-sky-400 text-sky-200 bg-sky-400/15',
  break: 'border-amber-400 text-amber-200 bg-amber-400/15',
  fix: 'border-emerald-400 text-emerald-200 bg-emerald-400/15',
  prove: 'border-violet-400 text-violet-200 bg-violet-400/15',
}

/**
 * Frame shared by every station: the live scene on the left (top on phones), and on the
 * right the story, the Explore / Break / Fix / Prove mission and the station's controls.
 */
export default function LabShell({
  labId,
  children,
  panel,
  actions = {},
}: {
  labId: string
  children: ReactNode
  panel: ReactNode
  actions?: StepActions
}) {
  const lab = labById(labId)!
  const [stepIdx, setStepIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const markLabDone = useAppStore((s) => s.markLabDone)
  const step = lab.steps[stepIdx]
  const action = actions[step.kind]
  const index = factoryLabs.findIndex((l) => l.id === labId)
  const next = factoryLabs[index + 1]

  useEffect(() => setShowAnswer(false), [stepIdx])

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-slate-950/60 px-3 py-2">
        <Link
          to="/world/factory"
          className="shrink-0 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10"
        >
          ← Factory
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
                    <Link to={`/world/factory/${next.id}`} className="self-start text-xs text-sky-300 underline">
                      Next station: {next.title} →
                    </Link>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowAnswer(true)
                    markLabDone(labId)
                  }}
                  className="self-start rounded-md border border-violet-400/50 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-400/10"
                >
                  I have my answer. Show the model answer
                </button>
              ))}
          </div>
          {panel}
        </aside>
      </div>
    </div>
  )
}
