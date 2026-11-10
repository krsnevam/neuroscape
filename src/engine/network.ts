import { layerForward, randomLayer, type Layer, type LayerOutput } from './neuron'
import type { Vec } from './matrix'
import type { TransferName } from './transfer'

/**
 * Multilayer network (Hagan Fig. 2.9 / Ch. 11):
 *   a⁰ = p
 *   a^(m+1) = f^(m+1)(W^(m+1) a^m + b^(m+1)),  m = 0, 1, …, M−1
 *   a = a^M
 */
export interface Network {
  layers: Layer[]
}

export interface ForwardTrace {
  /** a⁰ = p */
  p: Vec
  /** per layer m = 1..M: n^m and a^m */
  layers: LayerOutput[]
  /** final output a^M */
  a: Vec
}

export function forward(net: Network, p: Vec): ForwardTrace {
  const layers: LayerOutput[] = []
  let a = p
  for (const layer of net.layers) {
    const out = layerForward(layer, a)
    layers.push(out)
    a = out.a
  }
  return { p, layers, a }
}

/**
 * Build a network from an architecture, e.g. R=2, sizes=[3,1], fns=['logsig','purelin']
 * gives a 2-3-1 network.
 */
export function createNetwork(
  R: number,
  sizes: number[],
  fns: TransferName[],
  opts: { range?: number; seed?: number } = {},
): Network {
  if (sizes.length !== fns.length) throw new Error('sizes and fns must have the same length')
  const { range = 0.5, seed = 1 } = opts
  let inputs = R
  const layers = sizes.map((S, i) => {
    const layer = randomLayer(S, inputs, fns[i], range, seed + i * 7919)
    inputs = S
    return layer
  })
  return { layers }
}
