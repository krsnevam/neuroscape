import { useEffect, useRef, useState } from 'react'

/** Lightweight FPS readout, so the 30 fps acceptance check can be verified on a phone. */
export default function FpsMeter() {
  const [fps, setFps] = useState(0)
  const frames = useRef(0)
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      frames.current++
      if (t - last >= 1000) {
        setFps(Math.round((frames.current * 1000) / (t - last)))
        frames.current = 0
        last = t
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  const color = fps >= 30 ? 'text-emerald-400' : 'text-rose-400'
  return <span className={`font-mono text-xs ${color}`}>{fps} fps</span>
}
