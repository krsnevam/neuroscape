import { rng } from './sim'

/**
 * The small network behind the "helpers" levels: two probes in, two helpers, one boss.
 * The task cannot be done by one neuron: STOP when the two probes disagree by 3 or more.
 */
export interface KidNet {
  /** each helper's knobs for probe A and probe B */
  W: [number, number][]
  /** each helper's own starting worry (its bias) */
  b: number[]
  /** the boss's knob for each helper */
  v: number[]
  /** the boss's own starting worry */
  c: number
}

export const disagree = (a: number, b: number) => Math.abs(a - b) >= 3
export const sig = (n: number) => 1 / (1 + Math.exp(-n))
/** Probe readings run 0 to 10; the helpers hear them as −1 to 1. */
const scale = (x: number) => x / 5 - 1

export function randomKid(seed: number, helpers = 2): KidNet {
  const r = rng(seed)
  const u = (k: number) => (r() * 2 - 1) * k
  return {
    W: Array.from({ length: helpers }, () => [u(2), u(2)] as [number, number]),
    b: Array.from({ length: helpers }, () => u(1)),
    v: Array.from({ length: helpers }, () => u(2)),
    c: u(1),
  }
}

export const cloneKid = (n: KidNet): KidNet => ({ W: n.W.map((w) => [...w] as [number, number]), b: [...n.b], v: [...n.v], c: n.c })

export function forwardKid(net: KidNet, a: number, b: number) {
  const p: [number, number] = [scale(a), scale(b)]
  const h = net.W.map((w, j) => sig(w[0] * p[0] + w[1] * p[1] + net.b[j]))
  const out = sig(h.reduce((sum, hj, j) => sum + net.v[j] * hj, net.c))
  return { p, h, out }
}

export interface KidStep {
  h: number[]
  out: number
  target: number
  /** how wrong the boss was: target − answer */
  err: number
  /** each helper's share of the blame */
  blame: number[]
  before: KidNet
}

/** One correction from one motor: the boss fixes its own knobs, then passes blame back to the helpers. */
export function learnKid(net: KidNet, a: number, b: number, rate = 0.6): KidStep {
  const before = cloneKid(net)
  const { p, h, out } = forwardKid(net, a, b)
  const target = disagree(a, b) ? 1 : 0
  const err = target - out
  // a helper's blame: the boss's error, times how much the boss listens to it, times how movable the helper was
  const blame = h.map((hj, j) => err * net.v[j] * hj * (1 - hj))
  h.forEach((hj, j) => {
    net.v[j] += rate * err * hj
    net.W[j][0] += rate * blame[j] * p[0]
    net.W[j][1] += rate * blame[j] * p[1]
    net.b[j] += rate * blame[j]
  })
  net.c += rate * err
  return { h, out, target, err, blame, before }
}

/** How many of the 121 possible motors (A and B from 0 to 10) the network gets right. */
export function scoreKid(net: KidNet) {
  let right = 0
  for (let a = 0; a <= 10; a++) for (let b = 0; b <= 10; b++) if (forwardKid(net, a, b).out > 0.5 === disagree(a, b)) right++
  return right
}

/** A helper's line on the 0-10 map: where its worry is exactly half. Returned as wA·A + wB·B = k. */
export const helperLine = (net: KidNet, j: number) => ({ wa: net.W[j][0] / 5, wb: net.W[j][1] / 5, k: net.W[j][0] + net.W[j][1] - net.b[j] })
