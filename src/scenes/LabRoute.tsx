import { Suspense, type ComponentType, type LazyExoticComponent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { labsByWorld } from '../data/labRegistry'
import { scenes as neuronLab } from './neuron-lab'
import { scenes as perceptron } from './perceptron'
import { scenes as errorValley } from './error-valley'
import { scenes as competitive } from './competitive'
import { scenes as factory } from './factory'
import WorldFloor from './WorldFloor'
import WorldPlaceholder from './WorldPlaceholder'

const scenesByWorld: Record<string, Record<string, LazyExoticComponent<ComponentType>>> = {
  'neuron-lab': neuronLab,
  perceptron,
  'error-valley': errorValley,
  competitive,
  factory,
}

/** /world/:worldId — the world's floor of stations, or a placeholder while it has none. */
export function WorldRoute() {
  const { worldId } = useParams()
  return worldId && labsByWorld[worldId]?.length ? <WorldFloor key={worldId} worldId={worldId} /> : <WorldPlaceholder />
}

/** /world/:worldId/:labId — one station, loaded on demand so the first visit stays small. */
export default function LabRoute() {
  const { worldId, labId } = useParams()
  const Lab = worldId && labId ? scenesByWorld[worldId]?.[labId] : undefined
  if (!Lab) return <Navigate to={worldId ? `/world/${worldId}` : '/'} replace />
  return (
    <Suspense fallback={<div className="grid h-full place-items-center text-sm text-slate-400">Starting the station…</div>}>
      <Lab key={`${worldId}/${labId}`} />
    </Suspense>
  )
}
