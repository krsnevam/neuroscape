import type { Mat, Vec } from './matrix'

/**
 * Hopfield network.
 *
 * Hagan Ch. 3 form (continuous values, all neurons together):
 *   a(0) = p,  a(t+1) = satlins(W a(t) + b)
 *
 * Content-addressable memory form (±1 values, one neuron at a time):
 *   W = (1/N) Σ_q p_q p_qᵀ with w_ii = 0   (Hebb / outer-product rule)
 *   a_i ← hardlims(Σ_j w_ij a_j)
 *   E(a) = −½ aᵀWa − bᵀa never rises under these one-at-a-time updates.
 */

const satlins = (n: number) => (n < -1 ? -1 : n > 1 ? 1 : n)

/** One synchronous step a(t+1) = satlins(W a(t) + b). */
export function hopfieldStep(W: Mat, b: Vec, a: Vec): Vec {
  return W.map((row, i) => satlins(row.reduce((s, w, j) => s + w * a[j], b[i])))
}

/** a(0), a(1), … until the state repeats or maxSteps is reached. */
export function hopfieldRun(W: Mat, b: Vec, p: Vec, maxSteps = 50): { history: Vec[]; settled: boolean } {
  const history: Vec[] = [p.slice()]
  for (let t = 0; t < maxSteps; t++) {
    const prev = history[history.length - 1]
    const next = hopfieldStep(W, b, prev)
    history.push(next)
    if (next.every((v, i) => Math.abs(v - prev[i]) < 1e-9)) return { history, settled: true }
  }
  return { history, settled: false }
}

/** The network Hagan designs by hand in Ch. 3 for the prototypes [1 −1 −1] and [1 1 −1]. */
export const haganHopfield: { W: Mat; b: Vec } = {
  W: [
    [0.2, 0, 0],
    [0, 1.2, 0],
    [0, 0, 0.2],
  ],
  b: [0.9, 0, -0.9],
}

/** Hebb rule for ±1 patterns: W = (1/N) Σ p pᵀ, with the diagonal set to zero. */
export function hebbWeights(patterns: Vec[], N = patterns[0]?.length ?? 0): Mat {
  const W: Mat = Array.from({ length: N }, () => new Array<number>(N).fill(0))
  for (const p of patterns)
    for (let i = 0; i < N; i++) {
      const row = W[i]
      const pi = p[i] / N
      for (let j = 0; j < N; j++) if (i !== j) row[j] += pi * p[j]
    }
  return W
}

/** Net input to neuron i: n_i = Σ_j w_ij a_j (+ b_i). */
export function netInput(W: Mat, a: Vec, i: number, b?: Vec): number {
  const row = W[i]
  let s = b ? b[i] : 0
  for (let j = 0; j < a.length; j++) s += row[j] * a[j]
  return s
}

/**
 * Update neuron i in place: a_i ← hardlims(n_i). A net input of exactly zero leaves the
 * neuron as it is. Returns true if the neuron flipped.
 */
export function updateNeuron(W: Mat, a: Vec, i: number, b?: Vec): boolean {
  const n = netInput(W, a, i, b)
  const next = n > 0 ? 1 : n < 0 ? -1 : a[i]
  if (next === a[i]) return false
  a[i] = next
  return true
}

/** E(a) = −½ aᵀWa − bᵀa */
export function energy(W: Mat, a: Vec, b?: Vec): number {
  let e = 0
  for (let i = 0; i < a.length; i++) {
    const row = W[i]
    let s = 0
    for (let j = 0; j < a.length; j++) s += row[j] * a[j]
    e -= 0.5 * a[i] * s
    if (b) e -= b[i] * a[i]
  }
  return e
}

/** True when no single neuron wants to change: a is a resting state of the network. */
export function isStable(W: Mat, a: Vec, b?: Vec): boolean {
  for (let i = 0; i < a.length; i++) {
    const n = netInput(W, a, i, b)
    if ((n > 0 && a[i] < 0) || (n < 0 && a[i] > 0)) return false
  }
  return true
}

/** Update every neuron once in the given order. Returns how many flipped. */
export function sweep(W: Mat, a: Vec, order: number[], b?: Vec): number {
  let flips = 0
  for (const i of order) if (updateNeuron(W, a, i, b)) flips++
  return flips
}

/** Overlap (1/N) aᵀp: +1 identical, −1 the exact negative, 0 unrelated. */
export function overlap(a: Vec, p: Vec): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * p[i]
  return s / a.length
}

/** Rule-of-thumb capacity of a Hebb-rule Hopfield memory with random patterns: about 0.138 N. */
export const hopfieldCapacity = (N: number) => 0.138 * N
