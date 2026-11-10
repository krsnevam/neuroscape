import type { Vec } from './matrix'

/** Self-organising feature map on a rows × cols grid (Hagan Ch. 16). Neuron i sits at (i / cols, i % cols). */
export interface Som {
  rows: number
  cols: number
  /** weight vector of each neuron */
  w: Vec[]
}

export function createSom(rows: number, cols: number, init: (i: number) => Vec): Som {
  return { rows, cols, w: Array.from({ length: rows * cols }, (_, i) => init(i)) }
}

function dist2(a: Vec, b: Vec): number {
  let s = 0
  for (let k = 0; k < a.length; k++) s += (a[k] - b[k]) * (a[k] - b[k])
  return s
}

/** Indices of the closest and second-closest neurons to p. */
export function winners(som: Som, p: Vec): [number, number] {
  let best = 0
  let second = 0
  let d1 = Infinity
  let d2 = Infinity
  for (let i = 0; i < som.w.length; i++) {
    const d = dist2(som.w[i], p)
    if (d < d1) {
      d2 = d1
      second = best
      d1 = d
      best = i
    } else if (d < d2) {
      d2 = d
      second = i
    }
  }
  return [best, second]
}

/**
 * Kohonen rule with a Gaussian neighbourhood:
 *   w_i(q) = w_i(q−1) + α h(i, i*) (p − w_i(q−1))
 * radius ≤ 0 updates the winner only (a plain competitive layer).
 * Returns the winner i*.
 */
export function somStep(som: Som, p: Vec, alpha: number, radius: number): number {
  const [win] = winners(som, p)
  const wr = Math.floor(win / som.cols)
  const wc = win % som.cols
  for (let i = 0; i < som.w.length; i++) {
    let h = i === win ? 1 : 0
    if (radius > 0) {
      const dr = Math.floor(i / som.cols) - wr
      const dc = (i % som.cols) - wc
      h = Math.exp(-(dr * dr + dc * dc) / (2 * radius * radius))
      if (h < 0.01) continue
    } else if (h === 0) continue
    const w = som.w[i]
    for (let k = 0; k < w.length; k++) w[k] += alpha * h * (p[k] - w[k])
  }
  return win
}

/** Average distance from each input to its closest prototype. */
export function quantError(som: Som, data: Vec[]): number {
  if (data.length === 0) return 0
  let s = 0
  for (const p of data) s += Math.sqrt(dist2(som.w[winners(som, p)[0]], p))
  return s / data.length
}

/** Fraction of inputs whose closest and second-closest prototypes are not grid neighbours. */
export function topoError(som: Som, data: Vec[]): number {
  if (data.length === 0) return 0
  let bad = 0
  for (const p of data) {
    const [a, b] = winners(som, p)
    const dr = Math.abs(Math.floor(a / som.cols) - Math.floor(b / som.cols))
    const dc = Math.abs((a % som.cols) - (b % som.cols))
    if (Math.max(dr, dc) > 1) bad++
  }
  return bad / data.length
}

/** How many inputs each neuron wins. A neuron with 0 hits is dead. */
export function hits(som: Som, data: Vec[]): number[] {
  const h = new Array<number>(som.w.length).fill(0)
  for (const p of data) h[winners(som, p)[0]]++
  return h
}
