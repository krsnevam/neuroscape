import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import HubScene from './scenes/hub/HubScene'
import LabRoute, { WorldRoute } from './scenes/LabRoute'

const SlideDeck = lazy(() => import('./scenes/factory/slides/SlideDeck'))
const Journey = lazy(() => import('./scenes/journey/JourneyPage'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubScene />} />
      <Route path="/world/:worldId" element={<WorldRoute />} />
      <Route path="/world/:worldId/:labId" element={<LabRoute />} />
      <Route
        path="/world/factory/slides/:code"
        element={
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-slate-400">Opening the slides…</div>}>
            <SlideDeck />
          </Suspense>
        }
      />
      <Route
        path="/journey"
        element={
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-slate-400">Starting the journey…</div>}>
            <Journey />
          </Suspense>
        }
      />
      <Route path="*" element={<HubScene />} />
    </Routes>
  )
}
