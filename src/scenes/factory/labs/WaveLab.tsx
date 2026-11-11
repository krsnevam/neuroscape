import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import LabShell from '../../../ui/lab/LabShell'
import Canvas2D, { dot, useTicker } from '../../../ui/lab/Canvas2D'
import { Btn, Group, Seg, Slider, Stat, Stats } from '../../../ui/lab/controls'
import { autocorr, createNetwork, crosscorr, lmStep, output, paramCount, type Sample } from '../../../engine'
import { buildGame, GAME_D, KW_MAX, KW_MIN, meanAbs } from './waveGame'

const RATE = 15 // samples per second
const PAST = 120 // samples of history on screen (8 s)
const AHEAD = 30 // samples of forecast drawn (2 s)
const H = 15 // "one second ahead"
const LAGS = 12

type Source = 'demo' | 'finger' | 'tilt'
/** Errors this small are rounding noise; their correlation means nothing. */
const quiet = (e: number[]) => e.every((v) => Math.abs(v) < 0.002)
const ROUNDS = 10
const SHOWN = 48 // hours of history shown in a game round
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const demo = (t: number) => 0.55 * Math.sin(2 * Math.PI * 0.5 * t) + 0.3 * Math.sin(2 * Math.PI * t + 1)

export default function WaveLab() {
  const [source, setSource] = useState<Source>('demo')
  const [D, setD] = useState(6)
  const [show, setShow] = useState<'one' | 'second'>('second')
  const [message, setMessage] = useState('')
  const input = useRef({ finger: 0, tilt: 0, gotTilt: false })
  const [mode, setMode] = useState<'live' | 'game'>('live')
  const [guess, setGuess] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [rounds, setRounds] = useState<{ truth: number; model: number; guess: number }[]>([])
  const [gameNo, setGameNo] = useState(0)
  const gamePlot = useRef<{ top: number; bottom: number } | null>(null)
  // Built the first time the game is opened: training the 24-5-1 network takes about half a second
  const game = useMemo(() => (mode === 'game' || gameNo > 0 ? buildGame(7 + gameNo) : null), [mode, gameNo])
  const question = game ? game.questions[Math.min(rounds.length - (revealed ? 1 : 0), ROUNDS - 1)] : 0
  const over = rounds.length >= ROUNDS && revealed
  useTicker(300)

  const sim = useMemo(() => {
    const net = createNetwork(D, [8, 1], ['tansig', 'purelin'], { seed: 6 + D })
    // Start with a few seconds of the demo wave so there is something to learn from at once
    const y = Array.from({ length: PAST }, (_, i) => demo(i / RATE))
    return {
      net,
      lm: { mu: 0.01 },
      y,
      pred1: [] as number[],
      ins: [] as number[],
      predH: [] as number[],
      ghost: [] as number[],
      errs: [] as number[],
      time: PAST / RATE,
      acc: 0,
      value: y[y.length - 1],
    }
  }, [D])

  useEffect(() => {
    if (source !== 'tilt') return
    input.current.gotTilt = false
    setMessage('')
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta === null) return
      input.current.gotTilt = true
      input.current.tilt = Math.max(-1, Math.min(1, e.beta / 45))
    }
    const ask = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
    if (ask) ask().catch(() => {})
    window.addEventListener('deviceorientation', onTilt)
    const id = setTimeout(() => {
      if (!input.current.gotTilt) setMessage('No tilt sensor found on this device. Use your finger instead.')
    }, 1800)
    return () => {
      window.removeEventListener('deviceorientation', onTilt)
      clearTimeout(id)
    }
  }, [source])

  const window1 = (j: number) => Array.from({ length: D }, (_, d) => sim.y[j - 1 - d])

  const sample = () => {
    sim.time += 1 / RATE
    const t = sim.time
    const target =
      source === 'demo'
        ? demo(t)
        : source === 'finger'
          ? input.current.finger
          : input.current.tilt
    sim.value += (target - sim.value) * (source === 'demo' ? 1 : 0.45)
    sim.y.push(sim.value)
    const k = sim.y.length - 1
    if (Number.isFinite(sim.pred1[k])) {
      sim.errs.push(sim.value - sim.pred1[k])
      // The newest input the network saw when it made that prediction: p(t) = y(t − 1)
      sim.ins.push(sim.y[k - 1])
      if (sim.errs.length > 120) {
        sim.errs.shift()
        sim.ins.shift()
      }
    }
    if (k <= D + 2) return
    // Train on 60 windows spread over the last 12 seconds (series-parallel: measured values as inputs)
    if (k % 2 === 0) {
      const span = Math.min(k - D, 180)
      const batch: Sample[] = Array.from({ length: 60 }, (_, i) => {
        const j = k - Math.floor((i / 60) * span)
        return { p: window1(j), t: [sim.y[j]] }
      })
      lmStep(sim.net, batch, sim.lm)
    }
    // One step ahead, then closed loop: feed predictions back in as if they were measurements
    const w = window1(k + 1)
    sim.ghost = []
    for (let s = 0; s < AHEAD; s++) {
      const v = Math.max(-2, Math.min(2, output(sim.net, w)[0]))
      sim.ghost.push(v)
      w.pop()
      w.unshift(v)
    }
    sim.pred1[k + 1] = sim.ghost[0]
    sim.predH[k + H] = sim.ghost[H - 1]
    if (sim.y.length > 900) {
      sim.y.splice(0, 400)
      sim.pred1.splice(0, 400)
      sim.predH.splice(0, 400)
    }
  }

  const drawGame = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!game) return
    const t = question
    const top = 30
    const bottom = h - 34
    gamePlot.current = { top, bottom }
    const left = 46
    const right = w - 16
    const nextX = right - Math.min(70, w * 0.14)
    const X = (i: number) => left + ((i - (t - SHOWN)) / SHOWN) * (nextX - left)
    const Y = (kw: number) => bottom - ((kw - KW_MIN) / (KW_MAX - KW_MIN)) * (bottom - top)
    ctx.font = '11px ui-monospace, monospace'
    ctx.lineWidth = 1
    ctx.textBaseline = 'middle'
    for (const kw of [100, 200, 300, 400, 500, 600]) {
      ctx.strokeStyle = 'rgba(148,163,184,0.14)'
      ctx.beginPath()
      ctx.moveTo(left, Y(kw))
      ctx.lineTo(right, Y(kw))
      ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.textAlign = 'right'
      ctx.fillText(String(kw), left - 6, Y(kw))
    }
    ctx.textAlign = 'left'
    ctx.fillStyle = '#64748b'
    ctx.fillText('campus load, kW', left + 4, top - 14)
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'
    for (let i = t - SHOWN; i < t; i++) {
      if (i % 6 !== 0) continue
      ctx.strokeStyle = i % 24 === 0 ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.1)'
      ctx.beginPath()
      ctx.moveTo(X(i), top)
      ctx.lineTo(X(i), bottom)
      ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(i % 24 === 0 ? dayNames[Math.floor(i / 24) % 7] : `${i % 24}h`, X(i), bottom + 5)
    }
    // The hour to be guessed
    ctx.fillStyle = 'rgba(250,204,21,0.07)'
    ctx.fillRect(nextX - 8, top, right - nextX + 8, bottom - top)
    ctx.fillStyle = '#fbbf24'
    ctx.fillText(`${dayNames[Math.floor(t / 24) % 7]} ${t % 24}:00`, (nextX + right) / 2 - 4, bottom + 5)
    ctx.fillText('next hour ?', (nextX + right) / 2 - 4, top - 20)
    ctx.textBaseline = 'middle'
    ctx.beginPath()
    for (let i = t - SHOWN; i < t; i++) {
      if (i === t - SHOWN) ctx.moveTo(X(i), Y(game.series[i]))
      else ctx.lineTo(X(i), Y(game.series[i]))
    }
    ctx.strokeStyle = '#f8fafc'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.stroke()
    for (let i = t - SHOWN; i < t; i++) dot(ctx, X(i), Y(game.series[i]), 2, '#f8fafc')
    const gx = (nextX + right) / 2 - 4
    const mark = (kw: number, color: string, label: string, side: -1 | 1) => {
      ctx.strokeStyle = color
      ctx.setLineDash([3, 4])
      ctx.beginPath()
      ctx.moveTo(X(t - 1), Y(game.series[t - 1]))
      ctx.lineTo(gx, Y(kw))
      ctx.stroke()
      ctx.setLineDash([])
      dot(ctx, gx, Y(kw), 6, color)
      ctx.fillStyle = color
      ctx.textAlign = 'right'
      ctx.fillText(label, gx - 12, Y(kw) + side * 12)
    }
    if (guess !== null) mark(guess, '#38bdf8', `you ${guess.toFixed(0)}`, -1)
    if (revealed) {
      const last = rounds[rounds.length - 1]
      if (last) {
        mark(last.model, '#fbbf24', `network ${last.model.toFixed(0)}`, 1)
        mark(last.truth, '#f8fafc', `actual ${last.truth.toFixed(0)}`, last.truth > last.model ? -1 : 1)
      }
    } else if (guess === null) {
      ctx.fillStyle = '#38bdf8'
      ctx.textAlign = 'right'
      ctx.fillText('tap here at the height you expect', right - 4, (top + bottom) / 2)
    }
  }

  const onDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, _t: number, dt: number) => {
    if (mode === 'game') return drawGame(ctx, w, h)
    sim.acc += dt
    while (sim.acc >= 1 / RATE) {
      sim.acc -= 1 / RATE
      sample()
    }
    const k = sim.y.length - 1
    const step = (w * 0.78) / PAST
    const nowX = w * 0.78
    const X = (i: number) => nowX + (i - k) * step
    const Y = (v: number) => h / 2 - v * (h * 0.36)
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.lineWidth = 1
    for (const v of [-1, 0, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, Y(v))
      ctx.lineTo(w, Y(v))
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(250,204,21,0.05)'
    ctx.fillRect(nowX, 0, w - nowX, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.beginPath()
    ctx.moveTo(nowX, 0)
    ctx.lineTo(nowX, h)
    ctx.stroke()
    ctx.font = '11px ui-monospace, monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'right'
    ctx.fillText('what happened', nowX - 8, 16)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#fbbf24'
    ctx.fillText('forecast', nowX + 8, 16)

    const trace = (arr: number[], color: string, width: number) => {
      ctx.beginPath()
      let pen = false
      for (let i = Math.max(0, k - PAST); i <= k; i++) {
        const v = arr[i]
        if (!Number.isFinite(v)) {
          pen = false
          continue
        }
        if (pen) ctx.lineTo(X(i), Y(v))
        else ctx.moveTo(X(i), Y(v))
        pen = true
      }
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineJoin = 'round'
      ctx.stroke()
    }
    trace(show === 'one' ? sim.pred1 : sim.predH, show === 'one' ? '#34d399' : '#f59e0b', 2)
    trace(sim.y, '#f8fafc', 2.5)
    // Forecast running ahead of now
    for (let s = 0; s < sim.ghost.length; s++) {
      ctx.fillStyle = `rgba(251,191,36,${0.95 - (s / AHEAD) * 0.8})`
      ctx.beginPath()
      ctx.arc(X(k + 1 + s), Y(sim.ghost[s]), 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
    if (k >= 0) dot(ctx, nowX, Y(sim.y[k]), 7, '#f8fafc')

    // Error analysis insets: is anything predictable left in the errors?
    const bw = 9
    const ih = 46
    const iy = h - 16
    const mid = iy - ih
    const bound = sim.errs.length ? 2 / Math.sqrt(sim.errs.length) : 1
    const silent = quiet(sim.errs)
    const inset = (ix: number, title: string, values: number[]) => {
      ctx.fillStyle = 'rgba(2,6,23,0.8)'
      ctx.fillRect(ix - 6, iy - ih * 2 - 22, LAGS * (bw + 3) + 14, ih * 2 + 34)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.fillText(title, ix, iy - ih * 2 - 8)
      ctx.strokeStyle = 'rgba(248,113,113,0.7)'
      ctx.setLineDash([3, 3])
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(ix, mid - s * bound * ih)
        ctx.lineTo(ix + LAGS * (bw + 3), mid - s * bound * ih)
        ctx.stroke()
      }
      ctx.setLineDash([])
      for (let lag = 1; lag <= LAGS; lag++) {
        const v = Math.max(-1, Math.min(1, values[lag - 1] || 0))
        ctx.fillStyle = Math.abs(v) > bound ? '#f87171' : '#34d399'
        ctx.fillRect(ix + (lag - 1) * (bw + 3), v >= 0 ? mid - v * ih : mid, bw, Math.abs(v) * ih)
      }
    }
    inset(14, 'error autocorrelation', silent ? [] : autocorr(sim.errs, LAGS).slice(1))
    if (w > 360) inset(14 + LAGS * (bw + 3) + 22, 'input-error cross-corr.', silent ? [] : crosscorr(sim.ins, sim.errs, LAGS - 1))
  }

  const follow = (e: PointerEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    if (mode === 'game') {
      const gp = gamePlot.current
      if (!gp || revealed || over || (e.type === 'pointermove' && e.buttons === 0)) return
      const kw = KW_MIN + ((gp.bottom - (e.clientY - box.top)) / (gp.bottom - gp.top)) * (KW_MAX - KW_MIN)
      setGuess(Math.round(Math.max(KW_MIN, Math.min(KW_MAX, kw))))
      return
    }
    input.current.finger = Math.max(-1.2, Math.min(1.2, (box.height / 2 - (e.clientY - box.top)) / (box.height * 0.36)))
  }

  const rms = (pred: number[]) => {
    const k = sim.y.length - 1
    let s = 0
    let n = 0
    for (let i = Math.max(0, k - 75); i <= k; i++)
      if (Number.isFinite(pred[i])) {
        s += (sim.y[i] - pred[i]) ** 2
        n++
      }
    return n ? Math.sqrt(s / n) : NaN
  }
  const r = quiet(sim.errs) ? [] : autocorr(sim.errs, LAGS)
  const bound = sim.errs.length ? 2 / Math.sqrt(sim.errs.length) : 1
  const outside = r.slice(1).filter((v) => Math.abs(v) > bound).length
  const crossOutside = quiet(sim.errs) ? 0 : crosscorr(sim.ins, sim.errs, LAGS - 1).filter((v) => Math.abs(v) > bound).length

  const lockIn = () => {
    if (!game || guess === null || revealed) return
    setRounds((rs) => [...rs, { truth: game.series[question], model: game.forecast(question), guess }])
    setRevealed(true)
  }
  const nextRound = () => {
    setRevealed(false)
    setGuess(null)
  }
  const newGame = () => {
    setRounds([])
    setRevealed(false)
    setGuess(null)
    setGameNo((n) => n + 1)
  }
  const youErr = meanAbs(rounds.map((q) => q.truth - q.guess))
  const netErr = meanAbs(rounds.map((q) => q.truth - q.model))
  const youWins = rounds.filter((q) => Math.abs(q.truth - q.guess) < Math.abs(q.truth - q.model)).length
  const lastRound = rounds[rounds.length - 1]
  const e1 = rms(sim.pred1)
  const eH = rms(sim.predH)

  return (
    <LabShell
      labId="wave"
      happening={
        mode === 'game' ? (
          <>
            <p>
              Beat the model: the white line is the last {SHOWN} hours of load on a campus feeder. You and a {GAME_D}-5-1 network both predict the next hour.
              The network sees the last {GAME_D} hours through a tapped delay line and was trained on the two weeks before this one.
            </p>
            <p>
              {revealed && lastRound
                ? `Round ${rounds.length}: actual ${lastRound.truth.toFixed(0)} kW. You said ${lastRound.guess.toFixed(0)} (off by ${Math.abs(lastRound.truth - lastRound.guess).toFixed(0)}), the network said ${lastRound.model.toFixed(0)} (off by ${Math.abs(lastRound.truth - lastRound.model).toFixed(0)}).`
                : guess === null
                  ? `Round ${rounds.length + 1} of ${ROUNDS}: tap the yellow column at the height you expect, then lock it in.`
                  : `Round ${rounds.length + 1} of ${ROUNDS}: your guess is ${guess} kW. Lock it in to see the answer.`}
            </p>
            <p>
              {rounds.length >= 5
                ? `After ${rounds.length} rounds your mean error is ${youErr.toFixed(0)} kW and the network's is ${netErr.toFixed(0)} kW. ${youErr < netErr ? 'You are ahead: you may be using something it cannot see, such as knowing what a Saturday means.' : 'The network is ahead: it weighs all 24 past hours the same way every time and never gets tired.'}`
                : 'Play at least 5 rounds before comparing: one round is luck, a mean over several is skill.'}
            </p>
          </>
        ) : (
        <>
          <p>
            The network sees the last {D} position{D > 1 ? 's' : ''} (a tapped delay line) and predicts the next one. It retrains several times a
            second on the last 12 seconds.
          </p>
          <p>
            {D === 1
              ? 'One past value tells it where you are, but not which way you are moving, so it cannot follow a wave.'
              : 'The amber dots are its own predictions fed back in as if they were measurements: that is closed-loop prediction.'}
          </p>
          <p>
            {Number.isFinite(e1) && Number.isFinite(eH)
              ? `One step ahead it is off by ${e1.toFixed(3)}; one second (15 steps) ahead by ${eH.toFixed(3)}.${eH > 3 * e1 + 0.02 ? ' Errors grow because each step builds on the last guess.' : ''}`
              : 'Collecting the first predictions.'}
          </p>
          <p>
            {outside > 2 || crossOutside > 2
              ? `Red bars: ${outside} autocorrelation and ${crossOutside} cross-correlation lags are outside the dashed limits ±${bound.toFixed(2)}. The errors still follow a pattern, so there is information the network has not used. Try more delays.`
              : `The bars are the correlation of the errors with themselves and with the input at earlier steps. ${outside + crossOutside === 0 ? 'All' : 'Nearly all'} are inside the dashed limits ±${bound.toFixed(2)}: what is left looks like noise.`}
          </p>
        </>
        )
      }
      actions={{
        break: { label: 'Use only 1 delay', run: () => { setMode('live'); setD(1) } },
        fix: { label: 'Use 8 delays', run: () => { setMode('live'); setD(8) } },
      }}
      panel={
        <>
          <Group title="Mode">
            <Seg
              value={mode}
              onChange={setMode}
              options={[
                { value: 'live', label: 'Live forecast' },
                { value: 'game', label: 'Beat the model' },
              ]}
            />
          </Group>
          {mode === 'game' && (
            <>
              <Group title={`Round ${Math.min(ROUNDS, rounds.length + (revealed ? 0 : 1))} of ${ROUNDS}`}>
                <div onPointerDown={() => { if (guess === null && !revealed) setGuess(300) }}>
                <Slider
                  label="Your guess for the next hour"
                  value={guess ?? 300}
                  min={KW_MIN}
                  max={KW_MAX}
                  step={5}
                  onChange={(v) => { if (!revealed) setGuess(v) }}
                  fmt={() => (guess === null ? 'tap the chart' : `${guess} kW`)}
                />
                </div>
                <div className="flex flex-wrap gap-2">
                  {!revealed && (
                    <Btn tone="go" disabled={guess === null} onClick={lockIn}>
                      Lock in my guess
                    </Btn>
                  )}
                  {revealed && !over && (
                    <Btn tone="go" onClick={nextRound}>
                      Next round
                    </Btn>
                  )}
                  <Btn onClick={newGame}>New game</Btn>
                </div>
                {revealed && lastRound && (
                  <Stats>
                    <Stat label="Actual" value={`${lastRound.truth.toFixed(0)} kW`} />
                    <Stat label="Network said" value={`${lastRound.model.toFixed(0)} kW`} tone="warn" />
                  </Stats>
                )}
              </Group>
              <Group title="Score">
                <Stats>
                  <Stat label="Your mean error" value={rounds.length ? `${youErr.toFixed(0)} kW` : '—'} tone={rounds.length >= 5 && youErr < netErr ? 'good' : 'plain'} />
                  <Stat label="Network's mean error" value={rounds.length ? `${netErr.toFixed(0)} kW` : '—'} tone={rounds.length >= 5 && netErr <= youErr ? 'good' : 'plain'} />
                  <Stat label="Rounds you won" value={`${youWins} of ${rounds.length}`} />
                  <Stat label="Rounds played" value={`${rounds.length} of ${ROUNDS}`} />
                </Stats>
                <p className="text-xs text-slate-300">
                  {over
                    ? youErr < netErr
                      ? 'Final: you beat the model.'
                      : 'Final: the model beat you.'
                    : rounds.length >= 5
                      ? youErr < netErr
                        ? 'So far you are beating the model.'
                        : 'So far the model is beating you.'
                      : 'The score counts after 5 rounds.'}
                </p>
              </Group>
            </>
          )}
          {mode === 'live' && (
          <>
          <Group title="The signal">
            <Seg
              value={source}
              onChange={setSource}
              options={[
                { value: 'demo', label: 'Demo wave' },
                { value: 'finger', label: 'My finger' },
                { value: 'tilt', label: 'Phone tilt' },
              ]}
            />
            {source === 'finger' && <p className="text-[11px] text-slate-500">Move up and down over the chart, in a rhythm.</p>}
            {source === 'tilt' && <p className="text-[11px] text-slate-500">Rock the phone gently towards you and away.</p>}
            {message && <p className="text-xs text-amber-300">{message}</p>}
          </Group>
          <Group title="The network">
            <Slider
              label="Delays in the tapped delay line"
              value={D}
              min={1}
              max={12}
              onChange={setD}
              fmt={(v) => `${v} · ${v}-8-1 · ${paramCount(sim.net)} parameters`}
            />
            <Seg
              label="Compare with what happened"
              value={show}
              onChange={setShow}
              options={[
                { value: 'one', label: 'One step ahead' },
                { value: 'second', label: 'One second ahead' },
              ]}
            />
          </Group>
          <Group title="How good is the forecast?">
            <Stats>
              <Stat label="One-step error" value={Number.isFinite(e1) ? e1.toFixed(3) : '—'} />
              <Stat label="One-second error" value={Number.isFinite(eH) ? eH.toFixed(3) : '—'} tone={eH > 0.25 ? 'bad' : 'plain'} />
              <Stat label="Lags outside limits" value={`${outside} of ${LAGS}`} tone={outside > 2 ? 'bad' : 'good'} />
              <Stat label="Cross-corr. lags outside" value={`${crossOutside} of ${LAGS}`} tone={crossOutside > 2 ? 'bad' : 'good'} />
            </Stats>
          </Group>
          </>
          )}
        </>
      }
    >
      <Canvas2D
        draw={onDraw}
        onPointerMove={follow}
        onPointerDown={(e) => {
          follow(e)
          if (mode === 'live' && source === 'demo') setSource('finger')
        }}
        className="cursor-ns-resize touch-none"
      />
    </LabShell>
  )
}
