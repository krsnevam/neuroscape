import { Route, Routes } from 'react-router-dom'
import HubScene from './scenes/hub/HubScene'
import WorldPlaceholder from './scenes/WorldPlaceholder'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubScene />} />
      <Route path="/world/:worldId" element={<WorldPlaceholder />} />
      <Route path="*" element={<HubScene />} />
    </Routes>
  )
}
