import { add, matVec, type Mat, type Vec } from './matrix'
import { transferFns, type TransferName } from './transfer'

/** Result of one neuron or layer computation, keeping every intermediate for display. */
export interface LayerOutput {
  /** net input n = Wp + b */
  n: Vec
  /** output a = f(n) */
  a: Vec
}

/** Single-input neuron (Hagan Fig. 2.1): n = w·p + b, a = f(n) */
export function singleInputNeuron(w: number, p: number, b: number, f: TransferName) {
  const n = w * p + b
  return { n, a: transferFns[f].f(n) }
}

/** Multiple-input neuron (Hagan Fig. 2.5): n = Wp + b with W a 1×R row. */
export function neuron(W: Vec, p: Vec, b: number, f: TransferName) {
  const out = layerForward({ W: [W], b: [b], f }, p)
  return { n: out.n[0], a: out.a[0] }
}

/** A layer of S neurons with R inputs: W is S×R, b is S×1. */
export interface Layer {
  W: Mat
  b: Vec
  f: TransferName
}

export function layerForward(layer: Layer, p: Vec): LayerOutput {
  const n = add(matVec(layer.W, p), layer.b)
  const fn = transferFns[layer.f].f
  return { n, a: n.map(fn) }
}

/** Seedable PRNG (mulberry32) so classroom demos are reproducible. */
export function rng(seed = 1) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Create a layer with weights uniform in [-range, range]. */
export function randomLayer(S: number, R: number, f: TransferName, range = 0.5, seed = 1): Layer {
  const rand = rng(seed)
  const u = () => (rand() * 2 - 1) * range
  return {
    W: Array.from({ length: S }, () => Array.from({ length: R }, u)),
    b: Array.from({ length: S }, u),
    f,
  }
}
