import { useAppStore } from '../store/useAppStore'

export default function QualityToggle() {
  const quality = useAppStore((s) => s.quality)
  const setQuality = useAppStore((s) => s.setQuality)
  return (
    <button
      onClick={() => setQuality(quality === 'high' ? 'low' : 'high')}
      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-300 backdrop-blur hover:bg-white/10"
      title="Lower quality runs faster on phones"
    >
      Quality: {quality === 'high' ? 'High' : 'Low'}
    </button>
  )
}
