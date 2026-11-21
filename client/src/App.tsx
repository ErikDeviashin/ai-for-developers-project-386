import { Route, Routes } from 'react-router-dom'
import { BookPage } from './pages/BookPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/book" element={<BookPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
