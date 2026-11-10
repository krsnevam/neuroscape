import { Route, Routes } from 'react-router-dom'
import HubScene from './scenes/hub/HubScene'
import WorldPlaceholder from './scenes/WorldPlaceholder'
import FactoryFloor from './scenes/factory/FactoryFloor'
import LabRoute from './scenes/factory/LabRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubScene />} />
      <Route path="/world/factory" element={<FactoryFloor />} />
      <Route path="/world/factory/:labId" element={<LabRoute />} />
      <Route path="/world/:worldId" element={<WorldPlaceholder />} />
      <Route path="*" element={<HubScene />} />
    </Routes>
  )
}
