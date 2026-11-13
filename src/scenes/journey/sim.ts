/**
 * The network behind "The Journey of a Signal": a 2-4-3 classifier that sorts mangoes into
 * Unripe, Ripe and Overripe from two measurements. It is written out longhand (no matrix
 * library) so every intermediate number the lesson shows comes straight from these functions.
 *
 * Notation follows Hagan: p input, W weights, b bias, n net input, a output, s sensitivity.
 */
export type Act = 'tansig' | 'logsig' | 'relu' | 'linear'

export const CLASSES = ['Unripe', 'Ripe', 'Overripe'] as const
export const HIDDEN = 4

export interface Net {
  W1: number[][] // HIDDEN x 2
  b1: number[]
  W2: number[][] // 3 x HIDDEN
  b2: number[]
  act: Act
}

export interface Mango {
  /** 0 = deep green, 10 = deep yellow with dark patches */
  colour: number
  /** 0 = rock hard, 10 = very soft */
  soft: number
  label: number
}

export const actFn: Record<Act, { f: (n: number) => number; d: (n: number, a: number) => number; name: string; formula: string }> = {
  tansig: { f: Math.tanh, d: (_n, a) => 1 - a * a, name: 'Tan-sigmoid', formula: 'a = tanh(n)' },
  logsig: { f: (n) => 1 / (1 + Math.exp(-n)), d: (_n, a) => a * (1 - a), name: 'Log-sigmoid', formula: 'a = 1 / (1 + e⁻ⁿ)' },
  relu: { f: (n) => Math.max(0, n), d: (n) => (n > 0 ? 1 : 0), name: 'ReLU', formula: 'a = max(0, n)' },
  linear: { f: (n) => n, d: () => 1, name: 'Linear', formula: 'a = n' },
}

/** Seeded random numbers, so the lesson is the same every time it is opened. */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Encoding: a 0 to 10 measurement becomes a number from −1 to 1. */
export const normalise = (x: number) => (x - 5) / 5
export const encode = (colour: number, soft: number): [number, number] => [normalise(colour), normalise(soft)]

/** How a fruit seller would label a mango. Too soft or too dark: overripe. Yellow enough and yielding: ripe. */
export function trueLabel(colour: number, soft: number) {
  if (soft > 7 || colour > 8.5) return 2
  if (colour >= 4 && soft >= 3) return 1
  return 0
}

/** Mangoes measured and labelled by hand. A little measurement noise blurs the borders. */
export function makeData(count = 180, seed = 11): Mango[] {
  const r = rng(seed)
  const gauss = () => (r() + r() + r() + r() - 2) * 0.87
  return Array.from({ length: count }, () => {
    const colour = r() * 10
    const soft = r() * 10
    return { colour, soft, label: trueLabel(colour + gauss() * 0.3, soft + gauss() * 0.3) }
  })
}

export function randomNet(seed = 3, act: Act = 'tansig'): Net {
  const r = rng(seed)
  const u = (k: number) => (r() * 2 - 1) * k
  return {
    W1: Array.from({ length: HIDDEN }, () => [u(1.2), u(1.2)]),
    b1: Array.from({ length: HIDDEN }, () => u(0.6)),
    W2: Array.from({ length: 3 }, () => Array.from({ length: HIDDEN }, () => u(0.8))),
    b2: [u(0.3), u(0.3), u(0.3)],
    act,
  }
}

export const cloneNet = (n: Net): Net => ({ W1: n.W1.map((r) => [...r]), b1: [...n.b1], W2: n.W2.map((r) => [...r]), b2: [...n.b2], act: n.act })

export function softmax(n: number[]) {
  const m = Math.max(...n)
  const e = n.map((v) => Math.exp(v - m))
  const sum = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / sum)
}

export interface Pass {
  p: [number, number]
  n1: number[]
  a1: number[]
  n2: number[]
  a2: number[]
}

/** One forward pass, keeping every intermediate value. */
export function forward(net: Net, p: [number, number]): Pass {
  const { f } = actFn[net.act]
  const n1 = net.W1.map((w, i) => w[0] * p[0] + w[1] * p[1] + net.b1[i])
  const a1 = n1.map(f)
  const n2 = net.W2.map((w, k) => w.reduce((sum, wkj, j) => sum + wkj * a1[j], net.b2[k]))
  return { p, n1, a1, n2, a2: softmax(n2) }
}

/** Decoding: the largest probability names the class; below `sure` the honest answer is "not sure". */
export function decode(a2: number[], sure = 0.6) {
  let k = 0
  for (let i = 1; i < a2.length; i++) if (a2[i] > a2[k]) k = i
  return { k, label: CLASSES[k], confidence: a2[k], confident: a2[k] >= sure }
}

/** Cross-entropy for one example: minus the log of the probability given to the true class. */
export const lossOf = (a2: number[], t: number) => -Math.log(Math.max(1e-12, a2[t]))

export interface Grads {
  s2: number[]
  s1: number[]
  W1: number[][]
  b1: number[]
  W2: number[][]
  b2: number[]
}

/** Backpropagation for one example: sensitivities first, then the slope for every weight. */
export function backward(net: Net, pass: Pass, t: number): Grads {
  const { d } = actFn[net.act]
  // softmax with cross-entropy: the output sensitivity is simply a − t
  const s2 = pass.a2.map((a, k) => a - (k === t ? 1 : 0))
  // each hidden neuron collects blame through the weights it feeds, scaled by its own slope
  const s1 = pass.n1.map((n, j) => d(n, pass.a1[j]) * s2.reduce((sum, s, k) => sum + net.W2[k][j] * s, 0))
  return {
    s2,
    s1,
    W2: s2.map((s) => pass.a1.map((a) => s * a)),
    b2: [...s2],
    W1: s1.map((s) => [s * pass.p[0], s * pass.p[1]]),
    b1: [...s1],
  }
}

const zeroLike = (net: Net): Omit<Grads, 's1' | 's2'> => ({
  W1: net.W1.map(() => [0, 0]),
  b1: net.b1.map(() => 0),
  W2: net.W2.map((r) => r.map(() => 0)),
  b2: net.b2.map(() => 0),
})

/** Steepest descent: move every weight a little against its slope. Changes `net` in place. */
export function applyStep(net: Net, g: Omit<Grads, 's1' | 's2'>, alpha: number) {
  net.W1.forEach((r, j) => r.forEach((_, i) => (r[i] -= alpha * g.W1[j][i])))
  net.b1.forEach((_, j) => (net.b1[j] -= alpha * g.b1[j]))
  net.W2.forEach((r, k) => r.forEach((_, j) => (r[j] -= alpha * g.W2[k][j])))
  net.b2.forEach((_, k) => (net.b2[k] -= alpha * g.b2[k]))
}

export interface Trainer {
  net: Net
  velocity: Omit<Grads, 's1' | 's2'>
  epoch: number
  history: { loss: number; acc: number }[]
}

export const createTrainer = (net: Net): Trainer => ({ net, velocity: zeroLike(net), epoch: 0, history: [] })

/** One pass over all the mangoes: average the slopes, then step with momentum. */
export function trainEpoch(tr: Trainer, data: Mango[], alpha = 0.6, gamma = 0.9) {
  const sum = zeroLike(tr.net)
  for (const m of data) {
    const g = backward(tr.net, forward(tr.net, encode(m.colour, m.soft)), m.label)
    sum.W1.forEach((r, j) => r.forEach((_, i) => (r[i] += g.W1[j][i])))
    sum.b1.forEach((_, j) => (sum.b1[j] += g.b1[j]))
    sum.W2.forEach((r, k) => r.forEach((_, j) => (r[j] += g.W2[k][j])))
    sum.b2.forEach((_, k) => (sum.b2[k] += g.b2[k]))
  }
  const q = data.length
  const v = tr.velocity
  const blend = (old: number, grad: number) => gamma * old + (1 - gamma) * (grad / q)
  v.W1.forEach((r, j) => r.forEach((_, i) => (r[i] = blend(r[i], sum.W1[j][i]))))
  v.b1.forEach((_, j) => (v.b1[j] = blend(v.b1[j], sum.b1[j])))
  v.W2.forEach((r, k) => r.forEach((_, j) => (r[j] = blend(r[j], sum.W2[k][j]))))
  v.b2.forEach((_, k) => (v.b2[k] = blend(v.b2[k], sum.b2[k])))
  applyStep(tr.net, v, alpha)
  tr.epoch++
  const score = evaluate(tr.net, data)
  tr.history.push(score)
  return score
}

export function evaluate(net: Net, data: Mango[]) {
  let loss = 0
  let right = 0
  for (const m of data) {
    const { a2 } = forward(net, encode(m.colour, m.soft))
    loss += lossOf(a2, m.label)
    if (decode(a2).k === m.label) right++
  }
  return { loss: loss / data.length, acc: right / data.length }
}

/** A network trained to completion, for "skip to the trained weights". */
export function trainedNet(data: Mango[], act: Act = 'tansig', seed = 3, epochs = 1500): Net {
  const tr = createTrainer(randomNet(seed, act))
  for (let e = 0; e < epochs; e++) trainEpoch(tr, data)
  return tr.net
}

/** Where a hidden neuron's net input is zero: the line w₁p₁ + w₂p₂ + b = 0, as two points in 0-10 units. */
export function boundaryLine(w: number[], b: number): [[number, number], [number, number]] | null {
  const pts: [number, number][] = []
  const raw = (pn: number) => pn * 5 + 5
  if (Math.abs(w[1]) > 1e-9) {
    for (const p1 of [-1.4, 1.4]) pts.push([raw(p1), raw((-b - w[0] * p1) / w[1])])
  } else if (Math.abs(w[0]) > 1e-9) {
    const p1 = -b / w[0]
    pts.push([raw(p1), raw(-1.4)], [raw(p1), raw(1.4)])
  } else return null
  return [pts[0], pts[1]]
}

/** True when a measurement lies outside anything the training mangoes covered. */
export const outsideData = (colour: number, soft: number) => colour < 0 || colour > 10 || soft < 0 || soft > 10
