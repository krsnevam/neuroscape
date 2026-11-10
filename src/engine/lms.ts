import type { Mat, Vec } from './matrix'

/**
 * ADALINE and the LMS (Widrow-Hoff) algorithm, Hagan Ch. 10.
 *
 *   a = purelin(Wp + b) = Wp + b
 *   F(x) = E[e²] = c − 2xᵀh + xᵀRx,   x = [W; b],  z = [p; 1]
 *   c = E[t²],  h = E[t z],  R = E[z zᵀ]
 *   LMS:  W(k+1) = W(k) + 2α e(k) pᵀ(k),   b(k+1) = b(k) + 2α e(k)
 *   stable for 0 < α < 1/λ_max(R)
 */
export interface Adaline {
  /** weight row W (1 × R) */
  w: Vec
  b: number
  /** false: the bias is held at its value (Hagan's apple/orange example has no bias) */
  useBias: boolean
}

export function createAdaline(R: number, useBias = true): Adaline {
  return { w: new Array<number>(R).fill(0), b: 0, useBias }
}

export function adalineOutput(ad: Adaline, p: Vec): number {
  let a = ad.b
  for (let j = 0; j < p.length; j++) a += ad.w[j] * p[j]
  return a
}

/** One LMS step on the pair {p, t}. Weights change in place. Returns the output and error before the update. */
export function lmsStep(ad: Adaline, p: Vec, t: number, alpha: number): { a: number; e: number } {
  const a = adalineOutput(ad, p)
  const e = t - a
  const k = 2 * alpha * e
  for (let j = 0; j < p.length; j++) ad.w[j] += k * p[j]
  if (ad.useBias) ad.b += k
  return { a, e }
}

/** Input correlation matrix R = E[z zᵀ], averaged over the given vectors. */
export function correlationMatrix(zs: Vec[]): Mat {
  const n = zs[0]?.length ?? 0
  const R = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  for (const z of zs) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) R[i][j] += z[i] * z[j]
  const Q = Math.max(1, zs.length)
  for (const row of R) for (let j = 0; j < n; j++) row[j] /= Q
  return R
}

/** Cross-correlation h = E[t z]. */
export function crossCorrelation(zs: Vec[], ts: number[]): Vec {
  const n = zs[0]?.length ?? 0
  const h = new Array<number>(n).fill(0)
  zs.forEach((z, q) => {
    for (let i = 0; i < n; i++) h[i] += ts[q] * z[i]
  })
  return h.map((v) => v / Math.max(1, zs.length))
}

/**
 * Eigenvalues (ascending) and unit eigenvectors of a small symmetric matrix by Jacobi rotations.
 * `vectors[k]` is the eigenvector for `values[k]`.
 */
export function symEigen(A: Mat): { values: number[]; vectors: Vec[] } {
  const n = A.length
  const a = A.map((r) => r.slice())
  const V: Mat = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j): number => (i === j ? 1 : 0)))
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j]
    if (off < 1e-22) break
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q])
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
        const c = 1 / Math.sqrt(t * t + 1)
        const s = t * c
        for (let k = 0; k < n; k++) {
          const akp = a[k][p]
          const akq = a[k][q]
          a[k][p] = c * akp - s * akq
          a[k][q] = s * akp + c * akq
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k]
          const aqk = a[q][k]
          a[p][k] = c * apk - s * aqk
          a[q][k] = s * apk + c * aqk
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p]
          const vkq = V[k][q]
          V[k][p] = c * vkp - s * vkq
          V[k][q] = s * vkp + c * vkq
        }
      }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => a[i][i] - a[j][j])
  return { values: order.map((i) => a[i][i]), vectors: order.map((i) => V.map((row) => row[i])) }
}

/** Solve the small linear system A x = y (Gauss-Jordan with pivoting). Returns null if A is singular. */
export function solveLinear(A: Mat, y: Vec): Vec | null {
  const n = y.length
  const M = A.map((r, i) => [...r, y[i]])
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r
    if (Math.abs(M[piv][c]) < 1e-12) return null
    ;[M[piv], M[c]] = [M[c], M[piv]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  return M.map((r, i) => r[n] / r[i])
}

/** Mean square error at x: F(x) = c − 2xᵀh + xᵀRx (Hagan 10.15). */
export function mseQuadratic(x: Vec, c: number, h: Vec, R: Mat): number {
  let F = c
  for (let i = 0; i < x.length; i++) {
    F -= 2 * x[i] * h[i]
    for (let j = 0; j < x.length; j++) F += x[i] * R[i][j] * x[j]
  }
  return F
}

/** Largest stable LMS learning rate: α < 1/λ_max (Hagan 10.39). */
export function lmsAlphaBound(R: Mat): number {
  const { values } = symEigen(R)
  return 1 / values[values.length - 1]
}

/**
 * Adaptive filter (Hagan Fig. 10.6): a tapped delay line feeding an ADALINE with no bias.
 *   a(k) = Σᵢ wᵢ · y(k − (i−1)·spacing),  i = 1..taps
 * `spacing` is the delay between neighbouring taps, in samples (1 in the book).
 * In a noise canceller y is the noise reference and the target is the contaminated signal,
 * so the error e(k) = t(k) − a(k) is the restored signal.
 */
export function createAdaptiveFilter(taps: number, spacing = 1) {
  const len = (taps - 1) * spacing + 1
  const line = new Array<number>(len).fill(0)
  const ad = createAdaline(taps, false)
  const p = new Array<number>(taps).fill(0)
  return {
    ad,
    /** the current tap vector p(k), valid after `step` */
    p,
    step(y: number, t: number, alpha: number): { a: number; e: number } {
      for (let i = len - 1; i > 0; i--) line[i] = line[i - 1]
      line[0] = y
      for (let i = 0; i < taps; i++) p[i] = line[i * spacing]
      return lmsStep(ad, p, t, alpha)
    },
    reset() {
      line.fill(0)
      ad.w.fill(0)
    },
  }
}
