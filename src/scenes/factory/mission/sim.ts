import {
  cloneNetwork,
  createNetwork,
  createTrainer,
  fitMinMax,
  gauss,
  lmStep,
  lossOn,
  normalize,
  output,
  rng,
  shuffle,
  type MinMax,
  type Network,
  type Sample,
} from '../../../engine'

/**
 * The mission: a food-delivery app must promise a delivery time for every order.
 * The player takes one model through every Unit V stage, then ships it and faces a month of live orders.
 * Everything here is pure logic so it can be tested without the screen.
 */

export interface Order {
  /** hour of day, 10 (10 am) to 24 (midnight) */
  hour: number
  km: number
  /** minutes from order to doorstep, as logged */
  minutes: number
}

const bump = (x: number, mu: number, sd: number) => Math.exp(-((x - mu) ** 2) / (2 * sd * sd))
/** How bad the roads and kitchens are: a lunch peak and a bigger dinner peak. */
export const rush = (hour: number) => 0.55 * bump(hour, 13, 1.4) + bump(hour, 20.2, 1.7)
/** The real average delivery time. The player never sees this function, only orders drawn from it. */
export const trueMinutes = (hour: number, km: number) => 8 + km * (2.4 + 3.4 * rush(hour))

function drawOrder(rand: () => number): Order {
  const u = rand()
  const raw = u < 0.35 ? 13 + gauss(rand) * 1.2 : u < 0.85 ? 20.3 + gauss(rand) * 1.5 : 10 + rand() * 14
  const hour = Math.min(23.99, Math.max(10, raw))
  const km = 0.3 + 8.7 * rand() ** 1.5
  const m = trueMinutes(hour, km)
  return { hour, km, minutes: Math.max(4, m + gauss(rand) * (2 + 0.04 * m)) }
}

/** A record is broken when the rider forgot to tap "Delivered": the logged time runs to hours. */
export const isBroken = (o: Order) => o.minutes > 120

/** Everything the company has logged so far. About 1 in 20 records is broken. */
export const companyLog: Order[] = (() => {
  const rand = rng(101)
  return Array.from({ length: 1800 }, () => {
    const o = drawOrder(rand)
    return rand() < 0.05 ? { ...o, minutes: 150 + rand() * 250 } : o
  })
})()

/** The orders that arrive after launch. Same city, every hour, every distance. */
export const liveOrders: Order[] = (() => {
  const rand = rng(202)
  return Array.from({ length: 600 }, () => drawOrder(rand))
})()

export const HOUR_BLOCKS: [number, number][] = [[10, 12], [12, 15], [15, 18], [18, 21], [21, 24]]
export const KM_BANDS: [number, number][] = [[0, 3], [3, 6], [6, 9]]
export const SEGMENTS = HOUR_BLOCKS.length * KM_BANDS.length
export const segmentOf = (o: Order) => {
  const h = HOUR_BLOCKS.findIndex(([a, b]) => o.hour >= a && o.hour < b)
  const k = Math.min(KM_BANDS.length - 1, Math.floor(o.km / 3))
  return Math.max(0, h) * KM_BANDS.length + k
}
export const blockLabel = (i: number) => {
  const f = (h: number) => (h === 12 ? '12 pm' : h === 24 ? '12 am' : h < 12 ? `${h} am` : `${h - 12} pm`)
  return `${f(HOUR_BLOCKS[i][0])}–${f(HOUR_BLOCKS[i][1])}`
}
export const segmentLabel = (s: number) => {
  const [a, b] = KM_BANDS[s % KM_BANDS.length]
  return `${blockLabel(Math.floor(s / KM_BANDS.length))}, ${a}–${b} km`
}

export interface Config {
  /** Stage 1: which logged orders to use */
  window: 'lunch' | 'dinner' | 'all'
  area: 'near' | 'all'
  size: 60 | 200 | 600
  /** Stage 2 */
  normalise: boolean
  clean: boolean
  /** Stage 3 */
  neurons: number
  /** Stage 4 */
  algo: 'sd' | 'momentum' | 'lm'
  alpha: number
  stopping: 'fixed' | 'early'
  restarts: 1 | 3 | 5
  /** Stage 6: minutes added to every promise */
  buffer: number
}

/** What someone in a hurry would do. The first run with these settings fails in instructive ways. */
export const rushedConfig: Config = {
  window: 'lunch',
  area: 'near',
  size: 60,
  normalise: false,
  clean: false,
  neurons: 12,
  algo: 'sd',
  alpha: 0.1,
  stopping: 'fixed',
  restarts: 1,
  buffer: 0,
}

/** A careful engineer's choices, used as the reference score. */
export const expertConfig: Config = {
  window: 'all',
  area: 'all',
  size: 200,
  normalise: true,
  clean: true,
  neurons: 8,
  algo: 'lm',
  alpha: 0.1,
  stopping: 'early',
  restarts: 3,
  buffer: 4,
}

export const COST_PER_RECORD = 30
export const paramCountFor = (neurons: number) => neurons * 3 + neurons + 1

export interface Dataset {
  train: Order[]
  val: Order[]
  test: Order[]
  /** how many records the filters left to choose from */
  available: number
  brokenInTrain: number
  hourMM: MinMax
  metreMM: MinMax
  encode: (o: Pick<Order, 'hour' | 'km'>) => number[]
  toSample: (o: Order) => Sample
  /** training records per segment */
  coverage: number[]
}

export function buildData(cfg: Pick<Config, 'window' | 'area' | 'size' | 'normalise' | 'clean'>): Dataset {
  const rand = rng(7)
  let pool = companyLog.filter(
    (o) =>
      (cfg.window === 'all' || (cfg.window === 'lunch' ? o.hour >= 11 && o.hour < 15 : o.hour >= 18 && o.hour < 23)) &&
      (cfg.area === 'all' || o.km <= 3),
  )
  if (cfg.clean) pool = pool.filter((o) => !isBroken(o))
  const picked = shuffle(pool, rand).slice(0, cfg.size)
  const nTrain = Math.round(picked.length * 0.7)
  const nVal = Math.round(picked.length * 0.15)
  const train = picked.slice(0, nTrain)
  const val = picked.slice(nTrain, nTrain + nVal)
  const test = picked.slice(nTrain + nVal)
  // Scaling uses the training set only, so nothing leaks from validation or test
  const hourMM = fitMinMax(train.map((o) => o.hour))
  const metreMM = fitMinMax(train.map((o) => o.km * 1000))
  const encode = (o: Pick<Order, 'hour' | 'km'>) =>
    cfg.normalise ? [normalize(o.hour, hourMM), normalize(o.km * 1000, metreMM)] : [o.hour, o.km * 1000]
  const coverage = new Array<number>(SEGMENTS).fill(0)
  for (const o of train) coverage[segmentOf(o)]++
  return {
    train,
    val,
    test,
    available: pool.length,
    brokenInTrain: train.filter(isBroken).length,
    hourMM,
    metreMM,
    encode,
    toSample: (o) => ({ p: encode(o), t: [o.minutes / 40 - 1] }),
    coverage,
  }
}

const rmsMinutes = (net: Network, samples: Sample[]) => (samples.length ? Math.sqrt(lossOn(net, samples)) * 40 : NaN)

export interface Run {
  history: { train: number; val: number }[]
  /** iteration at which each restart began, for the chart */
  restartsAt: number[]
  its: number
  restart: number
  status: 'running' | 'done' | 'diverged'
  /** the network being trained right now */
  net: Network
  /** the network that will be shipped: lowest validation error over all restarts */
  final: Network | null
  finalVal: number
  /** restarts that blew up */
  diverged: number
  stoppedEarlyAt: number | null
  /** advance training by one screen frame's worth of work */
  step: () => void
}

export function createRun(cfg: Config, data: Dataset): Run {
  const train = data.train.map(data.toSample)
  const val = data.val.map(data.toSample)
  const lm = cfg.algo === 'lm'
  const maxIts = lm ? 120 : 1500
  const chunk = lm ? 1 : 12
  const patience = lm ? 10 : 240
  let trainer = createTrainer(createNetwork(2, [1, 1], ['tansig', 'purelin']))
  let lmState = { mu: 0.01 }
  let itsThis = 0
  let bestVal = Infinity
  let bestNet: Network | null = null
  let bestAt = 0

  const run: Run = {
    history: [],
    restartsAt: [],
    its: 0,
    restart: 0,
    status: 'running',
    net: createNetwork(2, [cfg.neurons, 1], ['tansig', 'purelin'], { seed: 11 }),
    final: null,
    finalVal: Infinity,
    diverged: 0,
    stoppedEarlyAt: null,
    step,
  }

  function begin(k: number) {
    run.restart = k
    run.net = createNetwork(2, [cfg.neurons, 1], ['tansig', 'purelin'], { seed: 11 + k * 17 })
    trainer = createTrainer(run.net)
    lmState = { mu: 0.01 }
    itsThis = 0
    bestVal = Infinity
    bestNet = null
    bestAt = 0
    run.restartsAt.push(run.its)
  }

  function finishRestart(blewUp: boolean) {
    if (blewUp) run.diverged++
    else {
      // Early stopping keeps the weights from the lowest validation error; otherwise the last weights are kept
      const keep = cfg.stopping === 'early' && bestNet ? bestNet : run.net
      const v = rmsMinutes(keep, val.length ? val : train)
      if (v < run.finalVal) {
        run.finalVal = v
        run.final = cloneNetwork(keep)
      }
    }
    if (run.restart + 1 < cfg.restarts) begin(run.restart + 1)
    else run.status = run.final ? 'done' : 'diverged'
  }

  function step() {
    if (run.status !== 'running' || train.length < 2) {
      if (train.length < 2) run.status = 'diverged'
      return
    }
    for (let k = 0; k < chunk; k++) {
      if (lm) lmStep(run.net, train, lmState)
      else trainer.step(train, { alpha: cfg.alpha, gamma: cfg.algo === 'momentum' ? 0.9 : 0 })
    }
    itsThis += chunk
    run.its += chunk
    const tr = rmsMinutes(run.net, train)
    const va = rmsMinutes(run.net, val)
    if (!Number.isFinite(tr) || tr > 1e4) {
      run.history.push({ train: 1e4, val: 1e4 })
      finishRestart(true)
      return
    }
    run.history.push({ train: tr, val: va })
    if (va < bestVal) {
      bestVal = va
      bestNet = cloneNetwork(run.net)
      bestAt = itsThis
    }
    if (cfg.stopping === 'early' && itsThis - bestAt >= patience) {
      run.stoppedEarlyAt = run.its
      finishRestart(false)
    } else if (itsThis >= maxIts) finishRestart(false)
  }

  begin(0)
  return run
}

export function runToEnd(cfg: Config, data: Dataset): Run {
  const run = createRun(cfg, data)
  let guard = 0
  while (run.status === 'running' && guard++ < 100000) run.step()
  return run
}

/** Minutes the model predicts. With no usable network the team falls back to one flat promise. */
export function predictor(net: Network | null, data: Dataset) {
  const flat = data.train.length ? data.train.reduce((s, o) => s + o.minutes, 0) / data.train.length : 30
  return (o: Pick<Order, 'hour' | 'km'>) => {
    if (!net) return flat
    const v = (output(net, data.encode(o))[0] + 1) * 40
    return Number.isFinite(v) ? v : flat
  }
}

export interface Inspection {
  train: number
  val: number
  test: number
  /** [actual, predicted] for each test order, for the regression plot */
  pairs: [number, number][]
  /** per segment: test orders there, and RMS error on them (NaN when none) */
  segCount: number[]
  segRms: number[]
  /** how much predictions vary across the test set; near zero means "same answer for everyone" */
  spread: number
}

export function inspect(net: Network | null, data: Dataset): Inspection {
  const f = predictor(net, data)
  const rms = (os: Order[]) => (os.length ? Math.sqrt(os.reduce((s, o) => s + (f(o) - o.minutes) ** 2, 0) / os.length) : NaN)
  const segCount = new Array<number>(SEGMENTS).fill(0)
  const segSq = new Array<number>(SEGMENTS).fill(0)
  for (const o of data.test) {
    const s = segmentOf(o)
    segCount[s]++
    segSq[s] += (f(o) - o.minutes) ** 2
  }
  const preds = data.test.map(f)
  const mean = preds.reduce((s, v) => s + v, 0) / Math.max(1, preds.length)
  return {
    train: rms(data.train),
    val: rms(data.val),
    test: rms(data.test),
    pairs: data.test.map((o, i) => [o.minutes, preds[i]]),
    segCount,
    segRms: segSq.map((v, i) => (segCount[i] ? Math.sqrt(v / segCount[i]) : NaN)),
    spread: Math.sqrt(preds.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, preds.length)),
  }
}

export type Outcome = 'ontime' | 'late' | 'lost'
export const MARGIN = 40
export const LATE_COST = 20
/** Each simulated order stands for this many real ones over the month */
export const SCALE = 5

export interface Shipment {
  outcomes: Outcome[]
  promises: number[]
  ontime: number
  late: number
  lost: number
  /** rupees over the month, after paying for the data */
  profit: number
  revenue: number
  dataCost: number
  /** per segment: orders, and orders that went wrong (late or lost) */
  segOrders: number[]
  segBad: number[]
  /** RMS error of the raw predictions on live orders */
  liveRms: number
}

/**
 * Launch: every live order gets a promise (prediction + buffer).
 * Promise too long: the customer may order elsewhere. Promise broken by more than 2 minutes: refund.
 */
export function ship(net: Network | null, data: Dataset, cfg: Pick<Config, 'buffer' | 'size'>): Shipment {
  const f = predictor(net, data)
  const rand = rng(303)
  const res: Shipment = {
    outcomes: [],
    promises: [],
    ontime: 0,
    late: 0,
    lost: 0,
    profit: 0,
    revenue: 0,
    dataCost: cfg.size * COST_PER_RECORD,
    segOrders: new Array<number>(SEGMENTS).fill(0),
    segBad: new Array<number>(SEGMENTS).fill(0),
    liveRms: 0,
  }
  let sq = 0
  for (const o of liveOrders) {
    const pred = Math.min(150, Math.max(3, f(o)))
    sq += (pred - o.minutes) ** 2
    const promise = pred + cfg.buffer
    // A rival app promises an honest time plus 4 minutes; the longer our promise beyond that, the more customers leave
    const leave = Math.min(0.85, Math.max(0, (promise - (trueMinutes(o.hour, o.km) + 4)) / 18))
    const outcome: Outcome = rand() < leave ? 'lost' : o.minutes > promise + 2 ? 'late' : 'ontime'
    res.outcomes.push(outcome)
    res.promises.push(promise)
    res[outcome]++
    const s = segmentOf(o)
    res.segOrders[s]++
    if (outcome !== 'ontime') res.segBad[s]++
  }
  res.liveRms = Math.sqrt(sq / liveOrders.length)
  res.revenue = (res.ontime * MARGIN - res.late * LATE_COST) * SCALE
  res.profit = res.revenue - res.dataCost
  return res
}

let expertCache: number | null = null
/** Profit of the reference pipeline, computed once. */
export function expertProfit(): number {
  if (expertCache === null) {
    const data = buildData(expertConfig)
    expertCache = ship(runToEnd(expertConfig, data).final, data, expertConfig).profit
  }
  return expertCache
}

export const stars = (profit: number) => {
  const r = profit / expertProfit()
  return r >= 0.92 ? 3 : r >= 0.7 ? 2 : r >= 0.35 ? 1 : 0
}

export interface Finding {
  /** index of the stage to revisit */
  stage: number
  title: string
  text: string
}

/** After launch: what went wrong, most costly first, in words a first-time learner can act on. */
export function debrief(cfg: Config, data: Dataset, run: Run | null, insp: Inspection, shipment: Shipment): Finding[] {
  const out: Finding[] = []
  const total = liveOrders.length
  if (!run?.final)
    out.push({
      stage: 3,
      title: 'Training blew up, so no model was shipped',
      text: 'The learning rate was too large and the error grew instead of falling. Operations had to promise one flat time to everyone. Lower the learning rate or switch algorithm.',
    })
  if (!cfg.normalise)
    out.push({
      stage: 1,
      title: 'The inputs were never scaled',
      text:
        `Distance went in as metres (up to ${Math.round(data.metreMM.max)}), which pushes tansig neurons flat, where they cannot learn. ` +
        (insp.spread < 3
          ? `The model gave almost the same answer to everyone: its predictions varied by only ${insp.spread.toFixed(1)} minutes.`
          : `Training struggled: the error stayed at ${insp.train.toFixed(1)} minutes, well above what scaled inputs reach.`),
    })
  if (!cfg.clean && data.brokenInTrain > 0)
    out.push({
      stage: 1,
      title: `${data.brokenInTrain} broken record${data.brokenInTrain === 1 ? '' : 's'} trained the model`,
      text: 'Orders where the rider forgot to tap "Delivered" show delivery times of several hours. Squared error makes the network bend towards them, so promises come out too long and customers leave.',
    })
  const blind = data.coverage.map((c, s) => (c === 0 ? s : -1)).filter((s) => s >= 0)
  const blindBad = blind.reduce((sum, s) => sum + shipment.segBad[s], 0)
  const allBad = shipment.late + shipment.lost
  if (blind.length >= 3 && blindBad > 0)
    out.push({
      stage: 0,
      title: `Blind spots: ${blind.length} of ${SEGMENTS} situations had no training data`,
      text: `${blindBad} of the ${allBad} orders that went wrong (${Math.round((blindBad / Math.max(1, allBad)) * 100)}%) came from situations the model had never seen, such as ${segmentLabel(blind[blind.length - 1])}. Your test set had no orders there either, so it could not warn you.`,
    })
  if (run?.final && cfg.normalise && insp.train > 0 && insp.test > 1.8 * insp.train && insp.test > 5)
    out.push({
      stage: 2,
      title: 'The model memorised its training orders',
      text: `Training error was ${insp.train.toFixed(1)} min but test error was ${insp.test.toFixed(1)} min. ${paramCountFor(cfg.neurons)} parameters were fitted to ${data.train.length} orders. Use fewer neurons, more data, or early stopping.`,
    })
  if (run?.final && cfg.normalise && insp.train > 7)
    out.push({
      stage: 3,
      title: 'The model never fitted even its own training data',
      text: `Training error stayed at ${insp.train.toFixed(1)} minutes. Train longer, use a faster algorithm such as Levenberg-Marquardt, or add neurons.`,
    })
  if (shipment.late / total > 0.2)
    out.push({
      stage: 5,
      title: `${Math.round((shipment.late / total) * 100)}% of orders arrived late`,
      text: 'Every late order is refunded. If the model itself is sound, add a few minutes of buffer to each promise.',
    })
  if (shipment.lost / total > 0.2)
    out.push({
      stage: 5,
      title: `${Math.round((shipment.lost / total) * 100)}% of customers went to a rival`,
      text: 'Promises were longer than they needed to be. Reduce the buffer, or fix whatever is making the predictions too high.',
    })
  if (out.length === 0)
    out.push({
      stage: 5,
      title: 'A sound pipeline',
      text: 'Data covered the whole city, inputs were clean and scaled, and training and test errors agreed. What is left is noise no model can predict; tune the buffer to trade refunds against lost customers.',
    })
  return out
}
