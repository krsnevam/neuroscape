import type { Network } from './network'
import { rng } from './neuron'
import type { Grad } from './train'
import type { TransferName } from './transfer'

/**
 * Ways to set the weights of an R-S-1 network before training (Hagan Ch. 22, weight initialisation):
 *  - 'random'  small uniform random values in [−0.5, 0.5]
 *  - 'zero'    every weight and bias 0
 *  - 'equal'   every hidden neuron given the same weights
 *  - 'nw'      Nguyen-Widrow: each hidden weight row has magnitude 0.7·S^(1/R) in a random
 *              direction, and each hidden bias is uniform in [−‖w‖, ‖w‖], so the active parts of
 *              the sigmoids are spread across inputs normalised to [−1, 1]
 */
export type InitScheme = 'random' | 'zero' | 'equal' | 'nw'

export function initNetwork(
  R: number,
  S: number,
  scheme: InitScheme,
  seed = 1,
  fns: [TransferName, TransferName] = ['tansig', 'purelin'],
): Network {
  const rand = rng(seed)
  const u = (range: number) => (rand() * 2 - 1) * range
  let W1: number[][]
  let b1: number[]
  let W2: number[]
  let b2 = 0
  if (scheme === 'zero') {
    W1 = Array.from({ length: S }, () => new Array<number>(R).fill(0))
    b1 = new Array<number>(S).fill(0)
    W2 = new Array<number>(S).fill(0)
  } else if (scheme === 'equal') {
    W1 = Array.from({ length: S }, () => new Array<number>(R).fill(0.3))
    b1 = new Array<number>(S).fill(0.3)
    W2 = new Array<number>(S).fill(0.3)
  } else if (scheme === 'nw') {
    const mag = 0.7 * S ** (1 / R)
    W1 = Array.from({ length: S }, () => {
      const row = Array.from({ length: R }, () => u(1) || 0.5)
      const len = Math.sqrt(row.reduce((s, v) => s + v * v, 0))
      return row.map((v) => (v / len) * mag)
    })
    b1 = Array.from({ length: S }, () => u(mag))
    W2 = Array.from({ length: S }, () => u(0.5))
    b2 = u(0.5)
  } else {
    W1 = Array.from({ length: S }, () => Array.from({ length: R }, () => u(0.5)))
    b1 = Array.from({ length: S }, () => u(0.5))
    W2 = Array.from({ length: S }, () => u(0.5))
    b2 = u(0.5)
  }
  return {
    layers: [
      { W: W1, b: b1, f: fns[0] },
      { W: [W2], b: [b2], f: fns[1] },
    ],
  }
}

/** Length of the gradient vector ‖g‖: training stops when it falls below a minimum. */
export function gradNorm(g: Grad): number {
  let s = 0
  for (const W of g.W) for (const row of W) for (const v of row) s += v * v
  for (const b of g.b) for (const v of b) s += v * v
  return Math.sqrt(s)
}

/** How many hidden neurons differ from every earlier one (weights, bias and output weight). */
export function distinctNeurons(net: Network, tol = 1e-6): number {
  const L1 = net.layers[0]
  const W2 = net.layers[1].W[0]
  const rows = L1.W.map((w, i) => [...w, L1.b[i], W2[i]])
  let n = 0
  rows.forEach((r, i) => {
    const copy = rows.slice(0, i).some((q) => q.every((v, k) => Math.abs(v - r[k]) <= tol))
    if (!copy) n++
  })
  return n
}
