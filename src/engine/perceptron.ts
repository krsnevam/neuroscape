/**
 * The perceptron (Hagan Ch. 4): a layer of hardlim neurons, a = hardlim(Wp + b),
 * trained with the unified perceptron rule
 *   e = t − a,   W_new = W_old + e pᵀ,   b_new = b_old + e.
 */
import type { Mat, Vec } from './matrix'

export interface PSample {
  p: Vec
  t: Vec
}

export interface Perceptron {
  W: Mat
  b: Vec
}

export const hardlim = (n: number): 0 | 1 => (n >= 0 ? 1 : 0)

export function createPerceptron(S: number, R: number): Perceptron {
  return { W: Array.from({ length: S }, () => new Array<number>(R).fill(0)), b: new Array<number>(S).fill(0) }
}

export function netInput(net: Perceptron, p: Vec): Vec {
  return net.W.map((row, i) => row.reduce((s, w, j) => s + w * p[j], net.b[i]))
}

export function perceptronOutput(net: Perceptron, p: Vec): Vec {
  return netInput(net, p).map(hardlim)
}

export interface StepResult {
  n: Vec
  a: Vec
  e: Vec
  /** true when at least one neuron had a non-zero error, so the weights moved */
  changed: boolean
}

/**
 * Present one sample and apply the unified rule in place.
 * `alpha` scales the correction (Hagan's rule uses 1). `useBias: false` keeps b fixed.
 */
export function perceptronStep(net: Perceptron, s: PSample, alpha = 1, useBias = true): StepResult {
  const n = netInput(net, s.p)
  const a = n.map(hardlim)
  const e = s.t.map((t, i) => t - a[i])
  let changed = false
  for (let i = 0; i < e.length; i++) {
    if (e[i] === 0) continue
    changed = true
    for (let j = 0; j < s.p.length; j++) net.W[i][j] += alpha * e[i] * s.p[j]
    if (useBias) net.b[i] += alpha * e[i]
  }
  return { n, a, e, changed }
}

/** How many samples the network gets wrong (any neuron wrong counts). */
export function countErrors(net: Perceptron, samples: PSample[]): number {
  let wrong = 0
  for (const s of samples) {
    const a = perceptronOutput(net, s.p)
    if (a.some((v, i) => v !== s.t[i])) wrong++
  }
  return wrong
}

/** Cycle through the samples until a whole pass makes no change, or `maxEpochs` passes. */
export function trainPerceptron(net: Perceptron, samples: PSample[], maxEpochs = 1000, alpha = 1, useBias = true) {
  let updates = 0
  for (let epoch = 1; epoch <= maxEpochs; epoch++) {
    let changed = false
    for (const s of samples) {
      if (perceptronStep(net, s, alpha, useBias).changed) {
        changed = true
        updates++
      }
    }
    if (!changed) return { converged: true, epochs: epoch, updates }
  }
  return { converged: false, epochs: maxEpochs, updates }
}

/** Angle between two vectors, in degrees. 90 when either is zero. */
export function angleDeg(x: Vec, y: Vec): number {
  let xy = 0
  let xx = 0
  let yy = 0
  for (let i = 0; i < x.length; i++) {
    xy += x[i] * y[i]
    xx += x[i] * x[i]
    yy += y[i] * y[i]
  }
  if (xx === 0 || yy === 0) return 90
  return (Math.acos(Math.max(-1, Math.min(1, xy / Math.sqrt(xx * yy)))) * 180) / Math.PI
}

/**
 * The convergence proof's bound (Hagan Ch. 4, "Proof of Convergence") for a single neuron
 * that starts from zero weights. With x = [w; b], z_q = [p_q; 1] and a solution x* that has
 * x*ᵀz_q ≥ δ > 0 for t = 1 and x*ᵀz_q ≤ −δ for t = 0, the number of weight changes k obeys
 *   k ≤ ‖x*‖² Π / δ²,   Π = max ‖z_q‖².
 * Returns null when x* does not classify every sample with a positive margin.
 */
export function convergenceBound(xStar: Vec, samples: { p: Vec; t: number }[]) {
  let delta = Infinity
  let Pi = 0
  for (const s of samples) {
    const z = [...s.p, 1]
    const proj = z.reduce((sum, v, i) => sum + v * xStar[i], 0)
    delta = Math.min(delta, s.t === 1 ? proj : -proj)
    Pi = Math.max(Pi, z.reduce((sum, v) => sum + v * v, 0))
  }
  if (!(delta > 0)) return null
  const norm2 = xStar.reduce((s, v) => s + v * v, 0)
  return { delta, Pi, norm2, bound: (norm2 * Pi) / (delta * delta) }
}

/**
 * Exact test for linear separability of two classes of points in the plane.
 * The widest gap between two separable sets is perpendicular either to the line joining
 * one point of each class, or to an edge joining two points of the same class, so trying
 * those directions is enough. Returns the widest-margin line w·p + b = 0 (‖w‖ = 1, w pointing
 * to the t = 1 side) or null when no line separates the classes.
 */
export function separatingLine(samples: { p: Vec; t: number }[]): { w: [number, number]; b: number; margin: number } | null {
  const pos = samples.filter((s) => s.t === 1)
  const neg = samples.filter((s) => s.t !== 1)
  if (pos.length === 0 || neg.length === 0) {
    // One class only: any far-away line works. Put it beyond the points.
    const sign = pos.length ? 1 : -1
    const minX = Math.min(...samples.map((s) => s.p[0]))
    return { w: [sign, 0], b: -sign * (minX - 1), margin: 1 }
  }
  let best: { w: [number, number]; b: number; margin: number } | null = null
  const tryDir = (dx: number, dy: number) => {
    const len = Math.hypot(dx, dy)
    if (len < 1e-9) return
    for (const sgn of [1, -1]) {
      const w: [number, number] = [(sgn * dx) / len, (sgn * dy) / len]
      let minPos = Infinity
      let maxNeg = -Infinity
      for (const s of pos) minPos = Math.min(minPos, w[0] * s.p[0] + w[1] * s.p[1])
      for (const s of neg) maxNeg = Math.max(maxNeg, w[0] * s.p[0] + w[1] * s.p[1])
      const margin = (minPos - maxNeg) / 2
      if (margin > 1e-6 && (!best || margin > best.margin)) best = { w, b: -(minPos + maxNeg) / 2, margin }
    }
  }
  for (let i = 0; i < samples.length; i++)
    for (let j = i + 1; j < samples.length; j++) {
      const dx = samples[j].p[0] - samples[i].p[0]
      const dy = samples[j].p[1] - samples[i].p[1]
      tryDir(dx, dy)
      tryDir(-dy, dx)
    }
  return best
}
