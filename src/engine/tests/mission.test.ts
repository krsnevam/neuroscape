import { describe, expect, it } from 'vitest'
import {
  buildData,
  debrief,
  expertConfig,
  expertProfit,
  inspect,
  runToEnd,
  rushedConfig,
  ship,
  stars,
  type Config,
} from '../../scenes/factory/mission/sim'

const play = (cfg: Config) => {
  const data = buildData(cfg)
  const run = runToEnd(cfg, data)
  const insp = inspect(run.final, data)
  const shipment = ship(run.final, data, cfg)
  return { data, run, insp, shipment, findings: debrief(cfg, data, run, insp, shipment) }
}

describe('the delivery-promise mission', { timeout: 60000 }, () => {
  const expert = play(expertConfig)
  const rushed = play(rushedConfig)

  it('rewards the careful pipeline far above the rushed one', () => {
    expect(expert.shipment.profit).toBeGreaterThan(0)
    expect(expert.shipment.profit).toBeGreaterThan(rushed.shipment.profit + 20000)
    expect(stars(expert.shipment.profit)).toBe(3)
    expect(stars(rushed.shipment.profit)).toBeLessThanOrEqual(1)
    expect(expertProfit()).toBe(expert.shipment.profit)
  })

  it('gives the careful pipeline an accurate model with agreeing errors', () => {
    expect(expert.insp.test).toBeLessThan(5)
    expect(expert.insp.test).toBeLessThan(1.6 * expert.insp.train)
    expect(expert.shipment.liveRms).toBeLessThan(5)
    expect(expert.data.coverage.filter((c) => c === 0).length).toBeLessThanOrEqual(1)
  })

  it('explains the rushed failures: unscaled inputs, broken records and blind spots', () => {
    const titles = rushed.findings.map((f) => f.title).join(' | ')
    expect(titles).toMatch(/never scaled/)
    expect(titles).toMatch(/Blind spots/)
    expect(rushed.data.coverage.filter((c) => c === 0).length).toBeGreaterThan(6)
  })

  it('shows each single mistake costs money', () => {
    const cases: Partial<Config>[] = [
      { normalise: false },
      { clean: false },
      { window: 'lunch' },
      { area: 'near' },
      { algo: 'sd', alpha: 3, stopping: 'fixed', restarts: 1 },
      { buffer: 14 },
    ]
    for (const patch of cases) {
      const r = play({ ...expertConfig, ...patch })
      expect(r.shipment.profit, JSON.stringify(patch)).toBeLessThan(expert.shipment.profit - 3000)
    }
  })

  it('hides blind spots from the test set', () => {
    const r = play({ ...expertConfig, window: 'lunch' })
    // the test error looks fine, the live error does not
    expect(r.insp.test).toBeLessThan(6)
    expect(r.shipment.liveRms).toBeGreaterThan(1.5 * r.insp.test)
  })
})
