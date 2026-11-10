import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { worlds } from '../data/worlds'
import { useAppStore } from '../store/useAppStore'

/** Temporary landing page for each world until its scenes are built. */
export default function WorldPlaceholder() {
  const { worldId } = useParams()
  const world = worlds.find((w) => w.id === worldId)
  const markVisited = useAppStore((s) => s.markVisited)

  useEffect(() => {
    if (world) markVisited(world.id)
  }, [world, markVisited])

  if (!world) {
    return (
      <div className="grid h-full place-items-center">
        <Link to="/" className="text-sky-400 underline">Back to hub</Link>
      </div>
    )
  }

  return (
    <div className="grid h-full place-items-center p-6">
      <div className="max-w-lg text-center">
        <div className="text-xs uppercase tracking-widest" style={{ color: world.color }}>
          World {world.number} · {world.unit}
        </div>
        <h1 className="mt-1 text-3xl font-bold">{world.title}</h1>
        <p className="mt-3 text-slate-300">{world.topics}</p>
        <p className="mt-2 text-sm text-amber-300">Break &amp; fix: {world.breakFix}</p>
        <p className="mt-6 text-sm text-slate-500">Scenes for this world are under construction.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
        >
          ← Back to hub
        </Link>
      </div>
    </div>
  )
}
