import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/** Station id → lazily loaded component. Ids match src/data/competitiveLabs.ts. */
export const scenes: Record<string, LazyExoticComponent<ComponentType>> = {
  pavlov: lazy(() => import('./labs/PavlovLab')),
  'instar-outstar': lazy(() => import('./labs/InstarOutstarLab')),
  competition: lazy(() => import('./labs/CompetitionLab')),
  'feature-map': lazy(() => import('./labs/FeatureMapLab')),
  lvq: lazy(() => import('./labs/LvqLab')),
  'rbf-hills': lazy(() => import('./labs/RbfHillsLab')),
}
