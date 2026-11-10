import type { Mat, Vec } from './matrix'
import type { Network } from './network'

/** One term per layer of the parameter count: S^m (S^(m−1) + 1). */
export function paramTerms(R: number, sizes: number[]): { S: number; inputs: number; count: number }[] {
  let inputs = R
  return sizes.map((S) => {
    const term = { S, inputs, count: S * (inputs + 1) }
    inputs = S
    return term
  })
}

/**
 * A stack of linear layers is one linear layer:
 *   W = W^M … W² W¹,   b = W^M … W² b¹ + … + W^M b^(M−1) + b^M
 * Returns that single layer, or null if any layer is not purelin.
 */
export function collapseLinear(net: Network): { W: Mat; b: Vec } | null {
  if (net.layers.length === 0 || net.layers.some((L) => L.f !== 'purelin')) return null
  let W = net.layers[0].W.map((r) => r.slice())
  let b = net.layers[0].b.slice()
  for (let m = 1; m < net.layers.length; m++) {
    const L = net.layers[m]
    const cols = W[0].length
    const prevW = W
    const prevB = b
    W = L.W.map((row) => Array.from({ length: cols }, (_, j) => row.reduce((s, w, k) => s + w * prevW[k][j], 0)))
    b = L.W.map((row, i) => row.reduce((s, w, k) => s + w * prevB[k], L.b[i]))
  }
  return { W, b }
}
