import type { Som } from './som'

/**
 * Regression between targets and network outputs (Hagan Ch. 22, post-training analysis of fitting):
 *   a ≈ m t + c,  R = correlation coefficient between t and a.
 * A perfect fit has m = 1, c = 0, R = 1.
 */
export function regression(t: number[], a: number[]): { m: number; c: number; r: number } {
  const Q = Math.min(t.length, a.length)
  if (Q < 2) return { m: 0, c: Q ? a[0] : 0, r: 0 }
  let mt = 0
  let ma = 0
  for (let i = 0; i < Q; i++) {
    mt += t[i]
    ma += a[i]
  }
  mt /= Q
  ma /= Q
  let stt = 0
  let saa = 0
  let sta = 0
  for (let i = 0; i < Q; i++) {
    stt += (t[i] - mt) ** 2
    saa += (a[i] - ma) ** 2
    sta += (t[i] - mt) * (a[i] - ma)
  }
  if (stt === 0) return { m: 0, c: ma, r: 0 }
  const m = sta / stt
  return { m, c: ma - m * mt, r: saa === 0 ? 0 : sta / Math.sqrt(stt * saa) }
}

/**
 * Distance matrix (U-matrix) of a self-organising map: for each neuron, the mean distance from its
 * weight vector to those of its grid neighbours (up, down, left, right). Large values mark the
 * borders between clusters.
 */
export function umatrix(som: Som): number[] {
  const { rows, cols, w } = som
  const out = new Array<number>(w.length).fill(0)
  const d = (a: number, b: number) => {
    let s = 0
    for (let k = 0; k < w[a].length; k++) s += (w[a][k] - w[b][k]) ** 2
    return Math.sqrt(s)
  }
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      let s = 0
      let n = 0
      if (r > 0) (s += d(i, i - cols)), n++
      if (r + 1 < rows) (s += d(i, i + cols)), n++
      if (c > 0) (s += d(i, i - 1)), n++
      if (c + 1 < cols) (s += d(i, i + 1)), n++
      out[i] = n ? s / n : 0
    }
  return out
}

/**
 * Cross-correlation between an input sequence and the prediction errors, normalised to [−1, 1]:
 *   R_pe(τ) = mean (p(t − τ) − p̄)(e(t) − ē) / √(R_p(0) R_e(0)),  τ = 0..maxLag
 * out[τ] is the correlation between the error now and the input τ steps earlier. If the network has
 * used everything the input offers, every value stays within ±2/√Q.
 */
export function crosscorr(p: number[], e: number[], maxLag: number): number[] {
  const Q = Math.min(p.length, e.length)
  const out = new Array<number>(maxLag + 1).fill(0)
  if (Q < 2) return out
  let mp = 0
  let me = 0
  for (let i = 0; i < Q; i++) {
    mp += p[i]
    me += e[i]
  }
  mp /= Q
  me /= Q
  let vp = 0
  let ve = 0
  for (let i = 0; i < Q; i++) {
    vp += (p[i] - mp) ** 2
    ve += (e[i] - me) ** 2
  }
  const scale = Math.sqrt((vp / Q) * (ve / Q))
  if (scale === 0) return out
  for (let tau = 0; tau <= maxLag && tau < Q; tau++) {
    let s = 0
    for (let t = tau; t < Q; t++) s += (p[t - tau] - mp) * (e[t] - me)
    out[tau] = s / (Q - tau) / scale
  }
  return out
}

/** Distance from x to the nearest of the training inputs: a simple novelty measure. */
export function nearest(x: number, train: number[]): number {
  let d = Infinity
  for (const v of train) d = Math.min(d, Math.abs(x - v))
  return d
}
