import { describe, expect, it } from 'vitest'
import { gram, hebb, hebbCrossTalk, invert, pseudoinverse, pseudoinverseRule, recall } from '../associator'

/** Hagan, "Neural Network Design" (2nd ed.), Chapter 7 worked examples. */
describe('Hebb rule with orthonormal inputs (Hagan Ch. 7)', () => {
  const P = [[0.5, -0.5, 0.5, -0.5], [0.5, 0.5, -0.5, -0.5]]
  const T = [[1, -1], [1, 1]]
  const W = hebb(P, T)

  it('W = T Pᵀ = [1 0 0 −1; 0 1 −1 0]', () => {
    expect(W).toEqual([[1, 0, 0, -1], [0, 1, -1, 0]])
  })
  it('recall is exact for both prototypes', () => {
    expect(recall(W, P[0])).toEqual([1, -1])
    expect(recall(W, P[1])).toEqual([1, 1])
  })
  it('inner products: PᵀP is the identity, so there is no cross-talk', () => {
    expect(gram(P)).toEqual([[1, 0], [0, 1]])
    expect(hebbCrossTalk(P, T, 0).crossTalk).toEqual([0, 0])
  })
})

describe('Hebb rule with inputs that are not orthogonal (Hagan Ch. 7, orange and apple)', () => {
  const s = 1 / Math.sqrt(3)
  const P = [[-s, s, -s], [s, s, -s]]
  const T = [[-1], [1]]
  const W = hebb(P, T)

  it('W = [1.1547 0 0]', () => {
    expect(W[0][0]).toBeCloseTo(1.1547, 4)
    expect(W[0][1]).toBeCloseTo(0, 10)
    expect(W[0][2]).toBeCloseTo(0, 10)
  })
  it('recall misses the targets: a = −0.667 and +0.667 instead of −1 and +1', () => {
    expect(recall(W, P[0])[0]).toBeCloseTo(-0.6667, 4)
    expect(recall(W, P[1])[0]).toBeCloseTo(0.6667, 4)
  })
  it('the miss is exactly the cross-talk term t_q (p_qᵀ p_k) = 1 × 1/3', () => {
    const { wanted, crossTalk } = hebbCrossTalk(P, T, 0)
    expect(wanted[0]).toBeCloseTo(-1, 10)
    expect(crossTalk[0]).toBeCloseTo(1 / 3, 10)
    expect(wanted[0] + crossTalk[0]).toBeCloseTo(recall(W, P[0])[0], 10)
  })
})

describe('Pseudoinverse rule (Hagan Ch. 7)', () => {
  const P = [[1, -1, -1], [1, 1, -1]]
  const T = [[-1], [1]]

  it('P⁺ = (PᵀP)⁻¹Pᵀ = [0.25 −0.5 −0.25; 0.25 0.5 −0.25]', () => {
    const Pp = pseudoinverse(P)!
    const want = [[0.25, -0.5, -0.25], [0.25, 0.5, -0.25]]
    Pp.forEach((row, i) => row.forEach((v, j) => expect(v).toBeCloseTo(want[i][j], 10)))
  })
  it('W = T P⁺ = [0 1 0], and recall is exact', () => {
    const W = pseudoinverseRule(P, T)!
    ;[0, 1, 0].forEach((v, j) => expect(W[0][j]).toBeCloseTo(v, 10))
    expect(recall(W, P[0])[0]).toBeCloseTo(-1, 10)
    expect(recall(W, P[1])[0]).toBeCloseTo(1, 10)
  })
  it('hand check of the 2×2 inverse: [3 1; 1 3]⁻¹ = (1/8)[3 −1; −1 3]', () => {
    const inv = invert([[3, 1], [1, 3]])!
    const want = [[0.375, -0.125], [-0.125, 0.375]]
    inv.forEach((row, i) => row.forEach((v, j) => expect(v).toBeCloseTo(want[i][j], 10)))
  })
  it('linearly dependent patterns have no pseudoinverse of this form', () => {
    expect(pseudoinverse([[1, -1, 1], [2, -2, 2]])).toBeNull()
    expect(invert([[1, 2], [2, 4]])).toBeNull()
  })
})
