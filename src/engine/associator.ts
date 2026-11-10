/**
 * The linear associator (Hagan Ch. 7): a = Wp, trained in one shot.
 *   Hebb rule:           W = T Pᵀ = Σ t_q p_qᵀ
 *   Pseudoinverse rule:  W = T P⁺,  P⁺ = (PᵀP)⁻¹ Pᵀ
 * Patterns are passed as lists of vectors (the columns of P and T).
 */
import type { Mat, Vec } from './matrix'

const dotp = (a: Vec, b: Vec) => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

/** W = Σ_q t_q p_qᵀ */
export function hebb(P: Vec[], T: Vec[]): Mat {
  const S = T[0]?.length ?? 0
  const R = P[0]?.length ?? 0
  const W: Mat = Array.from({ length: S }, () => new Array<number>(R).fill(0))
  for (let q = 0; q < P.length; q++)
    for (let i = 0; i < S; i++) {
      const t = T[q][i]
      if (t === 0) continue
      for (let j = 0; j < R; j++) W[i][j] += t * P[q][j]
    }
  return W
}

/** The table of inner products p_qᵀ p_k (this is PᵀP). */
export function gram(P: Vec[]): Mat {
  return P.map((a) => P.map((b) => dotp(a, b)))
}

/** Inverse of a small square matrix by Gauss-Jordan elimination with pivoting. Null if singular. */
export function invert(M: Mat, tol = 1e-9): Mat | null {
  const n = M.length
  const A = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r
    if (Math.abs(A[piv][c]) < tol) return null
    ;[A[c], A[piv]] = [A[piv], A[c]]
    const d = A[c][c]
    for (let j = 0; j < 2 * n; j++) A[c][j] /= d
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const f = A[r][c]
      if (f === 0) continue
      for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]
    }
  }
  return A.map((row) => row.slice(n))
}

/** P⁺ = (PᵀP)⁻¹Pᵀ as Q rows of length R. Null when the patterns are linearly dependent. */
export function pseudoinverse(P: Vec[]): Mat | null {
  const inv = invert(gram(P))
  if (!inv) return null
  const R = P[0]?.length ?? 0
  return inv.map((row) => {
    const out = new Array<number>(R).fill(0)
    for (let q = 0; q < P.length; q++) for (let j = 0; j < R; j++) out[j] += row[q] * P[q][j]
    return out
  })
}

/** W = T P⁺. Null when the patterns are linearly dependent. */
export function pseudoinverseRule(P: Vec[], T: Vec[]): Mat | null {
  const Pplus = pseudoinverse(P)
  return Pplus ? hebb(Pplus, T) : null
}

/** a = Wp */
export function recall(W: Mat, p: Vec): Vec {
  return W.map((row) => dotp(row, p))
}

/**
 * Performance analysis of the Hebb rule (Hagan Eq. 7.9):
 *   a = W p_k = t_k (p_kᵀp_k) + Σ_{q≠k} t_q (p_qᵀp_k)
 * Returns the wanted part and the cross-talk part for any probe p.
 */
export function hebbCrossTalk(P: Vec[], T: Vec[], k: number, probe: Vec = P[k]) {
  const S = T[0].length
  const wanted = T[k].map((t) => t * dotp(P[k], probe))
  const crossTalk = new Array<number>(S).fill(0)
  for (let q = 0; q < P.length; q++) {
    if (q === k) continue
    const ip = dotp(P[q], probe)
    for (let i = 0; i < S; i++) crossTalk[i] += T[q][i] * ip
  }
  return { wanted, crossTalk }
}

export function norm(v: Vec): number {
  return Math.sqrt(dotp(v, v))
}
