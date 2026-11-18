import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LangProvider } from './i18n'
import Layout from './components/Layout'
import { lazy, Suspense } from 'react'
import Home from './pages/Home'
const Explore = lazy(() => import('./pages/Explore'))
const Models = lazy(() => import('./pages/Models'))
const Panorama = lazy(() => import('./pages/Panorama'))
const Method = lazy(() => import('./pages/Method'))

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="chart-skeleton" style={{ height: '60vh', margin: '2rem' }} />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="explorar" element={<Explore />} />
            <Route path="explorar/:id" element={<Explore />} />
            <Route path="modelos" element={<Models />} />
            <Route path="panorama" element={<Panorama />} />
            <Route path="metodologia" element={<Method />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </Suspense>
      </BrowserRouter>
    </LangProvider>
  )
}
