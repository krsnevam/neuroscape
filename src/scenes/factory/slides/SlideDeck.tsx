import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { labsByWorld } from '../../../data/labRegistry'
import { deckHref, unit5Plan } from '../../../data/unit5Plan'
import { useAppStore } from '../../../store/useAppStore'
import SlideStage, { SLIDE_H, SLIDE_W, type Deck } from './SlideStage'

/**
 * /world/factory/slides/:code — a lecture deck opened inside the app.
 * Arrow keys or a click move through the slides, speaker notes sit underneath,
 * and "Open" buttons on the slides lead straight to the stations.
 */
export default function SlideDeck() {
  const { code = '' } = useParams()
  const lecture = unit5Plan.find((l) => l.code === code)
  const [params, setParams] = useSearchParams()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [failed, setFailed] = useState(false)
  const tutorMode = useAppStore((s) => s.tutorMode)
  const [notes, setNotes] = useState(tutorMode)
  const [full, setFull] = useState(false)
  const [showList, setShowList] = useState(false)
  const frame = useRef<HTMLDivElement>(null)
  const area = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!lecture) return
    let alive = true
    setDeck(null)
    setFailed(false)
    fetch(deckHref(`${lecture.code}.json`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: Deck) => alive && setDeck(d))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [lecture])

  const count = deck?.slides.length ?? 0
  const idx = Math.min(Math.max(0, Number(params.get('s') ?? 1) - 1), Math.max(0, count - 1))
  const go = useCallback(
    (i: number) => {
      if (!count) return
      const next = Math.min(Math.max(0, i), count - 1)
      setParams({ s: String(next + 1) }, { replace: true })
    },
    [count, setParams],
  )

  // fit the slide to the space available, keeping 16:9
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    const fit = () => setWidth(Math.max(0, Math.floor(Math.min(el.clientWidth, (el.clientHeight * SLIDE_W) / SLIDE_H))))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [deck, notes, full])

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void frame.current?.requestFullscreen?.().catch(() => {})
  }, [])
  useEffect(() => {
    const onChange = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) (e.preventDefault(), go(idx + 1))
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) (e.preventDefault(), go(idx - 1))
      else if (e.key === 'Home') go(0)
      else if (e.key === 'End') go(count - 1)
      else if (e.key === 'n' || e.key === 'N') setNotes((v) => !v)
      else if (e.key === 'f' || e.key === 'F') toggleFull()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, idx, count, toggleFull])

  if (!lecture) return <Navigate to="/world/factory" replace />
  const slide = deck?.slides[idx]
  const labs = labsByWorld.factory ?? []
  const btn = 'shrink-0 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40'

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <Link to="/world/factory" className={btn}>
          ← Factory
        </Link>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-300">
            {lecture.code} · {lecture.date} · slides
          </div>
          <h1 className="truncate text-base font-semibold leading-tight text-white">{lecture.title}</h1>
        </div>
        <nav aria-label="Lectures" className="flex gap-1 overflow-x-auto">
          {unit5Plan.map((l) => (
            <Link
              key={l.code}
              to={`/world/factory/slides/${l.code}`}
              aria-current={l.code === lecture.code ? 'page' : undefined}
              title={l.title}
              className={`shrink-0 rounded px-2 py-1 font-mono text-[11px] ${
                l.code === lecture.code ? 'bg-violet-400/25 font-semibold text-violet-100' : 'text-slate-400 hover:bg-white/10'
              }`}
            >
              {l.code}
            </Link>
          ))}
        </nav>
        <button type="button" className={`${btn} lg:hidden`} aria-expanded={showList} onClick={() => setShowList((v) => !v)}>
          Slide list
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={notes}
          onClick={() => setNotes((v) => !v)}
          className={`${btn} ${notes ? 'border-amber-400 bg-amber-400/20 text-amber-100' : ''}`}
        >
          Notes {notes ? 'on' : 'off'}
        </button>
        <button type="button" className={btn} onClick={toggleFull}>
          Present
        </button>
        <a href={deckHref(lecture.deck.file)} download className={btn} title="Download as PowerPoint">
          ↓ .pptx
        </a>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`${showList ? 'flex' : 'hidden'} absolute inset-y-0 left-0 z-10 mt-[52px] w-64 flex-col overflow-y-auto border-r border-white/10 bg-slate-950 lg:static lg:mt-0 lg:flex`}
          aria-label="Slides in this deck"
        >
          <ol className="flex flex-col p-2">
            {deck?.slides.map((s, i) => (
              <li key={i}>
                {(i === 0 || s.section !== deck.slides[i - 1].section) && s.section && (
                  <div className="px-2 pb-1 pt-3 font-mono text-[10px] uppercase tracking-widest text-slate-500">{s.section}</div>
                )}
                <button
                  type="button"
                  onClick={() => (go(i), setShowList(false))}
                  aria-current={i === idx ? 'true' : undefined}
                  className={`flex w-full gap-2 rounded px-2 py-1.5 text-left text-xs leading-snug ${
                    i === idx ? 'bg-violet-400/20 text-white' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="w-4 shrink-0 text-right font-mono text-[10px] text-slate-500">{i + 1}</span>
                  <span>
                    {s.kind === 'demo' && <span className="text-amber-300">Live · </span>}
                    {s.title}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-auto border-t border-white/10 p-3">
            <div className="mb-1.5 text-[11px] text-slate-400">Stations for this hour</div>
            <div className="flex flex-wrap gap-1.5">
              {lecture.stations.map((id) => {
                const lab = labs.find((x) => x.id === id)
                return lab ? (
                  <Link key={id} to={`/world/factory/${id}`} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 hover:bg-white/10">
                    <span style={{ color: lab.color }}>●</span> {lab.title}
                  </Link>
                ) : null
              })}
              <Link to="/world/factory/mission" className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-100 hover:bg-white/10">
                ▶ The mission
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div ref={frame} className={`flex min-h-0 flex-1 flex-col ${full ? 'bg-black' : ''}`}>
            <div className="flex min-h-0 flex-1 p-2 sm:p-4">
            <div ref={area} className="grid min-h-0 min-w-0 flex-1 place-items-center overflow-hidden">
              {failed && <p className="text-sm text-rose-300">These slides could not be loaded. Check the connection and try again.</p>}
              {!failed && !slide && <p className="text-sm text-slate-400">Opening the slides…</p>}
              {slide && width > 0 && (
                <div className="cursor-pointer shadow-2xl shadow-black/50" onClick={() => go(idx + 1)} title="Click for the next slide">
                  <SlideStage slide={slide} width={width} />
                </div>
              )}
            </div>
            </div>
            <div className="flex shrink-0 items-center justify-center gap-3 px-3 pb-2">
              <button type="button" className={btn} onClick={() => go(idx - 1)} disabled={idx === 0}>
                ← Previous
              </button>
              <span className="w-16 text-center font-mono text-xs text-slate-400" aria-live="polite">
                {count ? `${idx + 1} / ${count}` : ''}
              </span>
              <button type="button" className={btn} onClick={() => go(idx + 1)} disabled={idx >= count - 1}>
                Next →
              </button>
              {full && (
                <button type="button" className={btn} onClick={toggleFull}>
                  Exit
                </button>
              )}
            </div>
          </div>
          {notes && slide && !full && (
            <section className="max-h-[28%] shrink-0 overflow-y-auto border-t border-amber-400/25 bg-amber-400/[0.06] px-4 py-3" aria-label="Speaker notes">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-amber-300">Speaker notes</div>
              <p className="max-w-3xl text-sm leading-relaxed text-amber-50">{slide.notes || 'No notes for this slide.'}</p>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
