import { describe, expect, it } from 'vitest'
import { buildGame, meanAbs } from '../../scenes/factory/labs/waveGame'

describe('beat-the-model series', { timeout: 30000 }, () => {
  const g = buildGame()
  const ts = Array.from({ length: g.series.length - g.playFrom }, (_, i) => g.playFrom + i)
  const model = meanAbs(ts.map((t) => g.series[t] - g.forecast(t)))
  const last = meanAbs(ts.map((t) => g.series[t] - g.series[t - 1]))
  const yesterday = meanAbs(ts.map((t) => g.series[t] - g.series[t - 24]))

  it('trains a network that beats "same as the last hour" and "same as yesterday" on unseen days', () => {
    expect(model).toBeLessThan(0.8 * last)
    expect(model).toBeLessThan(yesterday)
  })

  it('asks ten different questions from the unseen week with two days of history each', () => {
    expect(new Set(g.questions).size).toBe(10)
    for (const t of g.questions) expect(t).toBeGreaterThanOrEqual(g.playFrom + 48)
  })
})
