import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/** Station id → lazily loaded component. Ids match src/data/perceptronLabs.ts. */
export const scenes: Record<string, LazyExoticComponent<ComponentType>> = {
  boundary: lazy(() => import('./labs/BoundaryLab')),
  'learning-rule': lazy(() => import('./labs/LearningRuleLab')),
  'four-classes': lazy(() => import('./labs/FourClassesLab')),
  'xor-room': lazy(() => import('./labs/XorRoomLab')),
  'memory-wall': lazy(() => import('./labs/MemoryWallLab')),
}
