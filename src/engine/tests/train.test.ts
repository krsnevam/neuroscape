import { describe, expect, it } from 'vitest'
import {
  autocorr,
  confusion,
  createNetwork,
  createSom,
  createTrainer,
  fitMinMax,
  gradient,
  lmStep,
  lossOn,
  normalize,
  rates,
  rng,
  roc,
  somStep,
  type Network,
  type Sample,
} from '..'

describe('backpropagation (Hagan Ch. 11 worked example, 1-2-1 network)', () => {
  const net = (): Network => ({
    layers: [
      { W: [[-0.27], [-0.41]], b: [-0.48, -0.13], f: 'logsig' },
      { W: [[0.09, -0.17]], b: [0.48], f: 'purelin' },
    ],
  })
  const sample: Sample = { p: [1], t: [1 + Math.sin(Math.PI / 4)] }

  it('gives the sensitivities s² = −2.522 and s¹ = [−0.0495, 0.0997]', () => {
    const g = gradient(net(), [sample])
    expect(g.b[1][0]).toBeCloseTo(-2.522, 3)
    expect(g.b[0][0]).toBeCloseTo(-0.0495, 3)
    expect(g.b[0][1]).toBeCloseTo(0.0997, 3)
  })

  it('updates the weights as in the book with α = 0.1', () => {
    const n = net()
    createTrainer(n).step([sample], { alpha: 0.1 })
    expect(n.layers[1].W[0][0]).toBeCloseTo(0.171, 3)
    expect(n.layers[1].W[0][1]).toBeCloseTo(-0.0772, 3)
    expect(n.layers[1].b[0]).toBeCloseTo(0.732, 3)
    expect(n.layers[0].W[0][0]).toBeCloseTo(-0.265, 3)
    expect(n.layers[0].W[1][0]).toBeCloseTo(-0.42, 3)
    expect(n.layers[0].b[0]).toBeCloseTo(-0.475, 3)
    expect(n.layers[0].b[1]).toBeCloseTo(-0.14, 3)
  })
})

describe('gradient', () => {
  it('matches a numerical derivative for every loss', () => {
    const cases = [
      { fns: ['tansig', 'purelin'] as const, loss: 'mse' as const, t: [0.3, -0.2] },
      { fns: ['tansig', 'logsig'] as const, loss: 'xent' as const, t: [1, 0] },
      { fns: ['tansig', 'purelin'] as const, loss: 'softmax' as const, t: [0, 1] },
    ]
    for (const c of cases) {
      const net = createNetwork(2, [3, 2], [...c.fns], { seed: 5 })
      const data: Sample[] = [{ p: [0.4, -0.7], t: c.t }]
      const g = gradient(net, data, c.loss)
      const h = 1e-6
      const w = net.layers[0].W[1][0]
      net.layers[0].W[1][0] = w + h
      const up = lossOn(net, data, c.loss)
      net.layers[0].W[1][0] = w - h
      const down = lossOn(net, data, c.loss)
      expect(g.W[0][1][0]).toBeCloseTo((up - down) / (2 * h), 5)
    }
  })
})

describe('Levenberg-Marquardt', () => {
  it('fits a sine far faster than steepest descent', () => {
    const data: Sample[] = Array.from({ length: 21 }, (_, i) => {
      const p = -2 + (4 * i) / 20
      return { p: [p / 2], t: [Math.sin((Math.PI * p) / 4)] }
    })
    const lm = createNetwork(1, [4, 1], ['tansig', 'purelin'], { seed: 3 })
    const sd = createNetwork(1, [4, 1], ['tansig', 'purelin'], { seed: 3 })
    const state = { mu: 0.01 }
    let fLm = 0
    for (let k = 0; k < 30; k++) fLm = lmStep(lm, data, state)
    const tr = createTrainer(sd)
    for (let k = 0; k < 30; k++) tr.step(data, { alpha: 0.1 })
    expect(fLm).toBeLessThan(1e-3)
    expect(fLm).toBeLessThan(lossOn(sd, data) / 10)
  })
})

describe('Kohonen rule', () => {
  it('moves the winner towards the input: w = [0.2, 0.6], p = [1, 0.2], α = 0.5 → [0.6, 0.4]', () => {
    const som = createSom(1, 2, (i) => (i === 0 ? [0.2, 0.6] : [-5, -5]))
    expect(somStep(som, [1, 0.2], 0.5, 0)).toBe(0)
    expect(som.w[0][0]).toBeCloseTo(0.6)
    expect(som.w[0][1]).toBeCloseTo(0.4)
    expect(som.w[1]).toEqual([-5, -5])
  })
})

describe('analysis helpers', () => {
  it('normalises to [−1, 1]', () => {
    expect(normalize(30, fitMinMax([20, 80]))).toBeCloseTo(-0.667, 3)
  })

  it('computes the confusion matrix rates', () => {
    // 100 sick, 900 healthy: 80 found, 90 false alarms
    const scores = [...Array(80).fill(0.9), ...Array(20).fill(0.1), ...Array(90).fill(0.9), ...Array(810).fill(0.1)]
    const labels = [...Array(100).fill(1), ...Array(900).fill(0)]
    const c = confusion(scores, labels, 0.5)
    expect(c).toEqual({ tp: 80, fn: 20, fp: 90, tn: 810 })
    const r = rates(c)
    expect(r.accuracy).toBeCloseTo(0.89)
    expect(r.sensitivity).toBeCloseTo(0.8)
    expect(r.specificity).toBeCloseTo(0.9)
    expect(r.precision).toBeCloseTo(80 / 170)
  })

  it('gives AUC 1 for a perfect ranking and about 0.5 for a random one', () => {
    expect(roc([0.9, 0.8, 0.2, 0.1], [1, 1, 0, 0]).auc).toBe(1)
    const rand = rng(7)
    const scores = Array.from({ length: 2000 }, () => rand())
    const labels = Array.from({ length: 2000 }, () => (rand() < 0.5 ? 1 : 0))
    expect(roc(scores, labels).auc).toBeGreaterThan(0.45)
    expect(roc(scores, labels).auc).toBeLessThan(0.55)
  })

  it('keeps white-noise autocorrelation inside ±2/√Q at most lags', () => {
    const rand = rng(11)
    const e = Array.from({ length: 400 }, () => rand() - 0.5)
    const r = autocorr(e, 20)
    expect(r[0]).toBeCloseTo(1)
    const outside = r.slice(1).filter((v) => Math.abs(v) > 2 / Math.sqrt(400)).length
    expect(outside).toBeLessThanOrEqual(3)
  })
})
