import type { Mat, Vec } from './matrix'

/**
 * Hamming network (Hagan Ch. 3). It decides which stored prototype an input is closest to.
 *
 * Feedforward layer:  a¹ = purelin(W¹p + b¹), rows of W¹ are the prototypes, every bias is R.
 *   For ±1 vectors, a¹ᵢ = 2 × (number of elements of p that agree with prototype i).
 * Recurrent layer:    a²(0) = a¹,  a²(t+1) = poslin(W² a²(t)),
 *   W² has 1 on the diagonal and −ε elsewhere, with 0 < ε < 1/(S−1).
 *   The neurons compete until only the one with the largest starting value is still positive.
 */

/** a¹ = W¹p + b¹ with W¹ = prototypes (one per row) and b¹ = R. */
export function hammingFeedforward(prototypes: Mat, p: Vec): Vec {
  const R = p.length
  return prototypes.map((row) => row.reduce((s, w, j) => s + w * p[j], R))
}

/** The lateral-inhibition matrix W²: 1 on the diagonal, −ε off it. */
export function hammingW2(S: number, eps: number): Mat {
  return Array.from({ length: S }, (_, i) => Array.from({ length: S }, (_, j) => (i === j ? 1 : -eps)))
}

/** One pass of the recurrent layer: a²(t+1) = poslin(W² a²(t)). */
export function hammingRecurrentStep(a: Vec, eps: number): Vec {
  const total = a.reduce((s, v) => s + v, 0)
  return a.map((v) => Math.max(0, v - eps * (total - v)))
}

export interface HammingRun {
  /** feedforward scores a¹ */
  a1: Vec
  /** a²(0), a²(1), … up to and including the first repeated state */
  history: Vec[]
  /** index of the only neuron left positive, or −1 if none or several are left */
  winner: number
  /** true when a²(t+1) = a²(t) was reached within maxSteps */
  settled: boolean
}

export function hammingWinner(a: Vec, tol = 1e-9): number {
  const alive = a.map((v, i) => (v > tol ? i : -1)).filter((i) => i >= 0)
  return alive.length === 1 ? alive[0] : -1
}

export function hammingRun(prototypes: Mat, p: Vec, eps = 0.5, maxSteps = 50): HammingRun {
  const a1 = hammingFeedforward(prototypes, p)
  const history: Vec[] = [a1.slice()]
  let settled = false
  for (let t = 0; t < maxSteps; t++) {
    const prev = history[history.length - 1]
    const next = hammingRecurrentStep(prev, eps)
    history.push(next)
    if (next.every((v, i) => Math.abs(v - prev[i]) < 1e-9)) {
      settled = true
      break
    }
  }
  return { a1, history, winner: hammingWinner(history[history.length - 1]), settled }
}
