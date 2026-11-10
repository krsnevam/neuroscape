import type { Vec } from './matrix'
import { distance } from './competitive'

/**
 * Learning vector quantization (Hagan, competitive networks chapter).
 * Layer 1 is a competitive layer of subclass prototypes. Layer 2 is linear with a fixed 0/1
 * matrix W2 that joins subclasses into classes; here it is stored as `classOf[i]`, the class
 * of subclass i (so W2[k][i] = 1 exactly when classOf[i] = k).
 */
export interface Lvq {
  /** W1: one prototype per subclass */
  w: Vec[]
  classOf: number[]
}

/** Subclasses ordered from closest to farthest. */
export function lvqRank(net: Lvq, p: Vec): number[] {
  const d = net.w.map((w) => distance(w, p))
  return d.map((_, i) => i).sort((a, b) => d[a] - d[b])
}

export function lvqWinner(net: Lvq, p: Vec): number {
  let best = 0
  let d = Infinity
  for (let i = 0; i < net.w.length; i++) {
    const di = distance(net.w[i], p)
    if (di < d) {
      d = di
      best = i
    }
  }
  return best
}

/** a2 = W2 a1: the class of the winning subclass. */
export const lvqClassify = (net: Lvq, p: Vec) => net.classOf[lvqWinner(net, p)]

export interface LvqStepResult {
  winner: number
  correct: boolean
  /** LVQ2 only: the closest prototype of the right class that was pulled in, or −1 */
  helper: number
}

/**
 * One LVQ step for input p with target class t.
 *   right class:  w_i*(q) = w_i*(q−1) + α (p − w_i*(q−1))
 *   wrong class:  w_i*(q) = w_i*(q−1) − α (p − w_i*(q−1))
 * With `lvq2`, when the winner is wrong the closest prototype of the right class is also
 * moved toward p, so a prototype that never wins can still reach its region.
 */
export function lvqStep(net: Lvq, p: Vec, t: number, alpha: number, lvq2 = false): LvqStepResult {
  const win = lvqWinner(net, p)
  const correct = net.classOf[win] === t
  const sign = correct ? 1 : -1
  const w = net.w[win]
  let helper = -1
  if (!correct && lvq2) {
    let d = Infinity
    for (let i = 0; i < net.w.length; i++) {
      if (net.classOf[i] !== t) continue
      const di = distance(net.w[i], p)
      if (di < d) {
        d = di
        helper = i
      }
    }
  }
  for (let k = 0; k < w.length; k++) w[k] += sign * alpha * (p[k] - w[k])
  if (helper >= 0) {
    const h = net.w[helper]
    for (let k = 0; k < h.length; k++) h[k] += alpha * (p[k] - h[k])
  }
  return { winner: win, correct, helper }
}

export function lvqAccuracy(net: Lvq, data: { p: Vec; t: number }[]): number {
  if (!data.length) return 0
  let ok = 0
  for (const d of data) if (lvqClassify(net, d.p) === d.t) ok++
  return ok / data.length
}
