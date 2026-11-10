import { describe, expect, it } from 'vitest'
import { hammingFeedforward, hammingRecurrentStep, hammingRun } from '../hamming'
import {
  energy,
  haganHopfield,
  hebbWeights,
  hopfieldRun,
  hopfieldStep,
  isStable,
  overlap,
  sweep,
  updateNeuron,
} from '../hopfield'
import { collapseLinear, paramTerms } from '../architecture'
import { createNetwork, forward } from '../network'
import { paramCount } from '../train'
import { rng } from '../neuron'

/**
 * Hagan, "Neural Network Design", Chapter 3: prototypes orange p₁ = [1 −1 −1]ᵀ and
 * apple p₂ = [1 1 −1]ᵀ, tested with the oblong orange p = [−1 −1 −1]ᵀ.
 */
const orange = [1, -1, -1]
const apple = [1, 1, -1]
const oblong = [-1, -1, -1]

const close = (got: number[], want: number[]) => got.forEach((v, i) => expect(v).toBeCloseTo(want[i], 10))

describe('Hagan Ch. 3 Hamming network, oblong orange', () => {
  it('feedforward layer gives a¹ = [4, 2]', () => {
    close(hammingFeedforward([orange, apple], oblong), [4, 2])
  })
  it('recurrent layer with ε = 0.5 gives a²(1) = [3, 0] and stays there', () => {
    const a1 = hammingRecurrentStep([4, 2], 0.5)
    close(a1, [3, 0])
    close(hammingRecurrentStep(a1, 0.5), [3, 0])
  })
  it('the orange neuron wins', () => {
    const run = hammingRun([orange, apple], oblong, 0.5)
    expect(run.winner).toBe(0)
    expect(run.settled).toBe(true)
  })
  it('an input halfway between the prototypes has no winner', () => {
    const run = hammingRun([orange, apple], [1, 0, -1], 0.5, 60)
    close(run.a1, [5, 5])
    close(run.history[1], [2.5, 2.5])
    expect(run.winner).toBe(-1)
  })
  it('feedforward score is twice the number of matching elements', () => {
    close(hammingFeedforward([orange, apple], orange), [6, 4])
  })
})

describe('Hagan Ch. 3 Hopfield network, oblong orange', () => {
  const { W, b } = haganHopfield
  it('a(1) = [0.7, −1, −1], a(2) = a(3) = [1, −1, −1]', () => {
    const a1 = hopfieldStep(W, b, oblong)
    close(a1, [0.7, -1, -1])
    const a2 = hopfieldStep(W, b, a1)
    close(a2, [1, -1, -1])
    close(hopfieldStep(W, b, a2), [1, -1, -1])
  })
  it('converges to the orange prototype', () => {
    const run = hopfieldRun(W, b, oblong)
    expect(run.settled).toBe(true)
    close(run.history[run.history.length - 1], orange)
  })
  it('an input halfway between the prototypes never moves', () => {
    close(hopfieldStep(W, b, [1, 0, -1]), [1, 0, -1])
  })
})

describe('Hebb-rule Hopfield memory', () => {
  // Hand calculation: one pattern p = [1, −1, 1, −1], N = 4
  const p = [1, -1, 1, -1]
  const W = hebbWeights([p])
  it('W = (1/N) p pᵀ with zero diagonal', () => {
    expect(W[0]).toEqual([0, -0.25, 0.25, -0.25])
    expect(W[1]).toEqual([-0.25, 0, -0.25, 0.25])
  })
  it('E(p) = −½ pᵀWp = −(N−1)/2 = −1.5', () => {
    expect(energy(W, p)).toBeCloseTo(-1.5, 10)
  })
  it('the stored pattern and its negative are stable', () => {
    expect(isStable(W, p)).toBe(true)
    expect(isStable(W, p.map((v) => -v))).toBe(true)
  })
  it('one flipped element is repaired, and the energy falls from 0 to −1.5', () => {
    const a = [1, 1, 1, -1]
    expect(energy(W, a)).toBeCloseTo(0, 10)
    expect(updateNeuron(W, a, 1)).toBe(true)
    expect(a).toEqual(p)
    expect(energy(W, a)).toBeCloseTo(-1.5, 10)
  })
  it('energy never rises during one-at-a-time recall of 64-element patterns', () => {
    const rand = rng(9)
    const pats = Array.from({ length: 5 }, () => Array.from({ length: 64 }, () => (rand() < 0.5 ? -1 : 1)))
    const W64 = hebbWeights(pats)
    const a = pats[0].map((v) => (rand() < 0.2 ? -v : v))
    let e = energy(W64, a)
    const order = Array.from({ length: 64 }, (_, i) => i)
    for (let s = 0; s < 6; s++)
      for (const i of order) {
        updateNeuron(W64, a, i)
        const e2 = energy(W64, a)
        expect(e2).toBeLessThanOrEqual(e + 1e-12)
        e = e2
      }
    expect(overlap(a, pats[0])).toBe(1)
    expect(sweep(W64, a, order)).toBe(0)
  })
})

describe('architecture helpers', () => {
  it('parameter count of a 3-4-2 network is 4(3+1) + 2(4+1) = 26', () => {
    const terms = paramTerms(3, [4, 2])
    expect(terms.map((t) => t.count)).toEqual([16, 10])
    const net = createNetwork(3, [4, 2], ['tansig', 'purelin'])
    expect(paramCount(net)).toBe(26)
  })
  it('three linear layers collapse to one layer with the same output', () => {
    const net = createNetwork(3, [4, 2, 3], ['purelin', 'purelin', 'purelin'], { seed: 4, range: 1 })
    const one = collapseLinear(net)!
    const p = [0.3, -0.8, 0.5]
    const deep = forward(net, p).a
    const flat = one.W.map((row, i) => row.reduce((s, w, j) => s + w * p[j], one.b[i]))
    close(flat, deep)
    expect(one.W.length).toBe(3)
    expect(one.W[0].length).toBe(3)
  })
  it('a network with a non-linear layer does not collapse', () => {
    expect(collapseLinear(createNetwork(2, [2, 1], ['tansig', 'purelin']))).toBeNull()
  })
})
