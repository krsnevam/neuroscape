import { describe, expect, it } from 'vitest'
import {
  backward,
  cloneNet,
  createTrainer,
  decode,
  encode,
  evaluate,
  forward,
  lossOf,
  makeData,
  randomNet,
  softmax,
  trainEpoch,
  trainedNet,
  type Net,
} from '../../scenes/journey/sim'

describe('the journey of a signal', { timeout: 60000 }, () => {
  const data = makeData()

  it('logs all three conditions in the data', () => {
    const counts = [0, 1, 2].map((k) => data.filter((m) => m.label === k).length)
    for (const c of counts) expect(c).toBeGreaterThan(20)
  })

  it('encodes each sensor range as -1 to 1', () => {
    expect(encode([0, 110])).toEqual([-1, 1])
    expect(encode([5, 92.5])).toEqual([0, 0.5])
  })

  it('turns scores into probabilities that sum to one and keep their order', () => {
    const a = softmax([2, 1, -1])
    expect(a.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 12)
    expect(a[0]).toBeGreaterThan(a[1])
    expect(a[1]).toBeGreaterThan(a[2])
    expect(decode(a).k).toBe(0)
  })

  it('backpropagation matches the slope measured by nudging each weight', () => {
    for (const act of ['tansig', 'logsig', 'linear'] as const) {
      const net = randomNet(5, act)
      const p = encode([6.2, 68])
      const t = 1
      const g = backward(net, forward(net, p), t)
      const h = 1e-6
      const slope = (bump: (n: Net, d: number) => void) => {
        const up = cloneNet(net)
        const down = cloneNet(net)
        bump(up, h)
        bump(down, -h)
        return (lossOf(forward(up, p).a2, t) - lossOf(forward(down, p).a2, t)) / (2 * h)
      }
      for (let j = 0; j < 4; j++) {
        for (let i = 0; i < 2; i++) expect(g.W1[j][i]).toBeCloseTo(slope((n, d) => (n.W1[j][i] += d)), 6)
        expect(g.b1[j]).toBeCloseTo(slope((n, d) => (n.b1[j] += d)), 6)
        for (let k = 0; k < 3; k++) expect(g.W2[k][j]).toBeCloseTo(slope((n, d) => (n.W2[k][j] += d)), 6)
      }
      for (let k = 0; k < 3; k++) expect(g.b2[k]).toBeCloseTo(slope((n, d) => (n.b2[k] += d)), 6)
    }
  })

  it('starts out guessing and learns to judge the motor', () => {
    const before = evaluate(randomNet(), data)
    expect(before.acc).toBeLessThan(0.6)
    const tr = createTrainer(randomNet())
    for (let e = 0; e < 1500; e++) trainEpoch(tr, data)
    const after = tr.history[tr.history.length - 1]
    expect(after.loss).toBeLessThan(before.loss / 3)
    expect(after.acc).toBeGreaterThan(0.9)
    // loss falls overall
    expect(tr.history[1499].loss).toBeLessThan(tr.history[100].loss)
  })

  it('needs a curved activation: a linear hidden layer does clearly worse', () => {
    const curved = evaluate(trainedNet(data, 'tansig'), data)
    const straight = evaluate(trainedNet(data, 'linear'), data)
    expect(curved.acc).toBeGreaterThan(straight.acc + 0.08)
  })

  it('gives the right answer for clear cases and stays confident far outside the data', () => {
    const net = trainedNet(data)
    expect(decode(forward(net, encode([1.2, 55])).a2).label).toBe('Healthy')
    expect(decode(forward(net, encode([5, 84])).a2).label).toBe('Service soon')
    expect(decode(forward(net, encode([8.6, 70])).a2).label).toBe('Stop now')
    // a reading no working sensor could give still gets a confident label
    expect(decode(forward(net, encode([12.5, 22])).a2).confidence).toBeGreaterThan(0.9)
  })
})
