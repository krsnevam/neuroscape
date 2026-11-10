/** Data handling and post-training analysis helpers (Hagan Ch. 22). */

export interface MinMax {
  min: number
  max: number
}

export function fitMinMax(values: number[]): MinMax {
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (!Number.isFinite(min)) return { min: 0, max: 1 }
  if (max === min) max = min + 1
  return { min, max }
}

/** p_n = 2 (p − p_min) / (p_max − p_min) − 1 */
export const normalize = (v: number, mm: MinMax) => (2 * (v - mm.min)) / (mm.max - mm.min) - 1
export const denormalize = (v: number, mm: MinMax) => ((v + 1) / 2) * (mm.max - mm.min) + mm.min

/** Fisher-Yates shuffle with a supplied random source; returns a new array. */
export function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Standard normal sample from a uniform source (Box-Muller). */
export function gauss(rand: () => number): number {
  const u = Math.max(1e-12, rand())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand())
}

export interface Confusion {
  tp: number
  fp: number
  fn: number
  tn: number
}

/** Two-class confusion counts: positive when score ≥ threshold. */
export function confusion(scores: number[], labels: number[], threshold: number): Confusion {
  const c = { tp: 0, fp: 0, fn: 0, tn: 0 }
  for (let i = 0; i < scores.length; i++) {
    const pos = scores[i] >= threshold
    if (labels[i] === 1) pos ? c.tp++ : c.fn++
    else pos ? c.fp++ : c.tn++
  }
  return c
}

export function rates(c: Confusion) {
  const total = c.tp + c.fp + c.fn + c.tn
  return {
    accuracy: total ? (c.tp + c.tn) / total : 0,
    sensitivity: c.tp + c.fn ? c.tp / (c.tp + c.fn) : 0,
    specificity: c.tn + c.fp ? c.tn / (c.tn + c.fp) : 0,
    precision: c.tp + c.fp ? c.tp / (c.tp + c.fp) : 0,
  }
}

/** ROC curve as [false positive rate, true positive rate] points, and the area under it. */
export function roc(scores: number[], labels: number[]): { points: [number, number][]; auc: number } {
  const order = scores.map((s, i) => [s, labels[i]] as const).sort((a, b) => b[0] - a[0])
  const P = labels.filter((l) => l === 1).length
  const N = labels.length - P
  const points: [number, number][] = [[0, 0]]
  let tp = 0
  let fp = 0
  let auc = 0
  for (const [, l] of order) {
    if (l === 1) tp++
    else {
      fp++
      auc += P ? tp / P : 0
    }
    points.push([N ? fp / N : 0, P ? tp / P : 0])
  }
  return { points, auc: N ? auc / N : 0 }
}

/**
 * Autocorrelation of a prediction error sequence, normalised so R(0) = 1.
 * For white noise, lags τ ≠ 0 stay within ±2/√Q.
 */
export function autocorr(e: number[], maxLag: number): number[] {
  const Q = e.length
  const out = new Array<number>(maxLag + 1).fill(0)
  if (Q < 2) return out
  const mean = e.reduce((s, v) => s + v, 0) / Q
  let r0 = 0
  for (const v of e) r0 += (v - mean) * (v - mean)
  r0 /= Q
  if (r0 === 0) return out
  for (let tau = 0; tau <= maxLag && tau < Q; tau++) {
    let s = 0
    for (let t = 0; t + tau < Q; t++) s += (e[t] - mean) * (e[t + tau] - mean)
    out[tau] = s / (Q - tau) / r0
  }
  return out
}
