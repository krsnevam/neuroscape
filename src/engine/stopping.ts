import type { Network } from './network'
import { gradNorm } from './init'
import { cloneNetwork, gradient, lossOn, type Sample } from './train'

/**
 * The four usual reasons a training run ends (Hagan Ch. 22, stopping criteria):
 *  - 'goal'        the training error reached the performance goal
 *  - 'gradient'    the gradient length ‖g‖ fell below the minimum: the surface is flat here
 *  - 'validation'  the validation error has not improved for `patience` iterations (early stopping)
 *  - 'maxit'       the maximum number of iterations was reached
 */
export type StopReason = 'goal' | 'gradient' | 'validation' | 'maxit'

export interface StopOpts {
  /** learning rate α */
  alpha: number
  /** momentum γ */
  gamma: number
  maxIt: number
  /** performance goal on the training mean squared error; 0 switches it off */
  goal: number
  minGrad: number
  /** iterations without a better validation error before stopping; 0 switches early stopping off */
  patience: number
}

export interface StopRun {
  net: Network
  its: number
  trainLoss: number
  valLoss: number
  grad: number
  /** [training loss, validation loss] recorded every `every` iterations */
  history: [number, number][]
  every: number
  /** weights at the lowest validation error so far */
  best: Network
  bestVal: number
  bestAt: number
  stopped: StopReason | null
  step: (n: number) => void
}

/**
 * Batch steepest descent with momentum (Hagan 12.9) that checks all four stopping criteria after
 * every iteration. The network is trained in place; `best` keeps the early-stopping weights.
 */
export function createStopRun(net: Network, train: Sample[], val: Sample[], o: StopOpts, every = 10): StopRun {
  const vW = net.layers.map((L) => L.W.map((r) => r.map(() => 0)))
  const vb = net.layers.map((L) => L.b.map(() => 0))
  const run: StopRun = {
    net,
    its: 0,
    trainLoss: lossOn(net, train),
    valLoss: lossOn(net, val),
    grad: NaN,
    history: [],
    every,
    best: cloneNetwork(net),
    bestVal: Infinity,
    bestAt: 0,
    stopped: null,
    step(n) {
      for (let q = 0; q < n && !run.stopped; q++) {
        const g = gradient(net, train)
        run.grad = gradNorm(g)
        if (run.grad < o.minGrad) {
          run.stopped = 'gradient'
          break
        }
        const k = (1 - o.gamma) * o.alpha
        for (let m = 0; m < net.layers.length; m++) {
          const L = net.layers[m]
          for (let i = 0; i < L.b.length; i++) {
            vb[m][i] = o.gamma * vb[m][i] - k * g.b[m][i]
            L.b[i] += vb[m][i]
            for (let j = 0; j < L.W[i].length; j++) {
              vW[m][i][j] = o.gamma * vW[m][i][j] - k * g.W[m][i][j]
              L.W[i][j] += vW[m][i][j]
            }
          }
        }
        run.its++
        run.trainLoss = lossOn(net, train)
        run.valLoss = lossOn(net, val)
        if (val.length && run.valLoss < run.bestVal) {
          run.bestVal = run.valLoss
          run.best = cloneNetwork(net)
          run.bestAt = run.its
        }
        if (run.its % every === 0) run.history.push([run.trainLoss, run.valLoss])
        if (!Number.isFinite(run.trainLoss)) run.stopped = 'maxit'
        else if (o.goal > 0 && run.trainLoss <= o.goal) run.stopped = 'goal'
        else if (o.patience > 0 && val.length && run.its - run.bestAt >= o.patience) run.stopped = 'validation'
        else if (run.its >= o.maxIt) run.stopped = 'maxit'
      }
    },
  }
  run.bestVal = run.valLoss
  return run
}
