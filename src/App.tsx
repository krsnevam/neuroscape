import { Route, Routes } from 'react-router-dom'
import HubScene from './scenes/hub/HubScene'
import LabRoute, { WorldRoute } from './scenes/LabRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubScene />} />
      <Route path="/world/:worldId" element={<WorldRoute />} />
      <Route path="/world/:worldId/:labId" element={<LabRoute />} />
      <Route path="*" element={<HubScene />} />
    </Routes>
  )
}
