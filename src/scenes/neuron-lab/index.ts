import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/** Station id → lazily loaded component. Ids match src/data/neuronLabLabs.ts. */
export const scenes: Record<string, LazyExoticComponent<ComponentType>> = {
  'rules-vs-learning': lazy(() => import('./labs/RulesLab')),
  neuron: lazy(() => import('./labs/NeuronLab')),
  layers: lazy(() => import('./labs/LayersLab')),
  'fruit-sorter': lazy(() => import('./labs/SorterLab')),
  memory: lazy(() => import('./labs/MemoryLab')),
}
