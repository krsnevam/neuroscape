import { createNetwork, gauss, lmStep, output, rng, type Network, type Sample } from '../../../engine'

/** Delays in the game network's tapped delay line: one full day of hourly readings. */
export const GAME_D = 24
const DAYS = 21
const TRAIN_DAYS = 14
export const KW_MIN = 50
export const KW_MAX = 650
const norm = (kw: number) => (kw - 300) / 250
const denorm = (v: number) => v * 250 + 300
const bump = (h: number, at: number, width: number) => Math.exp(-(((h - at) / width) ** 2))

/**
 * A simulated hourly load (kW) on a college campus feeder for three weeks: labs and air-conditioning
 * by day, hostels in the evening, quieter weekends, plus weather-like noise that lingers for hours.
 */
function campusLoad(seed: number): number[] {
  const rand = rng(seed)
  let drift = 0
  return Array.from({ length: DAYS * 24 }, (_, i) => {
    const h = i % 24
    const weekend = Math.floor(i / 24) % 7 >= 5
    const day = (weekend ? 0.45 : 1) * (230 * bump(h, 11, 2.3) + 210 * bump(h, 15.5, 2.1))
    const evening = 190 * bump(h, 20.5, 1.9) + 60 * bump(h - 24, -3.5, 1.9)
    drift = 0.75 * drift + gauss(rand) * 14
    return Math.max(KW_MIN + 10, 120 + day + evening + drift + gauss(rand) * 7)
  })
}

export interface Game {
  /** hourly load in kW; day 0 is a Monday */
  series: number[]
  net: Network
  /** first hour index of the part the network never trained on */
  playFrom: number
  /** the network's forecast of series[t] from the 24 hours before it, in kW */
  forecast: (t: number) => number
  /** hour indices to ask about, in a fixed shuffled order */
  questions: number[]
}

/** Build the series and train a 24-5-1 network on the first two weeks (one-step-ahead, measured inputs). */
export function buildGame(seed = 7): Game {
  const series = campusLoad(seed)
  const window = (t: number) => Array.from({ length: GAME_D }, (_, d) => norm(series[t - 1 - d]))
  const playFrom = TRAIN_DAYS * 24
  const samples: Sample[] = []
  for (let t = GAME_D; t < playFrom; t++) samples.push({ p: window(t), t: [norm(series[t])] })
  const net = createNetwork(GAME_D, [5, 1], ['tansig', 'purelin'], { seed: 40 + seed, range: 0.3 })
  const state = { mu: 0.01 }
  for (let k = 0; k < 20; k++) lmStep(net, samples, state, 10, 0.002)
  const forecast = (t: number) => Math.max(KW_MIN, Math.min(KW_MAX, denorm(output(net, window(t))[0])))
  const rand = rng(seed * 3 + 1)
  const pool = Array.from({ length: series.length - playFrom - 48 }, (_, i) => playFrom + 48 + i)
  const questions: number[] = []
  while (questions.length < 10 && pool.length) questions.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
  return { series, net, playFrom, forecast, questions }
}

export const meanAbs = (errs: number[]) => (errs.length ? errs.reduce((s, e) => s + Math.abs(e), 0) / errs.length : NaN)
