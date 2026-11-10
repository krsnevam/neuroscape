import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/** Station id → lazily loaded component. Ids match src/data/errorValleyLabs.ts. */
export const scenes: Record<string, LazyExoticComponent<ComponentType>> = {
  adaline: lazy(() => import('./labs/AdalineLab')),
  'noise-canceller': lazy(() => import('./labs/NoiseLab')),
  backprop: lazy(() => import('./labs/BackpropLab')),
  'xor-solved': lazy(() => import('./labs/XorLab')),
  ravine: lazy(() => import('./labs/RavineLab')),
}
