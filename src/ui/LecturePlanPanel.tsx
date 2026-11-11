import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Lab } from '../data/labs'
import { deckHref, unit5Plan } from '../data/unit5Plan'

/** Side sheet listing the eight Unit V lecture hours with their stations and slide decks. */
export default function LecturePlanPanel({
  worldId,
  labs,
  color,
  onClose,
}: {
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
        aria-label="Lecture plan and slides"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85%] w-full flex-col overflow-y-auto border-t border-white/10 bg-slate-950/95 backdrop-blur sm:max-h-none sm:w-[440px] sm:border-l sm:border-t-0"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-slate-950/95 px-5 py-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color }}>
              Unit V · L35 to L42
            </div>
            <h2 className="text-lg font-semibold leading-tight text-white">Lecture plan and slides</h2>
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
        <div className="flex flex-col gap-3 px-5 py-4">
          <p className="text-sm leading-relaxed text-slate-300">
            Eight one-hour lectures. Each has a slide deck with speaker notes that opens here, one live element for the
            classroom, and stations to open from the slides.
          </p>
          <ol className="flex flex-col gap-3">
            {unit5Plan.map((l) => (
              <li key={l.code} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-widest" style={{ color }}>
                    {l.code}
                  </span>
                  <span className="text-[11px] text-slate-500">{l.date}</span>
                </div>
                <h3 className="mt-0.5 text-sm font-semibold leading-snug text-white">{l.title}</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{l.syllabus}</p>
                <ul className="mt-2 flex list-disc flex-col gap-0.5 pl-4 text-[13px] leading-snug text-slate-300">
                  {l.teaches.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[13px] leading-snug text-amber-100">
                  <span className="font-semibold text-amber-300">Live · {l.live.kind}:</span> {l.live.what}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {l.stations.map((id) => {
                    const lab = labs.find((x) => x.id === id)
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
                {l.mission && <p className="mt-1.5 text-[11px] text-slate-500">Mission: {l.mission}</p>}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Link
                    to={`/world/${worldId}/slides/${l.code}`}
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-950 hover:brightness-110"
                    style={{ background: color }}
                  >
                    ▶ Open {l.code} slides
                    <span className="font-normal opacity-80">{l.deck.slides} slides</span>
                  </Link>
                  <a
                    href={deckHref(l.deck.file)}
                    download
                    className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                  >
                    ↓ PowerPoint
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}
