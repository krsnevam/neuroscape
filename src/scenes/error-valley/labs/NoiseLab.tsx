import { useEffect, useMemo, useRef, useState } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats } from '../../../ui/lab/controls'
import { correlationMatrix, createAdaptiveFilter, crossCorrelation, solveLinear, symEigen } from '../../../engine/lms'

const FS = 8000 // samples per second
const WIN = 480 // samples on screen (60 ms)
const HUM_GAIN = 0.6
const HUM_LAG = 1.9 // radians: the hum reaches the microphone later and weaker than the reference

type Noise = '50' | '100' | '220'
const noiseName: Record<Noise, string> = { '50': 'mains hum', '100': 'transformer buzz', '220': 'fan drone' }

/** A short tune, 4 s at 8 kHz: plucked notes with two overtones. */
const tune = (() => {
  const notes = [392, 440, 494, 523, 587, 523, 494, 440, 392, 494, 587, 784, 587, 494, 440, 392]
  const out = new Float32Array(FS * 4)
  const len = FS / 4
  notes.forEach((hz, n) => {
    for (let i = 0; i < len; i++) {
      const t = i / FS
      const env = Math.min(1, t / 0.008) * Math.exp(-t * 7)
      const w = 2 * Math.PI * hz * t
      out[n * len + i] = 0.34 * env * (Math.sin(w) + 0.4 * Math.sin(2 * w) + 0.2 * Math.sin(3 * w))
    }
  })
  return out
})()

const ref = (hz: number, k: number) => Math.sin((2 * Math.PI * hz * k) / FS)
const hum = (hz: number, k: number) => HUM_GAIN * Math.sin((2 * Math.PI * hz * k) / FS - HUM_LAG)
/** Delay between taps: a quarter of the hum's period, so the two taps carry independent information. */
const spacingFor = (hz: number) => Math.max(1, Math.round(FS / (4 * hz)))

/** R, h and the best weights x* = R⁻¹h, measured over a whole number of hum periods. */
function theory(hz: number, taps: number) {
  const D = spacingFor(hz)
  const zs: number[][] = []
  const ts: number[] = []
  for (let k = 0; k < 1600; k++) {
    zs.push(Array.from({ length: taps }, (_, i) => ref(hz, k - i * D)))
    ts.push(hum(hz, k)) // the tune is uncorrelated with the reference, so h = E[m z]
  }
  const R = correlationMatrix(zs)
  const h = crossCorrelation(zs, ts)
  const eig = symEigen(R)
  return { D, R, h, xStar: solveLinear(R, h), lambdaMax: eig.values[eig.values.length - 1] }
}

/** Run the canceller over a whole clip, starting from zero weights. Used for listening. */
function renderClip(signal: Float32Array, hz: number, taps: number, alpha: number) {
  const filt = createAdaptiveFilter(taps, spacingFor(hz))
  const before = new Float32Array(signal.length)
  const after = new Float32Array(signal.length)
  for (let k = 0; k < signal.length; k++) {
    const t = signal[k] + hum(hz, k)
    const { e } = filt.step(ref(hz, k), t, alpha)
    before[k] = Math.max(-1, Math.min(1, t))
    after[k] = Number.isFinite(e) ? Math.max(-1, Math.min(1, e)) : 0
  }
  return { before, after }
}

/** Average blocks of samples to bring a recording down to 8 kHz, then set its peak to 0.4. */
function to8k(data: Float32Array, rate: number) {
  const step = rate / FS
  const out = new Float32Array(Math.floor(data.length / step))
  let peak = 1e-6
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * step)
    const b = Math.max(a + 1, Math.floor((i + 1) * step))
    let s = 0
    for (let j = a; j < b; j++) s += data[j]
    out[i] = s / (b - a)
    peak = Math.max(peak, Math.abs(out[i]))
  }
  for (let i = 0; i < out.length; i++) out[i] *= 0.4 / peak
  return out
}

const f3 = (v: number) => (Number.isFinite(v) ? (v < 0 ? '−' : '') + Math.abs(v).toFixed(3) : '∞')
const COL = { mic: '#fbbf24', filt: '#f472b6', out: '#34d399', w: ['#38bdf8', '#c4b5fd'] }

export default function NoiseLab() {
  const [noise, setNoise] = useState<Noise>('100')
  const [taps, setTaps] = useState(2)
  const [logAlpha, setLogAlpha] = useState(-3.3)
  const [rate, setRate] = useState(1200)
  const [reset, setReset] = useState(0)
  const [recording, setRecording] = useState<Float32Array | null>(null)
  const [source, setSource] = useState<'tune' | 'mic'>('tune')
  const [message, setMessage] = useState('')
  const [playing, setPlaying] = useState<'' | 'before' | 'after'>('')
  const audio = useRef<{ ctx: AudioContext | null; node: AudioBufferSourceNode | null }>({ ctx: null, node: null })
  useTicker(200)

  const hz = Number(noise)
  const alpha = 10 ** logAlpha
  const signal = source === 'mic' && recording ? recording : tune
  const th = useMemo(() => theory(hz, taps), [hz, taps])
  const bound = 1 / th.lambdaMax

  const sim = useMemo(
    () => ({
      filt: createAdaptiveFilter(taps, th.D),
      k: 0,
      acc: 0,
      t: new Float32Array(WIN),
      a: new Float32Array(WIN),
      e: new Float32Array(WIN),
      s: new Float32Array(WIN),
      m: new Float32Array(WIN),
      wHist: Array.from({ length: taps }, () => [] as number[]),
      last: { t: 0, a: 0, e: 0 },
      lost: false,
    }),
    // `reset` sets the weights back to zero
    [taps, th, signal, reset],
  )

  const stopAudio = () => {
    try {
      audio.current.node?.stop()
    } catch {
      // already stopped
    }
    audio.current.node = null
    setPlaying('')
  }
  useEffect(
    () => () => {
      try {
        audio.current.node?.stop()
      } catch {
        // already stopped
      }
      audio.current.ctx?.close().catch(() => {})
    },
    [],
  )
  const getCtx = () => {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    audio.current.ctx ??= new Ctor()
    void audio.current.ctx.resume()
    return audio.current.ctx
  }
  const play = (which: 'before' | 'after') => {
    stopAudio()
    const ctx = getCtx()
    if (!ctx) {
      setMessage('This browser cannot play sound here. The traces still show the result.')
      return
    }
    const clip = renderClip(signal, hz, taps, alpha)[which]
    const buffer = ctx.createBuffer(1, clip.length, FS)
    buffer.getChannelData(0).set(clip)
    const node = ctx.createBufferSource()
    node.buffer = buffer
    node.connect(ctx.destination)
    node.onended = () => {
      if (audio.current.node === node) setPlaying('')
    }
    node.start()
    audio.current.node = node
    setPlaying(which)
  }

  const record = async () => {
    stopAudio()
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('No microphone is available here. The built-in tune is used instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: Blob[] = []
      rec.ondataavailable = (ev) => chunks.push(ev.data)
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop())
        try {
          const ctx = getCtx()
          if (!ctx) throw new Error('no audio')
          const decoded = await ctx.decodeAudioData(await new Blob(chunks).arrayBuffer())
          setRecording(to8k(decoded.getChannelData(0), decoded.sampleRate))
          setSource('mic')
          setMessage('Recorded. Your voice now has the hum added to it. Press the play buttons to compare.')
        } catch {
          setMessage('The recording could not be read. The built-in tune is used instead.')
        }
      }
      rec.start()
      setMessage('Recording for 3 seconds. Say something.')
      setTimeout(() => rec.state !== 'inactive' && rec.stop(), 3000)
    } catch {
      setMessage('The microphone was not allowed. The built-in tune is used instead.')
    }
  }

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number, _t: number, dt: number) => {
    // --- simulation: the same filter, in slow motion ---
    if (!sim.lost) {
      sim.acc += dt * rate
      let n = Math.min(400, Math.floor(sim.acc))
      sim.acc -= n
      while (n-- > 0) {
        const k = sim.k++
        const s = signal[k % signal.length]
        const m = hum(hz, k)
        const r = sim.filt.step(ref(hz, k), s + m, alpha)
        const i = k % WIN
        sim.t[i] = s + m
        sim.a[i] = r.a
        sim.e[i] = r.e
        sim.s[i] = s
        sim.m[i] = m
        sim.last = { t: s + m, a: r.a, e: r.e }
        if (k % 8 === 0)
          sim.wHist.forEach((hist, j) => {
            hist.push(sim.filt.ad.w[j])
            if (hist.length > 600) hist.shift()
          })
        if (!sim.filt.ad.w.every((v) => Math.abs(v) < 50)) {
          sim.lost = true
          break
        }
      }
    }
    const small = w < 520
    ctx.font = `${small ? 10 : 11}px ui-monospace, monospace`
    ctx.textBaseline = 'middle'

    // --- block diagram ---
    const dgH = small ? 46 : 62
    const by = dgH / 2 + 2
    const bh = small ? 22 : 28
    let x = 6
    const box = (label: string, color: string) => {
      const bw = ctx.measureText(label).width + (small ? 8 : 16)
      ctx.fillStyle = '#0f172a'
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(x, by - bh / 2, bw, bh, 5)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.fillText(label, x + bw / 2, by)
      x += bw
    }
    const arrow = (len: number, label = '') => {
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x + 2, by)
      ctx.lineTo(x + len - 2, by)
      ctx.lineTo(x + len - 6, by - 3)
      ctx.moveTo(x + len - 2, by)
      ctx.lineTo(x + len - 6, by + 3)
      ctx.stroke()
      if (label) {
        ctx.fillStyle = '#94a3b8'
        ctx.textAlign = 'center'
        ctx.fillText(label, x + len / 2, by - 9)
      }
      x += len
    }
    const gap = small ? 12 : Math.max(18, (w - 560) / 4)
    box(small ? 'ref v' : 'reference v(k)', '#94a3b8')
    arrow(gap)
    box(taps > 1 ? (small ? `delay ${th.D}` : `delay line, ${th.D} samples`) : 'no delay', '#94a3b8')
    arrow(gap)
    box(small ? 'ADALINE' : `ADALINE, ${taps} weight${taps > 1 ? 's' : ''}`, COL.filt)
    arrow(gap + 14, 'a(k)')
    box(small ? 't − a' : 'subtract: t(k) − a(k)', COL.mic)
    arrow(gap + 14, 'e(k)')
    box(small ? 'restored' : 'restored signal', COL.out)
    if (!small) {
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'left'
      ctx.fillText('t(k) = microphone = tune + hum.  LMS uses e(k) to adjust the weights.', 8, dgH - 2)
    }

    // --- three scrolling traces ---
    const chartH = Math.max(84, Math.round(h * 0.26))
    const top = dgH + 8
    const laneH = (h - top - chartH) / 3
    const head = sim.k % WIN
    const lane = (i: number, label: string, color: string, data: Float32Array, ghost?: Float32Array, ghostLabel?: string) => {
      const y0 = top + i * laneH
      const mid = y0 + laneH / 2 + 5
      const amp = (laneH - 18) / 2 / 1.1
      ctx.strokeStyle = 'rgba(148,163,184,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, mid)
      ctx.lineTo(w, mid)
      ctx.stroke()
      const path = (d: Float32Array) => {
        ctx.beginPath()
        for (let j = 0; j < WIN; j++) {
          const v = Math.max(-1.15, Math.min(1.15, d[(head + j) % WIN]))
          const px = (j / (WIN - 1)) * w
          if (j === 0) ctx.moveTo(px, mid - v * amp)
          else ctx.lineTo(px, mid - v * amp)
        }
        ctx.stroke()
      }
      if (ghost) {
        ctx.strokeStyle = 'rgba(248,250,252,0.4)'
        ctx.lineWidth = 3
        path(ghost)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = 1.6
      path(data)
      ctx.textAlign = 'left'
      ctx.fillStyle = color
      ctx.fillText(label, 8, y0 + 7)
      if (ghostLabel) {
        ctx.textAlign = 'right'
        ctx.fillStyle = 'rgba(248,250,252,0.6)'
        ctx.fillText(ghostLabel, w - 8, y0 + 7)
      }
    }
    lane(0, small ? 'microphone t(k) = tune + hum' : 'microphone t(k) = tune + hum (contaminated)', COL.mic, sim.t)
    lane(1, small ? 'filter output a(k)' : 'filter output a(k): its guess of the hum', COL.filt, sim.a, sim.m, 'grey: true hum')
    lane(2, small ? 'restored e(k) = t − a' : 'restored e(k) = t(k) − a(k)', COL.out, sim.e, sim.s, 'grey: clean tune')
    if (sim.lost) {
      ctx.fillStyle = '#fda4af'
      ctx.textAlign = 'center'
      ctx.fillText('the weights left the map: α is too large', w / 2, top + laneH * 1.5)
    }

    // --- weights ---
    const cy = h - chartH
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.beginPath()
    ctx.moveTo(0, cy + 0.5)
    ctx.lineTo(w, cy + 0.5)
    ctx.stroke()
    const span = Math.max(0.8, ...(th.xStar ?? []).map((v) => Math.abs(v) * 1.4))
    const Y = (v: number) => cy + chartH / 2 + 4 - (Math.max(-span, Math.min(span, v)) / span) * (chartH / 2 - 14)
    ctx.strokeStyle = 'rgba(148,163,184,0.2)'
    ctx.beginPath()
    ctx.moveTo(0, Y(0))
    ctx.lineTo(w, Y(0))
    ctx.stroke()
    sim.wHist.forEach((hist, j) => {
      const color = COL.w[j % 2]
      if (th.xStar) {
        ctx.strokeStyle = color
        ctx.globalAlpha = 0.55
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(0, Y(th.xStar[j]))
        ctx.lineTo(w, Y(th.xStar[j]))
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        ctx.fillStyle = color
        ctx.textAlign = 'right'
        ctx.fillText(`best w${j + 1} = ${f3(th.xStar[j])}`, w - 8, Y(th.xStar[j]) - 8)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      hist.forEach((v, i) => {
        const px = (i / 599) * w
        if (i === 0) ctx.moveTo(px, Y(v))
        else ctx.lineTo(px, Y(v))
      })
      ctx.stroke()
    })
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'left'
    ctx.fillText(`weights over time (last ${(4800 / FS).toFixed(1)} s of signal); dashed = best x* = R⁻¹h`, 8, cy + 9)
  }

  // How much of the hum is left in the restored signal, over the window on screen
  let left = 0
  let total = 0
  for (let i = 0; i < WIN; i++) {
    left += (sim.e[i] - sim.s[i]) ** 2
    total += sim.m[i] ** 2
  }
  const removed = total > 0 ? Math.max(0, 1 - Math.sqrt(left / total)) : 0
  const w = sim.filt.ad.w
  const wText = `[${w.map(f3).join(', ')}]`
  const bestText = th.xStar ? `[${th.xStar.map(f3).join(', ')}]` : 'not unique'
  let happening
  if (sim.lost)
    happening = (
      <p>
        The weights blew up. With α = {alpha.toPrecision(2)} each correction 2αe·p is bigger than the error it was meant to fix, so the error grows every sample.
        The limit from R is α &lt; 1/λ_max = {bound.toFixed(2)}, and a real filter stays far below it. Lower α and press Reset.
      </p>
    )
  else if (taps === 1)
    happening = (
      <>
        <p>
          With no delay the ADALINE has one weight. It can make the reference louder or softer, but it cannot shift it in time, and the hum at the microphone is{' '}
          {HUM_LAG} rad late. Best possible weight: {bestText}; now {wText}.
        </p>
        <p>Only {Math.round(removed * 100)} % of the hum is removed. The pink trace never lines up with the grey one.</p>
      </>
    )
  else if (removed < 0.85)
    happening = (
      <>
        <p>
          Sample {sim.k}: the microphone read t = {f3(sim.last.t)}, the filter guessed a = {f3(sim.last.a)}, so e = {f3(sim.last.e)}. LMS adds 2αe·p to the weights:
          they are {wText}, heading for {bestText}.
        </p>
        <p>{Math.round(removed * 100)} % of the hum is gone so far. Watch the pink trace grow until it covers the grey hum.</p>
      </>
    )
  else
    happening = (
      <>
        <p>
          The weights have settled at {wText}, next to the best values {bestText}. The filter output now copies the hum, so what is left, e = t − a, is the tune:{' '}
          {Math.round(removed * 100)} % of the hum is removed.
        </p>
        <p>
          {alpha > 0.02
            ? `α = ${alpha.toPrecision(2)} is large, so the weights also chase the tune and wobble. That wobble distorts the restored signal.`
            : `The tune survives because it has nothing in common with the reference: the filter can only build its output from the ${hz} Hz reference.`}
        </p>
      </>
    )

  return (
    <LabShell
      labId="noise-canceller"
      happening={happening}
      actions={{
        break: {
          label: `Set α = ${(bound * 1.5).toFixed(1)}, above 1/λ_max`,
          run: () => {
            setLogAlpha(Math.log10(bound * 1.5))
            setReset((r) => r + 1)
          },
        },
        fix: {
          label: 'α = 0.0005 and one delay',
          run: () => {
            setLogAlpha(-3.3)
            setTaps(2)
            setReset((r) => r + 1)
          },
        },
      }}
      panel={
        <>
          <Group title="Listen">
            <div className="flex flex-wrap gap-2">
              <Btn tone="warn" onClick={() => play('before')}>
                {playing === 'before' ? '♪ playing…' : '▶ Before: with hum'}
              </Btn>
              <Btn tone="go" onClick={() => play('after')}>
                {playing === 'after' ? '♪ playing…' : '▶ After: restored'}
              </Btn>
              <Btn onClick={stopAudio} disabled={!playing}>
                Stop
              </Btn>
            </div>
            <p className="text-[11px] leading-snug text-slate-500">
              &quot;After&quot; starts with zero weights, so you hear the hum fade as the filter learns. Low hum needs headphones; a phone speaker plays the 220 Hz
              drone best.
            </p>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={record}>Record 3 s from the microphone</Btn>
              {recording && (
                <Btn onClick={() => setSource(source === 'mic' ? 'tune' : 'mic')}>{source === 'mic' ? 'Use the built-in tune' : 'Use my recording'}</Btn>
              )}
            </div>
            {message && <p className="text-[11px] leading-snug text-amber-200">{message}</p>}
          </Group>
          <Group title="The filter">
            <Seg
              label="Tapped delay line"
              value={String(taps)}
              onChange={(v) => setTaps(Number(v))}
              options={[
                { value: '1', label: 'No delay: 1 weight' },
                { value: '2', label: 'One delay: 2 weights' },
              ]}
            />
            <Slider label="Learning rate α" value={logAlpha} min={-4} max={0.7} step={0.05} onChange={setLogAlpha} fmt={() => alpha.toPrecision(2)} />
            <Slider label="Slow motion" value={rate} min={100} max={8000} step={100} onChange={setRate} fmt={(v) => `${v} of 8000 samples / s`} />
            <Btn onClick={() => setReset((r) => r + 1)}>Reset the weights to zero</Btn>
            <Stats>
              <Stat label="Weights now" value={<span className="text-xs">{sim.lost ? 'left the map' : wText}</span>} tone={sim.lost ? 'bad' : 'plain'} />
              <Stat label="Best x* = R⁻¹h" value={<span className="text-xs">{bestText}</span>} />
              <Stat label="Hum removed" value={`${Math.round(removed * 100)} %`} tone={removed > 0.9 ? 'good' : removed < 0.5 ? 'warn' : 'plain'} />
              <Stat label="Stable while α <" value={bound.toFixed(2)} tone={alpha < bound ? 'good' : 'bad'} />
              <Stat label="Weights (no bias)" value={taps} />
              <Stat label="Multiplications / sample" value={`about 2·${taps} = ${2 * taps}`} />
            </Stats>
          </Group>
          <Group title="The noise">
            <Seg
              value={noise}
              onChange={setNoise}
              options={[
                { value: '50', label: 'Mains hum 50 Hz' },
                { value: '100', label: 'Transformer buzz 100 Hz' },
                { value: '220', label: 'Fan drone 220 Hz' },
              ]}
            />
            <p className="text-[11px] leading-snug text-slate-500">
              The reference is a clean pickup of the {noiseName[noise]}: v(k) = sin(2π·{hz}·k/8000). At the microphone it is {HUM_GAIN} times as strong and{' '}
              {HUM_LAG} rad late. The taps are {th.D} samples apart, a quarter of one cycle.
            </p>
          </Group>
        </>
      }
    >
      <Canvas2D draw={draw} />
    </LabShell>
  )
}
