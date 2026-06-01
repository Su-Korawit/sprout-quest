import { BrowserRouter, Routes, Route } from 'react-router-dom'
import GameCanvas from './components/GameCanvas'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameCanvas />} />
      </Routes>
    </BrowserRouter>
  )
}
