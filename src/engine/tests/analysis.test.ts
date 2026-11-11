import { describe, expect, it } from 'vitest'
import {
  createSom,
  createStopRun,
  crosscorr,
  distinctNeurons,
  gauss,
  gradient,
  gradNorm,
  initNetwork,
  nearest,
  regression,
  rng,
  umatrix,
  type Sample,
} from '..'

describe('regression between targets and outputs', () => {
  it('gives m = 1, c = 0, R = 1 for a perfect fit', () => {
    const t = [1, 2, 3, 4]
    const r = regression(t, t)
    expect(r.m).toBeCloseTo(1, 12)
    expect(r.c).toBeCloseTo(0, 12)
    expect(r.r).toBeCloseTo(1, 12)
  })

  it('matches a hand calculation', () => {
    // t = 1,2,3  a = 2,2,5: S_tt = 2, S_ta = 3, S_aa = 6 → m = 1.5, c = 0, R = 3/√12
    const r = regression([1, 2, 3], [2, 2, 5])
    expect(r.m).toBeCloseTo(1.5, 12)
    expect(r.c).toBeCloseTo(0, 12)
    expect(r.r).toBeCloseTo(3 / Math.sqrt(12), 12)
  })

  it('gives R = −1 when outputs fall as targets rise, and 0 for a flat output', () => {
    expect(regression([1, 2, 3], [3, 2, 1]).r).toBeCloseTo(-1, 12)
    expect(regression([1, 2, 3], [5, 5, 5]).r).toBe(0)
  })
})

describe('SOM distance matrix', () => {
  it('is zero on a map whose neurons all hold the same weights', () => {
    expect(umatrix(createSom(3, 3, () => [0.2, 0.4]))).toEqual(new Array(9).fill(0))
  })

  it('is largest along the border between two clusters', () => {
    // 1 × 4 map: two neurons at 0, two at 1. Mean neighbour distances: 0, 0.5, 0.5, 0
    const u = umatrix(createSom(1, 4, (i) => [i < 2 ? 0 : 1]))
    expect(u).toEqual([0, 0.5, 0.5, 0])
  })

  it('averages over the neighbours a neuron actually has', () => {
    // 2 × 2 map with weights 0,1 / 2,4: the corner 0 has neighbours 1 and 2 → (1 + 2) / 2
    const u = umatrix(createSom(2, 2, (i) => [[0, 1, 2, 4][i]]))
    expect(u).toEqual([1.5, 2, 2, 2.5])
  })
})

describe('input-error cross-correlation', () => {
  const rand = rng(3)
  const p = Array.from({ length: 400 }, () => gauss(rand))

  it('is 1 at the lag where the error is a copy of the input, and small elsewhere', () => {
    const e = p.map((_, t) => (t >= 3 ? p[t - 3] : 0))
    const r = crosscorr(p, e, 6)
    expect(r[3]).toBeGreaterThan(0.97)
    for (const tau of [0, 1, 2, 4, 5, 6]) expect(Math.abs(r[tau])).toBeLessThan(0.2)
  })

  it('stays near the ±2/√Q band for unrelated noise', () => {
    const e = Array.from({ length: 400 }, () => gauss(rand))
    const r = crosscorr(p, e, 10)
    expect(r.filter((v) => Math.abs(v) > 2 / Math.sqrt(400)).length).toBeLessThanOrEqual(2)
  })

  it('returns zeros for a constant sequence', () => {
    expect(crosscorr([1, 1, 1, 1], [1, 2, 3, 4], 2)).toEqual([0, 0, 0])
  })
})

describe('novelty distance', () => {
  it('is the gap to the closest training input', () => {
    expect(nearest(7, [1, 2, 5.5])).toBe(1.5)
    expect(nearest(2, [1, 2, 5.5])).toBe(0)
    expect(nearest(2, [])).toBe(Infinity)
  })
})

describe('weight initialisation', () => {
  const rand = rng(11)
  const data: Sample[] = Array.from({ length: 24 }, (_, i) => {
    const p = -1 + (2 * i) / 23
    return { p: [p], t: [Math.exp(-((p - 0.3) ** 2) / 0.2) - 0.5 + gauss(rand) * 0.05] }
  })
  const opts = { alpha: 0.3, gamma: 0.9, maxIt: 1500, goal: 0, minGrad: 1e-4, patience: 0 }

  it('all zero: every gradient is exactly zero except the output bias', () => {
    const g = gradient(initNetwork(1, 5, 'zero'), data)
    expect(g.W[0].flat().every((v) => v === 0)).toBe(true)
    expect(g.b[0].every((v) => v === 0)).toBe(true)
    expect(g.W[1].flat().every((v) => v === 0)).toBe(true)
    expect(Math.abs(g.b[1][0])).toBeGreaterThan(0)
  })

  it('all zero: training only moves the output bias to the mean target, then stops on a zero gradient', () => {
    const run = createStopRun(initNetwork(1, 5, 'zero'), data, [], opts)
    run.step(1500)
    expect(run.stopped).toBe('gradient')
    expect(run.net.layers[0].W.flat().every((v) => v === 0)).toBe(true)
    const mean = data.reduce((s, d) => s + d.t[0], 0) / data.length
    expect(run.net.layers[1].b[0]).toBeCloseTo(mean, 3)
  })

  it('all equal: the hidden neurons stay exact copies of each other through training', () => {
    const run = createStopRun(initNetwork(1, 5, 'equal'), data, [], opts)
    run.step(1500)
    expect(distinctNeurons(run.net, 0)).toBe(1)
    expect(run.net.layers[0].W[0][0]).not.toBe(0.3)
  })

  it('small random and Nguyen-Widrow: neurons differ and the fit is far better', () => {
    const equal = createStopRun(initNetwork(1, 5, 'equal'), data, [], opts)
    equal.step(1500)
    for (const scheme of ['random', 'nw'] as const) {
      const run = createStopRun(initNetwork(1, 5, scheme, 2), data, [], opts)
      run.step(1500)
      expect(distinctNeurons(run.net)).toBe(5)
      expect(run.trainLoss).toBeLessThan(0.5 * equal.trainLoss)
    }
  })

  it('Nguyen-Widrow sets each hidden weight row to magnitude 0.7·S^(1/R) with the bias inside ±‖w‖', () => {
    const net = initNetwork(2, 9, 'nw', 4)
    for (let i = 0; i < 9; i++) {
      const len = Math.hypot(...net.layers[0].W[i])
      expect(len).toBeCloseTo(0.7 * Math.sqrt(9), 10)
      expect(Math.abs(net.layers[0].b[i])).toBeLessThanOrEqual(len)
    }
  })
})

describe('stopping criteria', () => {
  const data: Sample[] = [-1, -0.5, 0, 0.5, 1].map((p) => ({ p: [p], t: [0.5 * p] }))
  const base = { alpha: 0.3, gamma: 0.8, maxIt: 400, goal: 0, minGrad: 1e-9, patience: 0 }

  it('stops at the maximum number of iterations', () => {
    const run = createStopRun(initNetwork(1, 3, 'random'), data, [], { ...base, maxIt: 25 })
    run.step(1000)
    expect(run.stopped).toBe('maxit')
    expect(run.its).toBe(25)
  })

  it('stops when the performance goal is met', () => {
    const run = createStopRun(initNetwork(1, 3, 'random'), data, [], { ...base, maxIt: 5000, goal: 1e-3 })
    run.step(5000)
    expect(run.stopped).toBe('goal')
    expect(run.trainLoss).toBeLessThanOrEqual(1e-3)
  })

  it('stops when the validation error stops improving and keeps the best weights', () => {
    // Validation targets contradict the training targets, so validation error rises as training proceeds
    const val: Sample[] = data.map((d) => ({ p: d.p, t: [-d.t[0]] }))
    const run = createStopRun(initNetwork(1, 3, 'random'), data, val, { ...base, maxIt: 5000, patience: 20 })
    run.step(5000)
    expect(run.stopped).toBe('validation')
    expect(run.its - run.bestAt).toBe(20)
    expect(run.bestVal).toBeLessThan(run.valLoss)
  })

  it('reports the gradient length', () => {
    const net = initNetwork(1, 3, 'random')
    expect(gradNorm(gradient(net, data))).toBeGreaterThan(0)
  })
})
