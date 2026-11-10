import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/** Station id → lazily loaded component. Ids match src/data/factoryLabs.ts. */
export const scenes: Record<string, LazyExoticComponent<ComponentType>> = {
  traffic: lazy(() => import('./labs/TrafficLab')),
  sensor: lazy(() => import('./labs/SensorLab')),
  valley: lazy(() => import('./labs/ValleyLab')),
  fraud: lazy(() => import('./labs/FraudLab')),
  battery: lazy(() => import('./labs/BatteryLab')),
  cricket: lazy(() => import('./labs/CricketLab')),
  doodle: lazy(() => import('./labs/DoodleLab')),
  colours: lazy(() => import('./labs/ColoursLab')),
  wave: lazy(() => import('./labs/WaveLab')),
}
