import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Lab } from '../data/labs'
import type { WorldIntro } from '../data/worldIntros'

/** Side sheet (bottom sheet on phones) that maps a world's stations onto real industry work. */
export default function WorldIntroPanel({
  intro,
  worldId,
  labs,
  color,
  onClose,
}: {
  intro: WorldIntro
  worldId: string
  labs: Lab[]
  color: string
  onClose: () => void
}) {
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    close.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-end bg-slate-950/50 sm:items-stretch" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={intro.title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85%] w-full flex-col overflow-y-auto border-t border-white/10 bg-slate-950/95 backdrop-blur sm:max-h-none sm:w-[420px] sm:border-l sm:border-t-0"
      >
        <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-white/10 bg-slate-950/95 px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color }}>
              In industry
            </div>
            <h2 className="text-lg font-semibold leading-tight text-white">{intro.title}</h2>
          </div>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-white/15 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10"
          >
            Close
          </button>
        </header>
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-sm leading-relaxed text-slate-300">{intro.lead}</p>
          <ol className="flex flex-col">
            {intro.stages.map((st, i) => (
              <li key={st.name} className="relative flex gap-3 pb-5 last:pb-0">
                {i < intro.stages.length - 1 && (
                  <span className="absolute left-[11px] top-7 h-[calc(100%-1.5rem)] w-px bg-white/15" aria-hidden />
                )}
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold"
                  style={{ borderColor: color, color }}
                >
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="text-sm font-semibold text-white">{st.name}</h3>
                  <p className="text-[13px] leading-snug text-slate-300">{st.question}</p>
                  {st.stations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {st.stations.map((id) => {
                        const lab = labs.find((l) => l.id === id)
                        if (!lab) return null
                        return (
                          <Link
                            key={id}
                            to={`/world/${worldId}/${id}`}
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 hover:bg-white/10"
                          >
                            <span style={{ color: lab.color }}>●</span> {lab.title}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                  {st.note && <p className="text-xs leading-snug text-slate-500">{st.note}</p>}
                  <p className="text-[11px] text-slate-500">Who: {st.roles}</p>
                </div>
              </li>
            ))}
          </ol>
          {intro.footer && <p className="border-t border-white/10 pt-3 text-xs leading-snug text-slate-400">{intro.footer}</p>}
        </div>
      </section>
    </div>
  )
}
