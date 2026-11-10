import type { Lab } from './labs'
import { factoryLabs } from './factoryLabs'
import { neuronLabLabs } from './neuronLabLabs'
import { perceptronLabs } from './perceptronLabs'
import { errorValleyLabs } from './errorValleyLabs'
import { competitiveLabs } from './competitiveLabs'

/** Stations of every world, keyed by the world ids in worlds.ts. */
export const labsByWorld: Record<string, Lab[]> = {
  'neuron-lab': neuronLabLabs,
  perceptron: perceptronLabs,
  'error-valley': errorValleyLabs,
  competitive: competitiveLabs,
  factory: factoryLabs,
}

export const findLab = (worldId: string | undefined, labId: string | undefined) =>
  worldId ? labsByWorld[worldId]?.find((l) => l.id === labId) : undefined
