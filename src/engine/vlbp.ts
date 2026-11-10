import type { Network } from './network'
import { gradient, type Sample } from './train'

/**
 * Batch backpropagation and its heuristic modifications (Hagan Ch. 12), written for any
 * performance index F(x) with gradient g(x):
 *
 *   SDBP  Δx(k) = −α g(k)
 *   MOBP  Δx(k) = γ Δx(k−1) − (1−γ) α g(k)                       (12.9, 12.10)
 *   VLBP  MOBP plus the variable learning rate rules:
 *     1. If F rises by more than ζ (4 %) the step is discarded, α ← ρ α (ρ = 0.7), γ ← 0.
 *     2. If F falls the step is accepted, α ← η α (η = 1.05), γ is restored.
 *     3. If F rises by less than ζ the step is accepted, α is unchanged, γ is restored.
 */
export interface Problem {
  F: (x: number[]) => number
  grad: (x: number[]) => number[]
}

export interface BpOpts {
  alpha: number
  /** momentum coefficient γ; 0 gives plain steepest descent */
  gamma?: number
  /** true switches the variable learning rate rules on */
  variable?: boolean
  eta?: number
  rho?: number
  zeta?: number
}

export interface BpState {
  x: number[]
  F: number
  /** current learning rate (changes only under VLBP) */
  alpha: number
  /** momentum in use for the next step (0 right after a rejected step) */
  gamma: number
  dx: number[]
  /** what the last step did */
  last: 'start' | 'accepted' | 'rejected'
  iterations: number
}

export function createBp(problem: Problem, x0: number[], opts: BpOpts) {
  const gamma0 = opts.gamma ?? 0
  const eta = opts.eta ?? 1.05
  const rho = opts.rho ?? 0.7
  const zeta = opts.zeta ?? 0.04
  const state: BpState = {
    x: x0.slice(),
    F: problem.F(x0),
    alpha: opts.alpha,
    gamma: gamma0,
    dx: x0.map(() => 0),
    last: 'start',
    iterations: 0,
  }
  return {
    state,
    step(): BpState {
      const g = problem.grad(state.x)
      const dx = g.map((gi, i) => state.gamma * state.dx[i] - (1 - state.gamma) * state.alpha * gi)
      const x1 = state.x.map((v, i) => v + dx[i])
      const F1 = problem.F(x1)
      state.iterations++
      if (!opts.variable) {
        state.x = x1
        state.dx = dx
        state.F = F1
        state.last = 'accepted'
        return state
      }
      if (!(F1 <= state.F * (1 + zeta))) {
        // Rule 1 (also catches NaN): throw the step away
        state.alpha *= rho
        state.gamma = 0
        state.last = 'rejected'
        return state
      }
      if (F1 < state.F) state.alpha *= eta
      state.gamma = gamma0
      state.x = x1
      state.dx = dx
      state.F = F1
      state.last = 'accepted'
      return state
    },
  }
}

/**
 * Hagan's Chapter 12 demonstration problem. A 1-2-1 network with logsig neurons in both layers
 * is asked to copy the response of the same network with
 *   w¹₁,₁ = 10, w¹₂,₁ = 10, b¹₁ = −5, b¹₂ = 5, w²₁,₁ = 1, w²₁,₂ = 1, b² = −1
 * at p = −2, −1.9, …, 2. Only two parameters are free (w¹₁,₁ and w²₁,₁ here, as in
 * Fig. 12.3), so the sum squared error can be drawn as a surface.
 */
export function haganCh12(): { net: Network; samples: Sample[]; problem: Problem; optimum: [number, number] } {
  const make = (): Network => ({
    layers: [
      { W: [[10], [10]], b: [-5, 5], f: 'logsig' },
      { W: [[1, 1]], b: [-1], f: 'logsig' },
    ],
  })
  const truth = make()
  const samples: Sample[] = Array.from({ length: 41 }, (_, i) => {
    const p = -2 + i * 0.1
    const a1 = truth.layers[0].W.map((w, j) => 1 / (1 + Math.exp(-(w[0] * p + truth.layers[0].b[j]))))
    const n2 = a1[0] + a1[1] - 1
    return { p: [p], t: [1 / (1 + Math.exp(-n2))] }
  })
  const net = make()
  const Q = samples.length
  const put = (x: number[]) => {
    net.layers[0].W[0][0] = x[0]
    net.layers[1].W[0][0] = x[1]
  }
  const sig = (n: number) => 1 / (1 + Math.exp(-n))
  const problem: Problem = {
    // Sum squared error (Hagan uses the sum, not the mean). Written out directly because the
    // surface plot evaluates it thousands of times; the test checks it against the engine.
    F: (x) => {
      let F = 0
      for (const s of samples) {
        const p = s.p[0]
        const e = s.t[0] - sig(x[1] * sig(x[0] * p - 5) + sig(10 * p + 5) - 1)
        F += e * e
      }
      return F
    },
    // Gradient by backpropagation; the engine averages over the samples, so multiply by Q
    grad: (x) => {
      put(x)
      const g = gradient(net, samples)
      return [g.W[0][0][0] * Q, g.W[1][0][0] * Q]
    },
  }
  return { net, samples, problem, optimum: [10, 1] }
}
