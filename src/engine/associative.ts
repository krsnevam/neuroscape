import type { Vec } from './matrix'

/**
 * Associative learning rules (Hagan, "Neural Network Design", associative learning chapter).
 * All rules are local: a weight changes using only its own input and its own neuron's output.
 */

export const hardlim = (n: number) => (n >= 0 ? 1 : 0)
export const satlins = (n: number) => Math.max(-1, Math.min(1, n))

/**
 * Simple associative network with one unconditioned input p0 (fixed weight w0) and one
 * conditioned input p (learned weight w):  a = hardlim(w0 p0 + w p + b).
 */
export function associatorOutput(w0: number, p0: number, w: number, p: number, b: number): { n: number; a: number } {
  const n = w0 * p0 + w * p + b
  return { n, a: hardlim(n) }
}

/**
 * Unsupervised Hebb rule with optional decay:
 *   w(q) = w(q−1) + α a(q) p(q) − γ w(q−1)
 * γ = 0 is the plain Hebb rule. With a = p = 1 on every trial the weight settles at α/γ.
 */
export function hebbStep(w: number, a: number, p: number, alpha: number, gamma = 0): number {
  return w + alpha * a * p - gamma * w
}

/** The largest weight the Hebb rule with decay can reach: w_max = α/γ. */
export const hebbMax = (alpha: number, gamma: number) => (gamma > 0 ? alpha / gamma : Infinity)

/** Vector form of the Hebb rule with decay for one neuron: w ← w + α a p − γ w. */
export function hebbDecayVec(w: Vec, p: Vec, a: number, alpha: number, gamma: number): Vec {
  return w.map((wj, j) => wj + alpha * a * p[j] - gamma * wj)
}

/**
 * Instar: a = hardlim(w0 p0 + wᵀp + b). One neuron that recognises a vector.
 */
export function instarOutput(w0: number, p0: number, w: Vec, p: Vec, b: number): { n: number; a: number } {
  let n = w0 * p0 + b
  for (let j = 0; j < w.length; j++) n += w[j] * p[j]
  return { n, a: hardlim(n) }
}

/**
 * Instar rule:  w(q) = w(q−1) + α a(q) (p(q) − w(q−1)).
 * The weight vector moves toward the input, and only when the neuron is active.
 * With a fixed at 1 for a chosen neuron this is the Kohonen rule.
 */
export function instarStep(w: Vec, p: Vec, a: number, alpha: number): Vec {
  return w.map((wj, j) => wj + alpha * a * (p[j] - wj))
}

/** Kohonen rule: the instar rule applied to a neuron picked some other way (for example the winner). */
export const kohonenStep = (w: Vec, p: Vec, alpha: number): Vec => instarStep(w, p, 1, alpha)

/**
 * Outstar: a = satlins(W0 p0 + w p), W0 = I. One cue p that recalls a whole vector.
 * `w` is the column of weights leaving the cue.
 */
export function outstarOutput(p0: Vec, w: Vec, p: number): Vec {
  return p0.map((v, i) => satlins(v + w[i] * p))
}

/**
 * Outstar rule:  w(q) = w(q−1) + α (a(q) − w(q−1)) p(q).
 * The weights leaving an active cue move toward the output pattern.
 */
export function outstarStep(w: Vec, a: Vec, p: number, alpha: number): Vec {
  return w.map((wi, i) => wi + alpha * (a[i] - wi) * p)
}
