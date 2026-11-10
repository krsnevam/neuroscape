import type { Vec } from './matrix'

/** Hamming network and competitive layer (Hagan, competitive networks chapter). */

/** Feedforward layer of the Hamming network: a1 = W p + b, each row of W is a stored prototype. */
export function hammingFeedforward(W: Vec[], p: Vec, b = 0): Vec {
  return W.map((row) => row.reduce((s, w, j) => s + w * p[j], b))
}

/**
 * Recurrent (competition) layer of the Hamming network:
 *   a2(t+1) = poslin(a2(t) − ε Σ_{j≠i} a2_j(t)),  0 < ε < 1/(S−1)
 * Lateral inhibition repeats until at most one neuron is still positive.
 * Returns every state, starting with a2(0) = a1.
 */
export function hammingCompete(a1: Vec, epsilon?: number, maxIter = 200): Vec[] {
  const S = a1.length
  const eps = epsilon ?? (S > 1 ? 0.5 / (S - 1) : 0)
  const states: Vec[] = [a1.map((v) => Math.max(0, v))]
  for (let t = 0; t < maxIter; t++) {
    const a = states[states.length - 1]
    if (a.filter((v) => v > 0).length <= 1) break
    const sum = a.reduce((s, v) => s + v, 0)
    states.push(a.map((v) => Math.max(0, v - eps * (sum - v))))
  }
  return states
}

/** compet transfer function: 1 for the largest net input, 0 for the rest. */
export function compet(n: Vec): Vec {
  let best = 0
  for (let i = 1; i < n.length; i++) if (n[i] > n[best]) best = i
  return n.map((_, i) => (i === best ? 1 : 0))
}

export interface CompetitiveLayer {
  /** one prototype (weight row) per neuron */
  w: Vec[]
  /** conscience bias of each neuron; 0 when the conscience is off */
  bias: number[]
  /** running estimate of how often each neuron wins (starts at 1/S) */
  share: number[]
  /** total wins so far */
  wins: number[]
}

export function createCompetitiveLayer(w: Vec[]): CompetitiveLayer {
  const S = w.length
  return {
    w: w.map((v) => v.slice()),
    bias: new Array<number>(S).fill(0),
    share: new Array<number>(S).fill(1 / S),
    wins: new Array<number>(S).fill(0),
  }
}

export const distance = (a: Vec, b: Vec) => {
  let s = 0
  for (let k = 0; k < a.length; k++) s += (a[k] - b[k]) * (a[k] - b[k])
  return Math.sqrt(s)
}

/** Net input of every neuron: n_i = −‖w_i − p‖ + b_i. The largest wins. */
export function competitiveNet(layer: CompetitiveLayer, p: Vec): Vec {
  return layer.w.map((w, i) => -distance(w, p) + layer.bias[i])
}

export function competitiveWinner(layer: CompetitiveLayer, p: Vec): number {
  const n = competitiveNet(layer, p)
  let best = 0
  for (let i = 1; i < n.length; i++) if (n[i] > n[best]) best = i
  return best
}

export interface ConscienceOpts {
  /** how strongly a frequent winner is handicapped (0 switches the conscience off) */
  strength: number
  /** how fast the win-share estimate follows recent wins */
  rate?: number
}

/**
 * One step of competitive learning.
 *   winner i* = argmax_i (−‖w_i − p‖ + b_i)
 *   Kohonen rule for the winner only:  w_i*(q) = w_i*(q−1) + α (p − w_i*(q−1))
 * Conscience: each neuron keeps a running win share c_i. Its bias is b_i = strength · (1/S − c_i),
 * so a neuron that wins more than its fair share is handicapped and one that never wins is helped.
 */
export function competitiveStep(layer: CompetitiveLayer, p: Vec, alpha: number, conscience?: ConscienceOpts): number {
  const S = layer.w.length
  const win = competitiveWinner(layer, p)
  const w = layer.w[win]
  for (let k = 0; k < w.length; k++) w[k] += alpha * (p[k] - w[k])
  layer.wins[win]++
  const rate = conscience?.rate ?? 0.02
  for (let i = 0; i < S; i++) {
    layer.share[i] += rate * ((i === win ? 1 : 0) - layer.share[i])
    layer.bias[i] = conscience && conscience.strength > 0 ? conscience.strength * (1 / S - layer.share[i]) : 0
  }
  return win
}

/** How many of the inputs each neuron is closest to (bias ignored). A neuron with 0 is dead. */
export function territory(layer: CompetitiveLayer, data: Vec[]): number[] {
  const h = new Array<number>(layer.w.length).fill(0)
  for (const p of data) {
    let best = 0
    let d = Infinity
    for (let i = 0; i < layer.w.length; i++) {
      const di = distance(layer.w[i], p)
      if (di < d) {
        d = di
        best = i
      }
    }
    h[best]++
  }
  return h
}

/** Average distance from each input to its closest prototype. */
export function meanDistance(w: Vec[], data: Vec[]): number {
  if (!data.length || !w.length) return 0
  let s = 0
  for (const p of data) {
    let d = Infinity
    for (const wi of w) d = Math.min(d, distance(wi, p))
    s += d
  }
  return s / data.length
}
