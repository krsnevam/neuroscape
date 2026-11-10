import { describe, expect, it } from 'vitest'
import {
  angleDeg,
  convergenceBound,
  countErrors,
  createPerceptron,
  perceptronOutput,
  perceptronStep,
  separatingLine,
  trainPerceptron,
  type Perceptron,
  type PSample,
} from '../perceptron'

/** Hagan, "Neural Network Design" (2nd ed.), Chapter 4: the test problem used to build the learning rule. */
describe('Hagan Ch. 4 test problem, no bias, w(0) = [1.0, −0.8]', () => {
  const samples: PSample[] = [
    { p: [1, 2], t: [1] },
    { p: [-1, 2], t: [0] },
    { p: [0, -1], t: [0] },
  ]
  const net: Perceptron = { W: [[1.0, -0.8]], b: [0] }

  it('p1 is misclassified (e = +1), so p1 is added: w = [2.0, 1.2]', () => {
    const r = perceptronStep(net, samples[0], 1, false)
    expect(r.a).toEqual([0])
    expect(r.e).toEqual([1])
    expect(net.W[0][0]).toBeCloseTo(2.0, 10)
    expect(net.W[0][1]).toBeCloseTo(1.2, 10)
  })
  it('p2 is misclassified (e = −1), so p2 is subtracted: w = [3.0, −0.8]', () => {
    const r = perceptronStep(net, samples[1], 1, false)
    expect(r.e).toEqual([-1])
    expect(net.W[0][0]).toBeCloseTo(3.0, 10)
    expect(net.W[0][1]).toBeCloseTo(-0.8, 10)
  })
  it('p3 is misclassified (e = −1), so p3 is subtracted: w = [3.0, 0.2]', () => {
    const r = perceptronStep(net, samples[2], 1, false)
    expect(r.e).toEqual([-1])
    expect(net.W[0][0]).toBeCloseTo(3.0, 10)
    expect(net.W[0][1]).toBeCloseTo(0.2, 10)
  })
  it('all three are now correct, the bias never moved, and a further pass changes nothing (e = 0)', () => {
    expect(net.b).toEqual([0])
    expect(countErrors(net, samples)).toBe(0)
    for (const s of samples) expect(perceptronStep(net, s, 1, false).changed).toBe(false)
    expect(net.W[0][0]).toBeCloseTo(3.0, 10)
    expect(net.W[0][1]).toBeCloseTo(0.2, 10)
  })
})

/** Hagan P4.3 / P4.5: four classes, two neurons, W(0) = I, b(0) = [1, 1]. */
describe('Hagan P4.5 four-class problem', () => {
  const samples: PSample[] = [
    { p: [1, 1], t: [0, 0] },
    { p: [1, 2], t: [0, 0] },
    { p: [2, -1], t: [0, 1] },
    { p: [2, 0], t: [0, 1] },
    { p: [-1, 2], t: [1, 0] },
    { p: [-2, 1], t: [1, 0] },
    { p: [-1, -1], t: [1, 1] },
    { p: [-2, -2], t: [1, 1] },
  ]
  const start = (): Perceptron => ({ W: [[1, 0], [0, 1]], b: [1, 1] })

  it('first iteration: e = [−1, −1], W(1) = [0 −1; −1 0], b(1) = [0, 0]', () => {
    const net = start()
    const r = perceptronStep(net, samples[0])
    expect(r.a).toEqual([1, 1])
    expect(r.e).toEqual([-1, -1])
    expect(net.W).toEqual([[0, -1], [-1, 0]])
    expect(net.b).toEqual([0, 0])
  })
  it('second iteration changes nothing; third gives W(3) = [−2 0; 1 −1], b(3) = [−1, 1]', () => {
    const net = start()
    perceptronStep(net, samples[0])
    expect(perceptronStep(net, samples[1]).changed).toBe(false)
    const r = perceptronStep(net, samples[2])
    expect(r.e).toEqual([-1, 1])
    expect(net.W).toEqual([[-2, 0], [1, -1]])
    expect(net.b).toEqual([-1, 1])
  })
  it('iterations 4 to 8 change nothing; the ninth (p1 again) has e = [0, −1] and gives W = [−2 0; 0 −2], b = [−1, 0]', () => {
    const net = start()
    for (let i = 0; i < 3; i++) perceptronStep(net, samples[i])
    for (let i = 3; i < 8; i++) expect(perceptronStep(net, samples[i]).changed).toBe(false)
    // Hand calculation: n = [−2·1 − 1, 1·1 − 1·1 + 1] = [−3, 1], a = [0, 1], e = [0, −1]
    const r = perceptronStep(net, samples[0])
    expect(r.n).toEqual([-3, 1])
    expect(r.e).toEqual([0, -1])
    expect(net.W).toEqual([[-2, 0], [0, -2]])
    expect(net.b).toEqual([-1, 0])
  })
  it('training stops there: W = [−2 0; 0 −2], b = [−1, 0] classifies all eight points', () => {
    const net = start()
    const r = trainPerceptron(net, samples, 50)
    expect(r.converged).toBe(true)
    expect(net.W).toEqual([[-2, 0], [0, -2]])
    expect(net.b).toEqual([-1, 0])
    for (const s of samples) expect(perceptronOutput(net, s.p)).toEqual(s.t)
  })
})

describe('Convergence and its limits', () => {
  const gate = (t: number[]) => [[0, 0], [0, 1], [1, 0], [1, 1]].map((p, i) => ({ p, t: t[i] }))

  it('AND is separable; the number of updates from zero weights stays under the bound', () => {
    const data = gate([0, 0, 0, 1])
    const line = separatingLine(data)
    expect(line).not.toBeNull()
    // Widest gap for AND is the line p1 + p2 = 1.5, margin 0.5/√2
    expect(line!.margin).toBeCloseTo(0.5 / Math.SQRT2, 6)
    const bound = convergenceBound([...line!.w, line!.b], data)!
    const net = createPerceptron(1, 2)
    const r = trainPerceptron(net, data.map((s) => ({ p: s.p, t: [s.t] })), 1000)
    expect(r.converged).toBe(true)
    expect(r.updates).toBeLessThanOrEqual(bound.bound)
  })
  it('hand check of the bound: x* = [1, 1, −1.5] on AND gives δ = 0.5, Π = 3, bound = 4.25·3/0.25 = 51', () => {
    const b = convergenceBound([1, 1, -1.5], gate([0, 0, 0, 1]))!
    expect(b.delta).toBeCloseTo(0.5, 10)
    expect(b.Pi).toBe(3)
    expect(b.bound).toBeCloseTo(51, 10)
  })
  it('XOR has no separating line and the rule never settles', () => {
    const data = gate([0, 1, 1, 0])
    expect(separatingLine(data)).toBeNull()
    const net = createPerceptron(1, 2)
    const r = trainPerceptron(net, data.map((s) => ({ p: s.p, t: [s.t] })), 500)
    expect(r.converged).toBe(false)
    expect(countErrors(net, data.map((s) => ({ p: s.p, t: [s.t] })))).toBeGreaterThan(0)
  })
  it('a vector that is not a solution has no bound', () => {
    expect(convergenceBound([1, 1, -1.5], gate([0, 1, 1, 0]))).toBeNull()
  })
  it('angle between vectors', () => {
    expect(angleDeg([1, 0], [0, 2])).toBeCloseTo(90, 10)
    expect(angleDeg([1, 1], [2, 2])).toBeCloseTo(0, 5)
    expect(angleDeg([1, 0], [1, 1])).toBeCloseTo(45, 10)
  })
})
