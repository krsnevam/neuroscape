import { describe, expect, it } from 'vitest'
import { forward, layerForward, neuron, singleInputNeuron, transferFns } from '../index'

/**
 * Checks against worked problems in Hagan, Demuth, Beale & De Jesús,
 * "Neural Network Design" (2nd ed.), Chapter 2 Solved Problems.
 */
describe('Hagan P2.1 — single-input neuron, w = 2.3, p = 2, b = −3', () => {
  const w = 2.3, p = 2, b = -3

  it('net input n = 1.6', () => {
    expect(singleInputNeuron(w, p, b, 'purelin').n).toBeCloseTo(1.6, 10)
  })
  it('hardlim → a = 1', () => {
    expect(singleInputNeuron(w, p, b, 'hardlim').a).toBe(1)
  })
  it('purelin → a = 1.6', () => {
    expect(singleInputNeuron(w, p, b, 'purelin').a).toBeCloseTo(1.6, 10)
  })
  it('logsig → a = 0.8320', () => {
    expect(singleInputNeuron(w, p, b, 'logsig').a).toBeCloseTo(0.832, 4)
  })
  it('tansig → a = 0.9217', () => {
    expect(singleInputNeuron(w, p, b, 'tansig').a).toBeCloseTo(0.9217, 4)
  })
})

describe('Hagan P2.3 — two-input neuron, W = [3 2], b = 1.2, p = [−5; 6]', () => {
  const W = [3, 2], b = 1.2, p = [-5, 6]

  it('net input n = −1.8', () => {
    expect(neuron(W, p, b, 'purelin').n).toBeCloseTo(-1.8, 10)
  })
  it('hardlims → a = −1', () => {
    expect(neuron(W, p, b, 'hardlims').a).toBe(-1)
  })
  it('satlin → a = 0', () => {
    expect(neuron(W, p, b, 'satlin').a).toBe(0)
  })
  it('tansig → a = −0.9468', () => {
    expect(neuron(W, p, b, 'tansig').a).toBeCloseTo(-0.9468, 4)
  })
})

describe('Transfer functions (Hagan Table 2.1)', () => {
  it('step functions switch at n = 0 (inclusive)', () => {
    expect(transferFns.hardlim.f(0)).toBe(1)
    expect(transferFns.hardlims.f(0)).toBe(1)
    expect(transferFns.hardlim.f(-1e-9)).toBe(0)
  })
  it('saturating functions clip', () => {
    expect(transferFns.satlins.f(-3)).toBe(-1)
    expect(transferFns.satlins.f(0.4)).toBe(0.4)
    expect(transferFns.satlin.f(7)).toBe(1)
    expect(transferFns.poslin.f(-2)).toBe(0)
  })
  it('sigmoid derivatives match numerical derivative', () => {
    for (const name of ['logsig', 'tansig'] as const) {
      const t = transferFns[name]
      for (const n of [-2, -0.5, 0, 0.7, 3]) {
        const h = 1e-6
        const numeric = (t.f(n + h) - t.f(n - h)) / (2 * h)
        expect(t.df(n)).toBeCloseTo(numeric, 6)
      }
    }
  })
})

describe('Layer and multilayer forward pass', () => {
  it('layer: n = Wp + b', () => {
    const out = layerForward(
      { W: [[1, 2], [-1, 0.5]], b: [0.5, -1], f: 'purelin' },
      [2, 4],
    )
    expect(out.n).toEqual([10.5, -1])
    expect(out.a).toEqual([10.5, -1])
  })

  // Hagan Ch. 11 backprop example (Fig. 11.8 initial weights): 1-2-1 network,
  // W¹ = [−0.27; −0.41], b¹ = [−0.48; −0.13], W² = [0.09 −0.17], b² = 0.48, p = 1
  // → a¹ = [0.321; 0.368], a² = 0.446
  it('Hagan Ch.11 1-2-1 example: a¹ = [0.321; 0.368], a² = 0.446', () => {
    const trace = forward(
      {
        layers: [
          { W: [[-0.27], [-0.41]], b: [-0.48, -0.13], f: 'logsig' },
          { W: [[0.09, -0.17]], b: [0.48], f: 'purelin' },
        ],
      },
      [1],
    )
    expect(trace.layers[0].a[0]).toBeCloseTo(0.321, 3)
    expect(trace.layers[0].a[1]).toBeCloseTo(0.368, 3)
    expect(trace.a[0]).toBeCloseTo(0.446, 3)
  })
})
