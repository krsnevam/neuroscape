import type { Mat, Vec } from './matrix'
import type { Network } from './network'
import { transferFns } from './transfer'

/** One training pair {p, t}. */
export interface Sample {
  p: Vec
  t: Vec
}

/**
 * Performance functions (Hagan Ch. 22):
 *  - 'mse'     F = mean over samples of eᵀe, e = t − a
 *  - 'xent'    cross-entropy with a logsig output layer
 *  - 'softmax' cross-entropy with a purelin output layer passed through softmax
 */
export type Loss = 'mse' | 'xent' | 'softmax'

export function softmax(n: Vec): Vec {
  const m = Math.max(...n)
  const e = n.map((x) => Math.exp(x - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map((x) => x / s)
}

interface Trace {
  /** n^m for m = 1..M (index m−1) */
  n: Vec[]
  /** a^m for m = 0..M, a⁰ = p */
  a: Vec[]
}

function run(net: Network, p: Vec): Trace {
  const n: Vec[] = []
  const a: Vec[] = [p]
  let x = p
  for (const L of net.layers) {
    const f = transferFns[L.f].f
    const S = L.b.length
    const nm = new Array<number>(S)
    const am = new Array<number>(S)
    for (let i = 0; i < S; i++) {
      let s = L.b[i]
      const row = L.W[i]
      for (let j = 0; j < x.length; j++) s += row[j] * x[j]
      nm[i] = s
      am[i] = f(s)
    }
    n.push(nm)
    a.push(am)
    x = am
  }
  return { n, a }
}

/** Network output for p. With 'softmax' the final layer's output is passed through softmax. */
export function output(net: Network, p: Vec, loss: Loss = 'mse'): Vec {
  const tr = run(net, p)
  const y = tr.a[tr.a.length - 1]
  return loss === 'softmax' ? softmax(y) : y
}

/** Hidden-layer outputs a^m for display (m = 1..M). */
export function activations(net: Network, p: Vec): Vec[] {
  return run(net, p).a.slice(1)
}

const EPS = 1e-9

/** Sensitivity of the last layer s^M and this sample's loss. */
function outputSens(net: Network, tr: Trace, t: Vec, loss: Loss): { s: Vec; loss: number } {
  const M = net.layers.length
  const a = tr.a[M]
  const n = tr.n[M - 1]
  const s = new Array<number>(a.length)
  let F = 0
  if (loss === 'mse') {
    // Hagan (11.44): s^M = −2 Ḟ^M(n^M)(t − a)
    const df = transferFns[net.layers[M - 1].f].df
    for (let i = 0; i < a.length; i++) {
      const e = t[i] - a[i]
      F += e * e
      s[i] = -2 * df(n[i]) * e
    }
  } else if (loss === 'xent') {
    for (let i = 0; i < a.length; i++) {
      const y = Math.min(1 - EPS, Math.max(EPS, a[i]))
      F -= t[i] * Math.log(y) + (1 - t[i]) * Math.log(1 - y)
      s[i] = a[i] - t[i]
    }
  } else {
    const y = softmax(a)
    for (let i = 0; i < a.length; i++) {
      if (t[i] > 0) F -= t[i] * Math.log(Math.max(EPS, y[i]))
      s[i] = y[i] - t[i]
    }
  }
  return { s, loss: F }
}

/** Hagan (11.45): s^m = Ḟ^m(n^m)(W^(m+1))ᵀ s^(m+1) */
function backSens(net: Network, tr: Trace, m: number, s: Vec): Vec {
  const df = transferFns[net.layers[m - 1].f].df
  const W = net.layers[m].W
  const nPrev = tr.n[m - 1]
  const sp = new Array<number>(nPrev.length)
  for (let j = 0; j < nPrev.length; j++) {
    let acc = 0
    for (let i = 0; i < s.length; i++) acc += W[i][j] * s[i]
    sp[j] = df(nPrev[j]) * acc
  }
  return sp
}

export interface Grad {
  W: Mat[]
  b: Vec[]
  loss: number
}

function zerosLike(net: Network): { W: Mat[]; b: Vec[] } {
  return {
    W: net.layers.map((L) => L.W.map((r) => new Array<number>(r.length).fill(0))),
    b: net.layers.map((L) => new Array<number>(L.b.length).fill(0)),
  }
}

/**
 * Batch gradient by backpropagation, averaged over the samples.
 * `decay` adds the regularisation term decay·Σw² (weights only, not biases).
 */
export function gradient(net: Network, samples: Sample[], loss: Loss = 'mse', decay = 0): Grad {
  const g = zerosLike(net)
  let total = 0
  for (const smp of samples) {
    const tr = run(net, smp.p)
    const o = outputSens(net, tr, smp.t, loss)
    total += o.loss
    let s = o.s
    for (let m = net.layers.length - 1; m >= 0; m--) {
      const aPrev = tr.a[m]
      const gW = g.W[m]
      const gb = g.b[m]
      for (let i = 0; i < s.length; i++) {
        gb[i] += s[i]
        const row = gW[i]
        const si = s[i]
        for (let j = 0; j < aPrev.length; j++) row[j] += si * aPrev[j]
      }
      if (m > 0) s = backSens(net, tr, m, s)
    }
  }
  const Q = Math.max(1, samples.length)
  let F = total / Q
  for (let m = 0; m < net.layers.length; m++) {
    const W = net.layers[m].W
    for (let i = 0; i < W.length; i++) {
      g.b[m][i] /= Q
      for (let j = 0; j < W[i].length; j++) {
        g.W[m][i][j] = g.W[m][i][j] / Q + 2 * decay * W[i][j]
        F += decay * W[i][j] * W[i][j]
      }
    }
  }
  return { ...g, loss: F }
}

/** Mean loss over the samples, no weight change. */
export function lossOn(net: Network, samples: Sample[], loss: Loss = 'mse'): number {
  if (samples.length === 0) return 0
  let total = 0
  for (const smp of samples) total += outputSens(net, run(net, smp.p), smp.t, loss).loss
  return total / samples.length
}

export interface TrainOpts {
  /** learning rate α */
  alpha: number
  /** momentum coefficient γ (0 = plain steepest descent) */
  gamma?: number
  loss?: Loss
  decay?: number
}

/**
 * Steepest descent with optional momentum (Hagan 12.9):
 *   Δx(k) = γ Δx(k−1) − (1−γ) α g(k)
 * Weights are updated in place. `step` returns the loss before the update.
 */
export function createTrainer(net: Network) {
  let v = zerosLike(net)
  return {
    step(samples: Sample[], o: TrainOpts): number {
      const g = gradient(net, samples, o.loss ?? 'mse', o.decay ?? 0)
      const gam = o.gamma ?? 0
      const k = (1 - gam) * o.alpha
      for (let m = 0; m < net.layers.length; m++) {
        const L = net.layers[m]
        for (let i = 0; i < L.b.length; i++) {
          v.b[m][i] = gam * v.b[m][i] - k * g.b[m][i]
          L.b[i] += v.b[m][i]
          const row = L.W[i]
          for (let j = 0; j < row.length; j++) {
            v.W[m][i][j] = gam * v.W[m][i][j] - k * g.W[m][i][j]
            row[j] += v.W[m][i][j]
          }
        }
      }
      return g.loss
    },
    reset() {
      v = zerosLike(net)
    },
  }
}

/** All weights and biases as one vector x (per layer: W row by row, then b). */
export function getParams(net: Network): number[] {
  const x: number[] = []
  for (const L of net.layers) {
    for (const row of L.W) for (const w of row) x.push(w)
    for (const b of L.b) x.push(b)
  }
  return x
}

export function setParams(net: Network, x: number[]): void {
  let k = 0
  for (const L of net.layers) {
    for (const row of L.W) for (let j = 0; j < row.length; j++) row[j] = x[k++]
    for (let i = 0; i < L.b.length; i++) L.b[i] = x[k++]
  }
}

export function paramCount(net: Network): number {
  return net.layers.reduce((s, L) => s + L.b.length * (L.W[0].length + 1), 0)
}

export function cloneNetwork(net: Network): Network {
  return { layers: net.layers.map((L) => ({ W: L.W.map((r) => r.slice()), b: L.b.slice(), f: L.f })) }
}

/** Solve A x = y by Gaussian elimination with partial pivoting. A and y are overwritten. */
function solve(A: number[][], y: number[]): number[] | null {
  const n = y.length
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r
    if (Math.abs(A[piv][c]) < 1e-14) return null
    if (piv !== c) {
      ;[A[piv], A[c]] = [A[c], A[piv]]
      ;[y[piv], y[c]] = [y[c], y[piv]]
    }
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c]
      if (f === 0) continue
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]
      y[r] -= f * y[c]
    }
  }
  const x = new Array<number>(n)
  for (let r = n - 1; r >= 0; r--) {
    let s = y[r]
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]
    x[r] = s / A[r][r]
  }
  return x
}

function sse(net: Network, samples: Sample[]): number {
  return lossOn(net, samples, 'mse') * samples.length
}

/**
 * One Levenberg-Marquardt iteration (Hagan 12.31), squared-error performance:
 *   Δx = −[JᵀJ + μI]⁻¹ Jᵀv
 * μ is multiplied by ϑ when a step fails and divided by ϑ when it succeeds.
 * `decay` adds the regularisation term decay·Σx² to the sum of squared errors.
 * Returns the mean squared error after the step.
 */
export function lmStep(
  net: Network,
  samples: Sample[],
  state: { mu: number },
  theta = 10,
  decay = 0,
): number {
  const Q = samples.length
  if (Q === 0) return 0
  const x0 = getParams(net)
  const n = x0.length
  const JtJ = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  const Jtv = new Array<number>(n).fill(0)
  const M = net.layers.length
  const row = new Array<number>(n)
  let sse0 = 0
  for (const smp of samples) {
    const tr = run(net, smp.p)
    const a = tr.a[M]
    const df = transferFns[net.layers[M - 1].f].df
    for (let k = 0; k < a.length; k++) {
      const e = smp.t[k] - a[k]
      sse0 += e * e
      // Marquardt sensitivity for error element k: ∂e_k/∂n^M
      let s: Vec = a.map((_, i) => (i === k ? -df(tr.n[M - 1][i]) : 0))
      const sens: Vec[] = new Array(M)
      for (let m = M - 1; m >= 0; m--) {
        sens[m] = s
        if (m > 0) s = backSens(net, tr, m, s)
      }
      let c = 0
      for (let m = 0; m < M; m++) {
        const aPrev = tr.a[m]
        const sm = sens[m]
        for (let i = 0; i < sm.length; i++) for (let j = 0; j < aPrev.length; j++) row[c++] = sm[i] * aPrev[j]
        for (let i = 0; i < sm.length; i++) row[c++] = sm[i]
      }
      for (let i = 0; i < n; i++) {
        if (row[i] === 0) continue
        Jtv[i] += row[i] * e
        const Ji = JtJ[i]
        for (let j = 0; j < n; j++) Ji[j] += row[i] * row[j]
      }
    }
  }
  const penalty = (x: number[]) => decay * x.reduce((s, v) => s + v * v, 0)
  const f0 = sse0 + penalty(x0)
  for (let attempt = 0; attempt < 6; attempt++) {
    const A = JtJ.map((r, i) => {
      const c = r.slice()
      c[i] += state.mu + decay
      return c
    })
    const d = solve(A, Jtv.map((v, i) => -v - decay * x0[i]))
    if (d) {
      const x1 = x0.map((v, i) => v + d[i])
      setParams(net, x1)
      const sse1 = sse(net, samples)
      if (Number.isFinite(sse1) && sse1 + penalty(x1) < f0) {
        state.mu = Math.max(state.mu / theta, 1e-12)
        return sse1 / Q
      }
    }
    state.mu = Math.min(state.mu * theta, 1e12)
  }
  setParams(net, x0)
  return sse0 / Q
}
