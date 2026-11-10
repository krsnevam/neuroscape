/** Minimal dense linear algebra. Matrices are row-major number[][]; vectors are number[]. */
export type Vec = number[]
export type Mat = number[][]

export function zeros(rows: number, cols: number): Mat {
  return Array.from({ length: rows }, () => new Array(cols).fill(0))
}

export function matVec(W: Mat, p: Vec): Vec {
  if (W.length > 0 && W[0].length !== p.length) {
    throw new Error(`Dimension mismatch: W is ${W.length}x${W[0].length}, p has ${p.length}`)
  }
  return W.map((row) => row.reduce((s, w, j) => s + w * p[j], 0))
}

export function add(a: Vec, b: Vec): Vec {
  if (a.length !== b.length) throw new Error('Vector length mismatch')
  return a.map((x, i) => x + b[i])
}

export function sub(a: Vec, b: Vec): Vec {
  if (a.length !== b.length) throw new Error('Vector length mismatch')
  return a.map((x, i) => x - b[i])
}

export function scale(a: Vec, k: number): Vec {
  return a.map((x) => x * k)
}

export function dot(a: Vec, b: Vec): number {
  if (a.length !== b.length) throw new Error('Vector length mismatch')
  return a.reduce((s, x, i) => s + x * b[i], 0)
}

/** Outer product a·bᵀ */
export function outer(a: Vec, b: Vec): Mat {
  return a.map((x) => b.map((y) => x * y))
}

export function transpose(M: Mat): Mat {
  if (M.length === 0) return []
  return M[0].map((_, j) => M.map((row) => row[j]))
}

export function addMat(A: Mat, B: Mat): Mat {
  return A.map((row, i) => row.map((x, j) => x + B[i][j]))
}

export function scaleMat(A: Mat, k: number): Mat {
  return A.map((row) => row.map((x) => x * k))
}

export function clone(M: Mat): Mat {
  return M.map((row) => row.slice())
}
