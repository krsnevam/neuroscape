import { describe, expect, it } from 'vitest'
import {
  associatorOutput,
  hebbMax,
  hebbStep,
  instarOutput,
  instarStep,
  kohonenStep,
  outstarOutput,
  outstarStep,
} from '../associative'
import {
  compet,
  competitiveStep,
  competitiveWinner,
  createCompetitiveLayer,
  hammingCompete,
  hammingFeedforward,
} from '../competitive'
import { lvqClassify, lvqRank, lvqStep, type Lvq } from '../lvq'
import { leastSquares, rbfHidden, rbfOutput, rbfSolveOutput, solve } from '../rbf'

/**
 * Checks against worked examples in Hagan, Demuth, Beale & De Jesús, "Neural Network Design":
 * the associative learning, competitive networks and radial basis networks chapters.
 */
describe('Hagan banana associator: unsupervised Hebb rule, w0 = 1, b = −0.5, α = 1', () => {
  const w0 = 1, b = -0.5, alpha = 1
  // The sight sensor works only on alternate trials; the smell is always present
  const seq = [{ p0: 0, p: 1 }, { p0: 1, p: 1 }, { p0: 0, p: 1 }]

  it('w goes 0 → 0 → 1 → 2 and the response to smell alone appears on trial 3', () => {
    let w = 0
    const ws: number[] = []
    const as: number[] = []
    for (const s of seq) {
      const { a } = associatorOutput(w0, s.p0, w, s.p, b)
      w = hebbStep(w, a, s.p, alpha)
      as.push(a)
      ws.push(w)
    }
    expect(as).toEqual([0, 1, 1])
    expect(ws).toEqual([0, 1, 2])
  })

  it('with decay γ = 0.1 the weight goes 0 → 1 → 1.9 and can never pass α/γ = 10', () => {
    let w = 0
    const ws: number[] = []
    for (const s of seq) {
      const { a } = associatorOutput(w0, s.p0, w, s.p, b)
      w = hebbStep(w, a, s.p, alpha, 0.1)
      ws.push(w)
    }
    expect(ws[0]).toBe(0)
    expect(ws[1]).toBeCloseTo(1, 10)
    expect(ws[2]).toBeCloseTo(1.9, 10)
    expect(hebbMax(1, 0.1)).toBeCloseTo(10, 10)
    for (let q = 0; q < 500; q++) w = hebbStep(w, 1, 1, alpha, 0.1)
    expect(w).toBeCloseTo(10, 6)
  })

  it('with decay the weight forgets when nothing is presented: 10% lost per trial', () => {
    expect(hebbStep(2, 0, 0, 1, 0.1)).toBeCloseTo(1.8, 10)
  })
})

describe('Hagan orange recogniser: instar rule, w0 = 3, b = −2, α = 1, p = [1 −1 −1]', () => {
  const w0 = 3, b = -2, alpha = 1
  const p = [1, -1, -1]

  it('trial 1 (fruit not seen): a = 0 and the weights stay at 0', () => {
    const w = [0, 0, 0]
    const { a } = instarOutput(w0, 0, w, p, b)
    expect(a).toBe(0)
    expect(instarStep(w, p, a, alpha)).toEqual([0, 0, 0])
  })

  it('trial 2 (fruit seen): a = 1 and w becomes the measurement vector', () => {
    const { a } = instarOutput(w0, 1, [0, 0, 0], p, b)
    expect(a).toBe(1)
    expect(instarStep([0, 0, 0], p, a, alpha)).toEqual([1, -1, -1])
  })

  it('trial 3: the measurements alone now fire the neuron (n = 3 − 2 = 1)', () => {
    const r = instarOutput(w0, 0, [1, -1, -1], p, b)
    expect(r.n).toBe(1)
    expect(r.a).toBe(1)
  })

  it('an inactive instar does not forget, and the Kohonen rule is the instar rule with a = 1', () => {
    expect(instarStep([1, -1, -1], [0, 0, 0], 0, 1)).toEqual([1, -1, -1])
    expect(kohonenStep([0, 0], [1, 2], 0.5)).toEqual([0.5, 1])
  })
})

describe('Hagan pineapple recall: outstar rule, α = 1, measured pattern [−1 −1 1]', () => {
  const pattern = [-1, -1, 1]

  it('learns the pattern on the trial it is measured and recalls it from the cue alone', () => {
    let w = [0, 0, 0]
    // Trial 1: measurements fail, pineapple seen
    let a = outstarOutput([0, 0, 0], w, 1)
    expect(a).toEqual([0, 0, 0])
    w = outstarStep(w, a, 1, 1)
    expect(w).toEqual([0, 0, 0])
    // Trial 2: measurements work
    a = outstarOutput(pattern, w, 1)
    expect(a).toEqual(pattern)
    w = outstarStep(w, a, 1, 1)
    expect(w).toEqual(pattern)
    // Trial 3: measurements fail again, the cue alone recalls the pattern
    expect(outstarOutput([0, 0, 0], w, 1)).toEqual(pattern)
  })

  it('weights do not change when the cue is absent', () => {
    expect(outstarStep([0.2, -0.4], [1, 1], 0, 1)).toEqual([0.2, -0.4])
  })
})

describe('Hamming network and competitive layer', () => {
  it('feedforward layer scores each prototype; lateral inhibition leaves one winner', () => {
    // Hagan's apple/orange Hamming example: prototypes [1 −1 −1] and [1 1 −1], bias R = 3
    const a1 = hammingFeedforward([[1, -1, -1], [1, 1, -1]], [-1, -1, -1], 3)
    expect(a1).toEqual([4, 2])
    const states = hammingCompete(a1, 0.5)
    expect(states[1]).toEqual([3, 0])
    expect(states[states.length - 1].filter((v) => v > 0).length).toBe(1)
  })

  it('compet picks the largest net input', () => {
    expect(compet([-0.8321, 0.5547, 0.1961])).toEqual([0, 1, 0])
  })

  it('Kohonen rule for the winner only (hand calculation, α = 0.5)', () => {
    const layer = createCompetitiveLayer([[0.7071, -0.7071], [0.7071, 0.7071], [-1, 0]])
    const p = [-0.1961, 0.9806]
    expect(competitiveWinner(layer, p)).toBe(1)
    const win = competitiveStep(layer, p, 0.5)
    expect(win).toBe(1)
    // 0.7071 + 0.5 (−0.1961 − 0.7071) = 0.2555 ; 0.7071 + 0.5 (0.9806 − 0.7071) = 0.84385
    expect(layer.w[1][0]).toBeCloseTo(0.2555, 4)
    expect(layer.w[1][1]).toBeCloseTo(0.84385, 4)
    expect(layer.w[0]).toEqual([0.7071, -0.7071])
    expect(layer.w[2]).toEqual([-1, 0])
    expect(layer.wins).toEqual([0, 1, 0])
  })

  it('a far-away neuron is dead without a conscience and wins with one', () => {
    const data = [[0.1, 0.1], [0.15, 0.12], [0.12, 0.2], [0.2, 0.15]]
    const plain = createCompetitiveLayer([[0.15, 0.15], [5, 5]])
    const fair = createCompetitiveLayer([[0.15, 0.15], [5, 5]])
    for (let q = 0; q < 400; q++) {
      competitiveStep(plain, data[q % 4], 0.1)
      competitiveStep(fair, data[q % 4], 0.1, { strength: 30, rate: 0.05 })
    }
    expect(plain.wins[1]).toBe(0)
    expect(fair.wins[1]).toBeGreaterThan(0)
    expect(fair.w[1][0]).toBeLessThan(1)
  })
})

describe('Hagan LVQ example: four prototypes, two classes, α = 0.5', () => {
  const make = (): Lvq => ({
    w: [[-0.543, 0.84], [-0.969, -0.249], [0.997, 0.094], [0.456, 0.954]],
    classOf: [0, 0, 1, 1],
  })
  const p3 = [1, -1] // belongs to class 2 (index 1)

  it('neuron 3 is closest to p3 (distances 2.40, 2.11, 1.09, 2.03)', () => {
    const net = make()
    expect(lvqRank(net, p3)[0]).toBe(2)
    const d = net.w.map((w) => Math.hypot(w[0] - p3[0], w[1] - p3[1]))
    expect(d[0]).toBeCloseTo(2.4, 2)
    expect(d[1]).toBeCloseTo(2.11, 2)
    expect(d[2]).toBeCloseTo(1.09, 2)
    expect(d[3]).toBeCloseTo(2.03, 2)
    expect(lvqClassify(net, p3)).toBe(1)
  })

  it('right class: the winner moves toward the input, 3w(1) = [0.998 −0.453]', () => {
    const net = make()
    const r = lvqStep(net, p3, 1, 0.5)
    expect(r).toEqual({ winner: 2, correct: true, helper: -1 })
    expect(net.w[2][0]).toBeCloseTo(0.998, 3)
    expect(net.w[2][1]).toBeCloseTo(-0.453, 3)
    expect(net.w[0]).toEqual([-0.543, 0.84])
  })

  it('wrong class: the winner moves away by the same amount (hand calculation)', () => {
    const net = make()
    const r = lvqStep(net, p3, 0, 0.5)
    expect(r.correct).toBe(false)
    // 0.997 − 0.5 (1 − 0.997) = 0.9955 ; 0.094 − 0.5 (−1 − 0.094) = 0.641
    expect(net.w[2][0]).toBeCloseTo(0.9955, 4)
    expect(net.w[2][1]).toBeCloseTo(0.641, 4)
  })

  it('LVQ2 also pulls the closest prototype of the right class toward the input', () => {
    const net = make()
    const r = lvqStep(net, p3, 0, 0.5, true)
    // Class 1 prototypes are neurons 1 and 2; neuron 2 is closer to p3 (2.11 < 2.40)
    expect(r.helper).toBe(1)
    expect(net.w[1][0]).toBeCloseTo(-0.969 + 0.5 * (1 + 0.969), 6)
    expect(net.w[1][1]).toBeCloseTo(-0.249 + 0.5 * (-1 + 0.249), 6)
  })
})

describe('Radial basis network', () => {
  it('forward pass: a1 = exp(−(‖p − w‖ b)²), a2 = W2 a1 + b2 (hand calculation)', () => {
    const net = { centres: [[-1], [1]], b1: [2, 2], w2: [1, 1], b2: 0 }
    expect(rbfHidden(net.centres, net.b1, [-1])[0]).toBe(1)
    expect(rbfHidden(net.centres, net.b1, [-1])[1]).toBeCloseTo(Math.exp(-16), 12)
    expect(rbfHidden(net.centres, net.b1, [0])[0]).toBeCloseTo(Math.exp(-4), 12)
    expect(rbfOutput(net, [0])).toBeCloseTo(2 * Math.exp(-4), 12)
    // Two inputs: distance is Euclidean. ‖[3 4] − [0 0]‖ = 5, b = 0.2 → n = 1 → a = e⁻¹
    expect(rbfHidden([[0, 0]], [0.2], [3, 4])[0]).toBeCloseTo(Math.exp(-1), 12)
  })

  it('solve and leastSquares recover an exact line', () => {
    expect(solve([[2, 1], [1, 3]], [5, 10])).toEqual([1, 3])
    const x = leastSquares([[0, 1], [1, 1], [2, 1], [3, 1]], [1, 3, 5, 7])
    expect(x[0]).toBeCloseTo(2, 10)
    expect(x[1]).toBeCloseTo(1, 10)
  })

  it('Hagan least-squares example: g(p) = 1 + sin(πp/4), centres −2, 0, 2, bias 0.5', () => {
    const P = [-2, -1.2, -0.4, 0.4, 1.2, 2].map((p) => [p])
    const T = P.map(([p]) => 1 + Math.sin((Math.PI * p) / 4))
    const { w2, b2 } = rbfSolveOutput([[-2], [0], [2]], [0.5, 0.5, 0.5], P, T, 0)
    // Hagan's answer: W2 = [−1.03 0 1.03], b2 = 1
    expect(w2[0]).toBeCloseTo(-1.03, 2)
    expect(w2[1]).toBeCloseTo(0, 6)
    expect(w2[2]).toBeCloseTo(1.03, 2)
    expect(b2).toBeCloseTo(1, 6)
  })
})
