import type { Mat, Vec } from './matrix'

/**
 * Radial basis network (Hagan, radial basis networks chapter).
 *   layer 1:  n1_i = ‖p − w_i‖ b1_i,   a1_i = radbas(n1_i) = exp(−n1_i²)
 *   layer 2:  a2 = W2 a1 + b2           (linear)
 */
export interface Rbf {
  /** W1: one centre per hidden neuron */
  centres: Vec[]
  /** b1: one bias per hidden neuron; the hill's width is about 1/b */
  b1: number[]
  /** W2 for a single output */
  w2: number[]
  b2: number
}

export const radbas = (n: number) => Math.exp(-n * n)

export function rbfHidden(centres: Vec[], b1: number[], p: Vec): Vec {
  return centres.map((c, i) => {
    let d2 = 0
    for (let k = 0; k < c.length; k++) d2 += (p[k] - c[k]) * (p[k] - c[k])
    return Math.exp(-d2 * b1[i] * b1[i])
  })
}

export function rbfOutput(net: Rbf, p: Vec): number {
  const a1 = rbfHidden(net.centres, net.b1, p)
  let a2 = net.b2
  for (let i = 0; i < a1.length; i++) a2 += net.w2[i] * a1[i]
  return a2
}

/** Solve the square system A x = y by Gaussian elimination with partial pivoting. */
export function solve(A: Mat, y: Vec): Vec {
  const n = y.length
  const M = A.map((row, i) => [...row, y[i]])
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r
    ;[M[c], M[piv]] = [M[piv], M[c]]
    const d = M[c][c]
    if (Math.abs(d) < 1e-14) continue
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / d
      if (f === 0) continue
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n]
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]
    x[r] = Math.abs(M[r][r]) < 1e-14 ? 0 : s / M[r][r]
  }
  return x
}

/**
 * Linear least squares with a small ridge term ρ:
 *   x* = (UᵀU + ρ I)⁻¹ Uᵀ t
 * minimises Σ (t_q − u_qᵀ x)² + ρ ‖x‖². Each row of U is one regressor vector u_q.
 */
export function leastSquares(U: Mat, t: Vec, rho = 0): Vec {
  const n = U[0]?.length ?? 0
  const G: Mat = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  const h = new Array<number>(n).fill(0)
  for (let q = 0; q < U.length; q++) {
    const u = U[q]
    for (let i = 0; i < n; i++) {
      h[i] += u[i] * t[q]
      for (let j = i; j < n; j++) G[i][j] += u[i] * u[j]
    }
  }
  for (let i = 0; i < n; i++) {
    G[i][i] += rho
    for (let j = 0; j < i; j++) G[i][j] = G[j][i]
  }
  return solve(G, h)
}

/**
 * Second stage of two-stage RBF training: with the centres and biases fixed, the output is
 * linear in W2 and b2, so they come from one least-squares solve. u_q = [a1(p_q); 1].
 */
export function rbfSolveOutput(centres: Vec[], b1: number[], P: Vec[], T: number[], rho = 0): { w2: number[]; b2: number } {
  const U = P.map((p) => [...rbfHidden(centres, b1, p), 1])
  const x = leastSquares(U, T, rho)
  return { w2: x.slice(0, centres.length), b2: x[centres.length] ?? 0 }
}

/** Mean squared error of the network on a data set. */
export function rbfMse(net: Rbf, P: Vec[], T: number[]): number {
  if (!P.length) return 0
  let s = 0
  for (let q = 0; q < P.length; q++) s += (T[q] - rbfOutput(net, P[q])) ** 2
  return s / P.length
}
