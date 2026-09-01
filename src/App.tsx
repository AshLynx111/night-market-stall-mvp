import { lazy, Suspense } from 'react'
import { LandscapeGame } from './components/LandscapeGame'
import { getPlaytestConfig } from './analytics/tracker'

const PlaytestDebugPanel = lazy(() => import('./components/playtest/PlaytestDebugPanel'))

export function App() {
  const playtest = getPlaytestConfig()
  return <>
    <LandscapeGame />
    {playtest.debugMode && <Suspense fallback={null}><PlaytestDebugPanel /></Suspense>}
  </>
}
