import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { Navigate, useParams } from 'react-router-dom'

/** Each station is loaded on demand so the first visit to the app stays small. */
const labs: Record<string, LazyExoticComponent<ComponentType>> = {
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

export default function LabRoute() {
  const { labId } = useParams()
  const Lab = labId ? labs[labId] : undefined
  if (!Lab) return <Navigate to="/world/factory" replace />
  return (
    <Suspense fallback={<div className="grid h-full place-items-center text-sm text-slate-400">Starting the station…</div>}>
      <Lab key={labId} />
    </Suspense>
  )
}
