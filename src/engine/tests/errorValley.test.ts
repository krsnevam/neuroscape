import { describe, expect, it } from 'vitest'
import {
  correlationMatrix,
  createAdaline,
  createAdaptiveFilter,
  crossCorrelation,
  lmsAlphaBound,
  lmsStep,
  mseQuadratic,
  solveLinear,
  symEigen,
} from '../lms'
import { createBp, haganCh12, type Problem } from '../vlbp'
import { lossOn } from '../train'

describe('LMS (Hagan Ch. 10, apple/orange ADALINE, α = 0.2, no bias)', () => {
  const orange = { p: [1, -1, -1], t: -1 }
  const apple = { p: [1, 1, -1], t: 1 }

  it('follows the book for the first three iterations', () => {
    const ad = createAdaline(3, false)
    const s0 = lmsStep(ad, orange.p, orange.t, 0.2)
    expect(s0.a).toBe(0)
    expect(s0.e).toBe(-1)
    // W(1) = W(0) + 2α e(0) pᵀ(0) = 2(0.2)(−1)[1 −1 −1]
    ;[-0.4, 0.4, 0.4].forEach((v, i) => expect(ad.w[i]).toBeCloseTo(v, 10))
    const s1 = lmsStep(ad, apple.p, apple.t, 0.2)
    expect(s1.a).toBeCloseTo(-0.4, 10)
    expect(s1.e).toBeCloseTo(1.4, 10)
    ;[0.16, 0.96, -0.16].forEach((v, i) => expect(ad.w[i]).toBeCloseTo(v, 10))
    const s2 = lmsStep(ad, orange.p, orange.t, 0.2)
    expect(s2.a).toBeCloseTo(-0.64, 10)
    expect(s2.e).toBeCloseTo(-0.36, 10)
    ;[0.016, 1.104, -0.016].forEach((v, i) => expect(ad.w[i]).toBeCloseTo(v, 10))
    expect(ad.b).toBe(0)
  })

  it('converges to W = [0 1 0]', () => {
    const ad = createAdaline(3, false)
    for (let k = 0; k < 200; k++) {
      const s = k % 2 === 0 ? orange : apple
      lmsStep(ad, s.p, s.t, 0.2)
    }
    ;[0, 1, 0].forEach((v, i) => expect(ad.w[i]).toBeCloseTo(v, 6))
  })

  it('has R with eigenvalues 0, 1, 2, so α must stay below 0.5', () => {
    const R = correlationMatrix([orange.p, apple.p])
    expect(R).toEqual([
      [1, 0, -1],
      [0, 1, 0],
      [-1, 0, 1],
    ])
    const eig = symEigen(R)
    ;[0, 1, 2].forEach((v, i) => expect(eig.values[i]).toBeCloseTo(v, 10))
    expect(lmsAlphaBound(R)).toBeCloseTo(0.5, 10)
    // Each eigenvector satisfies R v = λ v
    eig.vectors.forEach((v, k) =>
      R.forEach((row, i) => expect(row.reduce((s, r, j) => s + r * v[j], 0)).toBeCloseTo(eig.values[k] * v[i], 10)),
    )
  })
})

describe('adaptive noise cancellation (Hagan Ch. 10 example)', () => {
  // Noise source v(k) = 1.2 sin(2πk/3); the noise that reaches the signal is m(k) = 1.2 sin(2πk/3 − 3π/4).
  const v = (k: number) => 1.2 * Math.sin((2 * Math.PI * k) / 3)
  const m = (k: number) => 1.2 * Math.sin((2 * Math.PI * k) / 3 - (3 * Math.PI) / 4)
  const ks = [1, 2, 3]
  const zs = ks.map((k) => [v(k), v(k - 1)])
  const R = correlationMatrix(zs)
  // The signal s is uncorrelated with v, so h = E[(s + m) z] = E[m z]
  const h = crossCorrelation(zs, ks.map(m))

  it('gives R = [0.72 −0.36; −0.36 0.72] and h = [−0.51; 0.70]', () => {
    expect(R[0][0]).toBeCloseTo(0.72, 10)
    expect(R[0][1]).toBeCloseTo(-0.36, 10)
    expect(R[1][1]).toBeCloseTo(0.72, 10)
    expect(h[0]).toBeCloseTo(-0.51, 2)
    expect(h[1]).toBeCloseTo(0.7, 2)
  })

  it('has its minimum at x* = [−0.30; 0.82], where the mean square error is E[s²]', () => {
    const x = solveLinear(R, h)!
    expect(x[0]).toBeCloseTo(-0.3, 2)
    expect(x[1]).toBeCloseTo(0.82, 2)
    // s uniform in [−0.2, 0.2]: E[s²] = 0.4²/12 = 0.0133, c = E[s²] + E[m²] = 0.7333
    const c = 0.4 ** 2 / 12 + 0.72
    expect(c).toBeCloseTo(0.7333, 4)
    expect(mseQuadratic(x, c, h, R)).toBeCloseTo(0.0133, 4)
  })

  it('has eigenvalues 0.36 and 1.08', () => {
    const { values } = symEigen(R)
    expect(values[0]).toBeCloseTo(0.36, 10)
    expect(values[1]).toBeCloseTo(1.08, 10)
  })

  it('is found by the tapped-delay-line ADALINE with LMS, and the error becomes the signal', () => {
    const filt = createAdaptiveFilter(2)
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 0.4 - 0.2
    let worst = 0
    for (let k = 0; k < 20000; k++) {
      const s = rand()
      const { e } = filt.step(v(k), s + m(k), 0.004)
      if (k > 19000) worst = Math.max(worst, Math.abs(e - s))
    }
    expect(filt.ad.w[0]).toBeCloseTo(-0.3, 1)
    expect(filt.ad.w[1]).toBeCloseTo(0.82, 1)
    expect(worst).toBeLessThan(0.05)
  })

  it('first step by hand: zero weights give a = 0, e = t, W(1) = 2αe p', () => {
    const filt = createAdaptiveFilter(2)
    const r = filt.step(0.5, 2, 0.1)
    expect(r).toEqual({ a: 0, e: 2 })
    expect(filt.ad.w[0]).toBeCloseTo(0.2, 12) // 2·0.1·2·0.5
    expect(filt.ad.w[1]).toBe(0) // the delayed tap still holds 0
    const r2 = filt.step(1, 1, 0.1)
    expect(r2.a).toBeCloseTo(0.2, 12) // 0.2·1 + 0·0.5
    expect(filt.ad.w[1]).toBeCloseTo(2 * 0.1 * 0.8 * 0.5, 12)
  })
})

describe('SDBP, MOBP and VLBP (Hagan Ch. 12)', () => {
  // F(x) = x², g = 2x: every step can be checked by hand
  const quad: Problem = { F: (x) => x[0] * x[0], grad: (x) => [2 * x[0]] }

  it('steepest descent: x(1) = x(0) − α g', () => {
    const bp = createBp(quad, [1], { alpha: 0.1 })
    bp.step()
    expect(bp.state.x[0]).toBeCloseTo(0.8, 12)
    expect(bp.state.alpha).toBe(0.1)
  })

  it('momentum: Δx(k) = γ Δx(k−1) − (1−γ) α g(k)', () => {
    const bp = createBp(quad, [1], { alpha: 0.1, gamma: 0.5 })
    bp.step() // Δx = −0.5·0.1·2 = −0.1
    expect(bp.state.x[0]).toBeCloseTo(0.9, 12)
    bp.step() // Δx = 0.5·(−0.1) − 0.5·0.1·1.8 = −0.14
    expect(bp.state.x[0]).toBeCloseTo(0.76, 12)
  })

  it('VLBP accepts a step that lowers F and multiplies α by 1.05', () => {
    const bp = createBp(quad, [1], { alpha: 0.6, variable: true })
    bp.step() // x = 1 − 1.2 = −0.2, F: 1 → 0.04
    expect(bp.state.last).toBe('accepted')
    expect(bp.state.x[0]).toBeCloseTo(-0.2, 12)
    expect(bp.state.alpha).toBeCloseTo(0.63, 12)
  })

  it('VLBP rejects a step that raises F by more than 4 %, multiplies α by 0.7 and zeroes the momentum', () => {
    const bp = createBp(quad, [1], { alpha: 1.2, gamma: 0.8, variable: true })
    // First step with γ = 0.8: Δx = −0.2·1.2·2 = −0.48, accepted
    bp.step()
    expect(bp.state.x[0]).toBeCloseTo(0.52, 12)
    const bad = createBp(quad, [1], { alpha: 6, gamma: 0.8, variable: true })
    bad.step() // Δx = −0.2·6·2 = −2.4 → x = −1.4, F = 1.96 > 1.04
    expect(bad.state.last).toBe('rejected')
    expect(bad.state.x[0]).toBe(1)
    expect(bad.state.alpha).toBeCloseTo(4.2, 12)
    expect(bad.state.gamma).toBe(0)
    bad.step() // γ = 0 now: Δx = −4.2·2 = −8.4, rejected again
    expect(bad.state.alpha).toBeCloseTo(2.94, 12)
  })

  it('VLBP accepts a rise smaller than 4 % and leaves α alone', () => {
    const bp = createBp(quad, [1], { alpha: 1.005, variable: true })
    bp.step() // x = −1.01, F = 1.0201
    expect(bp.state.last).toBe('accepted')
    expect(bp.state.alpha).toBe(1.005)
  })

  describe('the 1-2-1 demonstration network', () => {
    const { problem, net, samples } = haganCh12()

    it('has zero error at w¹₁,₁ = 10, w²₁,₁ = 1 and the direct formula agrees with the engine', () => {
      expect(problem.F([10, 1])).toBeCloseTo(0, 12)
      problem.grad([3, 7]) // leaves the network at (3, 7)
      expect(problem.F([3, 7])).toBeCloseTo(lossOn(net, samples) * samples.length, 10)
    })

    it('backpropagation gradient matches a finite difference', () => {
      const x = [2, 3]
      const g = problem.grad(x)
      const h = 1e-6
      expect(g[0]).toBeCloseTo((problem.F([x[0] + h, x[1]]) - problem.F([x[0] - h, x[1]])) / (2 * h), 5)
      expect(g[1]).toBeCloseTo((problem.F([x[0], x[1] + h]) - problem.F([x[0], x[1] - h])) / (2 * h), 5)
    })

    it('reaches the global minimum from (−4, −4) but is drawn towards the local minimum from (−4, 10)', () => {
      const a = createBp(problem, [-4, -4], { alpha: 1, gamma: 0.8, variable: true })
      for (let k = 0; k < 600; k++) a.step()
      expect(a.state.x[0]).toBeCloseTo(10, 3)
      expect(a.state.x[1]).toBeCloseTo(1, 3)
      const b = createBp(problem, [-4, 10], { alpha: 1, gamma: 0.8, variable: true })
      for (let k = 0; k < 600; k++) b.step()
      expect(b.state.x[0]).toBeLessThan(2)
      expect(b.state.x[1]).toBeGreaterThan(15)
      expect(b.state.F).toBeGreaterThan(0.09)
      // The local minimum itself: F ≈ 0.0934 near (0.88, 38.6)
      expect(problem.F([0.88, 38.6])).toBeCloseTo(0.0934, 3)
    })

    it('steepest descent oscillates across the ravine when α is too large', () => {
      const ok = createBp(problem, [-4, -4], { alpha: 1 })
      const big = createBp(problem, [-4, -4], { alpha: 2.5 })
      for (let k = 0; k < 3000; k++) {
        ok.step()
        big.step()
      }
      expect(ok.state.F).toBeLessThan(1e-6)
      expect(big.state.F).toBeGreaterThan(1e-3)
    })
  })
})
